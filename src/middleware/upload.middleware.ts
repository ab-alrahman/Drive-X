import multer from 'multer';
import path from 'path';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Images are uploaded straight through to Cloudinary (see cars.service.ts addImage),
// so we only need the file in memory, never written to local disk.
const storage = multer.memoryStorage();

export const uploadCarImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(ext)) {
      cb(new Error('Only jpg, jpeg, png, and webp uploads are allowed'));
      return;
    }
    cb(null, true);
  }
});

// Maintenance/inspection documents are often PDF service records, not just photos.
const allowedInspectionMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const allowedInspectionExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

export const uploadInspectionFile = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedInspectionMimeTypes.has(file.mimetype) || !allowedInspectionExtensions.has(ext)) {
      cb(new Error('Only jpg, jpeg, png, webp, and pdf uploads are allowed'));
      return;
    }
    cb(null, true);
  }
});
