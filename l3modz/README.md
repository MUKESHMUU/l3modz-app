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

## Deployment: Vercel Frontend + Render Backend

### 🎯 **Architecture**

- **Frontend**: React/Vite → Deployed on **Vercel**
- **Backend**: Next.js API → Deployed on **Render**
- **Database**: MongoDB Atlas
- **External Services**: Razorpay, Cloudinary, ShipRocket

### Step 1: Prerequisites

1. **Create accounts**:
   - [Vercel](https://vercel.com) - for frontend
   - [Render](https://render.com) - for backend
   - [MongoDB Atlas](https://cloud.mongodb.com) - database
   - [Razorpay](https://razorpay.com) - payments
   - [Cloudinary](https://cloudinary.com) - images
   - [ShipRocket](https://shiprocket.in) - shipping

2. **Connect GitHub** to both Vercel and Render

### Step 2: Set Up External Services

#### MongoDB Atlas

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a new cluster
3. Create a database user
4. Get your connection string (looks like: `mongodb+srv://user:pass@cluster.mongodb.net/dbname`)
5. Whitelist IP: `0.0.0.0/0` (or add specific IPs)

#### Razorpay

1. Create account at [razorpay.com](https://razorpay.com)
2. Go to Dashboard > Settings > API Keys
3. Copy **Key ID** and **Key Secret**
4. Note: Use test keys for development, live keys for production

#### Cloudinary

1. Create account at [cloudinary.com](https://cloudinary.com)
2. Go to Dashboard
3. Copy **Cloud Name**, **API Key**, **API Secret**

#### ShipRocket

1. Create account at [shiprocket.in](https://shiprocket.in)
2. Get your **email** and **password** for API

### Step 3: Deploy Backend to Render

#### A. Prepare Your Next.js App

Make sure you have a `vercel.json` or `render.yaml` in `l3modz/`:

```json
{
  "version": 3,
  "builds": [
    { "src": "package.json", "use": "@vercel/next" }
  ]
}
```

#### B. Deploy on Render

1. **Go to [render.com](https://render.com)** and sign in

2. **Click "New +"** → **"Web Service"**

3. **Connect GitHub repository**:
   - Select your `l3-modz` repo
   - Connect

4. **Configure the service**:
   - **Name**: `l3modz-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd l3modz && npm install && npm run build`
   - **Start Command**: `cd l3modz && npm start`
   - **Root Directory**: Leave empty (Render uses this automatically)

5. **Add Environment Variables** (in Render dashboard):
   - `MONGODB_URI` - from MongoDB Atlas
   - `NEXTAUTH_SECRET` - create a random secret
   - `NEXTAUTH_URL` - your Render backend URL (e.g., `https://l3modz-backend.onrender.com`)
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID` - from Razorpay
   - `RAZORPAY_KEY_SECRET` - from Razorpay
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` - from Cloudinary
   - `CLOUDINARY_API_KEY` - from Cloudinary
   - `CLOUDINARY_API_SECRET` - from Cloudinary
   - `SHIPROCKET_EMAIL` - from ShipRocket
   - `SHIPROCKET_PASSWORD` - from ShipRocket
   - `ADMIN_SECRET` - create a random secret
   - `JWT_SECRET` - create a random secret

6. **Select Plan**: Free tier works for testing

7. **Create Web Service**

8. **Wait for deployment** (5-10 minutes)

9. **Note your Render URL**: `https://l3modz-backend.onrender.com` (save this!)

#### C. First Deploy May Fail (Normal!)

If build fails:
1. Check Render logs for errors
2. Ensure MongoDB connection string is correct
3. Verify all environment variables are set
4. Render may need 2-3 deploys to work (free tier limitation)

### Step 4: Deploy Frontend to Vercel

#### A. Update API Proxy

Update `l3modz/frontend/vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://l3modz-backend.onrender.com', // ← Your Render backend URL
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
```

Replace with your actual Render URL!

#### B. Deploy on Vercel

1. **Go to [vercel.com/dashboard](https://vercel.com/dashboard)**

2. **Click "New Project"**

3. **Import GitHub repository** (`l3-modz`)

4. **Configure**:
   - **Framework Preset**: Vite
   - **Root Directory**: `l3modz/frontend` ⭐
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. **Add Environment Variables**:
   - `VITE_API_BASE_URL` = `https://l3modz-backend.onrender.com`
   - `VITE_RAZORPAY_KEY_ID` = from Razorpay

6. **Deploy**

7. **Your Vercel URL**: `https://l3modz.vercel.app` (or your custom domain)

### Step 5: Post-Deployment Setup

#### A. Update CORS (if needed)

In your Next.js backend (`l3modz/app/api/*`), add CORS headers:

```typescript
// In your API routes
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://l3modz.vercel.app',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

#### B. Update Frontend Environment

In `l3modz/frontend/.env.local`:

```env
VITE_API_BASE_URL=https://l3modz-backend.onrender.com
VITE_RAZORPAY_KEY_ID=rzp_test_yourkeyid
```

#### C. Test Everything

1. Visit your Vercel frontend: `https://l3modz.vercel.app`
2. Test user registration
3. Test product browsing
4. Test payment with Razorpay test mode
5. Check admin panel

### Step 6: Troubleshooting

**Frontend can't reach backend:**
- Check CORS headers
- Verify Render URL is correct in `vite.config.ts`
- Check Render backend is running (check logs)

**Backend on Render times out:**
- Free tier may be slow
- Upgrade to paid plan if needed
- Render spins down free tier after 15 mins inactivity

**Database connection fails:**
- Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Check connection string format
- Ensure database user has correct permissions

**Payment processing fails:**
- Use Razorpay test keys for development
- Check test mode is enabled in Razorpay dashboard

### 📊 **Cost Breakdown**

| Service | Free | Cost |
|---------|------|------|
| Vercel | ✅ | $0-$20/mo |
| Render | ✅ (slow) | $5-$20/mo |
| MongoDB Atlas | ✅ (512MB) | $0-$57+/mo |
| Razorpay | ✅ | 2% transaction |
| Total | ~$0-5 | ~$5-100/mo |

Your entire stack can run **free** with:
- Vercel free tier for frontend
- Render free tier for backend (slow)
- MongoDB Atlas free tier (512MB)
- Razorpay sandbox mode (testing)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Deployment Guide](https://vercel.com/docs/deployments/overview)
- [Render Deployment Guide](https://render.com/docs)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [Razorpay Integration](https://razorpay.com/docs/)
