# 🚀 Free Deployment Guide for Chess Multiplayer

## Option 1: Railway (Recommended)

### Steps:
1. **Sign up** at [railway.app](https://railway.app) using your GitHub account
2. **Connect your repository**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your chess repository
3. **Deploy automatically**:
   - Railway will detect Node.js and deploy automatically
   - Your app will be live in ~2-3 minutes
4. **Get your URL**: Railway provides a custom domain (e.g., `yourapp.railway.app`)

### Railway Features:
- ✅ $5 free credit monthly
- ✅ WebSocket support
- ✅ Automatic deployments from GitHub
- ✅ Custom domains
- ✅ SSL certificates included

## Option 2: Render

### Steps:
1. **Sign up** at [render.com](https://render.com)
2. **Create Web Service**:
   - Connect GitHub repository
   - Choose "Web Service"
   - Build Command: `npm install`
   - Start Command: `npm start`
3. **Configure**:
   - Environment: `Node`
   - Region: Choose closest to your users
4. **Deploy**: Render will build and deploy automatically

### Render Features:
- ✅ 750 hours/month free
- ✅ WebSocket support
- ✅ Auto-sleep (services sleep after 15min inactivity)
- ✅ Custom domains on paid plans

## Option 3: Fly.io

### Steps:
1. **Install Fly CLI**: Download from [fly.io/docs/hands-on/install-flyctl/](https://fly.io/docs/hands-on/install-flyctl/)
2. **Login**: `flyctl auth login`
3. **Initialize**: `flyctl launch` (in your chess directory)
4. **Deploy**: `flyctl deploy`

### Fly.io Features:
- ✅ Generous free tier
- ✅ WebSocket support
- ✅ Global deployment
- ✅ Dockerfile support

## Option 4: Glitch

### Steps:
1. **Go to** [glitch.com](https://glitch.com)
2. **New Project** → Import from GitHub
3. **Add your repository URL**
4. **Automatic deployment** - Glitch handles the rest!

### Glitch Features:
- ✅ Always free for public projects
- ✅ WebSocket support
- ✅ Code editor in browser
- ✅ Instant deployment

## 🎯 Quick Deployment Commands

### For Railway:
```bash
# Push your code to GitHub first
git add .
git commit -m "Add multiplayer support"
git push origin main

# Then connect GitHub repo to Railway
```

### For Fly.io:
```bash
# Install Fly CLI, then:
flyctl launch
flyctl deploy
```

### For Local Testing:
```bash
npm start
# Visit http://localhost:3000
```

## 🌐 Environment Variables

For production deployment, you might want to set:

```
PORT=3000
NODE_ENV=production
```

## 🔧 Post-Deployment

1. **Test your deployment**:
   - Open your deployed URL
   - Select "Online Multiplayer"
   - Create a room and test with a friend

2. **Update your game**:
   - Any changes pushed to GitHub will auto-deploy (Railway/Render)

3. **Monitor usage**:
   - Check your hosting platform's dashboard for usage stats

## 💡 Tips for Free Hosting

1. **Railway**: Best overall experience, $5/month credit covers most hobby projects
2. **Render**: Great for 24/7 availability with 750 hours
3. **Fly.io**: Best for global reach and Docker deployment
4. **Glitch**: Perfect for learning and quick prototypes

## 🐛 Troubleshooting

### Common Issues:
- **WebSocket connection fails**: Ensure your hosting platform supports WebSockets
- **App sleeps**: On free tiers, apps may sleep after inactivity (normal behavior)
- **Build fails**: Check logs for missing dependencies or Node.js version issues

### Solutions:
- Keep app alive: Ping your app URL every 10-15 minutes
- Check logs: Most platforms provide real-time logging
- Node version: Ensure compatibility (Node 16+ recommended)

---

**Recommended Choice**: Start with **Railway** for the best balance of features and ease of use!
