import mongoose, { Schema, Document, Model } from 'mongoose';
import { IProduct } from './Product';
import { IUser } from './User';

export interface IOrderItem {
  product: mongoose.Types.ObjectId | IProduct;
  name: string;
  quantity: number;
  image: string;
  price: number;
}

export interface IOrder extends Document {
  createdAt?: Date;
  updatedAt?: Date;
  user?: mongoose.Types.ObjectId | IUser; // optional for guest checkout
  guestInfo?: {
    name: string;
    email: string;
    phone: string;
  };
  orderItems: IOrderItem[];
  shippingAddress: {
    addressLine1: string;
    addressLine2?: string;
    landmark: string;
    locality: string;
    street?: string;
    city: string;
    state: string;
    pincode: string;
  };
  paymentMethod: 'Razorpay' | 'COD';
  paymentResult?: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    status: string;
  };
  totalPrice: number;
  isPaid: boolean;
  paidAt?: Date;
  invoiceNumber?: string;
  billSentAt?: Date;
  status: 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';
  deliveredAt?: Date;
  packageWeightKg?: number;
  packageLengthCm?: number;
  packageBreadthCm?: number;
  packageHeightCm?: number;
  deliveryPartner?: 'Shiprocket' | 'India Post' | 'Other';
  shipment_id?: string;
  shiprocket_order_id?: string;
  courier_name?: string;
  AWB_number?: string;
  tracking_url?: string;
  delivery_status?: string;
  estimated_delivery?: Date;
  shipping_label_url?: string;
  shiprocketShipmentCreatedAt?: Date;
  shiprocketPickupRequestedAt?: Date;
  shiprocketShipmentUpdatedAt?: Date;
  shippingNotificationSentAt?: Date;
  return_shipment_status?: string;
  return_shipment_id?: string;
  return_awb_number?: string;
  return_tracking_url?: string;
  shiprocketTrackingHistory?: Array<{
    at: Date;
    status: string;
    message?: string;
    trackingUrl?: string;
    awb?: string;
    shipmentId?: string;
    source?: string;
  }>;
  shiprocketWebhookEventIds?: string[];
  shiprocketLastSyncAt?: Date;
  shiprocketSyncAttempts?: number;
  shiprocketSyncError?: string;
}

const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    guestInfo: {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
    },
    orderItems: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],
    shippingAddress: {
      addressLine1: { type: String, required: true },
      addressLine2: { type: String },
      landmark: { type: String, required: true },
      locality: { type: String, required: true },
      street: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    paymentMethod: { type: String, required: true, enum: ['Razorpay', 'COD'] },
    paymentResult: {
      razorpay_order_id: { type: String },
      razorpay_payment_id: { type: String },
      razorpay_signature: { type: String },
      status: { type: String },
    },
    totalPrice: { type: Number, required: true, default: 0.0 },
    isPaid: { type: Boolean, required: true, default: false },
    paidAt: { type: Date },
    invoiceNumber: { type: String },
    billSentAt: { type: Date },
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    deliveredAt: { type: Date },
    packageWeightKg: { type: Number },
    packageLengthCm: { type: Number },
    packageBreadthCm: { type: Number },
    packageHeightCm: { type: Number },
    deliveryPartner: { type: String, enum: ['Shiprocket', 'India Post', 'Other'], default: 'Shiprocket' },
    shipment_id: { type: String },
    shiprocket_order_id: { type: String },
    courier_name: { type: String },
    AWB_number: { type: String },
    tracking_url: { type: String },
    delivery_status: { type: String, default: 'pending_sync' },
    estimated_delivery: { type: Date },
    shipping_label_url: { type: String, default: '' },
    shiprocketShipmentCreatedAt: { type: Date, default: null },
    shiprocketPickupRequestedAt: { type: Date, default: null },
    shiprocketShipmentUpdatedAt: { type: Date, default: null },
    shippingNotificationSentAt: { type: Date, default: null },
    return_shipment_status: { type: String, default: '' },
    return_shipment_id: { type: String },
    return_awb_number: { type: String },
    return_tracking_url: { type: String },
    shiprocketTrackingHistory: {
      type: [
        {
          at: { type: Date, required: true },
          status: { type: String, required: true },
          message: { type: String },
          trackingUrl: { type: String },
          awb: { type: String },
          shipmentId: { type: String },
          source: { type: String },
        },
      ],
      default: [],
    },
    shiprocketWebhookEventIds: { type: [String], default: [] },
    shiprocketLastSyncAt: { type: Date, default: null },
    shiprocketSyncAttempts: { type: Number, default: 0 },
    shiprocketSyncError: { type: String, default: '' },
  },
  { timestamps: true }
);

const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', orderSchema);
export default Order;
