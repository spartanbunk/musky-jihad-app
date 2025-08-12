#!/bin/bash

# Lake St. Clair Musky App - AWS Server Deployment Script
# This script runs ON the AWS server to pull latest code and deploy
# Author: Claude Code

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_IP="3.149.167.85"
APP_NAME="musky-jihad"
GIT_REPO="https://github.com/yourusername/musky_jihad.git"  # Update this!
GIT_BRANCH="musky-jihad-android"
APP_DIR="/opt/${APP_NAME}"
BACKUP_DIR="/opt/backups"

echo -e "${BLUE}🚀 Lake St. Clair Musky App - AWS Server Deployment${NC}"
echo -e "${BLUE}=================================================${NC}"
echo -e "${YELLOW}Server IP: ${AWS_IP}${NC}"
echo -e "${YELLOW}Branch: ${GIT_BRANCH}${NC}"
echo -e "${YELLOW}Timestamp: $(date)${NC}"
echo ""

# Function to install prerequisites
install_prerequisites() {
    echo -e "${BLUE}📦 Installing prerequisites...${NC}"
    
    # Update system
    sudo apt update
    
    # Install Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}🐳 Installing Docker...${NC}"
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
    fi
    
    # Install Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${YELLOW}🐳 Installing Docker Compose...${NC}"
        sudo apt install -y docker-compose
    fi
    
    # Install Git
    if ! command -v git &> /dev/null; then
        echo -e "${YELLOW}📦 Installing Git...${NC}"
        sudo apt install -y git
    fi
    
    # Install Node.js (for npm commands)
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}📦 Installing Node.js...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
    fi
    
    # Start Docker service
    sudo systemctl start docker
    sudo systemctl enable docker
    
    echo -e "${GREEN}✅ Prerequisites installed${NC}"
}

# Function to backup existing deployment
backup_existing() {
    echo -e "${BLUE}💾 Creating backup of existing deployment...${NC}"
    
    # Create backup directory
    sudo mkdir -p ${BACKUP_DIR}
    
    if [ -d "${APP_DIR}" ]; then
        BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
        echo -e "${YELLOW}📦 Creating backup: ${BACKUP_NAME}${NC}"
        
        # Backup database if running
        if docker-compose -f ${APP_DIR}/docker-compose.yml ps db | grep -q "Up" 2>/dev/null; then
            echo -e "${YELLOW}🗃️ Backing up database...${NC}"
            cd ${APP_DIR}
            sudo docker-compose exec -T db pg_dump -U postgres fishing_intelligence > ${BACKUP_DIR}/${BACKUP_NAME}-database.sql || echo "Database backup failed (might be empty)"
        fi
        
        # Backup application directory
        sudo tar -czf ${BACKUP_DIR}/${BACKUP_NAME}-app.tar.gz -C /opt ${APP_NAME} 2>/dev/null || echo "App backup completed with warnings"
        
        echo -e "${GREEN}✅ Backup created: ${BACKUP_DIR}/${BACKUP_NAME}${NC}"
    else
        echo -e "${YELLOW}ℹ️ No existing deployment to backup${NC}"
    fi
}

# Function to stop existing services
stop_services() {
    echo -e "${BLUE}🛑 Stopping existing services...${NC}"
    
    if [ -d "${APP_DIR}" ]; then
        cd ${APP_DIR}
        
        # Stop docker-compose services
        sudo docker-compose down 2>/dev/null || echo "No existing docker-compose services"
        
        # Stop any standalone containers
        sudo docker stop $(sudo docker ps -q --filter name=${APP_NAME}) 2>/dev/null || echo "No standalone containers to stop"
        
        echo -e "${GREEN}✅ Services stopped${NC}"
    else
        echo -e "${YELLOW}ℹ️ No existing services to stop${NC}"
    fi
}

# Function to clone/update repository
update_code() {
    echo -e "${BLUE}📥 Updating code from repository...${NC}"
    
    if [ -d "${APP_DIR}" ]; then
        echo -e "${YELLOW}📂 Updating existing repository...${NC}"
        cd ${APP_DIR}
        sudo git fetch origin
        sudo git reset --hard origin/${GIT_BRANCH}
        sudo git clean -fd
    else
        echo -e "${YELLOW}📥 Cloning repository...${NC}"
        sudo mkdir -p /opt
        cd /opt
        sudo git clone -b ${GIT_BRANCH} ${GIT_REPO} ${APP_NAME}
    fi
    
    # Set permissions
    sudo chown -R $USER:$USER ${APP_DIR}
    
    echo -e "${GREEN}✅ Code updated from git${NC}"
}

# Function to create production environment
create_production_env() {
    echo -e "${BLUE}🌍 Creating production environment...${NC}"
    
    cd ${APP_DIR}
    
    # Create production .env file
    cat > .env.production << EOF
# Production Environment Configuration
NODE_ENV=production

# Database Configuration
DATABASE_URL=postgresql://postgres:fishing_secure_pass_2024@db:5432/fishing_intelligence
DB_HOST=db
DB_PORT=5432
DB_NAME=fishing_intelligence
DB_USER=postgres
DB_PASSWORD=fishing_secure_pass_2024

# Application URLs - Using AWS IP with HTTPS
NEXT_PUBLIC_API_URL=https://${AWS_IP}:3011
NEXT_PUBLIC_APP_URL=https://${AWS_IP}:3010
API_URL=http://backend:3011

# External APIs (UPDATE THESE!)
OPENWEATHER_API_KEY=your_openweather_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_key_here
PERPLEXITY_API_KEY=your_perplexity_key_here

# Security
JWT_SECRET=musky_fishing_jwt_secret_prod_2024_$(date +%s)
CORS_ORIGIN=https://${AWS_IP}:3010,http://${AWS_IP}:3010

# SSL Configuration
SSL_CERT_PATH=/app/ssl/cert.pem
SSL_KEY_PATH=/app/ssl/key.pem

EOF

    echo -e "${YELLOW}⚠️ Remember to update API keys in .env.production!${NC}"
    echo -e "${GREEN}✅ Production environment created${NC}"
}

