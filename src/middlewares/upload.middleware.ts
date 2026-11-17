import multer, { FileFilterCallback } from 'multer';
import { Request, Response, NextFunction } from 'express';

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'image/gif'
];

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image format. Allowed formats: JPG, PNG, WEBP, GIF.'));
  }
};

export const uploadSingleImage = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
});

// Middleware to catch Multer errors gracefully
export const handleMulterError = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'Image file too large. Maximum allowed size is 5MB.',
      });
    }
    return res.status(400).json({
      message: `Image upload error: ${err.message}`,
    });
  } else if (err) {
    return res.status(400).json({
      message: err.message || 'Error processing uploaded file',
    });
  }
  next();
};

