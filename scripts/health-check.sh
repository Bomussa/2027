#!/bin/bash

# Health Check Script for Cloudflare Pages Deployment
# This script verifies the deployment is working correctly

set -e

# Configuration
PRODUCTION_URL="${PRODUCTION_URL:-https://www.mmc-mms.com}"
PREVIEW_URL="${PREVIEW_URL:-https://2027-5a0.pages.dev}"
MAX_RETRIES=3
RETRY_DELAY=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check URL
check_url() {
    local url=$1
    local name=$2
    local retries=0
    
    echo -e "\n${YELLOW}Checking $name: $url${NC}"
    
    while [ $retries -lt $MAX_RETRIES ]; do
        status=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
        response_time=$(curl -o /dev/null -s -w "%{time_total}" "$url" || echo "0")
        
        if [ "$status" = "200" ]; then
            echo -e "${GREEN}✓ $name is healthy${NC}"
            echo -e "  Status: $status"
            echo -e "  Response time: ${response_time}s"
            return 0
        else
            retries=$((retries + 1))
            echo -e "${RED}✗ Attempt $retries failed (HTTP $status)${NC}"
            
            if [ $retries -lt $MAX_RETRIES ]; then
                echo "  Retrying in ${RETRY_DELAY}s..."
                sleep $RETRY_DELAY
            fi
        fi
    done
    
    echo -e "${RED}✗ $name is unhealthy after $MAX_RETRIES attempts${NC}"
    return 1
}

# Function to check critical resources
check_resources() {
    local base_url=$1
    local name=$2
    
    echo -e "\n${YELLOW}Checking critical resources for $name...${NC}"
    
    resources=(
        "/"
        "/index.html"
    )
    
    for resource in "${resources[@]}"; do
        url="${base_url}${resource}"
        status=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
        
        if [ "$status" = "200" ] || [ "$status" = "301" ] || [ "$status" = "302" ]; then
            echo -e "${GREEN}✓ $resource - OK ($status)${NC}"
        else
            echo -e "${YELLOW}⚠ $resource - Warning ($status)${NC}"
        fi
    done
}

# Function to collect metrics
collect_metrics() {
    local url=$1
    local name=$2
    
    echo -e "\n${YELLOW}Collecting metrics for $name...${NC}"
    
    # Get response time
    response_time=$(curl -o /dev/null -s -w "%{time_total}" "$url" || echo "0")
    
    # Get response size
    size=$(curl -s -w "%{size_download}" -o /dev/null "$url" || echo "0")
    
    # Get status
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    
    echo "  Response time: ${response_time}s"
    echo "  Size: ${size} bytes"
    echo "  Status: ${status}"
    
    # Save metrics to file
    if [ -d "logs/metrics" ]; then
        timestamp=$(date -u +"%Y-%m-%d_%H-%M-%S")
        cat > "logs/metrics/${name}-${timestamp}.json" << EOF
{
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "name": "$name",
    "url": "$url",
    "status": $status,
    "response_time": $response_time,
    "size_bytes": $size
}
EOF
        echo -e "${GREEN}  Metrics saved${NC}"
    fi
}

# Main health check
main() {
    echo "================================="
    echo "  Cloudflare Pages Health Check"
    echo "================================="
    echo "Time: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    
    # Check production
    if check_url "$PRODUCTION_URL" "Production"; then
        check_resources "$PRODUCTION_URL" "Production"
        collect_metrics "$PRODUCTION_URL" "production"
        PROD_HEALTHY=true
    else
        PROD_HEALTHY=false
    fi
    
    # Check preview
    if check_url "$PREVIEW_URL" "Preview"; then
        check_resources "$PREVIEW_URL" "Preview"
        collect_metrics "$PREVIEW_URL" "preview"
        PREVIEW_HEALTHY=true
    else
        PREVIEW_HEALTHY=false
    fi
    
    # Summary
    echo -e "\n================================="
    echo "  Health Check Summary"
    echo "================================="
    
    if [ "$PROD_HEALTHY" = true ]; then
        echo -e "${GREEN}✓ Production: Healthy${NC}"
    else
        echo -e "${RED}✗ Production: Unhealthy${NC}"
    fi
    
    if [ "$PREVIEW_HEALTHY" = true ]; then
        echo -e "${GREEN}✓ Preview: Healthy${NC}"
    else
        echo -e "${YELLOW}⚠ Preview: Needs attention${NC}"
    fi
    
    # Exit with error if production is unhealthy
    if [ "$PROD_HEALTHY" != true ]; then
        echo -e "\n${RED}Health check failed!${NC}"
        exit 1
    fi
    
    echo -e "\n${GREEN}Health check passed!${NC}"
    exit 0
}

# Run main function
main
