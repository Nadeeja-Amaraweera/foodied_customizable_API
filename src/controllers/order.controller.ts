import { Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { OrderModel } from '../models/order.model';
import { UserModel } from '../models/user.model';
import { AuthRequest } from '../middlewares/auth';
import {
  validateProductCustomization,
  validateOrderItems,
  ValidateItemInput,
} from '../service/price-validator';

export class OrderController {
  /**
   * Validate a single customized product's price against MongoDB
   * POST /api/v1/orders/validate-price
   */
  static async validateCustomizationPrice(req: Request, res: Response): Promise<void> {
    try {
      const { productId, quantity, customization, unitPrice, totalPrice } = req.body;

      if (!productId) {
        res.status(400).json({ message: 'productId is required' });
        return;
      }

      const validation = await validateProductCustomization({
        productId,
        quantity: quantity || 1,
        customization,
        unitPrice,
        totalPrice,
      });

      if (!validation.isValid || !validation.item) {
        res.status(400).json({
          message: validation.errorMessage || 'Invalid customization or price mismatch',
          isValid: false,
        });
        return;
      }

      res.status(200).json({
        message: 'Price validated successfully',
        isValid: true,
        data: {
          productId: validation.item.productId,
          name: validation.item.name,
          basePrice: validation.item.basePrice,
          sizePriceModifier: validation.item.sizePriceModifier,
          extrasPriceModifier: validation.item.extrasPriceModifier,
          unitPrice: validation.item.unitPrice,
          totalPrice: validation.item.totalPrice,
          customization: validation.item.customization,
        },
      });
    } catch (error: any) {
      console.error('Error validating customization price:', error);
      res.status(500).json({
        message: 'Server error while validating price',
        error: error.message,
      });
    }
  }

  /**
   * Submit and create a new order with backend price validation
   * POST /api/v1/orders
   */
  static async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const { items, customer, subtotal, totalAmount, paymentMethod, notes } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ message: 'Order items are required and must not be empty' });
        return;
      }

      // 1. Perform strict backend price validation against MongoDB records
      const validation = await validateOrderItems(items, subtotal, totalAmount);

      if (!validation.isValid) {
        res.status(400).json({
          message: validation.errorMessage || 'Order price validation failed',
          details: validation.errorMessage,
        });
        return;
      }

      // 2. Generate unique order number (e.g. ORD-8472)
      const orderCount = await OrderModel.countDocuments();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `ORD-${orderCount + 1000}-${randomSuffix}`;

      // 3. Extract authenticated customer user ID if available
      let userId: mongoose.Types.ObjectId | undefined = undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const payload: any = jwt.verify(token, process.env.JWT_SECRET as string);
          if (payload?.sub && mongoose.Types.ObjectId.isValid(payload.sub)) {
            userId = new mongoose.Types.ObjectId(payload.sub);
          }
        } catch {}
      }

      // 4. Construct Order document using backend trusted prices
      const newOrder = new OrderModel({
        userId,
        orderNumber,
        customer: {
          name: customer?.name?.trim() || 'Guest Customer',
          phone: customer?.phone?.trim() || '+1 (555) 123-4567',
          email: customer?.email?.trim() || 'customer@foodied.com',
          deliveryAddress: customer?.deliveryAddress?.trim() || 'Standard Delivery',
          customerType: customer?.customerType || 'New',
        },
        items: validation.validatedItems.map((vi) => ({
          productId: vi.productId,
          name: vi.name,
          quantity: vi.quantity,
          unitPrice: vi.unitPrice,
          totalPrice: vi.totalPrice,
          image: vi.image,
          customization: vi.customization,
        })),
        subtotal: validation.subtotal,
        deliveryFee: validation.deliveryFee,
        tax: validation.tax,
        totalAmount: validation.totalAmount,
        status: 'new',
        paymentMethod: paymentMethod || 'Credit Card',
        paymentStatus: 'Paid',
        placedAt: new Date(),
        notes: notes || '',
      });

      const savedOrder = await newOrder.save();

      res.status(201).json({
        message: 'Order placed successfully and validated by kitchen backend',
        data: savedOrder,
      });
    } catch (error: any) {
      console.error('Error creating order:', error);
      res.status(500).json({
        message: 'Failed to process order',
        error: error.message,
      });
    }
  }

  /**
   * Retrieve orders belonging only to the authenticated customer
   * GET /api/v1/orders/my-orders
   */
  static async getMyOrders(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.sub) {
        res.status(401).json({ message: 'Unauthorized. Please log in to view your orders.' });
        return;
      }

      const userId = req.user.sub;
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        res.status(400).json({ message: 'Invalid authenticated user token' });
        return;
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(401).json({ message: 'User account not found' });
        return;
      }

      // Secure query: match by authenticated user ID or verified user email
      const userCondition: any = {
        $or: [
          { userId: new mongoose.Types.ObjectId(userId) },
          { 'customer.email': { $regex: new RegExp(`^${user.email.trim()}$`, 'i') } },
        ],
      };

      // Compute status counts for the user
      const [allCount, preparingCount, confirmedCount, cancelledCount, deliveredCount, newCount] =
        await Promise.all([
          OrderModel.countDocuments(userCondition),
          OrderModel.countDocuments({ ...userCondition, status: 'preparing' }),
          OrderModel.countDocuments({ ...userCondition, status: 'confirmed' }),
          OrderModel.countDocuments({ ...userCondition, status: 'cancelled' }),
          OrderModel.countDocuments({ ...userCondition, status: 'delivered' }),
          OrderModel.countDocuments({ ...userCondition, status: 'new' }),
        ]);

      // Apply status filter if provided
      const { status, page, limit } = req.query;
      const queryFilter: any = { ...userCondition };

      const validStatuses = ['all', 'new', 'preparing', 'confirmed', 'delivered', 'cancelled'];
      if (status && typeof status === 'string' && status !== 'all') {
        const normalizedStatus = status.trim().toLowerCase();
        if (!validStatuses.includes(normalizedStatus)) {
          res.status(400).json({
            message: `Invalid status filter "${status}". Valid values: ${validStatuses.join(', ')}`,
          });
          return;
        }
        queryFilter.status = normalizedStatus;
      }

      // Server-side Pagination
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 5));
      const skip = (pageNum - 1) * limitNum;

      const totalFiltered = await OrderModel.countDocuments(queryFilter);
      const orders = await OrderModel.find(queryFilter)
        .sort({ placedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      res.status(200).json({
        message: 'Customer orders retrieved successfully',
        data: orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalFiltered,
          totalPages: Math.ceil(totalFiltered / limitNum) || 1,
        },
        statusCounts: {
          all: allCount,
          preparing: preparingCount,
          confirmed: confirmedCount,
          cancelled: cancelledCount,
          delivered: deliveredCount,
          new: newCount,
        },
      });
    } catch (error: any) {
      console.error('Error fetching customer orders:', error);
      res.status(500).json({
        message: 'Failed to retrieve your order history',
        error: error.message,
      });
    }
  }

  /**
   * Retrieve all orders (for admin incoming & past orders)
   * GET /api/v1/orders
   */
  static async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.query;
      const filter: Record<string, any> = {};

      if (status && typeof status === 'string' && status !== 'all') {
        filter.status = status;
      }

      const orders = await OrderModel.find(filter).sort({ placedAt: -1 }).lean();

      res.status(200).json({
        message: 'Orders retrieved successfully',
        data: orders,
        total: orders.length,
      });
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      res.status(500).json({
        message: 'Failed to fetch orders',
        error: error.message,
      });
    }
  }

  /**
   * Retrieve single order by ID
   * GET /api/v1/orders/:id
   */
  static async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: 'Invalid order ID' });
        return;
      }

      const order = await OrderModel.findById(id).lean();
      if (!order) {
        res.status(404).json({ message: 'Order not found' });
        return;
      }

      res.status(200).json({
        message: 'Order retrieved successfully',
        data: order,
      });
    } catch (error: any) {
      console.error('Error fetching order by ID:', error);
      res.status(500).json({
        message: 'Failed to fetch order',
        error: error.message,
      });
    }
  }

  /**
   * Update order status
   * PATCH /api/v1/orders/:id/status
   */
  static async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['new', 'preparing', 'confirmed', 'delivered', 'cancelled'];
      if (!status || !validStatuses.includes(status)) {
        res.status(400).json({
          message: `Invalid status. Valid values: ${validStatuses.join(', ')}`,
        });
        return;
      }

      if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: 'Invalid order ID' });
        return;
      }

      const updated = await OrderModel.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
      ).lean();

      if (!updated) {
        res.status(404).json({ message: 'Order not found' });
        return;
      }

      res.status(200).json({
        message: 'Order status updated successfully',
        data: updated,
      });
    } catch (error: any) {
      console.error('Error updating order status:', error);
      res.status(500).json({
        message: 'Failed to update order status',
        error: error.message,
      });
    }
  }
}

export default OrderController;

