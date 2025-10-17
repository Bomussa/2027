#!/bin/bash

# Workflow Validation Script
# Validates that all GitHub Actions workflows are properly configured

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   GitHub Actions Workflow Validation                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}✗${NC} Not in a git repository"
    exit 1
fi

echo -e "${GREEN}✓${NC} Git repository detected"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  Checking Workflow Files"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check workflow directory exists
if [ ! -d ".github/workflows" ]; then
    echo -e "${RED}✗${NC} .github/workflows directory not found"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓${NC} .github/workflows directory exists"
fi

# List of required workflows
declare -a workflows=(
    "ci-cd.yml"
    "pr-management.yml"
    "deploy-cloudflare.yml"
    "auto-repair.yml"
)

# Check each workflow file
for workflow in "${workflows[@]}"; do
    if [ -f ".github/workflows/$workflow" ]; then
        echo -e "${GREEN}✓${NC} Found: $workflow"
        
        # Check if file is not empty
        if [ ! -s ".github/workflows/$workflow" ]; then
            echo -e "  ${RED}✗${NC} File is empty"
            ERRORS=$((ERRORS + 1))
        fi
        
        # Check YAML syntax (basic check)
        if command -v yamllint &> /dev/null; then
            if yamllint -d relaxed ".github/workflows/$workflow" > /dev/null 2>&1; then
                echo -e "  ${GREEN}✓${NC} YAML syntax valid"
            else
                echo -e "  ${YELLOW}⚠${NC} YAML syntax warnings"
                WARNINGS=$((WARNINGS + 1))
            fi
        fi
    else
        echo -e "${RED}✗${NC} Missing: $workflow"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# Check documentation files
echo "═══════════════════════════════════════════════════════════════"
echo "  Checking Documentation"
echo "═══════════════════════════════════════════════════════════════"
echo ""

declare -a docs=(
    ".github/workflows/README.md"
    ".github/WORKFLOWS_GUIDE.md"
    ".github/QUICK_REFERENCE.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✓${NC} Found: $doc"
    else
        echo -e "${YELLOW}⚠${NC} Missing: $doc (optional)"
        WARNINGS=$((WARNINGS + 1))
    fi
done

echo ""

# Check setup script
echo "═══════════════════════════════════════════════════════════════"
echo "  Checking Setup Tools"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ -f ".github/setup-workflows.sh" ]; then
    echo -e "${GREEN}✓${NC} Setup script exists"
    if [ -x ".github/setup-workflows.sh" ]; then
        echo -e "${GREEN}✓${NC} Setup script is executable"
    else
        echo -e "${YELLOW}⚠${NC} Setup script is not executable (run: chmod +x .github/setup-workflows.sh)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠${NC} Setup script not found (optional)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# Validate workflow configuration
echo "═══════════════════════════════════════════════════════════════"
echo "  Validating Workflow Configuration"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check Node version consistency
echo "Checking Node.js version consistency..."
NODE_VERSIONS=$(grep -h "NODE_VERSION:" .github/workflows/*.yml 2>/dev/null | grep -oP "'\K[^']+" | sort -u)
if [ $(echo "$NODE_VERSIONS" | wc -l) -eq 1 ]; then
    echo -e "${GREEN}✓${NC} Node.js version consistent: $NODE_VERSIONS"
elif [ $(echo "$NODE_VERSIONS" | wc -l) -gt 1 ]; then
    echo -e "${YELLOW}⚠${NC} Multiple Node.js versions found:"
    echo "$NODE_VERSIONS" | sed 's/^/  /'
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${BLUE}ℹ${NC} Node.js version not specified in env (using default)"
fi

# Check for required actions
echo ""
echo "Checking required GitHub Actions..."

declare -a required_actions=(
    "actions/checkout@v4"
    "actions/setup-node@v4"
    "actions/upload-artifact@v4"
    "actions/download-artifact@v4"
    "actions/github-script@v7"
)

for action in "${required_actions[@]}"; do
    if grep -r "$action" .github/workflows/*.yml > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Uses: $action"
    else
        echo -e "${YELLOW}⚠${NC} Not found: $action"
        WARNINGS=$((WARNINGS + 1))
    fi
done

echo ""

# Check Cloudflare Pages action
if grep -r "cloudflare/pages-action" .github/workflows/*.yml > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Cloudflare Pages deployment configured"
else
    echo -e "${RED}✗${NC} Cloudflare Pages deployment not configured"
    ERRORS=$((ERRORS + 1))
fi

# Check for Playwright installation
if grep -r "playwright install" .github/workflows/*.yml > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Playwright installation configured"
else
    echo -e "${YELLOW}⚠${NC} Playwright installation not found"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# Check project configuration
echo "═══════════════════════════════════════════════════════════════"
echo "  Checking Project Configuration"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check package.json
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓${NC} package.json exists"
    
    # Check required scripts
    if grep -q '"build":' package.json && \
       grep -q '"build:backend":' package.json && \
       grep -q '"build:frontend":' package.json; then
        echo -e "${GREEN}✓${NC} Build scripts defined"
    else
        echo -e "${RED}✗${NC} Missing build scripts"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗${NC} package.json not found"
    ERRORS=$((ERRORS + 1))
fi

# Check wrangler.toml
if [ -f "wrangler.toml" ]; then
    echo -e "${GREEN}✓${NC} wrangler.toml exists"
    
    # Check project name
    if grep -q 'name = "2027"' wrangler.toml; then
        echo -e "${GREEN}✓${NC} Project name configured: 2027"
    else
        echo -e "${YELLOW}⚠${NC} Check project name in wrangler.toml"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠${NC} wrangler.toml not found (needed for Cloudflare)"
    WARNINGS=$((WARNINGS + 1))
fi

# Check .gitignore
if [ -f ".gitignore" ]; then
    echo -e "${GREEN}✓${NC} .gitignore exists"
    
    # Check for essential entries
    if grep -q "node_modules" .gitignore && \
       grep -q "dist" .gitignore; then
        echo -e "${GREEN}✓${NC} Essential entries in .gitignore"
    else
        echo -e "${YELLOW}⚠${NC} Check .gitignore entries"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠${NC} .gitignore not found"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# Check README badges
echo "═══════════════════════════════════════════════════════════════"
echo "  Checking README Badges"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ -f "README.md" ]; then
    if grep -q "github.com/Bomussa/2027/actions/workflows" README.md; then
        echo -e "${GREEN}✓${NC} Workflow badges found in README.md"
    else
        echo -e "${YELLOW}⚠${NC} Workflow badges not found in README.md"
        echo "  Add badges from .github/QUICK_REFERENCE.md"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠${NC} README.md not found"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# Summary
echo "═══════════════════════════════════════════════════════════════"
echo "  Validation Summary"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Your GitHub Actions workflows are properly configured."
    echo ""
    echo "Next steps:"
    echo "1. Run: .github/setup-workflows.sh (to create labels)"
    echo "2. Configure Cloudflare secrets in GitHub"
    echo "3. Push to main/develop to trigger workflows"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Validation completed with $WARNINGS warning(s)${NC}"
    echo ""
    echo "Workflows should work, but review warnings above."
    echo ""
    exit 0
else
    echo -e "${RED}✗ Validation failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix the errors above before using the workflows."
    echo ""
    exit 1
fi
