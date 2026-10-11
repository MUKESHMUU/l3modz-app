export type MigrationCollection = 'products' | 'categories' | 'orders';

export interface MigrationSummaryMapping {
  sourceProvider: 'cloudinary' | 'other';
  sourceUrl: string;
  status: 'pending' | 'verified' | 'failed' | 'skipped';
  references: Array<{
    collection: MigrationCollection;
    sourceUrl: string;
    documentId?: string;
    field?: string;
    index?: number;
  }>;
}

function isCloudinaryUrl(sourceUrl: string) {
  try {
    return new URL(sourceUrl).hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}

function isR2Url(sourceUrl: string) {
  try {
    return new URL(sourceUrl).hostname === 'images.l3modz.com';
  } catch {
    return false;
  }
}

export function buildMigrationSummary(
  mappings: Map<string, MigrationSummaryMapping>,
  prefix: string,
) {
  const values = [...mappings.values()];
  const references = values.flatMap((item) => item.references);
  return {
    prefix,
    uniqueUrls: values.length,
    totalReferences: references.length,
    referencesByCollection: {
      products: references.filter((reference) => reference.collection === 'products').length,
      categories: references.filter((reference) => reference.collection === 'categories').length,
      orders: references.filter((reference) => reference.collection === 'orders').length,
    },
    cloudinaryUrls: values.filter((item) => item.sourceProvider === 'cloudinary').length,
    cloudinaryReferences: references.filter((reference) => isCloudinaryUrl(reference.sourceUrl)).length,
    r2Urls: values.filter((item) => isR2Url(item.sourceUrl)).length,
    r2References: references.filter((reference) => isR2Url(reference.sourceUrl)).length,
    otherExternalUrls: values.filter((item) => item.sourceProvider === 'other' && !isR2Url(item.sourceUrl)).length,
    otherExternalReferences: references.filter((reference) => !isCloudinaryUrl(reference.sourceUrl) && !isR2Url(reference.sourceUrl)).length,
    eligibleCloudinaryUrls: values.filter((item) => item.sourceProvider === 'cloudinary' && item.status === 'pending').length,
    verified: values.filter((item) => item.status === 'verified').length,
    failed: values.filter((item) => item.status === 'failed').length,
    failedUrls: values.filter((item) => item.status === 'failed').length,
    skipped: values.filter((item) => item.status === 'skipped').length,
    duplicateReferences: Math.max(0, references.length - values.length),
    sharedSources: values.filter((item) => item.references.length > 1).length,
  };
}
