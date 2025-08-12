# 🔑 GitHub Personal Access Token Setup

## 🚨 **Issue**: GitHub password authentication no longer works

GitHub requires Personal Access Tokens (PAT) instead of passwords for git operations.

## ⚡ **Quick Fix: Create GitHub Token**

### **Step 1: Create Personal Access Token**
1. **Go to:** https://github.com/settings/tokens
2. **Click:** "Generate new token (classic)"
3. **Settings:**
   - Note: `Musky App Deployment`
   - Expiration: `90 days` (or longer)
   - **Scopes:** Check these boxes:
     - ✅ `repo` (all repo permissions)
     - ✅ `workflow` (if using GitHub Actions)
4. **Click:** "Generate token"
5. **Copy the token** (starts with `ghp_...`) - **Save it somewhere safe!**

### **Step 2: Use Token Instead of Password**
When git asks for username/password:
- **Username:** `spartanbunk@gmail.com` (or just `spartanbunk`)
- **Password:** `ghp_your_token_here` (paste your token)

---

## 🎯 **Alternative: Configure Git to Remember Token**

### **Option A: Configure Git Credentials**
```bash
# Set up credential helper (Windows)
git config --global credential.helper manager-core

# Or for Linux/Mac:
git config --global credential.helper store
```

### **Option B: Update Remote URL with Token**
```bash
# Replace with your actual token
git remote set-url origin https://ghp_YOUR_TOKEN_HERE@github.com/spartanbunk/musky_jihad.git
```

### **Option C: Use GitHub CLI**
```bash
# Install GitHub CLI and authenticate
gh auth login
# Follow prompts to authenticate with browser
```

---

## 🚀 **For AWS Deployment**

### **Option 1: Use Public Repository (Easiest)**
Make your repository public temporarily:
1. **GitHub** → Your repo → Settings
2. **Scroll down** → Danger Zone → Change visibility
3. **Make public** → Deployment won't need authentication
4. **Make private again** after deployment

### **Option 2: Use Token on Server**
In EC2 Instance Connect, use:
```bash
# Clone with token embedded
git clone https://ghp_YOUR_TOKEN_HERE@github.com/spartanbunk/musky_jihad.git /opt/musky-jihad
```

### **Option 3: Upload Code Manually**
1. **Download ZIP** from GitHub (green "Code" button)
2. **Upload to server** via AWS Console file manager
3. **Extract and deploy**

---

## ⚡ **Immediate Solution**

**For fastest deployment right now:**

1. **Make repo public temporarily:**
   - GitHub → musky_jihad → Settings → Scroll down → Change visibility → Public

2. **In EC2 Instance Connect:**
   ```bash
   git clone https://github.com/spartanbunk/musky_jihad.git /opt/musky-jihad
   cd /opt/musky-jihad
   git checkout musky-jihad-android
   chmod +x deploy-aws-server.sh
   sudo ./deploy-aws-server.sh
   ```

3. **Make repo private again** after deployment

---

## 🔧 **Long-term Setup**

**After deployment, set up token properly:**

```bash
# Create token at: https://github.com/settings/tokens
# Then configure git:
git config --global credential.helper manager-core

# Next git push will ask for token instead of password
```

**Your musky app will be deployed and mobile GPS will work with HTTPS!** 🎣