import { buildMigrationSummary } from '@/lib/migrationSummary';
import type { MigrationSummaryMapping } from '@/lib/migrationSummary';

describe('migrateImages inventory summary', () => {
  it('reports collection, provider, eligibility, and duplicate counts without writes', () => {
    const mappings = new Map<string, MigrationSummaryMapping>([
      ['https://res.cloudinary.com/demo/image/upload/a.jpg', {
        sourceUrl: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
        sourceProvider: 'cloudinary',
        references: [
          { collection: 'products', documentId: 'p1', field: 'images', index: 0, sourceUrl: 'https://res.cloudinary.com/demo/image/upload/a.jpg' },
          { collection: 'orders', documentId: 'o1', field: 'orderItems.image', index: 0, sourceUrl: 'https://res.cloudinary.com/demo/image/upload/a.jpg' },
        ],
        status: 'pending',
      }],
      ['https://images.l3modz.com/products/a.jpg', {
        sourceUrl: 'https://images.l3modz.com/products/a.jpg',
        sourceProvider: 'other',
        references: [
          { collection: 'categories', documentId: 'c1', field: 'image', sourceUrl: 'https://images.l3modz.com/products/a.jpg' },
        ],
        status: 'skipped',
      }],
      ['https://example.com/legacy.jpg', {
        sourceUrl: 'https://example.com/legacy.jpg',
        sourceProvider: 'other',
        references: [
          { collection: 'products', documentId: 'p2', field: 'images', index: 0, sourceUrl: 'https://example.com/legacy.jpg' },
        ],
        status: 'failed',
      }],
    ]);

    expect(buildMigrationSummary(mappings, 'dry-run')).toEqual(expect.objectContaining({
      totalReferences: 4,
      referencesByCollection: { products: 2, categories: 1, orders: 1 },
      uniqueUrls: 3,
      cloudinaryUrls: 1,
      cloudinaryReferences: 2,
      eligibleCloudinaryUrls: 1,
      r2Urls: 1,
      r2References: 1,
      otherExternalUrls: 1,
      otherExternalReferences: 1,
      failedUrls: 1,
      duplicateReferences: 1,
    }));
  });
});
