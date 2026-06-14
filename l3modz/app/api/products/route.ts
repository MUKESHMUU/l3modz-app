import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { checkAdmin } from '@/lib/checkAuth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 0;
    const search = searchParams.get('search');

    // Bike compatibility filters
    const brand = searchParams.get('brand');
    const model = searchParams.get('model');
    const year  = searchParams.get('year');

    let filter: Record<string, any> = {};
    const filterClauses: Record<string, any>[] = [];

    if (category) {
      const cat = await Category.findOne({ slug: category }).lean();
      if (!cat) {
        return NextResponse.json([]);
      }
      filterClauses.push({
        $or: [
          { categoryId: cat._id },
          { categories: cat.slug },
        ],
      });
    }

    if (search) {
      filterClauses.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      });
    }

    if (brand || model || year) {
      const compatFilter: Record<string, any> = {};
      if (brand) compatFilter['compatibility.brand'] = { $regex: `^${brand}$`, $options: 'i' };
      if (model) compatFilter['compatibility.model'] = { $regex: `^${model}$`, $options: 'i' };
      if (year) compatFilter['compatibility.year'] = year;
      filterClauses.push(compatFilter);
    }

    if (filterClauses.length === 1) {
      filter = filterClauses[0];
    } else if (filterClauses.length > 1) {
      filter = { $and: filterClauses };
    }

    const productsQuery = Product.find(filter)
      .populate('categoryId', 'name slug');

    if (limit > 0) {
      productsQuery.limit(limit);
    }

    const products = await productsQuery.lean();

    return NextResponse.json(Array.isArray(products) ? products : []);
  } catch (error: any) {
    return NextResponse.json({ message: 'Failed to load products' }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ message: 'Unauthorized, admin only' }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const rawStock = body?.stock;
    const stockValue = rawStock === undefined || rawStock === null || rawStock === '' ? 0 : Number(rawStock);
    if (!Number.isFinite(stockValue) || stockValue < 0) {
      return NextResponse.json({ message: 'Stock quantity must be a non-negative number' }, { status: 400 });
    }
    const stock = Math.max(0, stockValue);
    const inStock = typeof body?.inStock === 'boolean' ? body.inStock : stock > 0;
    
    // expecting full product payload
    const categoryId = body?.categoryId && mongoose.Types.ObjectId.isValid(body.categoryId)
      ? new mongoose.Types.ObjectId(body.categoryId)
      : null;

    const product = await Product.create({
      ...body,
      categoryId,
      stock,
      inStock,
    });
    const created = await Product.findById(product._id).populate('categoryId', 'name slug').lean();
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Failed to create product' }, { status: 500 });
  }
}
