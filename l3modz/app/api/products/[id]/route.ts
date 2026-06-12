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
    
    // === STEP 1: LOG INCOMING REQUEST ===
    console.log('');
    console.log('╔═══════════════════════════════════════');
    console.log('║ BACKEND STEP 1: INCOMING REQUEST');
    console.log('╚═══════════════════════════════════════');
    console.log('Full request body:', JSON.stringify(body, null, 2));
    console.log('body.originalPrice (MRP):', body?.originalPrice, 'Type:', typeof body?.originalPrice);
    console.log('body.price (Selling):', body?.price, 'Type:', typeof body?.price);
    console.log('body.stock:', body?.stock, 'Type:', typeof body?.stock);
    
    const rawStock = body?.stock;
    const stockValue = rawStock === undefined || rawStock === null || rawStock === '' ? 0 : Number(rawStock);
    if (!Number.isFinite(stockValue) || stockValue < 0) {
      console.log('[Products PUT] Validation failed: stockValue', stockValue);
      return NextResponse.json({ message: 'Stock quantity must be a non-negative number' }, { status: 400 });
    }
    const stock = Math.max(0, stockValue);
    const inStock = typeof body?.inStock === 'boolean' ? body.inStock : stock > 0;
    
    console.log('[Products PUT] Calculated stock:', stock, 'inStock:', inStock);

    // === STEP 2: BUILD UPDATE PAYLOAD ===
    console.log('');
    console.log('╔═══════════════════════════════════════');
    console.log('║ BACKEND STEP 2: UPDATE PAYLOAD');
    console.log('╚═══════════════════════════════════════');
    
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
    
    console.log('Update payload:', JSON.stringify(updatePayload, null, 2));
    console.log('updatePayload.originalPrice:', updatePayload.originalPrice);
    console.log('updatePayload.price:', updatePayload.price);
    
    // === STEP 3: CHECK EXISTING PRODUCT ===
    console.log('');
    console.log('╔═══════════════════════════════════════');
    console.log('║ BACKEND STEP 3: EXISTING PRODUCT');
    console.log('╚═══════════════════════════════════════');
    
    const existingProduct = await Product.findById(id);
    console.log('Existing product originalPrice:', existingProduct?.originalPrice);
    console.log('Existing product price:', existingProduct?.price);
    console.log('Existing product stock:', existingProduct?.stock);
    
    // === STEP 4: PERFORM UPDATE ===
    console.log('');
    console.log('╔═══════════════════════════════════════');
    console.log('║ BACKEND STEP 4: MONGODB UPDATE');
    console.log('╚═══════════════════════════════════════');
    
    const product = await Product.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true });
    if (!product) {
      console.log('[Products PUT] Product not found after update');
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    
    // === STEP 5: VERIFY UPDATE IN DATABASE ===
    console.log('');
    console.log('╔═══════════════════════════════════════');
    console.log('║ BACKEND STEP 5: AFTER UPDATE');
    console.log('╚═══════════════════════════════════════');
    console.log('Updated product originalPrice:', product.originalPrice);
    console.log('Updated product price:', product.price);
    console.log('Updated product stock:', product.stock);
    console.log('Full updated product:', JSON.stringify({ 
      _id: product._id, 
      title: product.title, 
      price: product.price, 
      originalPrice: product.originalPrice, 
      stock: product.stock 
    }, null, 2));

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
