import { NextResponse } from 'next/server';
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
      ? await Product.findById(id) 
      : await Product.findOne({ slug: id });

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
    
    // Explicitly log incoming stock value for debugging
    console.log('[Products PUT] Incoming stock:', body?.stock, 'Type:', typeof body?.stock);
     // Explicitly log incoming originalPrice value for debugging
    console.log('[Products PUT] Incoming originalPrice:', body?.originalPrice, 'Type:', typeof body?.originalPrice);
    
    const rawStock = body?.stock;
    const stockValue = rawStock === undefined || rawStock === null || rawStock === '' ? 0 : Number(rawStock);
    if (!Number.isFinite(stockValue) || stockValue < 0) {
      console.log('[Products PUT] Validation failed: stockValue', stockValue);
      return NextResponse.json({ message: 'Stock quantity must be a non-negative number' }, { status: 400 });
    }
    const stock = Math.max(0, stockValue);
    const inStock = typeof body?.inStock === 'boolean' ? body.inStock : stock > 0;
    
    console.log('[Products PUT] Calculated stock:', stock, 'inStock:', inStock);

    // Prepare the update payload - be explicit about all fields
    const updatePayload = {
      title: body.title,
      slug: body.slug,
      price: body.price,
      originalPrice: body.originalPrice,
      images: body.images,
      categories: body.categories,
      description: body.description,
      features: body.features,
      specs: body.specs,
      compatibility: body.compatibility,
      rating: body.rating,
      numReviews: body.numReviews,
      inStock,
      stock,
    };
    
    console.log('[Products PUT] Update payload keys:', Object.keys(updatePayload));
    console.log('[Products PUT] Stock in payload:', updatePayload.stock);
    console.log('[Products PUT] originalPrice in payload:', updatePayload.originalPrice);
    
    // Log before update
    const existingProduct = await Product.findById(id);
    console.log('[Products PUT] Before update - existing stock:', existingProduct?.stock);
    
    const product = await Product.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true });
    if (!product) {
      console.log('[Products PUT] Product not found after update');
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    
    console.log('[Products PUT] After update - returned stock:', product.stock);
    console.log('[Products PUT] After update - returned originalPrice:', product.originalPrice);
    console.log('[Products PUT] Full updated product:', { title: product.title, price: product.price, originalPrice: product.originalPrice, stock: product.stock });

    return NextResponse.json(product);
  } catch (error: any) {
    console.error('[Products PUT] Error:', error.message);
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
