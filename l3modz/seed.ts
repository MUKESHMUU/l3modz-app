import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Define the temporary schemas directly here so the script can run standalone
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String }, 
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
});

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  image: { type: String },
  description: { type: String },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  title: String,
  slug: { type: String, unique: true },
  price: Number,
  originalPrice: Number,
  images: [String],
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  categories: [String],
  description: String,
  features: [String],
  specs: { sku: String, material: String, installation: String },
  compatibility: [{ brand: String, model: String, year: String }],
  rating: Number,
  numReviews: Number,
  inStock: Boolean,
});

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<username>')) {
    console.error("❌ ERROR: Please replace the MONGODB_URI in your .env.local with your real MongoDB connection string.");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("✅ Connected!");

    const User = mongoose.models.User || mongoose.model('User', userSchema);
    const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

    console.log("Clearing existing data...");
    await User.deleteMany({});
    await Product.deleteMany({});

    console.log("Creating Admin User...");
    const salt = await bcrypt.genSalt(10);
    const defaultSeedPassword = process.env.SEED_ADMIN_PASSWORD || (process.env.NODE_ENV !== 'production' ? 'l3modz@admin2022' : '');
    if (!defaultSeedPassword) {
      throw new Error('SEED_ADMIN_PASSWORD is required in production');
    }
    const hashedPassword = await bcrypt.hash(defaultSeedPassword, salt);
    
    await User.create({
      name: 'Super Admin',
      email: 'admin@l3modz.com',
      phone: '7708969064',
      password: hashedPassword,
      role: 'admin'
    });
    console.log("✅ Admin created. Use configured ADMIN_EMAIL and ADMIN_PASSWORD to login.");

    console.log("Adding dummy products...");
    const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
    await Category.deleteMany({});

    const defaultCategories = [
      { name: 'Footrests', slug: 'footrest', image: '/footrest-l321.png', description: 'Premium footrests and riding pegs.' },
      { name: 'Radiator Guards', slug: 'radiator-guards', image: '/radiator-guard-l3.png', description: 'Radiator and engine protection guards.' },
      { name: 'Carriers', slug: 'carriers', image: '/carriers.png', description: 'Rear carriers and luggage-ready racks.' },
      { name: 'Accessories', slug: 'accessories', image: '/accessories.png', description: 'Daily-use motorcycle accessories.' },
    ];

    const createdCategories = await Category.create(defaultCategories);
    const categoryMap = new Map(createdCategories.map((cat: any) => [cat.slug, cat._id]));
    await Product.create([
      {
        title: 'Dominar 400 Premium Crash Guard with Sliders',
        slug: 'dominar-400-crash-guard',
        price: 4500,
        originalPrice: 5500,
        images: ['https://images.unsplash.com/photo-1558981403-c5f9899a289f?w=800&q=80', 'https://images.unsplash.com/photo-1558980664-ce6960e61139?w=800&q=80'],
        categoryId: categoryMap.get('accessories') ?? undefined,
        categories: ['crash-guards', 'dominar-400'],
        rating: 4.8,
        numReviews: 124,
        features: ['Direct Fit', 'Heavy Duty Tube', 'Nylon Sliders', 'Rust Proof Coating'],
        description: 'Protect your Dominar 400 with our ultra-durable crash guard. Built with heavy-duty steel tubes to withstand heavy impacts.',
        specs: { sku: 'L3-DOM400-CG01', material: 'Cold Rolled Steel', installation: 'Direct Bolt-on' },
        compatibility: [
          { brand: 'Bajaj', model: 'Dominar 400', year: '2023' },
          { brand: 'Bajaj', model: 'Dominar 400', year: '2022' },
        ],
        inStock: true
      },
      {
        title: 'Royal Enfield Himalayan Saddle Stay Set',
        slug: 'himalayan-saddle-stay',
        price: 2200,
        originalPrice: 2800,
        images: ['https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=500&q=80'],
        categoryId: categoryMap.get('carriers') ?? undefined,
        categories: ['carriers', 'royal-enfield'],
        rating: 4.5,
        numReviews: 89,
        features: ['Luggage Support', 'Weatherproof', 'Easy Mount'],
        description: 'Carry your luggage securely on rough terrains with these heavy-duty saddle stays.',
        specs: { sku: 'L3-REH-SS01', material: 'Steel Tubing', installation: 'Bolt-on' },
        compatibility: [{ brand: 'Royal Enfield', model: 'Himalayan', year: 'All' }],
        inStock: true
      },
      {
        title: 'L3 Adventure Carrier Rack for Scrambler 400X',
        slug: 'scrambler-400x-adventure-carrier-rack',
        price: 3899,
        originalPrice: 4599,
        images: [
          'https://images.unsplash.com/photo-1558981403-c5f9899a289f?w=1200&q=80',
          'https://images.unsplash.com/photo-1558980664-ce6960e61139?w=1200&q=80'
        ],
        categoryId: categoryMap.get('carriers') ?? undefined,
        categories: ['carriers', 'triumph', 'scrambler-400x'],
        rating: 4.7,
        numReviews: 58,
        features: [
          'Direct Fit',
          'Powder Coated Finish',
          'Top Box Ready',
          'Pillion Friendly Design',
          'Weatherproof Hardware',
          'Vibration Tested'
        ],
        description: 'Purpose-built rear carrier rack for the Triumph Scrambler 400X. Designed for daily utility and touring loads while preserving pillion comfort and exhaust clearance. Reinforced side supports improve rigidity and keep luggage stable over rough roads.',
        specs: {
          sku: 'L3-TRI-S400X-CR01',
          material: 'CNC Laser Cut MS with Black Powder Coat',
          installation: 'Direct Bolt-on (No drilling)'
        },
        compatibility: [
          { brand: 'Triumph', model: 'Scrambler 400X', year: '2024' },
          { brand: 'Triumph', model: 'Scrambler 400X', year: '2025' },
          { brand: 'Triumph', model: 'Scrambler 400X', year: '2026' }
        ],
        inStock: true
      }
    ]);
    console.log("✅ Products seeded!");

    console.log("🎉 Seeding successful! You can now log into the Admin panel.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
