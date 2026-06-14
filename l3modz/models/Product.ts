import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  title: string;
  slug: string;
  price: number;
  originalPrice?: number;
  images: string[];
  categoryId?: mongoose.Types.ObjectId | string | null;
  description: string;
  features: string[]; // e.g. ["Direct Fit", "CNC Metal", "Weatherproof"]
  specs: {
    sku: string;
    material: string;
    installation: string;
  };
  compatibility: {
    brand: string;
    model: string;
    year: string;
  }[];
  rating: number;
  numReviews: number;
  inStock: boolean;
  stock?: number; // Quantity in stock
}

const productSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    images: { type: [String], required: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    description: { type: String, required: true },
    features: { type: [String], default: [] },
    specs: {
      sku: { type: String },
      material: { type: String },
      installation: { type: String },
    },
    compatibility: [
      {
        brand: { type: String },
        model: { type: String },
        year: { type: String },
      },
    ],
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    inStock: { type: Boolean, default: true },
    stock: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>('Product', productSchema);
export default Product;
