import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { env } from '../config/env';

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const carIdParam = req.params.carId;
    const carId = Array.isArray(carIdParam) ? carIdParam[0] : carIdParam ?? 'misc';
    const dir = path.resolve(env.UPLOAD_DIR, 'cars', carId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

export const uploadCarImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are allowed'));
      return;
    }
    cb(null, true);
  }
});
