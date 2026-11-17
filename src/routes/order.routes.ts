import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticate, isAdmin } from '../middlewares/auth';

const router = Router();

// Price validation endpoint (public for real-time validation)
router.post('/validate-price', OrderController.validateCustomizationPrice);

// Submit order with price validation (public for guests / authenticated customers)
router.post('/', OrderController.createOrder);

// Admin order management endpoints
router.get('/', authenticate, isAdmin, OrderController.getOrders);
router.get('/:id', authenticate, isAdmin, OrderController.getOrderById);
router.patch('/:id/status', authenticate, isAdmin, OrderController.updateOrderStatus);

export default router;

