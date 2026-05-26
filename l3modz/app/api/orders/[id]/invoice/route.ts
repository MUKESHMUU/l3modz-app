import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { checkAdmin, getUserFromToken } from '@/lib/checkAuth';
import { generateInvoicePdfBuffer } from '@/lib/invoice';
import { createLogger } from '@/lib/logger';

const logger = createLogger('invoice-api');

function isValidLookup(value: string) {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isValidLookup(id)) {
      return NextResponse.json({ message: 'Invalid order reference' }, { status: 400 });
    }

    await dbConnect();
    const isAdmin = await checkAdmin();
    const user = await getUserFromToken();
    const requestUrl = new URL(_.url);
    const guestEmail = String(requestUrl.searchParams.get('email') || '').trim().toLowerCase();
    const guestPhone = String(requestUrl.searchParams.get('phone') || '').replace(/\D/g, '').trim();
    const order = await Order.findById(id).populate('user', 'name email phone');

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const ownerId = order.user && typeof order.user === 'object' && '_id' in order.user ? String(order.user._id) : String(order.user || '');
    const guestInfo = order.guestInfo || null;
    const guestEmailMatches = Boolean(guestInfo?.email && guestEmail && String(guestInfo.email).trim().toLowerCase() === guestEmail);
    const guestPhoneMatches = Boolean(guestInfo?.phone && guestPhone && String(guestInfo.phone).replace(/\D/g, '').trim() === guestPhone);

    if (!isAdmin) {
      if (user) {
        if (ownerId !== String(user._id)) {
          return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
      } else if (ownerId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      } else if (!guestEmailMatches && !guestPhoneMatches) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
    }

    const invoiceNumber = order.invoiceNumber || `INV-${String(order._id).slice(-8).toUpperCase()}`;
    order.invoiceNumber = invoiceNumber;
    const pdf = await generateInvoicePdfBuffer(order as any, { invoiceNumber });

    logger.info('invoice_generated', {
      orderId: String(order._id),
      invoiceNumber,
      admin: isAdmin,
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoiceNumber}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    logger.error('invoice_generation_failed', {
      error: error?.message || String(error),
    });
    return NextResponse.json({ message: 'Failed to generate invoice' }, { status: 500 });
  }
}
