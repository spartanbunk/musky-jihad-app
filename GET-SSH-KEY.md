# 🔑 How to Get SSH Key for AWS EC2

## 🎯 **Option 1: Create New Key Pair (Recommended)**

### **AWS Console Steps:**
1. **Go to AWS Console** → EC2 Dashboard
2. **Left sidebar** → Key Pairs (under Network & Security)
3. **Click "Create key pair"**
4. **Settings:**
   - Name: `musky-app-key`
   - Key pair type: `RSA`
   - Private key format: `.pem`
5. **Click "Create key pair"**
6. **Download starts automatically** → Save as `musky-app-key.pem`

### **Add Key to Your Instance:**
1. **Stop your instance** (3.149.167.85)
2. **Right-click instance** → Instance Settings → Change Key Pair
3. **Select your new key pair**
4. **Start instance**

---

## 🎯 **Option 2: Use EC2 Instance Connect**

### **Browser-based SSH (No key needed):**
1. **AWS Console** → EC2 → Instances
2. **Select your instance** (3.149.167.85)  
3. **Click "Connect" button**
4. **Choose "EC2 Instance Connect"**
5. **Username:** `ubuntu`
6. **Click "Connect"**

### **Then run deployment directly in browser terminal:**
```bash
# Clone your repository
git clone -b musky-jihad-android https://github.com/yourusername/musky_jihad.git
cd musky_jihad

# Make deployment script executable
chmod +x deploy-aws-server.sh

# Run deployment
./deploy-aws-server.sh
```

---

## 🎯 **Option 3: Use Systems Manager Session Manager**

### **No SSH key required:**
1. **AWS Console** → Systems Manager
2. **Session Manager** → Start Session
3. **Select your instance**
4. **Click "Start session"**

### **Then run commands in the web terminal:**
```bash
# Switch to home directory
cd /home/ubuntu

# Download deployment script (copy from your local machine)
nano deploy-aws-server.sh
# Paste the script content, Ctrl+X to save

# Make executable
chmod +x deploy-aws-server.sh

# Run deployment
./deploy-aws-server.sh
```

---

## 🎯 **Option 4: Create Brand New Instance**

### **If current instance is problematic:**
1. **AWS Console** → EC2 → Launch Instance
2. **Settings:**
   - AMI: Ubuntu 22.04 LTS
   - Instance type: t3.medium
   - **Key pair:** Create new key pair (download .pem)
   - **Security Group:** Create new with these ports:
     - SSH (22) - Your IP
     - HTTP (80) - Anywhere  
     - HTTPS (443) - Anywhere
     - Custom (3010) - Anywhere
     - Custom (3011) - Anywhere
3. **Launch instance**
4. **Note the new IP address**
5. **Update deployment scripts with new IP**

---

## ⚡ **Quick Start - Use Option 2**

**Easiest method (no downloads):**

1. **AWS Console** → EC2 → Select your instance
2. **Connect** → EC2 Instance Connect → Connect
3. **In the web terminal, run:**
```bash
# Download latest code
git clone -b musky-jihad-android https://github.com/yourusername/musky_jihad.git /opt/musky-jihad

# Go to app directory  
cd /opt/musky-jihad

# Update git repo URL in script (replace with your actual repo)
sed -i 's|GIT_REPO=".*"|GIT_REPO="https://github.com/yourusername/musky_jihad.git"|g' deploy-aws-server.sh

# Run deployment
./deploy-aws-server.sh
```

4. **Your app will be live at:** `https://3.149.167.85:3010`

---

## 🔧 **After Getting SSH Access**

**Once you have the key or connection working:**

```bash
# Test SSH connection
ssh -i musky-app-key.pem ubuntu@3.149.167.85

# Run our deployment script
./local-push-deploy.sh
```

---

## 💡 **Recommended Path**

**For fastest deployment:**
1. Use **EC2 Instance Connect** (Option 2) - works immediately
2. Run deployment directly on server via web browser
3. Download SSH key later for future deployments

**Result:** Your musky app deployed with HTTPS and mobile GPS working! 🎣