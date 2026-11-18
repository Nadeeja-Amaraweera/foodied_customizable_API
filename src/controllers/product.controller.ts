import { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  ProductModel,
  CATEGORY_VALUES,
  IProductCustomization,
  ProductCategory
} from '../models/admin.product';
import { uploadImage, deleteImage } from '../service/upload.service';


// Safely parse and sanitize product customization from FormData or JSON
function parseCustomization(raw: any): IProductCustomization {
  if (!raw) {
    return { sizes: [], extras: [], spiceLevels: [] };
  }
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { sizes: [], extras: [], spiceLevels: [] };
    }
  }

  return {
    sizes: Array.isArray(parsed?.sizes)
      ? parsed.sizes
        .map((s: any) => ({
          name: String(s.name || '').trim(),
          priceModifier: Math.max(0, Number(s.priceModifier) || 0),
        }))
        .filter((s: any) => s.name.length > 0)
      : [],
    extras: Array.isArray(parsed?.extras)
      ? parsed.extras
        .map((e: any) => ({
          name: String(e.name || '').trim(),
          priceModifier: Math.max(0, Number(e.priceModifier) || 0),
        }))
        .filter((e: any) => e.name.length > 0)
      : [],
    spiceLevels: Array.isArray(parsed?.spiceLevels)
      ? parsed.spiceLevels
        .map((sp: any) => String(sp || '').trim())
        .filter((sp: string) => sp.length > 0)
      : [],
  };
}


// Create a new product with image upload
export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, category, price, description, preparationTime } = req.body;

    // Validate required text fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Product name is required' });
    }

    if (!category || !CATEGORY_VALUES.includes(category as ProductCategory)) {
      return res.status(400).json({
        message: `Invalid category. Must be one of: ${CATEGORY_VALUES.join(', ')}`,
      });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: 'Price must be a valid non-negative number' });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ message: 'Product description is required' });
    }

    if (!preparationTime || typeof preparationTime !== 'string' || !preparationTime.trim()) {
      return res.status(400).json({ message: 'Preparation time is required' });
    }

    // Validate image file or image URL
    let imageUrl = '';
    if (req.file) {
      imageUrl = await uploadImage(req.file);
    } else if (req.body.image && typeof req.body.image === 'string' && req.body.image.trim()) {
      imageUrl = req.body.image.trim();
    } else {
      return res.status(400).json({ message: 'Product image file or image URL is required' });
    }

    // Customization
    const customization = parseCustomization(req.body.customization);

    // Availability
    const isAvailable =
      req.body.isAvailable !== undefined
        ? req.body.isAvailable === true || req.body.isAvailable === 'true'
        : true;

    const newProduct = await ProductModel.create({
      name: name.trim(),
      category: category as ProductCategory,
      price: parsedPrice,
      description: description.trim(),
      image: imageUrl,
      isAvailable,
      preparationTime: preparationTime.trim(),
      rating: 5.0,
      customization,
    });

    return res.status(201).json({
      message: 'Product created successfully',
      data: newProduct,
    });
  } catch (error: any) {
    console.error('[createProduct] Error:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error while creating product',
    });
  }
};


// Retrieve all products with optional category and search filters
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;
    const filter: Record<string, any> = {};

    if (category && category !== 'All' && typeof category === 'string') {
      filter.category = category;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    const products = await ProductModel.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      message: 'Products retrieved successfully',
      data: products,
      total: products.length,
    });
  } catch (error: any) {
    console.error('[getAllProducts] Error:', error);
    return res.status(500).json({
      message: 'Failed to retrieve products',
    });
  }
};


// Retrieve a single product by ID
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const product = await ProductModel.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json({
      message: 'Product retrieved successfully',
      data: product,
    });
  } catch (error: any) {
    console.error('[getProductById] Error:', error);
    return res.status(500).json({
      message: 'Failed to retrieve product',
    });
  }
};


// Update product details & optional image replacement
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const existingProduct = await ProductModel.findById(id);
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const { name, category, price, description, preparationTime } = req.body;

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'Product name cannot be empty' });
      }
      existingProduct.name = name.trim();
    }

    if (category !== undefined) {
      if (!CATEGORY_VALUES.includes(category as ProductCategory)) {
        return res.status(400).json({
          message: `Invalid category. Must be one of: ${CATEGORY_VALUES.join(', ')}`,
        });
      }
      existingProduct.category = category as ProductCategory;
    }

    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ message: 'Price must be a valid non-negative number' });
      }
      existingProduct.price = parsedPrice;
    }

    if (description !== undefined) {
      if (!description || typeof description !== 'string' || !description.trim()) {
        return res.status(400).json({ message: 'Description cannot be empty' });
      }
      existingProduct.description = description.trim();
    }

    if (preparationTime !== undefined) {
      if (!preparationTime || typeof preparationTime !== 'string' || !preparationTime.trim()) {
        return res.status(400).json({ message: 'Preparation time cannot be empty' });
      }
      existingProduct.preparationTime = preparationTime.trim();
    }

    if (req.body.isAvailable !== undefined) {
      existingProduct.isAvailable =
        req.body.isAvailable === true || req.body.isAvailable === 'true';
    }

    if (req.body.customization !== undefined) {
      existingProduct.customization = parseCustomization(req.body.customization);
    }

    // Handle image replacement if a new file is uploaded
    if (req.file) {
      const oldImage = existingProduct.image;
      const newImageUrl = await uploadImage(req.file);
      existingProduct.image = newImageUrl;

      // Clean up the replaced old image from storage asynchronously
      if (oldImage && oldImage !== newImageUrl) {
        deleteImage(oldImage).catch((err) =>
          console.warn('[updateProduct] Failed to cleanup old image:', err)
        );
      }
    }

    const updatedProduct = await existingProduct.save();

    return res.status(200).json({
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error: any) {
    console.error('[updateProduct] Error:', error);
    return res.status(500).json({
      message: error.message || 'Failed to update product',
    });
  }
};


// Toggle or set availability
export const updateProductAvailability = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const product = await ProductModel.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (req.body.isAvailable !== undefined) {
      product.isAvailable =
        req.body.isAvailable === true || req.body.isAvailable === 'true';
    } else {
      product.isAvailable = !product.isAvailable;
    }

    const saved = await product.save();

    return res.status(200).json({
      message: `Product is now ${saved.isAvailable ? 'available (In Stock)' : 'unavailable'}`,
      data: saved,
    });
  } catch (error: any) {
    console.error('[updateProductAvailability] Error:', error);
    return res.status(500).json({
      message: 'Failed to update product availability',
    });
  }
};


// Delete product and clean up image
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const product = await ProductModel.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Clean up image from Supabase Storage
    if (product.image) {
      deleteImage(product.image).catch((err) =>
        console.warn('[deleteProduct] Failed to delete image from Supabase:', err)
      );
    }

    await ProductModel.findByIdAndDelete(id);

    return res.status(200).json({
      message: 'Product deleted successfully',
      data: { id },
    });
  } catch (error: any) {
    console.error('[deleteProduct] Error:', error);
    return res.status(500).json({
      message: 'Failed to delete product',
    });
  }
};
