import mongoose from 'mongoose';
import { validateProductionEnv, requireEnv } from './env';

validateProductionEnv();

const MONGODB_URI = requireEnv('MONGODB_URI');

let cached = (global as any).mongoose;
let shipmentFieldSafetyChecked = false;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const isDev = process.env.NODE_ENV !== 'production';
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      tls: true,
      ...(isDev
        ? {
            // Local Windows/OpenSSL setups can fail TLS validation for Atlas cert chains.
            // Keep this fallback development-only.
            tlsAllowInvalidCertificates: true,
            tlsAllowInvalidHostnames: true,
          }
        : {}),
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('MongoDB connected successfully');
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  if (!shipmentFieldSafetyChecked) {
    shipmentFieldSafetyChecked = true;
    try {
      const { default: Order } = await import('@/models/Order');
      const missingCount = await Order.countDocuments({
        $or: [
          { shiprocketTrackingHistory: { $exists: false } },
          { shiprocketWebhookEventIds: { $exists: false } },
          { shiprocketShipmentCreatedAt: { $exists: false } },
          { shiprocketPickupRequestedAt: { $exists: false } },
          { shiprocketShipmentUpdatedAt: { $exists: false } },
          { shippingNotificationSentAt: { $exists: false } },
          { shiprocketSyncError: { $exists: false } },
          { shiprocketSyncAttempts: { $exists: false } },
          { shipmentCreationRetryAttempts: { $exists: false } },
          { trackingSyncRetryAttempts: { $exists: false } },
          { notificationRetryAttempts: { $exists: false } },
        ],
      });

      if (missingCount > 0) {
        console.warn('[MongoDB] Shipment migration safety check found orders missing new shipment fields', {
          missingCount,
          checkedAt: new Date().toISOString(),
        });
      } else {
        console.info('[MongoDB] Shipment migration safety check passed', {
          checkedAt: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      console.warn('[MongoDB] Shipment migration safety check skipped', {
        message: error?.message || String(error),
      });
    }
  }

  return cached.conn;
}

export default dbConnect;
