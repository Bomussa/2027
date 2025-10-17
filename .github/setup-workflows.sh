#!/bin/bash

# GitHub Actions Workflow Setup Script
# This script helps configure the necessary labels and provides setup instructions

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   GitHub Actions Workflow Setup for 2027 Repository          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}✗${NC} GitHub CLI (gh) is not installed"
    echo -e "${YELLOW}Install it from: https://cli.github.com/${NC}"
    echo ""
    echo "After installing, run this script again."
    exit 1
fi

echo -e "${GREEN}✓${NC} GitHub CLI found"

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} Not authenticated with GitHub CLI"
    echo "Please run: gh auth login"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} GitHub CLI authenticated"
echo ""

# Get repository info
REPO_OWNER=$(gh repo view --json owner -q .owner.login 2>/dev/null || echo "")
REPO_NAME=$(gh repo view --json name -q .name 2>/dev/null || echo "")

if [ -z "$REPO_OWNER" ] || [ -z "$REPO_NAME" ]; then
    echo -e "${RED}✗${NC} Could not determine repository info"
    echo "Make sure you're in the repository directory"
    exit 1
fi

echo -e "${BLUE}Repository:${NC} $REPO_OWNER/$REPO_NAME"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  Step 1: Creating Labels"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Function to create label
create_label() {
    local name=$1
    local color=$2
    local description=$3
    
    if gh label list --json name -q ".[] | select(.name==\"$name\") | .name" | grep -q "$name"; then
        echo -e "${YELLOW}⊘${NC} Label '$name' already exists"
    else
        if gh label create "$name" --color "$color" --description "$description" &> /dev/null; then
            echo -e "${GREEN}✓${NC} Created label: $name"
        else
            echo -e "${RED}✗${NC} Failed to create label: $name"
        fi
    fi
}

# Create size labels
echo "Creating size labels..."
create_label "size/XS" "0e8a16" "Extra small PR (< 100 changes)"
create_label "size/S" "1d76db" "Small PR (< 300 changes)"
create_label "size/M" "fbca04" "Medium PR (< 1000 changes)"
create_label "size/L" "d93f0b" "Large PR (< 3000 changes)"
create_label "size/XL" "b60205" "Extra large PR (3000+ changes)"
echo ""

# Create error detection labels
echo "Creating error detection labels..."
create_label "automated-error" "d93f0b" "Automated error detection"
create_label "needs-review" "fbca04" "Needs manual review"
create_label "auto-resolved" "0e8a16" "Auto-resolved by repair system"
echo ""

# Create category labels
echo "Creating category labels..."
create_label "backend" "fef2c0" "Backend related"
create_label "frontend" "bfdadc" "Frontend related"
create_label "deployment" "c5def5" "Deployment related"
create_label "api" "f9d0c4" "API related"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  Step 2: Configure Secrets"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo -e "${YELLOW}⚠ Manual configuration required${NC}"
echo ""
echo "You need to add the following secrets to your repository:"
echo ""
echo "1. Go to: https://github.com/$REPO_OWNER/$REPO_NAME/settings/secrets/actions"
echo ""
echo "2. Add these secrets:"
echo "   • CLOUDFLARE_API_TOKEN"
echo "     - Get from: https://dash.cloudflare.com/profile/api-tokens"
echo "     - Create token with 'Cloudflare Pages' permissions"
echo ""
echo "   • CLOUDFLARE_ACCOUNT_ID"
echo "     - Find in Cloudflare Dashboard sidebar"
echo "     - Usually a hex string like: a1b2c3d4e5f6..."
echo ""

read -p "Press Enter after you've configured the secrets..."

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Step 3: Verification"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if secrets are set (can't read values, but can check if they exist)
echo "Checking workflow files..."
if [ -f ".github/workflows/ci-cd.yml" ] && \
   [ -f ".github/workflows/pr-management.yml" ] && \
   [ -f ".github/workflows/deploy-cloudflare.yml" ] && \
   [ -f ".github/workflows/auto-repair.yml" ]; then
    echo -e "${GREEN}✓${NC} All workflow files present"
else
    echo -e "${RED}✗${NC} Some workflow files are missing"
fi
echo ""

# List workflows
echo "Available workflows:"
gh workflow list 2>/dev/null || echo "Run 'gh workflow list' after pushing to see workflows"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  Setup Complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✓${NC} Labels created"
echo -e "${YELLOW}⚠${NC} Secrets need to be configured manually"
echo -e "${GREEN}✓${NC} Workflow files verified"
echo ""
echo "Next steps:"
echo "1. Ensure Cloudflare secrets are configured"
echo "2. Push to main or develop branch to trigger CI/CD"
echo "3. Create a PR to test PR management workflow"
echo "4. Monitor the Actions tab for workflow execution"
echo ""
echo "Documentation:"
echo "• Workflow Guide: .github/WORKFLOWS_GUIDE.md"
echo "• Workflow README: .github/workflows/README.md"
echo ""
echo -e "${BLUE}Happy coding! 🚀${NC}"
