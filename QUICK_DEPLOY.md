# Quick Deployment Steps for CentOS Server

## Server Info
- **OS**: CentOS  
- **IP**: 18.217.224.120
- **User**: ec2-user
- **Docker**: Already installed

## Deployment Steps

### 1. Transfer script to server
```bash
# From your local machine (this directory)
scp deploy-aws-server.sh ec2-user@18.217.224.120:~/
```

### 2. SSH to server and deploy
```bash
# Connect to server
ssh ec2-user@18.217.224.120

# Make script executable
chmod +x deploy-aws-server.sh

# Run deployment
./deploy-aws-server.sh deploy
```

### 3. Access your app
After deployment completes (5-10 minutes):
- **Frontend**: https://18.217.224.120:3010
- **Backend API**: https://18.217.224.120:3011

## What the script does
1. Clones code from GitHub (musky-jihad-android branch)
2. Sets up production environment with API keys
3. Builds Docker containers
4. Initializes PostgreSQL database
5. Creates SSL certificates
6. Starts all services

## API Keys Status
- ✅ Google Maps API (valid)
- ✅ Perplexity API (valid)
- ⏳ OpenWeather (pending - app works without it)

## Troubleshooting
```bash
# Check status
./deploy-aws-server.sh status

# View logs
./deploy-aws-server.sh logs

# Quick update (code only)
./deploy-aws-server.sh update
```