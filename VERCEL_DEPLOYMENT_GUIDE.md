# Vercel Deployment Guide for Trip-Split

This guide will walk you through deploying your Trip-Split application to Vercel.

## Prerequisites

- A GitHub account with your code pushed to a repository
- A Vercel account (sign up at [vercel.com](https://vercel.com))
- Firebase project credentials

## Deployment Steps

### 1. Import Your Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `Iampranav009/trip-split`
4. Vercel will automatically detect it's a Vite project

### 2. Configure Build Settings

Vercel should auto-detect these settings, but verify:

- **Framework Preset:** Vite
- **Build Command:** `npm run build` or `vite build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### 3. Set Environment Variables

In the Vercel project settings, add the following environment variables:

**Go to:** Project Settings → Environment Variables

Add these variables (use your Firebase credentials):

```
VITE_FIREBASE_API_KEY=AIzaSyBeEKms--stcyW5VmR4pQNJ4rEeyONU0Cc
VITE_FIREBASE_AUTH_DOMAIN=travle-planer.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=travle-planer
VITE_FIREBASE_STORAGE_BUCKET=travle-planer.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=272409549250
VITE_FIREBASE_APP_ID=1:272409549250:web:0acf5524884a6d5c84de5b
```

**Important:** Make sure to select all environments (Production, Preview, and Development) for each variable.

### 4. Deploy

1. Click **"Deploy"**
2. Vercel will:
   - Install dependencies
   - Build your project
   - Deploy to a production URL

The deployment usually takes 1-3 minutes.

### 5. Configure Firebase for Your Vercel Domain

After deployment, you'll get a URL like: `https://trip-split-abc123.vercel.app`

You need to add this domain to Firebase:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `travle-planer`
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Click **"Add domain"**
5. Add your Vercel domain (e.g., `trip-split-abc123.vercel.app`)
6. Also add any preview deployment domains if needed (e.g., `trip-split-*.vercel.app`)

### 6. Test Your Deployment

1. Visit your Vercel deployment URL
2. Test the authentication flow
3. Create a trip and add expenses
4. Verify all features work correctly

## Continuous Deployment

Vercel automatically sets up continuous deployment:

- **Push to `main` branch** → Deploys to production
- **Push to other branches** → Creates preview deployments
- **Pull requests** → Get unique preview URLs

## Custom Domain (Optional)

To use a custom domain:

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow Vercel's DNS configuration instructions
4. Don't forget to add the custom domain to Firebase Authorized domains

## Troubleshooting

### Build Fails

- Check the build logs in Vercel
- Ensure all dependencies are in `package.json`
- Verify environment variables are set correctly

### Authentication Not Working

- Verify Firebase domain authorization
- Check environment variables are set
- Look at browser console for errors

### Blank Page After Deployment

- Check if `vercel.json` is properly configured
- Verify the `dist` folder is being created during build
- Check browser console for errors

## Environment Variables Security

✅ **Best Practices:**
- Never commit `.env` files to Git
- Use Vercel's environment variables feature
- Rotate API keys if they're exposed publicly

## Support

If you encounter issues:
1. Check [Vercel Documentation](https://vercel.com/docs)
2. Review [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
3. Check Firebase Console for authentication errors

## Files Created for Deployment

This project includes:
- `vercel.json` - Vercel configuration for SPA routing
- `.env.example` - Template for environment variables
- Updated `firebaseConfig.ts` - Uses environment variables
- `.gitignore` - Excludes sensitive files from Git

---

**Your app is now ready to deploy to Vercel! 🚀**

Once deployed, share your deployed URL with users to access the Trip-Split app from anywhere!
