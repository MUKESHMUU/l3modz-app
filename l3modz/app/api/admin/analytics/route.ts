import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { checkAdmin } from '@/lib/checkAuth';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';

export const runtime = 'nodejs';

function dateRange(request: Request) {
  const url = new URL(request.url);
  const end = url.searchParams.get('to') ? new Date(`${url.searchParams.get('to')}T23:59:59.999Z`) : new Date();
  const start = url.searchParams.get('from')
    ? new Date(`${url.searchParams.get('from')}T00:00:00.000Z`)
    : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
  return { start, end };
}

const paidRevenueMatch = {
  isPaid: true,
  status: { $ne: 'Cancelled' },
};

export async function GET(request: Request) {
  try {
    if (!(await checkAdmin())) return NextResponse.json({ message: 'Unauthorized, admin only' }, { status: 401 });
    await dbConnect();
    const { start, end } = dateRange(request);
    const range = { createdAt: { $gte: start, $lte: end } };

    const [orderStats, paymentStats, status, trend, topProducts, categoryPerformance, registrations, products, users] =
      await Promise.all([
        Order.aggregate([
          { $match: range },
          { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: { $cond: [{ $and: [{ $eq: ['$isPaid', true] }, { $ne: ['$status', 'Cancelled'] }] }, '$totalPrice', 0] } }, paidOrders: { $sum: { $cond: [{ $eq: ['$isPaid', true] }, 1, 0] } }, pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } } } },
        ]),
        Order.aggregate([{ $match: range }, { $group: { _id: '$paymentResult.status', count: { $sum: 1 } } }]),
        Order.aggregate([{ $match: range }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        Order.aggregate([
          { $match: range },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, orders: { $sum: 1 }, revenue: { $sum: { $cond: [{ $and: [{ $eq: ['$isPaid', true] }, { $ne: ['$status', 'Cancelled'] }] }, '$totalPrice', 0] } } } },
          { $sort: { _id: 1 } },
        ]),
        Order.aggregate([
          { $match: range },
          { $unwind: '$orderItems' },
          { $group: { _id: '$orderItems.name', quantity: { $sum: '$orderItems.quantity' }, revenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.quantity'] } } } },
          { $sort: { quantity: -1 } },
          { $limit: 10 },
        ]),
        Order.aggregate([
          { $match: range },
          { $unwind: '$orderItems' },
          { $lookup: { from: 'products', localField: 'orderItems.product', foreignField: '_id', as: 'product' } },
          { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
          { $lookup: { from: 'categories', localField: 'product.categoryId', foreignField: '_id', as: 'category' } },
          { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
          { $group: { _id: { $ifNull: ['$category.name', 'Uncategorized'] }, quantity: { $sum: '$orderItems.quantity' }, revenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.quantity'] } } } },
          { $sort: { revenue: -1 } },
        ]),
        User.aggregate([{ $match: { createdAt: { $gte: start, $lte: end } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, users: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
        Product.countDocuments({ inStock: true }),
        User.countDocuments(),
      ]);

    return NextResponse.json({
      range: { from: start.toISOString(), to: end.toISOString() },
      definition: 'Revenue is the totalPrice of paid, non-cancelled orders. Cancelled and unpaid orders are excluded.',
      metrics: { ...(orderStats[0] || { orders: 0, revenue: 0, paidOrders: 0, pending: 0 }), activeProducts: products, outOfStockProducts: await Product.countDocuments({ $or: [{ inStock: false }, { stock: { $lte: 0 } }] }), users },
      trend,
      status,
      payments: paymentStats,
      topProducts,
      categoryPerformance,
      registrations,
    });
  } catch {
    return NextResponse.json({ message: 'Failed to load analytics' }, { status: 500 });
  }
}
