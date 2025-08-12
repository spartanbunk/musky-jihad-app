# 🚀 Lake St. Clair Musky App - Production Deployment Guide

## 📋 Prerequisites

### AWS EC2 Setup
1. **EC2 Instance**: Ubuntu 22.04 LTS (t3.medium or larger recommended)
2. **IP Address**: 3.149.167.85
3. **Security Groups**: Open ports 22 (SSH), 80 (HTTP), 443 (HTTPS), 3010 (Frontend), 3011 (Backend)
4. **SSH Access**: Your SSH key added to the instance

### Local Requirements
- **Git**: For version control
- **Docker**: For building production images
- **SSH Client**: For deployment
- **WSL2** (Windows only): For running bash scripts

## 🎯 Quick Deployment

### Option 1: Windows (Batch File)
```cmd
# Run in Windows Command Prompt
deploy-production.bat
```

### Option 2: Linux/Mac/WSL (Bash Script)
```bash
# Make executable (first time only)
chmod +x deploy-production.sh

# Run deployment
./deploy-production.sh
```

## 📖 Deployment Script Features

### ✅ Automated Steps
1. **Prerequisites Check**: Git, Docker, SSH connectivity
2. **Backup Creation**: Database and project backup
3. **Git Operations**: Commit and push current state
4. **Production Build**: Docker images optimized for production
5. **AWS Deployment**: Copy and deploy to EC2 instance
6. **SSL Setup**: Self-signed certificates (replace with Let's Encrypt)
7. **Status Check**: Verify deployment success

### 🛠️ Script Commands
```bash
# Full deployment (default)
./deploy-production.sh
./deploy-production.sh deploy

# Check deployment status
./deploy-production.sh status

# Setup SSL certificates only
./deploy-production.sh ssl
```

## 🌍 Environment Configuration

The script creates a production environment with:

### Production URLs
- **Frontend**: `https://3.149.167.85:3010`
- **Backend**: `https://3.149.167.85:3011`
- **Database**: PostgreSQL on port 5432

### Required Environment Variables
Update these in `.env.production` on the server:
```env
OPENWEATHER_API_KEY=your_openweather_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_key_here
PERPLEXITY_API_KEY=your_perplexity_key_here
```

## 🔐 SSL/HTTPS Setup

### Development SSL (Automatic)
- Self-signed certificates generated automatically
- Enables GPS access on mobile devices
- Browser will show security warning (normal for self-signed)

### Production SSL (Manual)
Replace self-signed certificates with Let's Encrypt:

```bash
# SSH to your server
ssh ubuntu@3.149.167.85

# Install and configure Let's Encrypt
sudo certbot --nginx -d yourdomain.com
```

## 📱 Mobile GPS Fix

The deployment enables HTTPS, which fixes:
- ✅ GPS access on mobile devices
- ✅ Voice commands on phones
- ✅ PWA installation
- ✅ Modern browser features

## 🔧 Post-Deployment Steps

### 1. Update API Keys
```bash
# SSH to server
ssh ubuntu@3.149.167.85

# Edit environment file
sudo nano /opt/musky-jihad/.env.production

# Restart services
cd /opt/musky-jihad
sudo docker-compose -f docker-compose.production.yml restart
```

### 2. Configure Domain (Optional)
Point your domain DNS to `3.149.167.85`:
```
A Record: @ -> 3.149.167.85
A Record: www -> 3.149.167.85
```

### 3. Setup Let's Encrypt SSL
```bash
# On server
sudo apt install certbot nginx
sudo certbot --nginx -d yourdomain.com
```

## 🔍 Troubleshooting

### Connection Issues
```bash
# Test SSH connection
ssh -v ubuntu@3.149.167.85

# Check security groups in AWS console
# Ensure ports 22, 80, 443, 3010, 3011 are open
```

### Deployment Logs
```bash
# Check deployment status
./deploy-production.sh status

# SSH to server and check logs
ssh ubuntu@3.149.167.85
cd /opt/musky-jihad
sudo docker-compose -f docker-compose.production.yml logs
```

### Service Issues
```bash
# Restart services
ssh ubuntu@3.149.167.85
cd /opt/musky-jihad
sudo docker-compose -f docker-compose.production.yml restart

# Check container status
sudo docker-compose -f docker-compose.production.yml ps
```

## 💾 Backup & Recovery

### Automated Backups
The deployment script creates backups in `./backups/`:
- Database dump: `backup-YYYYMMDD-HHMMSS-database.sql`
- Project archive: `backup-YYYYMMDD-HHMMSS-project.tar.gz`

### Manual Database Backup
```bash
# From local machine
ssh ubuntu@3.149.167.85 "cd /opt/musky-jihad && sudo docker-compose -f docker-compose.production.yml exec -T db pg_dump -U postgres fishing_intelligence" > backup.sql
```

### Restore Database
```bash
# Copy backup to server
scp backup.sql ubuntu@3.149.167.85:~/

# Restore on server
ssh ubuntu@3.149.167.85
cd /opt/musky-jihad
sudo docker-compose -f docker-compose.production.yml exec -T db psql -U postgres fishing_intelligence < ~/backup.sql
```

## 🎯 Success Metrics

After deployment, verify:
- ✅ Frontend accessible at `https://3.149.167.85:3010`
- ✅ Backend API responding at `https://3.149.167.85:3011`
- ✅ GPS works on mobile devices (HTTPS enabled)
- ✅ Voice commands work on phones
- ✅ Database saves catches successfully
- ✅ Maps display catch locations

## 📞 Support

For deployment issues:
1. Check the console output from the deployment script
2. Review the troubleshooting section above
3. Check AWS security groups and instance status
4. Verify SSH key access to the EC2 instance

---

## 🎣 Ready to Fish!

Once deployed, your Lake St. Clair Musky Intelligence app will be live with:
- 🌐 HTTPS for secure mobile GPS access
- 📱 Full PWA functionality on phones
- 🎤 Voice-activated catch logging
- 🗺️ Real-time location tracking
- 🐟 AI-powered fishing recommendations

**Happy fishing and tight lines!** 🎣