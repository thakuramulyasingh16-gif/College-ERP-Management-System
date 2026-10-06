const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Checks if Cloudinary is configured with valid environment variables
 */
const isCloudinaryConfigured = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

/**
 * Extracts public_id from Cloudinary URL, including folder path.
 * e.g., 'https://res.cloudinary.com/demo/image/upload/v1570979139/college-erp/profiles/sample.jpg'
 *       -> 'college-erp/profiles/sample'
 */
function extractCloudinaryPublicId(url, keepExtension = false) {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('cloudinary.com')) return null;

  try {
    const cleanUrl = url.split('?')[0];
    const uploadIndex = cleanUrl.indexOf('/upload/');
    if (uploadIndex === -1) return null;

    let pathAfterUpload = cleanUrl.substring(uploadIndex + '/upload/'.length);
    const segments = pathAfterUpload.split('/');
    let startIndex = 0;

    while (startIndex < segments.length) {
      const seg = segments[startIndex];
      if (/^v\d+$/.test(seg)) {
        startIndex++;
        break;
      }
      if ((seg.includes(',') || /^[a-z]_[a-z0-9,]+$/i.test(seg)) && startIndex < segments.length - 1) {
        startIndex++;
      } else {
        break;
      }
    }

    const remaining = segments.slice(startIndex).join('/');
    if (keepExtension) {
      return remaining;
    }

    const lastDot = remaining.lastIndexOf('.');
    return lastDot !== -1 ? remaining.substring(0, lastDot) : remaining;
  } catch (err) {
    console.warn('[Cloudinary] Failed to parse public_id from URL:', err.message);
    return null;
  }
}

/**
 * Safely deletes a media file from Cloudinary (or local disk fallback)
 * Non-blocking: logs warning on failure but does not throw.
 * 
 * @param {string} fileUrl - Stored file URL (Cloudinary URL or local /uploads/... path)
 * @param {'image'|'raw'|'auto'} resourceType - 'image' for photos, 'raw' for PDFs
 */
async function deleteMediaFile(fileUrl, resourceType = 'image') {
  if (!fileUrl || typeof fileUrl !== 'string') return false;

  // 1. Cloudinary File Deletion
  if (fileUrl.includes('cloudinary.com')) {
    if (!isCloudinaryConfigured()) {
      console.warn('[Cloudinary] Skipping deletion: Cloudinary credentials not configured in environment.');
      return false;
    }

    try {
      if (resourceType === 'raw') {
        // Raw assets (e.g. PDFs) can be stored with or without file extension in public_id
        const publicIdWithExt = extractCloudinaryPublicId(fileUrl, true);
        const publicIdNoExt = extractCloudinaryPublicId(fileUrl, false);

        let res = null;
        if (publicIdWithExt) {
          res = await cloudinary.uploader.destroy(publicIdWithExt, { resource_type: 'raw', invalidate: true }).catch(() => null);
        }
        if ((!res || res.result !== 'ok') && publicIdNoExt && publicIdNoExt !== publicIdWithExt) {
          res = await cloudinary.uploader.destroy(publicIdNoExt, { resource_type: 'raw', invalidate: true }).catch(() => null);
        }
        // Fallback: in case PDF was uploaded as image
        if (!res || res.result !== 'ok') {
          await cloudinary.uploader.destroy(publicIdNoExt, { resource_type: 'image', invalidate: true }).catch(() => null);
        }
        return true;
      } else {
        // Image asset
        const publicId = extractCloudinaryPublicId(fileUrl, false);
        if (publicId) {
          const res = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
          return res && res.result === 'ok';
        }
      }
    } catch (err) {
      console.warn('[Cloudinary] Warning: Failed to destroy remote asset:', err.message);
      return false;
    }
  }

  // 2. Local File Deletion (for files from before Cloudinary migration)
  if (fileUrl.startsWith('/uploads/') || fileUrl.startsWith('uploads/')) {
    try {
      const relativePath = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;
      const localPath = path.join(__dirname, '..', relativePath);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        return true;
      }
    } catch (err) {
      console.warn('[Storage] Warning: Failed to delete local legacy file:', err.message);
      return false;
    }
  }

  return false;
}

/**
 * Normalizes uploaded file object from multer (CloudinaryStorage or diskStorage)
 * into a URL string for storing in database.
 * 
 * @param {object} file - multer req.file object
 * @param {string} defaultSubdir - 'profile' or 'materials' for local fallback
 * @returns {string|null}
 */
function getUploadedFileUrl(file, defaultSubdir = 'profile') {
  if (!file) return null;

  // CloudinaryStorage sets file.path to full secure_url
  if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
    return file.path;
  }

  // Fallback for diskStorage: format as /uploads/{subdir}/{filename}
  if (file.filename) {
    return `/uploads/${defaultSubdir}/${file.filename}`;
  }

  return file.path || null;
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  extractCloudinaryPublicId,
  deleteMediaFile,
  getUploadedFileUrl
};