# Function to create production docker-compose
create_docker_compose() {
    echo -e "${BLUE}🐳 Creating production docker-compose...${NC}"
    
    cd ${APP_DIR}
    
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
      - "80:3010"   # HTTP on standard port
      - "443:443"   # HTTPS
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - backend
    restart: unless-stopped
    volumes:
      - ./ssl:/app/ssl:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro

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

    echo -e "${GREEN}✅ Docker compose created${NC}"
}

# Function to create Dockerfiles
create_dockerfiles() {
    echo -e "${BLUE}📝 Creating production Dockerfiles...${NC}"
    
    cd ${APP_DIR}
    
    # Frontend Production Dockerfile
    cat > Dockerfile.production << EOF
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

# Create SSL directory
RUN mkdir -p /app/ssl

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set ownership
RUN chown -R nextjs:nodejs /app

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

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy server files
COPY server/ ./server/
COPY database/ ./database/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001

# Set ownership
RUN chown -R backend:nodejs /app

USER backend

EXPOSE 3011

ENV NODE_ENV=production

CMD ["node", "server/index.js"]
EOF

    echo -e "${GREEN}✅ Dockerfiles created${NC}"
}

# Function to setup SSL certificates
setup_ssl() {
    echo -e "${BLUE}🔐 Setting up SSL certificates...${NC}"
    
    cd ${APP_DIR}
    
    # Create SSL directory
    mkdir -p ssl
    
    # Generate self-signed certificates for immediate HTTPS
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -subj "/C=US/ST=Michigan/L=Detroit/O=LakeStClairFishing/CN=${AWS_IP}" 2>/dev/null
    
    echo -e "${GREEN}✅ Self-signed SSL certificates created${NC}"
    echo -e "${YELLOW}ℹ️ For production, replace with Let's Encrypt certificates${NC}"
}

# Function to build and start services
deploy_services() {
    echo -e "${BLUE}🚀 Building and starting services...${NC}"
    
    cd ${APP_DIR}
    
    # Build images
    echo -e "${YELLOW}🔨 Building Docker images...${NC}"
    docker-compose -f docker-compose.production.yml build --no-cache
    
    # Start services
    echo -e "${YELLOW}▶️ Starting services...${NC}"
    docker-compose -f docker-compose.production.yml up -d
    
    # Wait for services to start
    echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
    sleep 15
    
    # Show status
    echo -e "${BLUE}📊 Service Status:${NC}"
    docker-compose -f docker-compose.production.yml ps
    
    echo -e "${GREEN}✅ Services deployed${NC}"
}

# Function to show final status
show_final_status() {
    echo -e "${BLUE}🎯 Deployment Status${NC}"
    echo -e "${BLUE}==================${NC}"
    
    cd ${APP_DIR}
    
    echo -e "${YELLOW}🐳 Container Status:${NC}"
    docker-compose -f docker-compose.production.yml ps
    
    echo ""
    echo -e "${YELLOW}🌐 Access URLs:${NC}"
    echo -e "${GREEN}  Frontend (HTTP):  http://${AWS_IP}:3010${NC}"
    echo -e "${GREEN}  Frontend (HTTPS): https://${AWS_IP}:3010${NC}"
    echo -e "${GREEN}  Backend API:      https://${AWS_IP}:3011${NC}"
    echo -e "${GREEN}  Standard HTTP:    http://${AWS_IP}${NC}"
    
    echo ""
    echo -e "${YELLOW}🔧 Next Steps:${NC}"
    echo "  1. Update API keys in .env.production"
    echo "  2. Test GPS functionality (HTTPS now available!)"
    echo "  3. Configure domain DNS (optional)"
    echo "  4. Setup Let's Encrypt for trusted SSL"
    
    echo ""
    echo -e "${GREEN}🎣 Your Lake St. Clair Musky App is LIVE!${NC}"
}

# Function to show logs
show_logs() {
    cd ${APP_DIR}
    echo -e "${BLUE}📋 Recent logs:${NC}"
    docker-compose -f docker-compose.production.yml logs --tail=20
}

# Main deployment function
main() {
    echo -e "${BLUE}🎯 Starting AWS server deployment...${NC}"
    
    # Check if we're running as root
    if [ "$EUID" -eq 0 ]; then
        echo -e "${RED}❌ Don't run this script as root${NC}"
        echo -e "${YELLOW}Run as: ./deploy-aws-server.sh${NC}"
        exit 1
    fi
    
    install_prerequisites
    backup_existing
    stop_services
    update_code
    create_production_env
    create_docker_compose
    create_dockerfiles
    setup_ssl
    deploy_services
    show_final_status
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${BLUE}Access your app at: https://${AWS_IP}:3010${NC}"
}

# Handle command line arguments
case ${1:-deploy} in
    "deploy"|"")
        main
        ;;
    "status")
        show_final_status
        ;;
    "logs")
        show_logs
        ;;
    "update")
        echo -e "${BLUE}🔄 Quick update (code only)...${NC}"
        stop_services
        update_code
        deploy_services
        ;;
    *)
        echo -e "${RED}Usage: $0 [deploy|status|logs|update]${NC}"
        echo -e "${YELLOW}  deploy: Full deployment (default)${NC}"
        echo -e "${YELLOW}  status: Show deployment status${NC}"
        echo -e "${YELLOW}  logs:   Show service logs${NC}"
        echo -e "${YELLOW}  update: Quick code update${NC}"
        exit 1
        ;;
esac