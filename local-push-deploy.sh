#!/bin/bash

# Lake St. Clair Musky App - Local Push & Remote Deploy Script
# This script pushes local changes to git and triggers deployment on AWS
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
SSH_USER="ubuntu"
GIT_BRANCH="musky-jihad-android"
BACKUP_DIR="./backups"

echo -e "${BLUE}🚀 Lake St. Clair Musky App - Push & Deploy${NC}"
echo -e "${BLUE}===========================================${NC}"
echo -e "${YELLOW}Target: ${AWS_IP}${NC}"
echo -e "${YELLOW}Branch: ${GIT_BRANCH}${NC}"
echo -e "${YELLOW}Timestamp: $(date)${NC}"
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if git is available
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ Git is not installed${NC}"
        exit 1
    fi
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${RED}❌ Not in a git repository${NC}"
        exit 1
    fi
    
    # Test SSH connection
    echo -e "${YELLOW}📡 Testing SSH connection to ${AWS_IP}...${NC}"
    if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ${SSH_USER}@${AWS_IP} "echo 'SSH connection successful'" 2>/dev/null; then
        echo -e "${RED}❌ Cannot SSH to ${AWS_IP}. Please check:${NC}"
        echo -e "${RED}   1. Your SSH key is added to the AWS instance${NC}"
        echo -e "${RED}   2. Security group allows SSH (port 22)${NC}"
        echo -e "${RED}   3. The instance is running${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to create local backup
create_backup() {
    echo -e "${BLUE}💾 Creating local backup...${NC}"
    
    # Create backup directory
    mkdir -p ${BACKUP_DIR}
    
    # Create backup with timestamp
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    echo -e "${YELLOW}📦 Creating backup: ${BACKUP_NAME}${NC}"
    
    # Create project backup (excluding heavy directories)
    tar -czf ${BACKUP_DIR}/${BACKUP_NAME}-project.tar.gz \
        --exclude=node_modules \
        --exclude=.next \
        --exclude=backups \
        --exclude=.git \
        . 2>/dev/null || true
    
    echo -e "${GREEN}✅ Backup created: ${BACKUP_DIR}/${BACKUP_NAME}-project.tar.gz${NC}"
}

# Function to commit and push changes
push_to_git() {
    echo -e "${BLUE}📤 Committing and pushing to git...${NC}"
    
    # Add all changes
    git add .
    
    # Check if there are changes to commit
    if git diff --staged --quiet; then
        echo -e "${YELLOW}ℹ️ No changes to commit${NC}"
    else
        echo -e "${YELLOW}📝 Committing changes...${NC}"
        git commit -m "🚀 Production deployment - $(date)

Automated commit for AWS production deployment
- Target: ${AWS_IP}
- Branch: ${GIT_BRANCH}
- Features: Enhanced mobile GPS, voice commands, responsive UI

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    fi
    
    # Push to remote
    echo -e "${YELLOW}📤 Pushing to remote repository...${NC}"
    git push origin ${GIT_BRANCH}
    
    echo -e "${GREEN}✅ Code pushed to git${NC}"
}

# Function to copy deployment script to server
copy_deploy_script() {
    echo -e "${BLUE}📋 Copying deployment script to server...${NC}"
    
    # Copy the server deployment script
    scp -o StrictHostKeyChecking=no deploy-aws-server.sh ${SSH_USER}@${AWS_IP}:~/
    
    # Make it executable
    ssh -o StrictHostKeyChecking=no ${SSH_USER}@${AWS_IP} "chmod +x ~/deploy-aws-server.sh"
    
    echo -e "${GREEN}✅ Deployment script copied${NC}"
}

# Function to trigger deployment on server
deploy_on_server() {
    echo -e "${BLUE}🚀 Triggering deployment on AWS server...${NC}"
    
    # Update the git repository URL in the deployment script
    # You need to replace this with your actual git repository URL
    GIT_REPO_URL=$(git config --get remote.origin.url 2>/dev/null || echo "https://github.com/yourusername/musky_jihad.git")
    
    echo -e "${YELLOW}📥 Repository URL: ${GIT_REPO_URL}${NC}"
    
    # SSH to server and run deployment
    ssh -o StrictHostKeyChecking=no ${SSH_USER}@${AWS_IP} << EOF
        set -e
        
        echo "🔧 Updating deployment script with repository URL..."
        sed -i 's|GIT_REPO=".*"|GIT_REPO="${GIT_REPO_URL}"|g' ~/deploy-aws-server.sh
        
        echo "🚀 Starting deployment..."
        ~/deploy-aws-server.sh deploy
        
        echo ""
        echo "🎉 Deployment completed on server!"
EOF
    
    echo -e "${GREEN}✅ Server deployment completed${NC}"
}

# Function to show deployment status
show_status() {
    echo -e "${BLUE}📊 Checking deployment status...${NC}"
    
    ssh -o StrictHostKeyChecking=no ${SSH_USER}@${AWS_IP} "~/deploy-aws-server.sh status"
}

# Function to show service logs
show_logs() {
    echo -e "${BLUE}📋 Showing recent logs...${NC}"
    
    ssh -o StrictHostKeyChecking=no ${SSH_USER}@${AWS_IP} "~/deploy-aws-server.sh logs"
}

# Main function
main() {
    echo -e "${BLUE}🎯 Starting push and deploy workflow...${NC}"
    
    check_prerequisites
    create_backup
    push_to_git
    copy_deploy_script
    deploy_on_server
    
    echo ""
    echo -e "${GREEN}🎉 Push and deployment completed successfully!${NC}"
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${YELLOW}📱 Your Lake St. Clair Musky App is now live at:${NC}"
    echo -e "${BLUE}   🌐 https://${AWS_IP}:3010${NC}"
    echo -e "${BLUE}   🔧 https://${AWS_IP}:3011 (API)${NC}"
    echo ""
    echo -e "${YELLOW}📋 What's new in this deployment:${NC}"
    echo -e "   ✅ Mobile GPS access (HTTPS enabled)"
    echo -e "   ✅ Voice commands work on phones"
    echo -e "   ✅ Responsive mobile UI"
    echo -e "   ✅ Floating Action Button for mobile"
    echo -e "   ✅ Enhanced location debugging"
    echo ""
    echo -e "${GREEN}🎣 Ready for fishing! Test GPS on your phone!${NC}"
}

# Handle command line arguments
case ${1:-deploy} in
    "deploy"|"")
        main
        ;;
    "status")
        check_prerequisites
        show_status
        ;;
    "logs")
        check_prerequisites
        show_logs
        ;;
    "update")
        echo -e "${BLUE}🔄 Quick update deployment...${NC}"
        check_prerequisites
        push_to_git
        ssh -o StrictHostKeyChecking=no ${SSH_USER}@${AWS_IP} "~/deploy-aws-server.sh update"
        ;;
    *)
        echo -e "${RED}Usage: $0 [deploy|status|logs|update]${NC}"
        echo -e "${YELLOW}  deploy: Full push and deployment (default)${NC}"
        echo -e "${YELLOW}  status: Check deployment status${NC}"
        echo -e "${YELLOW}  logs:   Show service logs${NC}"
        echo -e "${YELLOW}  update: Quick code update${NC}"
        exit 1
        ;;
esac