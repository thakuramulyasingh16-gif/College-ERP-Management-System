const assert = require('assert');
const path = require('path');
const fs = require('fs');

const {
  extractCloudinaryPublicId,
  deleteMediaFile,
  getUploadedFileUrl,
  isCloudinaryConfigured
} = require('./services/cloudinaryService');

async function runCloudinaryTests() {
  console.log('====================================================');
  console.log('☁️  TESTING CLOUDINARY FILE STORAGE & REPLACEMENT');
  console.log('====================================================\n');

  // TEST 1: extractCloudinaryPublicId on standard image URL
  {
    const url = 'https://res.cloudinary.com/college-erp/image/upload/v1712345678/college-erp/profiles/user_pic123.jpg';
    const publicId = extractCloudinaryPublicId(url);
    assert.strictEqual(publicId, 'college-erp/profiles/user_pic123');
    console.log('  ✅ PASS: Test 1 - Extracted public_id from standard Cloudinary image URL');
  }

  // TEST 2: extractCloudinaryPublicId with transformations and query string
  {
    const url = 'https://res.cloudinary.com/college-erp/image/upload/c_limit,w_1000,h_1000/v1712345678/college-erp/profiles/custom_user.webp?token=abc';
    const publicId = extractCloudinaryPublicId(url);
    assert.strictEqual(publicId, 'college-erp/profiles/custom_user');
    console.log('  ✅ PASS: Test 2 - Extracted public_id with transformation parameters & query strings');
  }

  // TEST 3: extractCloudinaryPublicId on raw PDF document
  {
    const url = 'https://res.cloudinary.com/college-erp/raw/upload/v1712345678/college-erp/materials/semester1_syllabus.pdf';
    const publicIdWithExt = extractCloudinaryPublicId(url, true);
    const publicIdNoExt = extractCloudinaryPublicId(url, false);
    assert.strictEqual(publicIdWithExt, 'college-erp/materials/semester1_syllabus.pdf');
    assert.strictEqual(publicIdNoExt, 'college-erp/materials/semester1_syllabus');
    console.log('  ✅ PASS: Test 3 - Extracted raw PDF public_id (both with and without extension)');
  }

  // TEST 4: Non-Cloudinary local URL returns null
  {
    const localUrl = '/uploads/profile/profile_image-1718000000-12345.jpg';
    assert.strictEqual(extractCloudinaryPublicId(localUrl), null);
    console.log('  ✅ PASS: Test 4 - Non-Cloudinary local paths correctly return null for public_id');
  }

  // TEST 5: getUploadedFileUrl correctly normalizes Cloudinary vs Local multer files
  {
    // Cloudinary multer file
    const cloudinaryFile = {
      path: 'https://res.cloudinary.com/college-erp/image/upload/v1712345678/college-erp/profiles/img1.png',
      filename: 'college-erp/profiles/img1'
    };
    const cUrl = getUploadedFileUrl(cloudinaryFile, 'profile');
    assert.strictEqual(cUrl, 'https://res.cloudinary.com/college-erp/image/upload/v1712345678/college-erp/profiles/img1.png');

    // Local diskStorage multer file
    const diskFile = {
      filename: 'profile_image-12345.jpg',
      path: path.join(__dirname, 'uploads/profile/profile_image-12345.jpg')
    };
    const dUrl = getUploadedFileUrl(diskFile, 'profile');
    assert.strictEqual(dUrl, '/uploads/profile/profile_image-12345.jpg');

    // Study material local file
    const materialDiskFile = {
      filename: 'study_material-99999.pdf',
      path: path.join(__dirname, 'uploads/materials/study_material-99999.pdf')
    };
    const mUrl = getUploadedFileUrl(materialDiskFile, 'materials');
    assert.strictEqual(mUrl, '/uploads/materials/study_material-99999.pdf');

    console.log('  ✅ PASS: Test 5 - getUploadedFileUrl normalizes both Cloudinary and diskStorage files');
  }

  // TEST 6: deleteMediaFile cleans up local legacy files without throwing
  {
    const tempDir = path.join(__dirname, 'uploads/profile');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, 'temp-delete-test.jpg');
    fs.writeFileSync(tempFile, 'dummy-content');
    assert.strictEqual(fs.existsSync(tempFile), true);

    const deleted = await deleteMediaFile('/uploads/profile/temp-delete-test.jpg');
    assert.strictEqual(deleted, true);
    assert.strictEqual(fs.existsSync(tempFile), false);
    console.log('  ✅ PASS: Test 6 - deleteMediaFile correctly deletes legacy local file from disk');
  }

  // TEST 7: deleteMediaFile handles non-existent files gracefully without throwing
  {
    const deletedNonExistent = await deleteMediaFile('/uploads/profile/non-existent-file-xyz.jpg');
    assert.strictEqual(deletedNonExistent, false);

    const deletedNull = await deleteMediaFile(null);
    assert.strictEqual(deletedNull, false);
    console.log('  ✅ PASS: Test 7 - deleteMediaFile safely ignores non-existent and null files without throwing');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL CLOUDINARY INTEGRATION TESTS PASSED!');
  console.log('====================================================\n');
}

runCloudinaryTests().catch(err => {
  console.error('❌ Cloudinary test failed:', err);
  process.exit(1);
});
