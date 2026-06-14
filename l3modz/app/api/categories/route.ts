import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import { checkAdmin } from '@/lib/checkAuth';

export async function GET() {
  try {
    await dbConnect();
    const categories = await Category.find({})
      .select('_id name slug image description')
      .sort({ createdAt: 1 })
      .lean();
    return NextResponse.json(Array.isArray(categories) ? categories : []);
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
    const image = String(body?.image || '').trim();
    const description = String(body?.description || '').trim();

    if (!name) {
      return NextResponse.json({ message: 'Category name is required' }, { status: 400 });
    }

    const exists = await Category.findOne({ name });
    if (exists) {
      return NextResponse.json({ message: 'Category with same name already exists' }, { status: 400 });
    }

    // Server-generate slug from name to prevent client injection
    let baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    if (!baseSlug) baseSlug = 'category';

    // Ensure uniqueness by appending a suffix if needed
    let slugToUse = baseSlug;
    let counter = 2;
    while (await Category.findOne({ slug: slugToUse })) {
      slugToUse = `${baseSlug}-${counter}`;
      counter += 1;
    }

    const category = await Category.create({
      name,
      slug: slugToUse,
      image,
      description,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create category';
    return NextResponse.json({ message }, { status: 500 });
  }
}
