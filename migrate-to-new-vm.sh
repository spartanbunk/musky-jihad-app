#!/bin/bash

# Lake St. Clair Musky App - VM Migration Helper Script
# This script updates all IP references when migrating to a new VM

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Current configuration
OLD_IP="18.217.224.120"
NEW_IP="${1}"

# Display header
echo -e "${BLUE}🔄 Lake St. Clair Musky App - VM Migration Helper${NC}"
echo -e "${BLUE}=================================================${NC}"

# Check if new IP was provided
if [ -z "$NEW_IP" ]; then
    echo -e "${RED}❌ Error: No new IP address provided${NC}"
    echo -e "${YELLOW}Usage: ./migrate-to-new-vm.sh NEW_IP_ADDRESS${NC}"
    echo -e "${YELLOW}Example: ./migrate-to-new-vm.sh 54.123.45.67${NC}"
    exit 1
fi

# Validate IP format (basic check)
if ! [[ "$NEW_IP" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    echo -e "${RED}❌ Error: Invalid IP address format${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Migration Details:${NC}"
echo -e "  Old IP: ${OLD_IP}"
echo -e "  New IP: ${NEW_IP}"
echo ""

# Create backup directory
BACKUP_DIR="backup-before-migration-$(date +%Y%m%d-%H%M%S)"
echo -e "${BLUE}💾 Creating backup in ${BACKUP_DIR}...${NC}"
mkdir -p "$BACKUP_DIR"

# Files to update
files=(
    "deploy-aws-server.sh"
    "DEPLOYMENT_GUIDE.md"
    "QUICK_DEPLOY.md"
    "REDEPLOYMENT_CHECKLIST.md"
)

# Update each file
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        # Create backup
        cp "$file" "$BACKUP_DIR/"
        
        # Update IP addresses
        sed -i "s/${OLD_IP}/${NEW_IP}/g" "$file"
        
        echo -e "${GREEN}✅ Updated: $file${NC}"
    else
        echo -e "${YELLOW}⚠️  File not found: $file${NC}"
    fi
done

echo ""
echo -e "${GREEN}🎉 IP address migration complete!${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo -e "${YELLOW}1. Review the changes:${NC}"
echo "   git diff"
echo ""
echo -e "${YELLOW}2. Commit changes to git:${NC}"
echo "   git add ."
echo "   git commit -m \"Update IP address to ${NEW_IP} for new VM deployment\""
echo "   git push origin musky-jihad-android"
echo ""
echo -e "${YELLOW}3. On the NEW server (${NEW_IP}):${NC}"
echo "   # Transfer deployment script"
echo "   scp deploy-aws-server.sh ec2-user@${NEW_IP}:~/"
echo ""
echo "   # SSH to new server"
echo "   ssh ec2-user@${NEW_IP}"
echo ""
echo "   # Run deployment"
echo "   chmod +x deploy-aws-server.sh"
echo "   ./deploy-aws-server.sh deploy"
echo ""
echo -e "${YELLOW}4. After deployment succeeds:${NC}"
echo "   - Test the app at: https://${NEW_IP}:3010"
echo "   - Verify GPS functionality works"
echo "   - Check all API integrations"
echo ""
echo -e "${BLUE}📂 Backup saved in: ${BACKUP_DIR}/${NC}"
echo -e "${GREEN}Good luck with your migration! 🎣${NC}"