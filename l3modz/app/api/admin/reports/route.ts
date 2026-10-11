import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { checkAdmin } from '@/lib/checkAuth';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import Category from '@/models/Category';

export const runtime = 'nodejs';

function csvCell(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  try {
    if (!(await checkAdmin())) return NextResponse.json({ message: 'Unauthorized, admin only' }, { status: 401 });
    await dbConnect();
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'orders';
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const match = from || to ? { createdAt: { ...(from ? { $gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { $lte: new Date(`${to}T23:59:59.999Z`) } : {}) } } : {};

    let headers: string[] = [];
    let rows: unknown[][] = [];
    if (type === 'orders' || type === 'sales' || type === 'payments') {
      const records = await Order.find(match).populate('user', 'name email').sort({ createdAt: -1 }).lean();
      headers = ['Order ID', 'Created', 'Customer', 'Email', 'Status', 'Payment method', 'Payment verified', 'Total', 'Courier', 'Tracking'];
      rows = records.map((order: any) => [order._id, order.createdAt, order.user?.name || order.guestInfo?.name, order.user?.email || order.guestInfo?.email, order.status, order.paymentMethod, order.isPaid ? 'Yes' : 'No', order.totalPrice, order.courier_name || order.deliveryPartner, order.tracking_url]);
    } else if (type === 'products' || type === 'inventory') {
      const records = await Product.find({}).populate('categoryId', 'name').sort({ title: 1 }).lean();
      headers = ['Product ID', 'Title', 'SKU', 'Category', 'Price', 'Stock', 'In stock', 'Images'];
      rows = records.map((product: any) => [product._id, product.title, product.specs?.sku, product.categoryId?.name, product.price, product.stock || 0, product.inStock ? 'Yes' : 'No', (product.images || []).length]);
    } else if (type === 'users') {
      const records = await User.find(match).select('_id name email phone role createdAt').sort({ createdAt: -1 }).lean();
      headers = ['User ID', 'Name', 'Email', 'Phone', 'Role', 'Registered'];
      rows = records.map((user: any) => [user._id, user.name, user.email, user.phone, user.role, user.createdAt]);
    } else if (type === 'categories') {
      const records = await Category.find({}).sort({ name: 1 }).lean();
      headers = ['Category ID', 'Name', 'Slug', 'Description', 'Created'];
      rows = records.map((category: any) => [category._id, category.name, category.slug, category.description, category.createdAt]);
    } else {
      return NextResponse.json({ message: 'Unsupported report type' }, { status: 400 });
    }

    const body = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="l3modz-${type}-report-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ message: 'Failed to generate report' }, { status: 500 });
  }
}
