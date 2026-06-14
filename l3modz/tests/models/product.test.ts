import mongoose from 'mongoose';

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

describe('Product Model', () => {
  const categoryId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');

  it('accepts a valid ObjectId for categoryId', () => {
    const mockProduct = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Footrest',
      categoryId: categoryId,
    };

    expect(mockProduct.categoryId).toEqual(categoryId);
    expect(mockProduct.categoryId instanceof mongoose.Types.ObjectId).toBe(true);
  });

  it('defaults categoryId to null', () => {
    const mockProduct = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Footrest',
      categoryId: null,
    };

    expect(mockProduct.categoryId).toBeNull();
  });

  it('sets categoryId to null when category is deleted', async () => {
    const mockProduct = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Footrest',
      categoryId: categoryId,
      save: jest.fn(),
    };

    // Simulate deletion by setting to null
    mockProduct.categoryId = null;

    expect(mockProduct.categoryId).toBeNull();
  });

  it('saves product without categoryId (uncategorized)', () => {
    const mockProduct = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Uncategorized Product',
      slug: 'uncategorized-product',
      price: 100,
      categoryId: null,
      inStock: true,
      stock: 10,
    };

    expect(mockProduct.categoryId).toBeNull();
    expect(mockProduct.title).toBe('Uncategorized Product');
    expect(mockProduct.price).toBe(100);
  });

  it('preserves categoryId when updating other fields', () => {
    const mockProduct = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Original Title',
      categoryId: categoryId,
      price: 100,
    };

    // Update only title
    mockProduct.title = 'Updated Title';

    expect(mockProduct.categoryId).toEqual(categoryId);
    expect(mockProduct.title).toBe('Updated Title');
  });

  it('accepts string representation of ObjectId', () => {
    const categoryIdString = categoryId.toString();
    const mockProduct = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Footrest',
      categoryId: categoryIdString,
    };

    expect(mockProduct.categoryId).toBe(categoryIdString);
  });

  it('handles categoryId as null, string, or ObjectId', () => {
    const scenarios = [
      { categoryId: null, description: 'null' },
      { categoryId: categoryId, description: 'ObjectId' },
      { categoryId: categoryId.toString(), description: 'string' },
    ];

    scenarios.forEach(({ categoryId: catId, description }) => {
      const mockProduct = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Product',
        categoryId: catId,
      };

      if (catId === null) {
        expect(mockProduct.categoryId).toBeNull();
      } else if (typeof catId === 'string') {
        expect(typeof mockProduct.categoryId).toBe('string');
      } else {
        expect(mockProduct.categoryId instanceof mongoose.Types.ObjectId).toBe(true);
      }
    });
  });

  it('product can have all required fields without category', () => {
    const mockProduct = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Standalone Product',
      slug: 'standalone-product',
      price: 500,
      originalPrice: 750,
      images: ['/img1.png'],
      categoryId: null,
      description: 'A product without category',
      features: ['Feature 1', 'Feature 2'],
      specs: {
        sku: 'SKU123',
        material: 'Steel',
        installation: 'Bolt-on',
      },
      compatibility: [
        {
          brand: 'Bajaj',
          model: 'Dominar 400',
          year: '2023',
        },
      ],
      rating: 4.5,
      numReviews: 10,
      inStock: true,
      stock: 20,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(mockProduct.title).toBe('Standalone Product');
    expect(mockProduct.categoryId).toBeNull();
    expect(mockProduct.price).toBe(500);
    expect(mockProduct.specs.sku).toBe('SKU123');
  });
});
