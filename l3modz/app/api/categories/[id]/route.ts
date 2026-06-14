import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import Product from '@/models/Product';
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
    const image = String(body?.image || '').trim();
    const description = String(body?.description || '').trim();

    if (!name) {
      return NextResponse.json({ message: 'Category name is required' }, { status: 400 });
    }

    const duplicate = await Category.findOne({
      _id: { $ne: id },
      name,
    });
    if (duplicate) {
      return NextResponse.json({ message: 'Category with same name already exists' }, { status: 400 });
    }

    const category = await Category.findById(id);
    if (!category) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    // If name changed, regenerate slug server-side and ensure uniqueness
    if (body.name && body.name !== category.name) {
      category.name = name;
      let newSlug = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      if (!newSlug) newSlug = 'category';

      const exists = await Category.findOne({ slug: newSlug, _id: { $ne: category._id } });
      category.slug = exists ? `${newSlug}-2` : newSlug;
    }

    // Allow updating image and description freely
    category.image = image;
    category.description = description;
    await category.save();

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

    await Product.updateMany(
      { categoryId: new mongoose.Types.ObjectId(id) },
      { $set: { categoryId: null } }
    );

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete category';
    return NextResponse.json({ message }, { status: 500 });
  }
}
