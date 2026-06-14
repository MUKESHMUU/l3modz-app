import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order, { IOrder } from '@/models/Order';
import { refreshTracking, shouldAutoRefreshTracking, shouldRetryShipment, shouldRetryTracking, syncOrderToShiprocket } from '@/lib/orderFulfillment';
import { sendOrderBillNotifications, sendOrderPaidNotifications, sendOrderShipmentNotifications } from '@/lib/notifications';
import { createLogger } from '@/lib/logger';
import { acquireCronLock, releaseCronLock } from '@/lib/cronLock';
import { validateProductionEnv } from '@/lib/env';

const logger = createLogger('cron-shiprocket-sync');
const BATCH_LIMIT = 12;
const ACTIVE_STATUSES: Array<IOrder['status']> = ['Confirmed', 'Shipped'];
const LOCK_ID = 'shiprocket-sync';

function isAuthorized(req: Request) {
  const secret = String(process.env.CRON_SECRET || '').trim();
  const authorization = String(req.headers.get('authorization') || '').trim();
  if (!secret) return false;
  return authorization === `Bearer ${secret}`;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(req: Request) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    if (process.env.NODE_ENV === 'production') {
      validateProductionEnv();
    }

    if (!isAuthorized(req)) {
      logger.warn('cron_unauthorized', { requestId, hasAuthorization: Boolean(req.headers.get('authorization')) });
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const lock = await acquireCronLock(LOCK_ID, requestId, 10 * 60 * 1000);
    if (!lock.acquired) {
      logger.warn('cron_locked', { requestId, reason: lock.reason });
      return NextResponse.json({ message: 'Sync already running' }, { status: 409 });
    }

    const candidates = await Order.find({
      status: { $in: ACTIVE_STATUSES },
    }).sort({ updatedAt: -1 }).limit(100);
    const eligible = candidates.filter((order: any) => shouldAutoRefreshTracking(order, 45) || shouldRetryTracking(order) || shouldRetryShipment(order));
    const batch = eligible.slice(0, BATCH_LIMIT);

    const summary = {
      checked: eligible.length,
      processed: 0,
      trackingSynced: 0,
      shipmentRetried: 0,
      notificationRetried: 0,
      failed: 0,
    };

    logger.info('cron_started', { requestId, eligible: eligible.length, batch: batch.length, batchLimit: BATCH_LIMIT });

    for (const order of batch) {
      summary.processed += 1;

      if (shouldRetryShipment(order as any)) {
        const result = await syncOrderToShiprocket(order as any);
        if (result.ok) summary.shipmentRetried += 1;
        else summary.failed += 1;
        await order.save();
        await sleep(250);
        continue;
      }

      if (shouldRetryTracking(order as any) || shouldAutoRefreshTracking(order as any, 30)) {
        const result = await refreshTracking(order as any);
        if (result.ok) summary.trackingSynced += 1;
        else summary.failed += 1;
        await order.save();
        await sleep(250);
        continue;
      }

      const notificationError = String(order.notificationRetryError || '');
      if (order.notificationRetryAttempts && order.notificationRetryNextAt && new Date(order.notificationRetryNextAt).getTime() <= Date.now()) {
        if (notificationError.startsWith('bill_notifications_failed')) {
          await sendOrderBillNotifications(order as any);
        } else if (notificationError.startsWith('payment_notifications_failed')) {
          await sendOrderPaidNotifications(order as any);
        } else {
          await sendOrderShipmentNotifications(order as any);
        }
        order.notificationRetryAttempts = 0;
        order.notificationRetryError = '';
        order.notificationRetryNextAt = null as any;
        await order.save();
        summary.notificationRetried += 1;
        await sleep(150);
        continue;
      }

      if (!order.shippingNotificationSentAt && (order.AWB_number || order.tracking_url || order.shipment_id)) {
        await sendOrderShipmentNotifications(order as any);
        order.shippingNotificationSentAt = new Date();
        await order.save();
        summary.notificationRetried += 1;
        await sleep(150);
      }
    }

    logger.info('cron_completed', { requestId, ...summary });
    await releaseCronLock(LOCK_ID, requestId);
    return NextResponse.json({ message: 'Shiprocket sync completed', ...summary });
  } catch (error: any) {
    logger.error('cron_failed', { error: error?.message || String(error) });
    try {
      await releaseCronLock(LOCK_ID, requestId);
    } catch {
      // Ignore release errors; lock expiry is the final backstop.
    }
    return NextResponse.json({ message: 'Failed to sync Shiprocket orders' }, { status: 500 });
  }
}
