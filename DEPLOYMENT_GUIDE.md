# Lake St. Clair Musky App - AWS Deployment Guide

## Server Information
- **AWS IP**: 18.217.224.120
- **GitHub Repo**: https://github.com/spartanbunk/musky-jihad-app.git
- **Branch**: musky-jihad-android
- **Docker**: Already installed on server

## Pre-Deployment Checklist

### 1. API Keys Configuration
The deployment script needs these API keys updated in `.env.production` (line 167-169):
- [ ] **OpenWeather API Key** - Required for weather data
- [x] **Google Maps API Key** - Already valid in script
- [x] **Perplexity API Key** - Already valid in script

### 2. Server Access
```bash
# SSH into the AWS server
ssh ubuntu@18.217.224.120
# or
ssh ec2-user@18.217.224.120
```

### 3. Transfer Deployment Script
```bash
# From your local machine
scp deploy-aws-server.sh ubuntu@18.217.224.120:~/
```

## Deployment Steps

### Step 1: Initial Deployment
```bash
# On the AWS server
chmod +x deploy-aws-server.sh
./deploy-aws-server.sh deploy
```

This will automatically:
- ✅ Install prerequisites (Docker already installed)
- Clone the repository from GitHub
- Create production environment files
- Build Docker containers (frontend, backend, database)
- Setup self-signed SSL certificates
- Start all services

### Step 2: Update API Keys
After initial deployment, update the OpenWeather API key:
```bash
cd /opt/musky-jihad
nano .env.production
# Update OPENWEATHER_API_KEY=your_actual_key_here
```

### Step 3: Restart Services
```bash
cd /opt/musky-jihad
docker-compose -f docker-compose.production.yml restart
```

## Access URLs
Once deployed, access your application at:
- **Frontend (HTTPS)**: https://18.217.224.120:3010
- **Frontend (HTTP)**: http://18.217.224.120:3010
- **Backend API**: https://18.217.224.120:3011
- **Database**: 18.217.224.120:5432

## Verify Deployment

### Check Container Status
```bash
cd /opt/musky-jihad
docker-compose -f docker-compose.production.yml ps
```

Expected output:
```
NAME                    STATUS    PORTS
musky-jihad-frontend    Up        0.0.0.0:3010->3010/tcp, 0.0.0.0:443->443/tcp
musky-jihad-backend     Up        0.0.0.0:3011->3011/tcp
musky-jihad-db          Up        0.0.0.0:5432->5432/tcp
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.production.yml logs

# Specific service
docker-compose -f docker-compose.production.yml logs frontend
docker-compose -f docker-compose.production.yml logs backend
docker-compose -f docker-compose.production.yml logs db
```

## Key Features to Test

1. **GPS Functionality** ✅
   - HTTPS enables browser location services
   - Test on mobile devices for best results

2. **Database Connection**
   ```bash
   docker exec -it musky-jihad-db psql -U postgres -d fishing_intelligence
   \dt  # List tables
   \q   # Exit
   ```

3. **API Integrations**
   - Google Maps plotting
   - Weather data display
   - Perplexity AI recommendations

## Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :3010
sudo lsof -i :3011

# Stop conflicting service or change ports in docker-compose.production.yml
```

### Database Connection Issues
```bash
# Check database logs
docker-compose -f docker-compose.production.yml logs db

# Restart database
docker-compose -f docker-compose.production.yml restart db
```

### SSL Certificate Warning
The deployment uses self-signed certificates. Browsers will show a warning:
1. Click "Advanced" 
2. Click "Proceed to 18.217.224.120 (unsafe)"

For production, setup Let's Encrypt:
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
```

## Quick Commands

### Update Code Only
```bash
./deploy-aws-server.sh update
```

### View Status
```bash
./deploy-aws-server.sh status
```

### View Logs
```bash
./deploy-aws-server.sh logs
```

### Full Rebuild
```bash
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d
```

## Security Notes

1. **SSL/HTTPS**: Currently using self-signed certificates
2. **Firewall**: Ensure AWS Security Group allows:
   - Port 22 (SSH)
   - Port 80 (HTTP)
   - Port 443 (HTTPS)
   - Port 3010 (App)
   - Port 3011 (API)
   - Port 5432 (Database - consider restricting)

3. **Database**: Using default password - change in production:
   ```bash
   # Update in .env.production
   DB_PASSWORD=your_secure_password_here
   ```

## Next Steps

1. **Required**:
   - [ ] Add OpenWeather API key
   - [ ] Test all features
   - [ ] Verify GPS functionality on mobile

2. **Recommended**:
   - [ ] Setup domain name
   - [ ] Configure Let's Encrypt SSL
   - [ ] Change database password
   - [ ] Setup automated backups
   - [ ] Configure monitoring

3. **Optional**:
   - [ ] Setup CI/CD pipeline
   - [ ] Configure auto-scaling
   - [ ] Add CloudFlare CDN

## Support

For issues or questions:
- Check logs: `./deploy-aws-server.sh logs`
- GitHub Issues: https://github.com/spartanbunk/musky-jihad-app/issues
- Restart services: `docker-compose -f docker-compose.production.yml restart`