import mongoose from 'mongoose';
import { ProductModel, IProduct } from '../models/admin.product';

export interface ItemCustomizationInput {
  size?: string;
  extras?: string[];
  spiceLevel?: string;
  dietary?: string[];
  specialInstructions?: string;
}

export interface ValidateItemInput {
  productId: string;
  quantity: number;
  customization?: ItemCustomizationInput;
  unitPrice?: number;
  totalPrice?: number;
}

export interface ValidatedItemResult {
  productId: mongoose.Types.ObjectId;
  name: string;
  image: string;
  quantity: number;
  basePrice: number;
  sizePriceModifier: number;
  extrasPriceModifier: number;
  unitPrice: number;
  totalPrice: number;
  customization: {
    size: string;
    spiceLevel: string;
    extras: string[];
    dietary: string[];
    specialInstructions: string;
  };
}

export interface OrderValidationResult {
  isValid: boolean;
  validatedItems: ValidatedItemResult[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  totalAmount: number;
  errorMessage?: string;
}

/**
 * Normalizes extra name by trimming and stripping any parenthetical price text
 * e.g., "Extra Cheddar Cheese (+$1.50)" -> "Extra Cheddar Cheese"
 */
export const normalizeOptionName = (name: string): string => {
  return name.replace(/\s*\(\+\$[\d.]+\)$/i, '').trim();
};

/**
 * Validates a single customized item against real product and customization data in MongoDB
 */
export async function validateProductCustomization(
  item: ValidateItemInput
): Promise<{ isValid: boolean; item?: ValidatedItemResult; errorMessage?: string }> {
  const { productId, quantity, customization, unitPrice: submittedUnitPrice, totalPrice: submittedTotalPrice } = item;

  // 1. Validate Product ID
  if (!productId || typeof productId !== 'string' || !mongoose.Types.ObjectId.isValid(productId)) {
    return { isValid: false, errorMessage: `Invalid or missing product ID: ${productId}` };
  }

  // 2. Validate Quantity
  const qty = Math.floor(Number(quantity));
  if (!qty || qty < 1) {
    return { isValid: false, errorMessage: 'Item quantity must be a positive integer (minimum 1)' };
  }

  // 3. Fetch product from MongoDB
  const product = await ProductModel.findById(productId);
  if (!product) {
    return { isValid: false, errorMessage: `Product not found with ID: ${productId}` };
  }

  // 4. Verify product is available
  if (!product.isAvailable) {
    return {
      isValid: false,
      errorMessage: `Product "${product.name}" is currently unavailable and cannot be ordered.`,
    };
  }

  const basePrice = Number(product.price);
  let sizePriceModifier = 0;
  let selectedSizeName = '';

  const productSizes = product.customization?.sizes || [];
  const requestedSize = (customization?.size || '').trim();

  // 5. Validate Size Option
  if (productSizes.length > 0) {
    if (requestedSize) {
      const matchedSize = productSizes.find(
        (s) => s.name.trim().toLowerCase() === requestedSize.toLowerCase()
      );
      if (!matchedSize) {
        return {
          isValid: false,
          errorMessage: `Invalid size "${requestedSize}" for product "${product.name}". Available sizes: ${productSizes
            .map((s) => s.name)
            .join(', ')}`,
        };
      }
      sizePriceModifier = Number(matchedSize.priceModifier) || 0;
      selectedSizeName = matchedSize.name;
    } else {
      // Default to first size if none requested
      const defaultSize = productSizes[0];
      sizePriceModifier = Number(defaultSize.priceModifier) || 0;
      selectedSizeName = defaultSize.name;
    }
  } else {
    // If product has no defined sizes, accept default / standard
    selectedSizeName = requestedSize || 'Regular';
    sizePriceModifier = 0;
  }

  // 6. Validate Extras / Add-on Options
  let extrasPriceModifier = 0;
  const validatedExtrasNames: string[] = [];
  const productExtras = product.customization?.extras || [];
  const requestedExtras = customization?.extras || [];

  // Prevent duplicate extras in payload
  const uniqueRequestedExtras = Array.from(new Set(requestedExtras.map((e) => normalizeOptionName(e))));

  for (const rawExtra of uniqueRequestedExtras) {
    if (!rawExtra) continue;
    const matchedExtra = productExtras.find(
      (pe) => pe.name.trim().toLowerCase() === rawExtra.toLowerCase()
    );

    if (!matchedExtra) {
      return {
        isValid: false,
        errorMessage: `Invalid extra topping "${rawExtra}" for product "${product.name}". It is not an available option for this dish.`,
      };
    }

    extrasPriceModifier += Number(matchedExtra.priceModifier) || 0;
    validatedExtrasNames.push(matchedExtra.name);
  }

  // 7. Validate Spice Level (if applicable)
  const productSpiceLevels = product.customization?.spiceLevels || [];
  let selectedSpiceLevel = (customization?.spiceLevel || '').trim();
  if (productSpiceLevels.length > 0 && selectedSpiceLevel) {
    const matchedSpice = productSpiceLevels.find(
      (sp) => sp.trim().toLowerCase() === selectedSpiceLevel.toLowerCase()
    );
    if (matchedSpice) {
      selectedSpiceLevel = matchedSpice;
    }
  }

  // 8. Calculate trusted price from database records
  const trustedUnitPrice = Number((basePrice + sizePriceModifier + extrasPriceModifier).toFixed(2));
  const trustedTotalPrice = Number((trustedUnitPrice * qty).toFixed(2));

  // 9. Compare frontend submitted prices with backend-calculated price
  if (submittedUnitPrice !== undefined && submittedUnitPrice !== null) {
    const unitPriceDiff = Math.abs(Number(submittedUnitPrice) - trustedUnitPrice);
    if (unitPriceDiff > 0.02) {
      return {
        isValid: false,
        errorMessage: `Price mismatch for "${product.name}". Submitted unit price $${Number(
          submittedUnitPrice
        ).toFixed(2)} does not match verified server price $${trustedUnitPrice.toFixed(
          2
        )}. (Base: $${basePrice.toFixed(2)}, Size modifier: +$${sizePriceModifier.toFixed(
          2
        )}, Extras modifier: +$${extrasPriceModifier.toFixed(2)})`,
      };
    }
  }

  if (submittedTotalPrice !== undefined && submittedTotalPrice !== null) {
    const totalPriceDiff = Math.abs(Number(submittedTotalPrice) - trustedTotalPrice);
    if (totalPriceDiff > 0.02) {
      return {
        isValid: false,
        errorMessage: `Total price mismatch for "${product.name}". Submitted total price $${Number(
          submittedTotalPrice
        ).toFixed(2)} does not match server total $${trustedTotalPrice.toFixed(2)}.`,
      };
    }
  }

  return {
    isValid: true,
    item: {
      productId: product._id as mongoose.Types.ObjectId,
      name: product.name,
      image: product.image,
      quantity: qty,
      basePrice,
      sizePriceModifier,
      extrasPriceModifier,
      unitPrice: trustedUnitPrice,
      totalPrice: trustedTotalPrice,
      customization: {
        size: selectedSizeName,
        spiceLevel: selectedSpiceLevel,
        extras: validatedExtrasNames,
        dietary: customization?.dietary || [],
        specialInstructions: customization?.specialInstructions || '',
      },
    },
  };
}

/**
 * Validates a complete order containing one or multiple items
 */
export async function validateOrderItems(
  items: ValidateItemInput[],
  submittedSubtotal?: number,
  submittedTotalAmount?: number
): Promise<OrderValidationResult> {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return {
      isValid: false,
      validatedItems: [],
      subtotal: 0,
      deliveryFee: 0,
      tax: 0,
      totalAmount: 0,
      errorMessage: 'Order must contain at least one item.',
    };
  }

