This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT, bcryptjs
- **Payments**: Razorpay
- **Image Upload**: Cloudinary
- **Shipping**: ShipRocket
- **Deployment**: Vercel

## Getting Started (Local Development)

1. **Clone the repository**

   ```bash
   git clone https://github.com/dinesh-mca12/l3-modz.git
   cd l3modz
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your actual values in `.env.local`

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)**

## Environment Variables Required

See `.env.example` for all required environment variables. You need to set up:

- **MongoDB Atlas** database
- **Razorpay** payment gateway account
- **Cloudinary** for image uploads
- **ShipRocket** for shipping
- **JWT secrets** for authentication

## Deploy on Vercel

### 🎯 **Important: Monorepo Structure**

Your project has both:

- **`l3modz/`** - Complete Next.js full-stack app (frontend + API routes)
- **`l3modz/frontend/`** - Separate React/Vite frontend

**Recommendation: Deploy only the Next.js app** (`l3modz/`) - it's your complete application!

### Option 1: Deploy Next.js Backend Only (Recommended)

Your Next.js app is a complete full-stack application with both frontend pages and API routes.

#### Steps:

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Configure the project**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `l3modz` ⭐ **(This is crucial!)**
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. **Add Environment Variables** (from `.env.example`)
6. **Deploy**

### Option 2: Deploy Frontend Separately

If you want to deploy the React/Vite frontend (`l3modz/frontend/`) separately:

#### For the Frontend:

1. **Create a new Vercel project**
2. **Set Root Directory**: `l3modz/frontend`
3. **Framework Preset**: Vite
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. **Add environment variables** for API endpoints

#### For the Backend:

1. **Deploy Next.js app** as above
2. **Update frontend** to point to deployed backend API URLs

### Step 1: Prerequisites

1. **Create accounts** (if you don't have them):
   - [Vercel](https://vercel.com)
   - [MongoDB Atlas](https://cloud.mongodb.com)
   - [Razorpay](https://razorpay.com)
   - [Cloudinary](https://cloudinary.com)
   - [ShipRocket](https://shiprocket.in)

2. **Connect your GitHub account to Vercel**

### Step 2: Set up External Services

#### MongoDB Atlas

1. Create a new cluster
2. Create a database user
3. Get your connection string
4. Whitelist your IP (or 0.0.0.0/0 for all)

#### Razorpay

1. Create a Razorpay account
2. Get your Key ID and Secret from Dashboard > Settings > API Keys

#### Cloudinary

1. Create a Cloudinary account
2. Get your Cloud Name, API Key, and API Secret from Dashboard

#### ShipRocket

1. Create a ShipRocket account
2. Get your email and password for API authentication

### Step 3: Deploy to Vercel

#### Option A: Deploy from GitHub (Recommended)

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**

2. **Click "New Project"**

3. **Import your GitHub repository**:
   - Connect your GitHub account
   - Select the `l3-modz` repository

4. **Configure the project**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `l3modz` ⭐ **(This is crucial for monorepo!)**
   - **Build Command**: `npm run build` (should be automatic)
   - **Output Directory**: `.next` (should be automatic)

5. **Add Environment Variables**:
   In the Vercel dashboard, go to your project settings and add all variables from `.env.example`:
   - `MONGODB_URI`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (set to your Vercel app URL)
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `SHIPROCKET_EMAIL`
   - `SHIPROCKET_PASSWORD`
   - `ADMIN_SECRET`
   - `JWT_SECRET`

6. **Deploy**:
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `https://your-project-name.vercel.app`

#### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**:

   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:

   ```bash
   vercel login
   ```

3. **Deploy**:

   ```bash
   cd l3modz
   vercel --prod
   ```

4. **Set environment variables**:
   ```bash
   vercel env add MONGODB_URI
   vercel env add NEXTAUTH_SECRET
   # ... add all other variables
   ```

### Step 4: Post-Deployment Configuration

1. **Update NEXTAUTH_URL**:
   - In Vercel dashboard, update `NEXTAUTH_URL` to your production URL
   - Example: `https://l3modz.vercel.app`

2. **Database Connection**:
   - Ensure MongoDB Atlas allows connections from `0.0.0.0/0` or add Vercel's IP ranges

3. **Domain Setup** (Optional):
   - In Vercel dashboard, go to Settings > Domains
   - Add your custom domain if needed

4. **Environment Variables Check**:
   - Go to your deployed app
   - Check if all features work (payments, image uploads, etc.)

### Step 5: Testing Your Deployment

1. **Visit your deployed app**
2. **Test user registration/login**
3. **Test product browsing**
4. **Test payment flow** (use Razorpay test mode)
5. **Test admin panel** (if applicable)

### Troubleshooting

**Build fails**:

- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify environment variables are set correctly

**Database connection issues**:

- Check MongoDB Atlas network access
- Verify connection string format
- Ensure database user has correct permissions

**Payment issues**:

- Verify Razorpay keys are correct
- Check if you're using test/live mode appropriately

**Image upload issues**:

- Verify Cloudinary credentials
- Check upload presets if using custom configurations

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Deployment Guide](https://vercel.com/docs/deployments/overview)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [Razorpay Integration](https://razorpay.com/docs/)
