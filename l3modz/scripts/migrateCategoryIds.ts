import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import Product from '@/models/Product';

async function migrate() {
  await dbConnect();

  const categories = await Category.find({}).lean();
  const categoryMap = new Map<string, mongoose.Types.ObjectId>();
  categories.forEach((cat) => {
    if (cat.slug) {
      categoryMap.set(cat.slug, cat._id as mongoose.Types.ObjectId);
    }
  });

  const products = await Product.find({}).lean();
  let migrated = 0;
  let missing = 0;

  for (const product of products) {
    const currentCategoryId = (product as any).categoryId;
    if (currentCategoryId) {
      continue;
    }

const oldCategories =
    Array.isArray((product as any).categories) && (product as any).categories.length > 0
      ? (product as any).categories
      : [];
  const categorySlug = oldCategories.find(
    (slug: any) => typeof slug === 'string' && categoryMap.has(slug)
  );
  const categoryId = categorySlug ? categoryMap.get(categorySlug) ?? null : null;

    if (!categoryId) {
      missing += 1;
    }

    await Product.updateOne(
      { _id: product._id },
      { $set: { categoryId } }
    );

    migrated += 1;
  }

  console.log(`Migrated ${migrated} products, ${missing} had no matching category`);
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
