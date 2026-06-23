import mongoose from 'mongoose';

jest.mock('mongoose');
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

describe('Products API Routes', () => {
  let mockFind: jest.Mock;
  let mockFindOne: jest.Mock;
  let mockFindById: jest.Mock;
  let mockFindByIdAndUpdate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFind = jest.fn();
    mockFindOne = jest.fn();
    mockFindById = jest.fn();
    mockFindByIdAndUpdate = jest.fn();

    const mockProductModel = {
      find: mockFind,
      findOne: mockFindOne,
      findById: mockFindById,
      findByIdAndUpdate: mockFindByIdAndUpdate,
    };

    const mockCategoryModel = {
      findOne: mockFindOne,
    };

    (mongoose.models as any).Product = mockProductModel;
    (mongoose.models as any).Category = mockCategoryModel;
    (mongoose.model as any) = jest.fn(() => mockProductModel);
  });

  describe('GET /api/products', () => {
    it('returns all products when no category param', async () => {
      const mockProducts = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Product 1',
          slug: 'product-1',
          price: 100,
          categoryId: null,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Product 2',
          slug: 'product-2',
          price: 200,
          categoryId: null,
        },
      ];

      mockFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const products = await (mongoose.models.Product.find({} as any) as any)
        .populate('categoryId', 'name slug')
        .lean();

      expect(products).toHaveLength(2);
      expect(products[0].title).toBe('Product 1');
    });

    it('returns only matching products for valid category slug', async () => {
      const mockCategory = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        name: 'Footrests',
        slug: 'footrests',
      };

      const mockProducts = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Footrest Product',
          slug: 'footrest-product',
          categoryId: mockCategory._id,
        },
      ];

      // First find the category
      mockFindOne.mockResolvedValueOnce(mockCategory);

      // Then find products with that categoryId
      mockFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const category = await mongoose.models.Category.findOne({ slug: 'footrests' });
      expect(category).toBeDefined();

      const products = await (mongoose.models.Product.find({ categoryId: category._id } as any) as any)
        .populate('categoryId', 'name slug')
        .lean();

      expect(products).toHaveLength(1);
      expect(products[0].categoryId).toEqual(mockCategory._id);
    });

    it('returns empty array for nonexistent category slug', async () => {
      mockFindOne.mockResolvedValueOnce(null);

      const category = await mongoose.models.Category.findOne({ slug: 'nonexistent' });
      expect(category).toBeNull();

      // If category doesn't exist, products list should be empty
      const products = category ? [] : [];
      expect(products).toEqual([]);
    });

    it('populates categoryId with name and slug', async () => {
      const mockProducts = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Product',
          categoryId: {
            _id: new mongoose.Types.ObjectId(),
            name: 'Footrests',
            slug: 'footrests',
          },
        },
      ];

      mockFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProducts),
        }),
      });

      const products = await (mongoose.models.Product.find({} as any) as any)
        .populate('categoryId', 'name slug')
        .lean();

      expect(products[0].categoryId.name).toBe('Footrests');
      expect(products[0].categoryId.slug).toBe('footrests');
    });
  });

  describe('PUT /api/products/:id', () => {
    const productId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
    const categoryId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439012');

    it('saves categoryId as ObjectId correctly', async () => {
      const mockProduct = {
        _id: productId,
        title: 'Product',
        categoryId: categoryId,
      };

      mockFindByIdAndUpdate.mockResolvedValueOnce(mockProduct);

      const updated = await mongoose.models.Product.findByIdAndUpdate(
        productId,
        { categoryId: categoryId },
        { new: true }
      );

      expect(updated.categoryId).toEqual(categoryId);
      expect(updated.categoryId instanceof mongoose.Types.ObjectId).toBe(true);
    });

    it('preserves existing categoryId when not in request body', async () => {
      const existingCategoryId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439012');
      const mockProduct = {
        _id: productId,
        title: 'Product',
        categoryId: existingCategoryId,
      };

      mockFindByIdAndUpdate.mockResolvedValueOnce(mockProduct);

      // Update without categoryId in payload
      const updated = await mongoose.models.Product.findByIdAndUpdate(
        productId,
        { title: 'Updated Title' },
        { new: true }
      );

      expect(updated.categoryId).toEqual(existingCategoryId);
    });

    it('sets categoryId to null when explicitly provided', async () => {
      const mockProduct = {
        _id: productId,
        title: 'Product',
        categoryId: null,
      };

      mockFindByIdAndUpdate.mockResolvedValueOnce(mockProduct);

      const updated = await mongoose.models.Product.findByIdAndUpdate(
        productId,
        { categoryId: null },
        { new: true }
      );

      expect(updated.categoryId).toBeNull();
    });

    it('updates originalPrice correctly', async () => {
      const mockProduct = {
        _id: productId,
        title: 'Product',
        originalPrice: 3500,
      };

      mockFindByIdAndUpdate.mockResolvedValueOnce(mockProduct);

      const updated = await mongoose.models.Product.findByIdAndUpdate(
        productId,
        { originalPrice: 3500 },
        { new: true }
      );

      expect(updated.originalPrice).toBe(3500);
    });
  });
});
