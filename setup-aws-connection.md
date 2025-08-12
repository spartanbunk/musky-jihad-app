# 🔧 AWS Connection Setup Guide

## 🚨 **Issue**: Cannot SSH to 3.149.167.85

The deployment script failed because it can't connect to your AWS EC2 instance. Here's how to fix it:

## 🔑 **Step 1: Check SSH Key**

### **Do you have the .pem key file for this EC2 instance?**
```bash
# If you have the key file (e.g., musky-app-key.pem), add it:
ssh-add path/to/your-key.pem

# Or specify it directly:
ssh -i path/to/your-key.pem ubuntu@3.149.167.85
```

### **If you don't have the key:**
1. Go to AWS EC2 Console
2. Select your instance (3.149.167.85)
3. Actions → Security → Get Windows Password (if Windows) or create new key pair

## 🔐 **Step 2: Check Security Group**

### **AWS Console Steps:**
1. Go to **EC2 Console**
2. Select your instance
3. Click **Security** tab
4. Click on the **Security Group** link
5. **Edit Inbound Rules**
6. Add these rules if missing:

| Type | Port | Source | Description |
|------|------|--------|-------------|
| SSH | 22 | Your IP | SSH access |
| HTTP | 80 | 0.0.0.0/0 | Web traffic |
| HTTPS | 443 | 0.0.0.0/0 | Secure web |
| Custom | 3010 | 0.0.0.0/0 | Frontend app |
| Custom | 3011 | 0.0.0.0/0 | Backend API |

## 🖥️ **Step 3: Check Instance Status**

### **AWS Console:**
1. Go to **EC2 Console**
2. Find instance with IP **3.149.167.85**
3. Check **Instance State** = "running"
4. Check **Status Checks** = "2/2 checks passed"

### **If instance is stopped:**
- Select instance → Actions → Instance State → Start

## 🧪 **Step 4: Test Connection**

### **Option A: Test SSH manually**
```bash
# Replace with your actual key path
ssh -i ~/.ssh/your-key.pem ubuntu@3.149.167.85

# Or if using ssh-agent:
ssh ubuntu@3.149.167.85
```

### **Option B: Use EC2 Instance Connect (Browser)**
1. AWS Console → EC2 → Your Instance
2. Click **Connect** button
3. Choose **EC2 Instance Connect**
4. Click **Connect** (opens terminal in browser)

## 🔄 **Step 5: Alternative Deployment Methods**

### **Method 1: Manual Deployment**
If SSH still doesn't work, you can deploy manually:

1. **Copy deployment script via AWS Systems Manager:**
   - AWS Console → Systems Manager → Session Manager
   - Start session with your instance
   - Copy/paste the deployment script content

2. **Use EC2 User Data:**
   - Stop instance
   - Actions → Instance Settings → Edit User Data
   - Paste deployment script
   - Start instance (script runs automatically)

### **Method 2: Use Different Instance**
Create a new EC2 instance with:
- Ubuntu 22.04 LTS
- Generate new key pair (download .pem file)
- Configure security group properly from start

## ⚡ **Quick Fix Commands**

### **If you have the key file:**
```bash
# Add key to SSH agent
ssh-add path/to/your-musky-app-key.pem

# Test connection
ssh ubuntu@3.149.167.85

# If successful, run deployment:
./local-push-deploy.sh
```

### **If using Windows:**
```bash
# Use WSL for SSH
wsl ssh ubuntu@3.149.167.85

# Or use PuTTY:
# - Load your .ppk key file
# - Connect to 3.149.167.85:22
# - Username: ubuntu
```

## 📞 **Need the Instance Details?**

**Tell me:**
1. Do you have the SSH key (.pem file) for this instance?
2. Is the instance currently running in AWS console?
3. What's the security group configuration?

**Or provide:**
- The key file path
- Instance ID (i-xxxxxxxxx)
- Security group settings

Once we fix the SSH connection, the deployment script will work perfectly! 🚀

---

## 🎯 **Once SSH Works**

After fixing SSH access, simply run:
```bash
./local-push-deploy.sh
```

And your Lake St. Clair Musky app will be deployed with:
- ✅ HTTPS enabled (fixes mobile GPS!)
- ✅ Voice commands working on phones
- ✅ Responsive mobile layout
- ✅ Full production environment

🎣 **Ready to catch some muskies!**