  const validatedItems: ValidatedItemResult[] = [];

  for (let i = 0; i < items.length; i++) {
    const result = await validateProductCustomization(items[i]);
    if (!result.isValid || !result.item) {
      return {
        isValid: false,
        validatedItems: [],
        subtotal: 0,
        deliveryFee: 0,
        tax: 0,
        totalAmount: 0,
        errorMessage: `Item #${i + 1}: ${result.errorMessage || 'Invalid item'}`,
      };
    }
    validatedItems.push(result.item);
  }

  // Calculate trusted subtotal
  const trustedSubtotal = Number(
    validatedItems.reduce((acc, it) => acc + it.totalPrice, 0).toFixed(2)
  );

  const deliveryFee = 0; // Free express delivery as configured on the site
  const tax = 0;
  const trustedTotalAmount = Number((trustedSubtotal + deliveryFee + tax).toFixed(2));

  // Validate submitted subtotal if provided
  if (submittedSubtotal !== undefined && submittedSubtotal !== null) {
    if (Math.abs(Number(submittedSubtotal) - trustedSubtotal) > 0.05) {
      return {
        isValid: false,
        validatedItems,
        subtotal: trustedSubtotal,
        deliveryFee,
        tax,
        totalAmount: trustedTotalAmount,
        errorMessage: `Subtotal mismatch. Submitted: $${Number(submittedSubtotal).toFixed(
          2
        )}, Calculated: $${trustedSubtotal.toFixed(2)}.`,
      };
    }
  }

  // Validate submitted total amount if provided
  if (submittedTotalAmount !== undefined && submittedTotalAmount !== null) {
    if (Math.abs(Number(submittedTotalAmount) - trustedTotalAmount) > 0.05) {
      return {
        isValid: false,
        validatedItems,
        subtotal: trustedSubtotal,
        deliveryFee,
        tax,
        totalAmount: trustedTotalAmount,
        errorMessage: `Total amount mismatch. Submitted: $${Number(submittedTotalAmount).toFixed(
          2
        )}, Calculated: $${trustedTotalAmount.toFixed(2)}.`,
      };
    }
  }

  return {
    isValid: true,
    validatedItems,
    subtotal: trustedSubtotal,
    deliveryFee,
    tax,
    totalAmount: trustedTotalAmount,
  };
}

