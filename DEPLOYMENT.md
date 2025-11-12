# Deployment Guide for Render

This guide will help you deploy your Elective Registration System on Render.

## 🚀 Quick Setup

### Prerequisites
- MongoDB Atlas account (or any MongoDB instance)
- GitHub repository with your code
- Render account

---

## 📋 Step-by-Step Deployment

### 1. Backend Deployment (Web Service)

1. **Go to Render Dashboard** → Click "New +" → Select "Web Service"

2. **Connect Repository**
   - Connect your GitHub repository
   - Or use "Deploy from a public repo" if your repo is public

3. **Configure Backend Service:**
   - **Name:** `elective-backend` (or any name you prefer)
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** (leave empty or `npm install`)
   - **Start Command:** `npm start`
   - **Node Version:** `18` or `20` (latest LTS)

4. **Environment Variables:**
   Add these in the "Environment" section:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
   JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
   NODE_ENV=production
   PORT=5000
   ```

5. **Click "Create Web Service"**
   - Wait for deployment to complete
   - Note your backend URL: `https://your-backend-name.onrender.com`

---

### 2. Frontend Deployment (Web Service)

1. **Go to Render Dashboard** → Click "New +" → Select "Web Service"

2. **Connect Repository**
   - Use the same GitHub repository

3. **Configure Frontend Service:**
   - **Name:** `elective-frontend` (or any name you prefer)
   - **Root Directory:** `frontend`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Node Version:** `18` or `20` (latest LTS)

4. **Environment Variables:**
   Add these in the "Environment" section:
   ```
   NODE_ENV=production
   PORT=3000
   ```

5. **Click "Create Web Service"**
   - Wait for deployment to complete
   - Note your frontend URL: `https://your-frontend-name.onrender.com`

---

### 3. Update Frontend API URL

After your backend is deployed, update the frontend to use your backend URL:

1. **Edit:** `frontend/src/services/api.js`

2. **Update the production URL:**
   ```javascript
   const API = axios.create({
     baseURL: import.meta.env.PROD
       ? "https://your-backend-name.onrender.com/api" // Replace with your actual backend URL
       : "http://localhost:5000/api", // Development
   });
   ```

3. **Commit and push** to trigger a new deployment

---

## 🔧 Alternative: Using render.yaml (Blueprints)

If you prefer using Render Blueprints:

1. The `render.yaml` file is already in your root directory
2. Go to Render Dashboard → "New +" → "Blueprint"
3. Connect your repository
4. Render will automatically detect `render.yaml` and create both services
5. **Don't forget to add environment variables** in the Render dashboard:
   - Backend: `MONGO_URI`, `JWT_SECRET`
   - Frontend: None needed (or set `VITE_API_URL` if you want to use env vars)

---

## ✅ Post-Deployment Checklist

- [ ] Backend is running and accessible at `/health` endpoint
- [ ] Frontend is running and accessible
- [ ] Frontend API URL points to your backend
- [ ] Test login functionality
- [ ] Test navigation and page refreshes (should work now!)
- [ ] Test file uploads (student CSV upload)

---

## 🐛 Troubleshooting

### Issue: Frontend shows blank page on refresh
**Solution:** The Express server (`frontend/server.js`) handles this. Make sure:
- Build command includes `npm run build`
- Start command is `npm start`
- The `dist` folder is being created during build

### Issue: CORS errors
**Solution:** Your backend already has `cors()` enabled. If you want to restrict it:
```javascript
// In backend/server.js
app.use(cors({
  origin: ['https://your-frontend-name.onrender.com'],
  credentials: true
}));
```

### Issue: MongoDB connection fails
**Solution:** 
- Check your `MONGO_URI` format
- Make sure your MongoDB Atlas IP whitelist includes `0.0.0.0/0` (all IPs) for Render
- Verify database user has read/write permissions

### Issue: Build fails
**Solution:**
- Check Node version (use 18 or 20)
- Make sure all dependencies are in `package.json`
- Check build logs in Render dashboard

---

## 📝 Notes

- **Free tier:** Render free tier services spin down after 15 minutes of inactivity. First request after spin-down may take 30-60 seconds.
- **Environment variables:** Never commit secrets to Git. Always use Render's environment variables.
- **Auto-deploy:** Render automatically deploys on every push to your main branch (if enabled).

---

## 🔗 Useful Links

- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Setup](https://www.mongodb.com/docs/atlas/getting-started/)
- [React Router Deployment](https://reactrouter.com/en/main/start/overview#deploying)

