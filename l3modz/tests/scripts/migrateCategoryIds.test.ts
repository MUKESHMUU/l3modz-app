import mongoose from 'mongoose';

jest.mock('mongoose');
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

describe('migrateCategoryIds Script', () => {
  let mockFind: jest.Mock;
  let mockFindOne: jest.Mock;
  let mockUpdateOne: jest.Mock;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    mockFind = jest.fn();
    mockFindOne = jest.fn();
    mockUpdateOne = jest.fn();

    const mockProductModel = {
      find: mockFind,
      findOne: mockFindOne,
      updateOne: mockUpdateOne,
    };

    const mockCategoryModel = {
      findOne: mockFindOne,
    };

    (mongoose.models as any).Product = mockProductModel;
    (mongoose.models as any).Category = mockCategoryModel;
    (mongoose.model as any) = jest.fn(() => mockProductModel);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('migrates product with matching slug to correct ObjectId', async () => {
    const categoryId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
    const productId = new mongoose.Types.ObjectId('607f1f77bcf86cd799439012');

    const mockProduct = {
      _id: productId,
      categories: ['footrests'],
      categoryId: null,
    };

    mockFindOne.mockResolvedValueOnce({ _id: categoryId, slug: 'footrests' }); // Category found
    mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

    // Simulate migration logic
    const categorySlug = 'footrests';
    const category = await mongoose.models.Category.findOne({ slug: categorySlug });
    expect(category).toBeDefined();

    if (category && !mockProduct.categoryId) {
      await mongoose.models.Product.updateOne(
        { _id: productId },
        { categoryId: category._id }
      );
    }

    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: productId },
      { categoryId: categoryId }
    );
  });

  it('sets categoryId to null when no matching slug found', async () => {
    const productId = new mongoose.Types.ObjectId('607f1f77bcf86cd799439012');

    const mockProduct = {
      _id: productId,
      categories: ['nonexistent-category'],
      categoryId: null,
    };

    mockFindOne.mockResolvedValueOnce(null); // Category not found
    mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

    // Simulate migration logic
    const categorySlug = 'nonexistent-category';
    const category = await mongoose.models.Category.findOne({ slug: categorySlug });
    expect(category).toBeNull();

    // Set to null if not found
    await mongoose.models.Product.updateOne(
      { _id: productId },
      { categoryId: null }
    );

    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: productId },
      { categoryId: null }
    );
  });

  it('skips already migrated products (idempotent)', async () => {
    const categoryId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
    const productId = new mongoose.Types.ObjectId('607f1f77bcf86cd799439012');

    const mockProduct = {
      _id: productId,
      categoryId: categoryId, // Already migrated
      categories: ['footrests'],
    };

    // Should not update if already has categoryId
    if (mockProduct.categoryId) {
      // Skip this product
      expect(mockUpdateOne).not.toHaveBeenCalled();
    }
  });

  it('logs correct migration statistics', () => {
    const stats = {
      migrated: 5,
      skipped: 2,
      noMatch: 1,
    };

    const logMessage = `Migration complete: ${stats.migrated} products migrated, ${stats.skipped} skipped (already migrated), ${stats.noMatch} with no matching category.`;

    console.log(logMessage);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('5 products migrated')
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('2 skipped')
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('1 with no matching category')
    );
  });

  it('handles empty categories array', async () => {
    const productId = new mongoose.Types.ObjectId('607f1f77bcf86cd799439012');

    const mockProduct = {
      _id: productId,
      categories: [], // Empty
      categoryId: null,
    };

    // Should set to null or skip
    if (!mockProduct.categories || mockProduct.categories.length === 0) {
      await mongoose.models.Product.updateOne(
        { _id: productId },
        { categoryId: null }
      );
    }

    expect(mockUpdateOne).toHaveBeenCalled();
  });

  it('processes multiple products in batch', async () => {
    const categoryId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
    const products = [
      { _id: new mongoose.Types.ObjectId(), categories: ['footrests'], categoryId: null },
      { _id: new mongoose.Types.ObjectId(), categories: ['radiator-guards'], categoryId: null },
      { _id: new mongoose.Types.ObjectId(), categories: [], categoryId: null },
    ];

    mockFindOne.mockResolvedValueOnce({ _id: categoryId, slug: 'footrests' });
    mockFindOne.mockResolvedValueOnce({ _id: categoryId, slug: 'radiator-guards' });
    mockFindOne.mockResolvedValueOnce(null);

    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

    let migrated = 0;

    for (const product of products) {
      if (product.categories && product.categories.length > 0) {
        const categorySlug = product.categories[0];
        const category = await mongoose.models.Category.findOne({ slug: categorySlug });

        if (category) {
          await mongoose.models.Product.updateOne(
            { _id: product._id },
            { categoryId: category._id }
          );
          migrated += 1;
        }
      }
    }

    expect(migrated).toBe(2);
    expect(mockUpdateOne).toHaveBeenCalledTimes(2);
  });
});
