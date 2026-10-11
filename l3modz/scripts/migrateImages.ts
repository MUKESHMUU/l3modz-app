import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRepositoryMigrationEnvironment } from '@/lib/migrationEnv';
import { configureMigrationDns } from '@/lib/migrationDns';
import { buildMigrationSummary } from '@/lib/migrationSummary';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';
import Order from '@/models/Order';

const MIGRATION_ENV_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

type CollectionName = 'products' | 'categories' | 'orders';
type MigrationStatus = 'pending' | 'verified' | 'failed' | 'skipped';

interface ImageReference {
  collection: CollectionName;
  documentId: string;
  field: string;
  index?: number;
  sourceUrl: string;
}

export interface ImageMapping {
  sourceUrl: string;
  sourceProvider: 'cloudinary' | 'other';
  references: ImageReference[];
  status: MigrationStatus;
  destinationKey?: string;
  destinationUrl?: string;
  sourceContentType?: string;
  sourceBytes?: number;
  sourceChecksum?: string;
  destinationBytes?: number;
  destinationChecksum?: string;
  attempts: number;
  error?: string;
  migratedAt?: string;
}

interface Manifest {
  version: 1;
  generatedAt: string;
  updatedAt: string;
  mode: 'dry-run' | 'apply' | 'rollback';
  mappings: Record<string, ImageMapping>;
}

const DEFAULT_MANIFEST = resolve(process.env.IMAGE_MIGRATION_MANIFEST || 'migration-manifests/images.json');
const MAX_BYTES = 8 * 1024 * 1024;
const RETRIES = 3;

function args() {
  const values = new Set(process.argv.slice(2));
  const valueAfter = (name: string) => {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
  };
  return {
    help: values.has('--help') || values.has('-h'),
    localEnv: values.has('--local-env'),
    apply: values.has('--apply'),
    dryRun: values.has('--dry-run') || !values.has('--apply'),
    report: values.has('--report'),
    rollback: values.has('--rollback'),
    manifest: resolve(valueAfter('--manifest') || DEFAULT_MANIFEST),
    batchSize: Math.max(1, Number(valueAfter('--batch-size') || 25)),
    resume: values.has('--resume'),
    confirmProduction: values.has('--confirm-production'),
  };
}

function isCloudinaryUrl(sourceUrl: string) {
  try {
    return new URL(sourceUrl).hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}

function canonicalUrl(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl);
    url.hash = '';
    return url.toString();
  } catch {
    return sourceUrl.trim();
  }
}

function checksum(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function printMongoConfiguration() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('MONGODB_URI is not configured');
  }

  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('MONGODB_URI is invalid');
  }

  const isLocalHost = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(parsed.hostname);
  console.log(`MongoDB configuration: host=${isLocalHost ? 'local' : 'remote'}, database=${parsed.pathname.length > 1 ? 'configured' : 'not-configured'}`);
}

async function retry<T>(operation: () => Promise<T>) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      return { value: await operation(), attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) await new Promise((resolveDelay) => setTimeout(resolveDelay, 250 * attempt));
    }
  }
  throw lastError;
}

async function loadManifest(path: string): Promise<Manifest | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as Manifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new Error(`Unable to read migration manifest: ${path}`);
  }
}

async function saveManifest(path: string, manifest: Manifest) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, path);
}

