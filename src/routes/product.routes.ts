import { Router } from 'express';
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  updateProductAvailability,
  deleteProduct,
} from '../controllers/product.controller';
import { authenticate, isAdmin } from '../middlewares/auth';
import { uploadSingleImage, handleMulterError } from '../middlewares/upload.middleware';

const router = Router();

// Public routes (for customer menu & single item view)
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Admin protected routes
router.post(
  '/',
  authenticate,
  isAdmin,
  uploadSingleImage.single('image'),
  handleMulterError,
  createProduct
);

router.put(
  '/:id',
  authenticate,
  isAdmin,
  uploadSingleImage.single('image'),
  handleMulterError,
  updateProduct
);

router.patch(
  '/:id/availability',
  authenticate,
  isAdmin,
  updateProductAvailability
);

router.delete(
  '/:id',
  authenticate,
  isAdmin,
  deleteProduct
);

export default router;

