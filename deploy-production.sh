#!/bin/bash

# Lake St. Clair Musky App - Production Deployment Script
# Target: AWS EC2 (3.149.167.85)
# Author: Claude Code
# Date: $(date)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_IP="18.217.224.120"
SSH_USER="ubuntu"  # Default for Ubuntu AMI
APP_NAME="musky-jihad"
DOMAIN="lakestclair-fishing.com"  # You can set up DNS later
BACKUP_DIR="./backups"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo -e "${BLUE}🚀 Lake St. Clair Musky App - Production Deployment${NC}"
echo -e "${BLUE}=================================================${NC}"
echo -e "${YELLOW}Target: ${AWS_IP}${NC}"
echo -e "${YELLOW}Branch: ${CURRENT_BRANCH}${NC}"
echo -e "${YELLOW}Timestamp: $(date)${NC}"
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if git is clean
    if [[ -n $(git status --porcelain) ]]; then
        echo -e "${RED}❌ Git working directory is not clean. Please commit or stash changes.${NC}"
        git status
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker.${NC}"
        exit 1
    fi
    
    # Check if SSH key exists or can connect
    echo -e "${YELLOW}📡 Testing SSH connection to ${AWS_IP}...${NC}"
    if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ${SSH_USER}@${AWS_IP} "echo 'SSH connection successful'" 2>/dev/null; then
        echo -e "${RED}❌ Cannot SSH to ${AWS_IP}. Please ensure:${NC}"
        echo -e "${RED}   1. Your SSH key is added to the AWS instance${NC}"
        echo -e "${RED}   2. Security group allows SSH (port 22) from your IP${NC}"
        echo -e "${RED}   3. The instance is running${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to backup current state
backup_and_push() {
    echo -e "${BLUE}💾 Creating backup and pushing to git...${NC}"
    
    # Create backup directory
    mkdir -p ${BACKUP_DIR}
    
    # Create backup with timestamp
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    echo -e "${YELLOW}📦 Creating backup: ${BACKUP_NAME}${NC}"
    
    # Export current database (if running)
    if docker-compose ps | grep -q "musky.*Up"; then
        echo -e "${YELLOW}🗃️ Backing up database...${NC}"
        docker-compose exec -T db pg_dump -U postgres fishing_intelligence > ${BACKUP_DIR}/${BACKUP_NAME}-database.sql || true
    fi
    
    # Create full project backup
    tar -czf ${BACKUP_DIR}/${BACKUP_NAME}-project.tar.gz \
        --exclude=node_modules \
        --exclude=.next \
        --exclude=backups \
        --exclude=.git \
        . 2>/dev/null || true
    
    # Git operations
    echo -e "${YELLOW}📤 Pushing to git repository...${NC}"
    git add .
    
    # Check if there are changes to commit
    if git diff --staged --quiet; then
        echo -e "${YELLOW}ℹ️ No changes to commit${NC}"
    else
        git commit -m "🚀 Pre-production deployment backup - $(date)

Automated commit before deploying to AWS production server
- Branch: ${CURRENT_BRANCH}
- Target: ${AWS_IP}
- Backup: ${BACKUP_NAME}

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    fi
    
    git push origin ${CURRENT_BRANCH}
    echo -e "${GREEN}✅ Backup and git push completed${NC}"
}

# Function to build production images
build_production() {
    echo -e "${BLUE}🏗️ Building production Docker images...${NC}"
    
    # Create production environment file
    create_production_env
    
    # Build production images
    echo -e "${YELLOW}🔨 Building Next.js production image...${NC}"
    docker build -t ${APP_NAME}-frontend:latest -f Dockerfile.production .
    
    echo -e "${YELLOW}🔨 Building backend production image...${NC}"
    docker build -t ${APP_NAME}-backend:latest -f Dockerfile.backend .
    
    echo -e "${GREEN}✅ Production images built successfully${NC}"
}