async function inventory() {
  const mappings = new Map<string, ImageMapping>();
  const add = (reference: ImageReference) => {
    const originalUrl = reference.sourceUrl.trim();
    const sourceUrl = canonicalUrl(originalUrl);
    if (!sourceUrl) return;
    const existing = mappings.get(sourceUrl);
    if (existing) {
      existing.references.push({ ...reference, sourceUrl: originalUrl });
      return;
    }
    mappings.set(sourceUrl, {
      sourceUrl,
      sourceProvider: isCloudinaryUrl(sourceUrl) ? 'cloudinary' : 'other',
      references: [{ ...reference, sourceUrl: originalUrl }],
      status: isCloudinaryUrl(sourceUrl) ? 'pending' : 'skipped',
      attempts: 0,
      error: isCloudinaryUrl(sourceUrl) ? undefined : 'Not a Cloudinary URL; left unchanged.',
    });
  };

  const [products, categories, orders] = await Promise.all([
    Product.find({}, { images: 1 }).lean(),
    Category.find({}, { image: 1 }).lean(),
    Order.find({}, { orderItems: 1 }).lean(),
  ]);

  products.forEach((product: any) => (product.images || []).forEach((sourceUrl: unknown, index: number) => {
    if (typeof sourceUrl === 'string') add({ collection: 'products', documentId: String(product._id), field: 'images', index, sourceUrl });
  }));
  categories.forEach((category: any) => {
    if (typeof category.image === 'string' && category.image.trim()) {
      add({ collection: 'categories', documentId: String(category._id), field: 'image', sourceUrl: category.image });
    }
  });
  orders.forEach((order: any) => (order.orderItems || []).forEach((item: any, index: number) => {
    if (typeof item.image === 'string' && item.image.trim()) {
      add({ collection: 'orders', documentId: String(order._id), field: 'orderItems.image', index, sourceUrl: item.image });
    }
  }));

  return mappings;
}

async function fetchSource(sourceUrl: string) {
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_BYTES) throw new Error('Source image exceeds the 8MB limit');
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length > MAX_BYTES) throw new Error('Source image exceeds the 8MB limit');
  const contentType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
    throw new Error(`Unsupported source content type: ${contentType || 'unknown'}`);
  }
  return { buffer, contentType, checksum: checksum(buffer) };
}

async function migrateMapping(mapping: ImageMapping) {
  const { putR2Object, headR2Object, getR2PublicUrl, validateImageBuffer } = await import('@/lib/r2');
  const source = await fetchSource(mapping.sourceUrl);
  validateImageBuffer(source.buffer, source.contentType);
  const key = `migrated/${source.checksum}.${source.contentType.split('/')[1]}`;
  await putR2Object(key, source.buffer, source.contentType, source.checksum);
  const destination = await headR2Object(key);
  const destinationBytes = Number(destination.ContentLength || 0);
  if (destinationBytes !== source.buffer.length) {
    throw new Error(`Destination byte count mismatch: ${destinationBytes} != ${source.buffer.length}`);
  }
  mapping.sourceContentType = source.contentType;
  mapping.sourceBytes = source.buffer.length;
  mapping.sourceChecksum = source.checksum;
  mapping.destinationKey = key;
  mapping.destinationUrl = getR2PublicUrl(key);
  mapping.destinationBytes = destinationBytes;
  mapping.destinationChecksum = source.checksum;
  mapping.status = 'verified';
  mapping.error = undefined;
  mapping.migratedAt = new Date().toISOString();
}

