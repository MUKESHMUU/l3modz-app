import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import { checkAdmin } from '@/lib/checkAuth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const id = (await params).id;
    
    // Check if ID is a valid ObjectId, otherwise it might be a slug
    const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
    const product = isObjectId
      ? await Product.findById(id).populate('categoryId', 'name slug')
      : await Product.findOne({ slug: id }).populate('categoryId', 'name slug');

    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ message: 'Unauthorized, admin only' }, { status: 401 });
    }

    await dbConnect();
    const id = (await params).id;
    const body = await req.json();
    // Debug: log incoming body for update requests to trace originalPrice handling
    // Note: Keep logs minimal in production
    // eslint-disable-next-line no-console
    console.debug('[API] PUT /api/products/[id] body:', { id, body });
    
    const rawStock = body?.stock;
    const stockValue = rawStock === undefined || rawStock === null || rawStock === '' ? 0 : Number(rawStock);
    if (!Number.isFinite(stockValue) || stockValue < 0) {
      return NextResponse.json({ message: 'Stock quantity must be a non-negative number' }, { status: 400 });
    }
    const stock = Math.max(0, stockValue);
    const inStock = typeof body?.inStock === 'boolean' ? body.inStock : stock > 0;

    const updatePayload: any = {
      title: body.title,
      slug: body.slug,
      price: body.price,
      images: body.images,
      description: body.description,
      features: body.features,
      specs: body.specs,
      compatibility: body.compatibility,
      rating: body.rating,
      numReviews: body.numReviews,
      inStock,
      stock,
    };

    if (Object.prototype.hasOwnProperty.call(body, 'originalPrice')) {
      updatePayload.originalPrice = Number(body.originalPrice);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'categoryId')) {
      if (body.categoryId) {
        updatePayload.categoryId = new mongoose.Types.ObjectId(body.categoryId);
      } else {
        updatePayload.categoryId = null;
      }
    }

    // Debug: log the payload that will be used for update
    // eslint-disable-next-line no-console
    console.debug('[API] PUT /api/products/[id] updatePayload:', { id, updatePayload });

    const product = await Product.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true })
      .populate('categoryId', 'name slug');
    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ message: 'Unauthorized, admin only' }, { status: 401 });
    }

    await dbConnect();
    const id = (await params).id;

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
