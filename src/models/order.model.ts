import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItemCustomization {
  size?: string;
  spiceLevel?: string;
  extras?: string[];
  dietary?: string[];
  specialInstructions?: string;
}

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image?: string;
  customization: IOrderItemCustomization;
}

export interface ICustomerInfo {
  name: string;
  phone?: string;
  email?: string;
  deliveryAddress?: string;
  customerType?: 'New' | 'Returning' | 'VIP';
}

export type OrderStatus = 'new' | 'preparing' | 'confirmed' | 'delivered' | 'cancelled';

export interface IOrder extends Document {
  orderNumber: string;
  customer: ICustomerInfo;
  items: IOrderItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: 'Paid' | 'Pending';
  placedAt: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    image: {
      type: String,
      default: '',
    },
    customization: {
      size: { type: String, default: '' },
      spiceLevel: { type: String, default: '' },
      extras: { type: [String], default: [] },
      dietary: { type: [String], default: [] },
      specialInstructions: { type: String, default: '' },
    },
  },
  { _id: true }
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customer: {
      name: { type: String, required: true, trim: true, default: 'Customer' },
      phone: { type: String, default: '+1 (555) 000-0000' },
      email: { type: String, default: 'customer@example.com' },
      deliveryAddress: { type: String, default: 'Dine-In / Standard Delivery' },
      customerType: {
        type: String,
        enum: ['New', 'Returning', 'VIP'],
        default: 'New',
      },
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(val: IOrderItem[]) => val.length > 0, 'Order must contain at least one item'],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['new', 'preparing', 'confirmed', 'delivered', 'cancelled'],
      default: 'new',
      index: true,
    },
    paymentMethod: {
      type: String,
      default: 'Credit Card',
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending'],
      default: 'Paid',
    },
    placedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const OrderModel = mongoose.model<IOrder>('Order', orderSchema);
export default OrderModel;