async function updateDatabaseReferences(mappings: Map<string, ImageMapping>) {
  const changed = { products: 0, categories: 0, orders: 0 };
  const migrated = [...mappings.values()].filter((mapping) => mapping.status === 'verified' && mapping.destinationUrl);
  const productIds = new Set(migrated.flatMap((mapping) => mapping.references.filter((ref) => ref.collection === 'products').map((ref) => ref.documentId)));
  const categoryIds = new Set(migrated.flatMap((mapping) => mapping.references.filter((ref) => ref.collection === 'categories').map((ref) => ref.documentId)));
  const orderIds = new Set(migrated.flatMap((mapping) => mapping.references.filter((ref) => ref.collection === 'orders').map((ref) => ref.documentId)));

  for (const id of productIds) {
    const product: any = await Product.findById(id).lean();
    if (!product) continue;
    const original = [...(product.images || [])];
    const next = [...original];
    migrated.forEach((mapping) => mapping.references.filter((ref) => ref.collection === 'products' && ref.documentId === id).forEach((ref) => {
      if (typeof ref.index === 'number' && next[ref.index] === ref.sourceUrl) next[ref.index] = mapping.destinationUrl as string;
    }));
    if (JSON.stringify(original) !== JSON.stringify(next)) {
      const result = await Product.updateOne({ _id: id, images: original }, { $set: { images: next } });
      if (result.modifiedCount === 1) changed.products += 1;
    }
  }
  for (const id of categoryIds) {
    const category: any = await Category.findById(id).lean();
    if (!category) continue;
    const mapping = migrated.find((item) => item.references.some((ref) => ref.collection === 'categories' && ref.documentId === id));
    const reference = mapping?.references.find((ref) => ref.collection === 'categories' && ref.documentId === id);
    if (mapping?.destinationUrl && reference && category.image === reference.sourceUrl) {
      const result = await Category.updateOne({ _id: id, image: reference.sourceUrl }, { $set: { image: mapping.destinationUrl } });
      if (result.modifiedCount === 1) changed.categories += 1;
    }
  }
  for (const id of orderIds) {
    const order: any = await Order.findById(id).lean();
    if (!order) continue;
    const original = order.orderItems || [];
    const next = original.map((item: any) => ({ ...item }));
    migrated.forEach((mapping) => mapping.references.filter((ref) => ref.collection === 'orders' && ref.documentId === id).forEach((ref) => {
      if (typeof ref.index === 'number' && next[ref.index]?.image === ref.sourceUrl) next[ref.index].image = mapping.destinationUrl;
    }));
    if (JSON.stringify(original) !== JSON.stringify(next)) {
      const result = await Order.updateOne({ _id: id, orderItems: original }, { $set: { orderItems: next } });
      if (result.modifiedCount === 1) changed.orders += 1;
    }
  }
  return changed;
}

async function rollback(mappings: Map<string, ImageMapping>) {
  const changed = { products: 0, categories: 0, orders: 0 };
  for (const mapping of mappings.values()) {
    if (mapping.status !== 'verified' || !mapping.destinationUrl) continue;
    for (const ref of mapping.references) {
      if (ref.collection === 'products' && typeof ref.index === 'number') {
        const product: any = await Product.findById(ref.documentId).lean();
        const images = [...(product?.images || [])];
        if (images[ref.index] === mapping.destinationUrl) {
          images[ref.index] = ref.sourceUrl;
          const result = await Product.updateOne({ _id: ref.documentId, images: product.images }, { $set: { images } });
          if (result.modifiedCount === 1) changed.products += 1;
        }
      } else if (ref.collection === 'categories') {
        const result = await Category.updateOne({ _id: ref.documentId, image: mapping.destinationUrl }, { $set: { image: ref.sourceUrl } });
        if (result.modifiedCount === 1) changed.categories += 1;
      } else if (ref.collection === 'orders' && typeof ref.index === 'number') {
        const order: any = await Order.findById(ref.documentId).lean();
        const orderItems = (order?.orderItems || []).map((item: any) => ({ ...item }));
        if (orderItems[ref.index]?.image === mapping.destinationUrl) {
          orderItems[ref.index].image = ref.sourceUrl;
          const result = await Order.updateOne({ _id: ref.documentId, orderItems: order.orderItems }, { $set: { orderItems } });
          if (result.modifiedCount === 1) changed.orders += 1;
        }
      }
    }
  }
  return changed;
}

function printSummary(mappings: Map<string, ImageMapping>, prefix: string) {
  console.log(JSON.stringify(buildMigrationSummary(mappings, prefix), null, 2));
}