# Function to create production environment
create_production_env() {
    echo -e "${BLUE}🌍 Creating production environment configuration...${NC}"
    
    # Create production .env file
    cat > .env.production << EOF
# Production Environment Configuration
NODE_ENV=production

# Database Configuration
DATABASE_URL=postgresql://postgres:fishing_secure_pass_2024@localhost:5432/fishing_intelligence
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fishing_intelligence
DB_USER=postgres
DB_PASSWORD=fishing_secure_pass_2024

# Application URLs
NEXT_PUBLIC_API_URL=https://${AWS_IP}:3011
NEXT_PUBLIC_APP_URL=https://${AWS_IP}:3010
API_URL=http://localhost:3011

# External APIs (copy from your .env file)
OPENWEATHER_API_KEY=your_openweather_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_key_here
PERPLEXITY_API_KEY=your_perplexity_key_here

# Security
JWT_SECRET=musky_fishing_jwt_secret_prod_2024
CORS_ORIGIN=https://${AWS_IP}:3010

# SSL Configuration
SSL_CERT_PATH=/app/ssl/cert.pem
SSL_KEY_PATH=/app/ssl/key.pem

EOF

    echo -e "${YELLOW}⚠️ Remember to update API keys in .env.production before deployment!${NC}"
}

# Function to create production docker-compose
create_production_compose() {
    echo -e "${BLUE}🐳 Creating production docker-compose.yml...${NC}"
    
    cat > docker-compose.production.yml << EOF
version: '3.8'

services:
  frontend:
    build: 
      context: .
      dockerfile: Dockerfile.production
    container_name: ${APP_NAME}-frontend
    ports:
      - "3010:3010"
      - "443:443"  # HTTPS
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - backend
    restart: unless-stopped
    volumes:
      - ./ssl:/app/ssl:ro  # SSL certificates

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: ${APP_NAME}-backend
    ports:
      - "3011:3011"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15
    container_name: ${APP_NAME}-db
    environment:
      POSTGRES_DB: fishing_intelligence
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: fishing_secure_pass_2024
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local

EOF

    echo -e "${GREEN}✅ Production docker-compose created${NC}"
}

# Function to create production Dockerfiles
create_production_dockerfiles() {
    echo -e "${BLUE}📝 Creating production Dockerfiles...${NC}"
    
    # Frontend Production Dockerfile
    cat > Dockerfile.production << EOF
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

# Create ssl directory for certificates
RUN mkdir -p /app/ssl

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3010
EXPOSE 443

ENV NODE_ENV=production
ENV PORT=3010

CMD ["npm", "start"]
EOF

    # Backend Production Dockerfile
    cat > Dockerfile.backend << EOF
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy server files
COPY server/ ./server/
COPY database/ ./database/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001
RUN chown -R backend:nodejs /app
USER backend

EXPOSE 3011

ENV NODE_ENV=production

CMD ["node", "server/index.js"]
EOF

    echo -e "${GREEN}✅ Production Dockerfiles created${NC}"
}

