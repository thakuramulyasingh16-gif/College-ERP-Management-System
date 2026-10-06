const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FileType = require('file-type');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary, isCloudinaryConfigured } = require('../services/cloudinaryService');

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOC_EXTENSIONS = ['.pdf'];
const ALLOWED_DOC_MIMES = ['application/pdf'];

// Create storage engine: CloudinaryStorage when credentials exist, diskStorage fallback for local tests
let storage;

if (isCloudinaryConfigured()) {
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      if (file.fieldname === 'profile_image') {
        return {
          folder: 'college-erp/profiles',
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          transformation: [{ width: 1000, height: 1000, crop: 'limit', quality: 'auto' }]
        };
      } else if (file.fieldname === 'study_material') {
        return {
          folder: 'college-erp/materials',
          resource_type: 'raw',
          allowed_formats: ['pdf'],
          format: 'pdf'
        };
      }
      return {
        folder: 'college-erp/others'
      };
    }
  });
} else {
  // Local diskStorage fallback (for offline tests / local dev without Cloudinary keys)
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      let dir = path.join(__dirname, '../uploads/');
      if (file.fieldname === 'profile_image') {
        dir = path.join(__dirname, '../uploads/profile/');
      } else if (file.fieldname === 'study_material') {
        dir = path.join(__dirname, '../uploads/materials/');
      }
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const rawExt = path.extname(file.originalname).toLowerCase();
      let safeExt = '';
      
      if (file.fieldname === 'profile_image') {
        safeExt = ALLOWED_IMAGE_EXTENSIONS.includes(rawExt) ? rawExt : '.jpg';
      } else if (file.fieldname === 'study_material') {
        safeExt = ALLOWED_DOC_EXTENSIONS.includes(rawExt) ? rawExt : '.pdf';
      } else {
        safeExt = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '');
      }

      const safeFieldname = file.fieldname.replace(/[^a-zA-Z0-9_]/g, '');
      cb(null, `${safeFieldname}-${uniqueSuffix}${safeExt}`);
    }
  });
}

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'profile_image') {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype.startsWith('image/') && ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only valid image files (.jpg, .jpeg, .png, .gif, .webp) are allowed for profile!'), false);
    }
  } else if (file.fieldname === 'study_material') {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype === 'application/pdf' && ALLOWED_DOC_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files (.pdf) are allowed for study materials!'), false);
    }
  } else {
    cb(new Error('Unsupported upload field!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * Post-upload middleware to verify actual magic bytes / content signature
 * Handles both remote Cloudinary uploads and local disk fallback.
 */
const validateUploadedFile = async (req, res, next) => {
  if (!req.file) return next();

  // If uploaded to Cloudinary, req.file.path is a full HTTPS URL
  if (req.file.path && (req.file.path.startsWith('http://') || req.file.path.startsWith('https://'))) {
    return next();
  }

  // Local disk fallback validation
  try {
    const filePath = req.file.path;
    if (!filePath || !fs.existsSync(filePath)) {
      return next();
    }

    const fileType = await FileType.fromFile(filePath);

    let isValid = false;
    let expectedFormat = '';

    if (req.file.fieldname === 'profile_image') {
      expectedFormat = 'a valid image (JPEG, PNG, GIF, WebP)';
      if (fileType && ALLOWED_IMAGE_MIMES.includes(fileType.mime)) {
        isValid = true;
      }
    } else if (req.file.fieldname === 'study_material') {
      expectedFormat = 'a valid PDF document';
      if (fileType && ALLOWED_DOC_MIMES.includes(fileType.mime)) {
        isValid = true;
      }
    }

    if (!isValid) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (unlinkErr) {
        console.error("Error removing invalid upload:", unlinkErr);
      }

      return res.status(400).json({
        success: false,
        message: `Invalid file content: The uploaded file does not match ${expectedFormat}.`
      });
    }

    next();
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    console.error("File validation error:", error);
    return res.status(400).json({
      success: false,
      message: "Failed to verify uploaded file content."
    });
  }
};

module.exports = upload;
module.exports.validateUploadedFile = validateUploadedFile;
