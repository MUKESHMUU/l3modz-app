import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';

/**
 * GET /api/bikes
 * Returns the full brand → models tree derived from product compatibility data.
 * Response: { brands: [{ name: string, models: string[], years: string[] }] }
 */
export async function GET() {
  try {
    await dbConnect();

    // Aggregate all unique brands, their models, and years from compatibility arrays
    const result = await Product.aggregate([
      { $unwind: '$compatibility' },
      {
        $group: {
          _id: '$compatibility.brand',
          models: { $addToSet: '$compatibility.model' },
          years: { $addToSet: '$compatibility.year' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const brands = result
      .filter((b) => b._id) // remove null/empty brands
      .map((b) => ({
        name: b._id,
        models: b.models.filter(Boolean).sort(),
        years: b.years.filter(Boolean).sort().reverse(), // newest first
      }));

    return NextResponse.json({ brands });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
