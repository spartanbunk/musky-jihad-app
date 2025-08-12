# Redeployment Checklist for New VM

## Current Server Info (TO BE REPLACED)
- **Current AWS IP**: 18.217.224.120
- **Current Instance**: 1GB RAM (underpowered)
- **New Instance Requirements**: Minimum 2GB RAM, recommended 4GB

## Pre-Migration Steps (ON CURRENT VM)

### 1. Backup Current Data
```bash
# SSH to current server
ssh ec2-user@18.217.224.120

# Create full backup
cd /opt/musky-jihad
sudo docker-compose exec -T db pg_dump -U postgres fishing_intelligence > ~/database_backup.sql

# Download backup to local machine
exit
scp ec2-user@18.217.224.120:~/database_backup.sql ./
```

### 2. Commit All Changes to GitHub
```bash
# On your local machine
git add .
git commit -m "Prepare for VM migration with deployment scripts"
git push origin musky-jihad-android
```

## New VM Setup Steps

### 1. Create New AWS Instance
- [ ] Launch EC2 instance (t3.medium or larger - 4GB RAM)
- [ ] Select Amazon Linux 2 or CentOS
- [ ] Configure Security Group:
  - [ ] SSH (22) from your IP
  - [ ] HTTP (80) from anywhere
  - [ ] HTTPS (443) from anywhere
  - [ ] Custom TCP 3010 from anywhere
  - [ ] Custom TCP 3011 from anywhere
  - [ ] PostgreSQL (5432) - restrict to app only
- [ ] Download new .pem key file
- [ ] Note new IP address: _______________

### 2. Update Configuration Files
```bash
# Clone repository locally
git clone -b musky-jihad-android https://github.com/spartanbunk/musky-jihad-app.git
cd musky-jihad-app

# Update IP in ALL files
NEW_IP="YOUR_NEW_IP_HERE"
OLD_IP="18.217.224.120"

# Update deploy-aws-server.sh
sed -i "s/$OLD_IP/$NEW_IP/g" deploy-aws-server.sh

# Update documentation
sed -i "s/$OLD_IP/$NEW_IP/g" DEPLOYMENT_GUIDE.md
sed -i "s/$OLD_IP/$NEW_IP/g" QUICK_DEPLOY.md

# Commit changes
git add .
git commit -m "Update IP address for new VM deployment"
git push origin musky-jihad-android
```

### 3. Initial Server Setup
```bash
# SSH to new server
chmod 400 your-new-key.pem
ssh -i your-new-key.pem ec2-user@NEW_IP_ADDRESS

# Update system
sudo yum update -y

# Exit back to local machine
exit
```

### 4. Deploy Application
```bash
# Transfer deployment script
scp -i your-new-key.pem deploy-aws-server.sh ec2-user@NEW_IP_ADDRESS:~/

# SSH to server
ssh -i your-new-key.pem ec2-user@NEW_IP_ADDRESS

# Run deployment
chmod +x deploy-aws-server.sh
./deploy-aws-server.sh deploy
```

### 5. Restore Database (Optional)
```bash
# If you have data to restore
scp -i your-new-key.pem database_backup.sql ec2-user@NEW_IP_ADDRESS:~/

# On the server
cd /opt/musky-jihad
docker-compose -f docker-compose.production.yml exec -T db psql -U postgres fishing_intelligence < ~/database_backup.sql
```

## Post-Deployment Verification

### 1. Check Services
```bash
cd /opt/musky-jihad
docker-compose -f docker-compose.production.yml ps

# Should show:
# musky-jihad-frontend    Up
# musky-jihad-backend     Up
# musky-jihad-db          Up
```

### 2. Test Application
- [ ] Frontend loads: https://NEW_IP:3010
- [ ] Accept self-signed certificate warning
- [ ] GPS/location services work (HTTPS required)
- [ ] Database connection works
- [ ] API endpoints respond

### 3. Monitor Resources
```bash
# Check memory usage
free -h

# Check disk space
df -h

# Check Docker resources
docker stats
```

## Files That Need IP Updates

When migrating to new VM, update IP in these locations:

1. **deploy-aws-server.sh**
   - Line 17: `AWS_IP="18.217.224.120"`
   - Line 163: HTTPS URL generation
   - Line 164: HTTP URL generation

2. **DEPLOYMENT_GUIDE.md**
   - Line 4: AWS IP reference
   - Lines 18-23: SSH commands
   - Lines 28: SCP command
   - Lines 64-67: Access URLs

3. **QUICK_DEPLOY.md**
   - Line 5: IP reference
   - Line 14: SCP command
   - Line 20: SSH command
   - Lines 31-32: Access URLs

## Quick Migration Script

Save this as `migrate-to-new-vm.sh` for quick execution:

```bash
#!/bin/bash

# Configuration
OLD_IP="18.217.224.120"
NEW_IP="${1}"

if [ -z "$NEW_IP" ]; then
    echo "Usage: ./migrate-to-new-vm.sh NEW_IP_ADDRESS"
    exit 1
fi

echo "Updating configuration from $OLD_IP to $NEW_IP..."

# Update all files
files=(
    "deploy-aws-server.sh"
    "DEPLOYMENT_GUIDE.md"
    "QUICK_DEPLOY.md"
    "REDEPLOYMENT_CHECKLIST.md"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        sed -i.bak "s/$OLD_IP/$NEW_IP/g" "$file"
        echo "Updated $file"
    fi
done

echo "Configuration updated! Don't forget to:"
echo "1. Commit changes to git"
echo "2. Push to GitHub"
echo "3. Run deployment on new server"
```

## Troubleshooting New Deployment

### Memory Issues
```bash
# If containers crash due to memory
docker system prune -a
free -h
# Consider upgrading instance type
```

### Port Conflicts
```bash
sudo lsof -i :3010
sudo lsof -i :3011
sudo kill -9 [PID]
```

### DNS/SSL Setup (Optional)
```bash
# After deployment succeeds, setup domain
sudo yum install -y certbot
sudo certbot certonly --standalone -d your-domain.com
```

## Final Cleanup

### On Old Server (After Verification)
```bash
# Stop services
cd /opt/musky-jihad
docker-compose -f docker-compose.production.yml down

# Optional: Terminate AWS instance to stop billing
```

## Important Notes

1. **Test thoroughly** before terminating old server
2. **Keep database backup** until new deployment is verified
3. **Update any external services** that reference old IP:
   - DNS records (if using domain)
   - Monitoring services
   - API webhooks
   - Mobile app configurations

4. **Security reminders**:
   - Change default database password
   - Restrict security group rules after testing
   - Enable AWS CloudWatch monitoring
   - Setup automated backups

## Success Criteria

- [ ] All Docker containers running
- [ ] Frontend accessible via HTTPS
- [ ] GPS functionality works
- [ ] Database queries succeed
- [ ] API integrations functional
- [ ] Memory usage under 80%
- [ ] No error logs in containers

---
Generated: 2025-08-12
Ready for migration from underpowered 1GB VM to production-ready instance