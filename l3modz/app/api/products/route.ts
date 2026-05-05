import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
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

    let query: any = {};

    if (category) query.categories = { $in: [category] };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by bike compatibility
    if (brand || model || year) {
      const compatFilter: any = {};
      if (brand) compatFilter['compatibility.brand'] = { $regex: `^${brand}$`, $options: 'i' };
      if (model) compatFilter['compatibility.model'] = { $regex: `^${model}$`, $options: 'i' };
      if (year)  compatFilter['compatibility.year']  = year;
      query = { ...query, $and: [compatFilter] };
    }

    const products = await Product.find(query).limit(limit).sort({ createdAt: -1 });
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
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
    
    // expecting full product payload
    const product = await Product.create(body);
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
