import mongoose from 'mongoose';
import { requireEnv } from './env';
import { createLogger } from './logger';

const logger = createLogger('mongodb');

function getMongoUri() {
  return requireEnv('MONGODB_URI');
}

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

    const uri = getMongoUri();
    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      logger.info('mongodb_connected');
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
        logger.warn('shipment_migration_fields_missing', {
          missingCount,
          checkedAt: new Date().toISOString(),
        });
      } else {
        logger.info('shipment_migration_fields_ok', {
          checkedAt: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.warn('shipment_migration_check_skipped', {
        message: error?.message || String(error),
      });
    }
  }

  return cached.conn;
}

export default dbConnect;
