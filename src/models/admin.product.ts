import mongoose from 'mongoose';

export const CATEGORY_VALUES = [
  'Pizza',
  'Burger',
  'Bowls & Salads',
  'Pasta',
  'Desserts',
  'Beverages',
] as const;

export type ProductCategory = (typeof CATEGORY_VALUES)[number];

export interface ICustomizationOption {
  name: string;
  priceModifier: number;
}

export interface IProductCustomization {
  sizes: ICustomizationOption[];
  extras: ICustomizationOption[];
  spiceLevels: string[];
}

export interface IProduct {
  name: string;
  category: ProductCategory;
  price: number;
  description: string;
  image: string;
  isAvailable: boolean;
  preparationTime: string;
  rating: number;
  customization: IProductCustomization;
  createdAt?: Date;
  updatedAt?: Date;
}

const customizationOptionSchema = new mongoose.Schema<ICustomizationOption>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    priceModifier: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);

const productCustomizationSchema = new mongoose.Schema<IProductCustomization>(
  {
    sizes: {
      type: [customizationOptionSchema],
      default: [],
    },
    extras: {
      type: [customizationOptionSchema],
      default: [],
    },
    spiceLevels: {
      type: [
        {
          type: String,
          trim: true,
          minlength: 1,
        },
      ],
      default: [],
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    category: {
      type: String,
      required: true,
      enum: CATEGORY_VALUES,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    preparationTime: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    customization: {
      type: productCustomizationSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ name: 'text', description: 'text' });

export const ProductModel = mongoose.model<IProduct>("product", productSchema);
