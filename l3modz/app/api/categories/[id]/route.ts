import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import { checkAdmin } from '@/lib/checkAuth';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ message: 'Unauthorized, admin only' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    const name = String(body?.name || '').trim();
    const slug = String(body?.slug || '').trim().toLowerCase();
    const image = String(body?.image || '').trim();
    const description = String(body?.description || '').trim();

    if (!name || !slug) {
      return NextResponse.json({ message: 'Category name and slug are required' }, { status: 400 });
    }

    const duplicate = await Category.findOne({
      _id: { $ne: id },
      $or: [{ name }, { slug }],
    });
    if (duplicate) {
      return NextResponse.json({ message: 'Category with same name or slug already exists' }, { status: 400 });
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { name, slug, image, description },
      { new: true }
    );

    if (!category) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update category';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ message: 'Unauthorized, admin only' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Category deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete category';
    return NextResponse.json({ message }, { status: 500 });
  }
}
