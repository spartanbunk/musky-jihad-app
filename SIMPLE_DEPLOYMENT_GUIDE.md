# 🎣 Simple AWS Deployment Guide

## 🎯 **Two-Step Deployment Process**

### **Step 1: Push Code to Git & Deploy (Run Locally)**
```bash
# This runs on your local machine
./local-push-deploy.sh
```
**What it does:**
1. ✅ Backs up your local files  
2. ✅ Commits and pushes current code to git
3. ✅ Copies deployment script to AWS server
4. ✅ Triggers deployment on AWS server (pulls latest from git)
5. ✅ Shows you the live URLs when done

### **Step 2: That's it!** 
Your app is live at: `https://3.149.167.85:3010` 🚀

---

## 📱 **What Gets Deployed**

After deployment, you'll have:
- ✅ **Frontend**: `https://3.149.167.85:3010` (HTTPS enabled!)
- ✅ **Backend API**: `https://3.149.167.85:3011`  
- ✅ **Database**: PostgreSQL with all your catches
- ✅ **Mobile GPS**: Works on phones (HTTPS fixes it!)
- ✅ **Voice Commands**: Work on mobile devices
- ✅ **Responsive UI**: Mobile-friendly layout

---

## 🚀 **Quick Commands**

```bash
# Full deployment (backup, push, deploy)
./local-push-deploy.sh

# Check if deployment is working  
./local-push-deploy.sh status

# See recent logs from server
./local-push-deploy.sh logs

# Quick update (just code changes)
./local-push-deploy.sh update
```

---

## ⚙️ **How It Actually Works**

### **Local Script** (`local-push-deploy.sh`)
1. Creates backup of your current work
2. Commits and pushes to your git repository
3. Copies `deploy-aws-server.sh` to AWS server
4. SSH to AWS server and runs the deployment script

### **AWS Server Script** (`deploy-aws-server.sh`)  
1. Pulls latest code from your git repository
2. Installs Docker, Node.js, etc. (first time only)
3. Builds production Docker containers
4. Creates SSL certificates for HTTPS
5. Starts all services with `docker-compose`

### **The Magic**: 
- Your local changes → Git → AWS server pulls from git → Builds & deploys
- No need to copy files manually
- Server always gets the latest code from git
- Clean, repeatable deployments

---

## 🔧 **Before First Deployment**

### 1. **Update Git Repository URL**
In `deploy-aws-server.sh`, update line 18:
```bash
GIT_REPO="https://github.com/YOURUSERNAME/musky_jihad.git"
```

### 2. **Ensure AWS Access**
- SSH key added to EC2 instance
- Security groups allow ports: 22, 80, 443, 3010, 3011
- Instance is running

### 3. **API Keys** (Update After Deployment)
SSH to server and edit:
```bash
ssh ubuntu@3.149.167.85
sudo nano /opt/musky-jihad/.env.production

# Update these:
OPENWEATHER_API_KEY=your_actual_key
GOOGLE_MAPS_API_KEY=your_actual_key  
PERPLEXITY_API_KEY=your_actual_key
```

---

## 🎣 **Test Your Deployment**

After running `./local-push-deploy.sh`:

1. **Open** `https://3.149.167.85:3010` in browser
2. **Accept** SSL warning (self-signed certificate)
3. **Test GPS** on your phone (should work with HTTPS!)
4. **Try voice commands** on mobile
5. **Log a test catch** to verify database

---

## 🔍 **Troubleshooting**

### **Can't SSH to server?**
```bash
# Test SSH connection
ssh ubuntu@3.149.167.85

# Check AWS security groups - need port 22 open
```

### **Services not starting?**
```bash
# Check logs
./local-push-deploy.sh logs

# SSH to server and check manually
ssh ubuntu@3.149.167.85
cd /opt/musky-jihad
sudo docker-compose -f docker-compose.production.yml ps
```

### **GPS still not working on mobile?**
- Make sure you're using `https://` (not `http://`)
- Browser might cache the HTTP version
- Try private/incognito window

---

## ✨ **The Result**

After deployment, you'll have a production-ready Lake St. Clair Musky Intelligence app with:
- 🌊 Real-time weather and water conditions
- 🎣 Voice-activated catch logging  
- 🗺️ GPS location tracking (mobile-friendly!)
- 📱 Responsive design for all devices
- 🐟 AI-powered fishing recommendations
- 💾 Persistent database storage

**Ready to catch some muskies!** 🎣