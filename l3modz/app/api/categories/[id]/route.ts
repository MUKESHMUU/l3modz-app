import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { checkAdmin } from '@/lib/checkAuth';
import { hasNewCloudinaryUrl, isR2ImageUrl, publicImageUrl } from '@/lib/imageUrls';

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

    let slug = category.slug;

    // If name changed, regenerate slug server-side and ensure uniqueness
    if (body.name && body.name !== category.name) {
      let newSlug = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      if (!newSlug) newSlug = 'category';

      const exists = await Category.findOne({ slug: newSlug, _id: { $ne: category._id } });
      slug = exists ? `${newSlug}-2` : newSlug;
    }

    const update: Record<string, string> = {
      name,
      slug,
      description,
    };
    if (Object.prototype.hasOwnProperty.call(body, 'image')) {
      const image = String(body.image || '').trim();
      if (hasNewCloudinaryUrl(image, String(category.image || ''))) {
        return NextResponse.json({ message: 'New category images must use the R2 upload endpoint' }, { status: 400 });
      }
      if (isR2ImageUrl(String(category.image || '')) && !isR2ImageUrl(image)) {
        return NextResponse.json({ message: 'An existing R2 category image cannot be replaced with a local or empty path' }, { status: 400 });
      }
      update.image = image;
    }
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true },
    );
    if (!updatedCategory) {
      return NextResponse.json({ message: 'Category was not found after saving' }, { status: 404 });
    }

    const persistedCategory = await Category.findById(id);
    if (!persistedCategory) {
      return NextResponse.json({ message: 'Category was not found after saving' }, { status: 404 });
    }
    if (Object.prototype.hasOwnProperty.call(body, 'image') &&
      String(persistedCategory.image || '').trim() !== String(body.image || '').trim()) {
      return NextResponse.json({ message: 'Category image was not persisted; no success was reported' }, { status: 500 });
    }

    const serializedCategory = typeof persistedCategory.toObject === 'function'
      ? persistedCategory.toObject()
      : persistedCategory;
    return NextResponse.json({
      ...serializedCategory,
      image: publicImageUrl(persistedCategory.image),
    });
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