# Function to deploy to AWS
deploy_to_aws() {
    echo -e "${BLUE}🚀 Deploying to AWS EC2 (${AWS_IP})...${NC}"
    
    # Create deployment package
    echo -e "${YELLOW}📦 Creating deployment package...${NC}"
    tar -czf deployment-package.tar.gz \
        --exclude=node_modules \
        --exclude=.next \
        --exclude=backups \
        --exclude=.git \
        .
    
    # Copy to AWS instance
    echo -e "${YELLOW}📤 Copying files to AWS instance...${NC}"
    scp -o StrictHostKeyChecking=no deployment-package.tar.gz ${SSH_USER}@${AWS_IP}:~/
    
    # Execute deployment on remote server
    echo -e "${YELLOW}🔧 Executing deployment on remote server...${NC}"
    ssh -o StrictHostKeyChecking=no ${SSH_USER}@${AWS_IP} << EOF
        set -e
        
        # Update system
        sudo apt update
        sudo apt install -y docker.io docker-compose-v2
        
        # Start Docker
        sudo systemctl start docker
        sudo systemctl enable docker
        sudo usermod -aG docker \$USER
        
        # Setup application directory
        sudo mkdir -p /opt/${APP_NAME}
        cd /opt/${APP_NAME}
        
        # Stop existing containers
        sudo docker-compose down 2>/dev/null || true
        
        # Extract new deployment
        sudo rm -rf ./* 2>/dev/null || true
        sudo tar -xzf ~/deployment-package.tar.gz
        sudo chown -R \$USER:\$USER .
        
        # Build and start production containers
        sudo docker-compose -f docker-compose.production.yml build
        sudo docker-compose -f docker-compose.production.yml up -d
        
        # Show status
        sudo docker-compose -f docker-compose.production.yml ps
        
        echo "🎉 Deployment completed!"
        echo "🌐 Frontend: http://${AWS_IP}:3010"
        echo "🔧 Backend: http://${AWS_IP}:3011"
        
        # Cleanup
        rm ~/deployment-package.tar.gz
EOF
    
    # Cleanup local deployment package
    rm deployment-package.tar.gz
    
    echo -e "${GREEN}✅ AWS deployment completed!${NC}"
}

# Function to setup SSL certificates (Let's Encrypt)
setup_ssl() {
    echo -e "${BLUE}🔐 Setting up SSL certificates...${NC}"
    
    ssh -o StrictHostKeyChecking=no ${SSH_USER}@${AWS_IP} << EOF
        # Install certbot
        sudo apt install -y certbot
        
        # Create SSL directory
        sudo mkdir -p /opt/${APP_NAME}/ssl
        
        # Generate self-signed certificates for now (replace with Let's Encrypt later)
        sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /opt/${APP_NAME}/ssl/key.pem \
            -out /opt/${APP_NAME}/ssl/cert.pem \
            -subj "/C=US/ST=Michigan/L=Detroit/O=MuskyJihad/CN=${AWS_IP}"
        
        sudo chown -R \$USER:\$USER /opt/${APP_NAME}/ssl
        
        echo "🔐 SSL certificates created (self-signed)"
        echo "⚠️ For production, replace with Let's Encrypt certificates"
EOF
}

# Function to show deployment status
show_status() {
    echo -e "${BLUE}📊 Checking deployment status...${NC}"
    
    ssh -o StrictHostKeyChecking=no ${SSH_USER}@${AWS_IP} << EOF
        cd /opt/${APP_NAME}
        echo "🐳 Docker containers:"
        sudo docker-compose -f docker-compose.production.yml ps
        
        echo ""
        echo "🌐 Service URLs:"
        echo "  Frontend: http://${AWS_IP}:3010"
        echo "  Backend:  http://${AWS_IP}:3011"
        echo "  HTTPS:    https://${AWS_IP} (if SSL configured)"
        
        echo ""
        echo "📋 Recent logs:"
        sudo docker-compose -f docker-compose.production.yml logs --tail=20
EOF
}

# Main deployment workflow
main() {
    echo -e "${BLUE}Starting production deployment workflow...${NC}"
    
    # Step 1: Prerequisites
    check_prerequisites
    
    # Step 2: Backup and Git
    backup_and_push
    
    # Step 3: Create production files
    create_production_env
    create_production_compose
    create_production_dockerfiles
    
    # Step 4: Build production images
    build_production
    
    # Step 5: Deploy to AWS
    deploy_to_aws
    
    # Step 6: Setup SSL
    setup_ssl
    
    # Step 7: Show status
    show_status
    
    echo ""
    echo -e "${GREEN}🎉 Production deployment completed successfully!${NC}"
    echo -e "${GREEN}=======================================${NC}"
    echo -e "${YELLOW}📱 Your Lake St. Clair Musky App is now live at:${NC}"
    echo -e "${BLUE}   🌐 http://${AWS_IP}:3010${NC}"
    echo -e "${BLUE}   🔒 https://${AWS_IP} (with SSL)${NC}"
    echo ""
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo -e "   1. Update your domain DNS to point to ${AWS_IP}"
    echo -e "   2. Configure Let's Encrypt for production SSL"
    echo -e "   3. Update API keys in .env.production on the server"
    echo -e "   4. Test GPS functionality (now works with HTTPS!)"
    echo ""
    echo -e "${GREEN}🎣 Happy fishing! The musky await!${NC}"
}

# Check if we should run the script
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Parse command line arguments
    case ${1:-deploy} in
        "status")
            show_status
            ;;
        "ssl")
            setup_ssl
            ;;
        "deploy"|"")
            main
            ;;
        *)
            echo -e "${RED}Usage: $0 [deploy|status|ssl]${NC}"
            echo -e "${YELLOW}  deploy: Full production deployment (default)${NC}"
            echo -e "${YELLOW}  status: Check deployment status${NC}"
            echo -e "${YELLOW}  ssl:    Setup SSL certificates${NC}"
            exit 1
            ;;
    esac
fi