async function main() {
  const options = args();
  const selectedModes = [
    process.argv.includes('--dry-run'),
    options.apply,
    options.report,
    options.rollback,
  ].filter(Boolean).length;
  if (selectedModes > 1) {
    throw new Error('Choose exactly one migration mode: --dry-run, --apply, --report, or --rollback.');
  }
  if (options.localEnv && !options.dryRun) {
    throw new Error('--local-env is only supported for read-only dry-run mode.');
  }
  if (options.help) {
    console.log([
      'Usage: npm run migrate:images -- [--dry-run|--apply|--rollback|--report]',
      '  --dry-run                 Inventory and fetch-check Cloudinary images (default).',
      '  --apply                   Upload verified images to R2 and update MongoDB references.',
      '  --rollback                Restore references from a migration manifest when unchanged.',
      '  --report                  Print counts from an existing manifest.',
      '  --manifest <path>         Manifest path (default: migration-manifests/images.json).',
      '  --batch-size <number>     Number of images processed per checkpoint (default: 25).',
      '  --confirm-production      Required with production apply mode.',
      '  --local-env               Select the repository-root .env.local (conflicts fail if MONGODB_URI is inherited).',
    ].join('\n'));
    return;
  }
  loadRepositoryMigrationEnvironment(MIGRATION_ENV_DIR, process.env, options.localEnv);
  configureMigrationDns();
  printMongoConfiguration();
  const existing = await loadManifest(options.manifest);
  if (options.report) {
    if (!existing) throw new Error(`Manifest not found: ${options.manifest}`);
    printSummary(new Map(Object.entries(existing.mappings)), 'report');
    return;
  }
  if (options.rollback) {
    if (!existing) throw new Error(`Manifest not found: ${options.manifest}`);
    const target = process.env.MIGRATION_TARGET;
    if (target !== 'staging' && target !== 'production') {
      throw new Error('Set MIGRATION_TARGET=staging or MIGRATION_TARGET=production before rollback mode.');
    }
    if (target === 'production' && (!options.confirmProduction || process.env.MIGRATION_BACKUP_CONFIRMED !== 'true')) {
      throw new Error('Production rollback requires --confirm-production and MIGRATION_BACKUP_CONFIRMED=true.');
    }
    await dbConnect();
    const changed = await rollback(new Map(Object.entries(existing.mappings)));
    console.log(JSON.stringify({ mode: 'rollback', changed }, null, 2));
    return;
  }
  if (options.apply) {
    const target = process.env.MIGRATION_TARGET;
    if (target !== 'staging' && target !== 'production') {
      throw new Error('Set MIGRATION_TARGET=staging or MIGRATION_TARGET=production before apply mode.');
    }
    if (target === 'production' && (!options.confirmProduction || process.env.MIGRATION_BACKUP_CONFIRMED !== 'true')) {
      throw new Error('Production apply requires --confirm-production and MIGRATION_BACKUP_CONFIRMED=true.');
    }
  }

  await dbConnect();
  const current = await inventory();
  const mappings = existing ? new Map(Object.entries(existing.mappings)) : current;
  current.forEach((mapping, sourceUrl) => {
    if (!mappings.has(sourceUrl)) mappings.set(sourceUrl, mapping);
  });
  const pending = [...mappings.values()].filter((mapping) => mapping.status === 'pending');
  for (let index = 0; index < pending.length; index += options.batchSize) {
    const batch = pending.slice(index, index + options.batchSize);
    for (const mapping of batch) {
      if (options.dryRun) {
        try {
          const source = await fetchSource(mapping.sourceUrl);
          mapping.sourceContentType = source.contentType;
          mapping.sourceBytes = source.buffer.length;
          mapping.sourceChecksum = source.checksum;
          mapping.attempts = 1;
        } catch (error) {
          mapping.status = 'failed';
          mapping.error = error instanceof Error ? error.message : String(error);
        }
      } else {
        try {
          const result = await retry(() => migrateMapping(mapping));
          mapping.attempts += result.attempts;
        } catch (error) {
          mapping.status = 'failed';
          mapping.error = error instanceof Error ? error.message : String(error);
        }
      }
    }
    if (!options.dryRun) {
      const manifest: Manifest = {
        version: 1,
        generatedAt: existing?.generatedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mode: 'apply',
        mappings: Object.fromEntries(mappings),
      };
      await saveManifest(options.manifest, manifest);
    }
    console.log(`Processed ${Math.min(index + options.batchSize, pending.length)} of ${pending.length}`);
  }
  if (options.apply) {
    const changed = await updateDatabaseReferences(mappings);
    console.log(JSON.stringify({ mode: 'apply', changed }, null, 2));
  }
  printSummary(mappings, options.dryRun ? 'dry-run' : 'apply');
}

if (process.env.NODE_ENV !== 'test') {
  main().catch((error) => {
    console.error(`Image migration failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
