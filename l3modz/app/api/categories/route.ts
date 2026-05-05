import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import { checkAdmin } from '@/lib/checkAuth';

export async function GET() {
  try {
    await dbConnect();
    const categories = await Category.find({}).sort({ createdAt: 1 });
    return NextResponse.json(categories);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch categories';
    return NextResponse.json({ message }, { status: 500 });
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

    const name = String(body?.name || '').trim();
    const slug = String(body?.slug || '').trim().toLowerCase();
    const image = String(body?.image || '').trim();
    const description = String(body?.description || '').trim();

    if (!name || !slug) {
      return NextResponse.json({ message: 'Category name and slug are required' }, { status: 400 });
    }

    const exists = await Category.findOne({ $or: [{ name }, { slug }] });
    if (exists) {
      return NextResponse.json({ message: 'Category with same name or slug already exists' }, { status: 400 });
    }

    const category = await Category.create({
      name,
      slug,
      image,
      description,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create category';
    return NextResponse.json({ message }, { status: 500 });
  }
}
