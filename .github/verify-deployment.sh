#!/bin/bash
# Deployment Verification Script for Cloudflare Pages
# Verifies API endpoints are working after deployment

DEPLOYMENT_URL="${1:-https://2027-5a0.pages.dev}"
LOG_FILE=".github/logs/deploy-verification.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "========================================" >> "$LOG_FILE"
echo "Deployment Verification - $TIMESTAMP" >> "$LOG_FILE"
echo "Testing URL: $DEPLOYMENT_URL" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Function to test an endpoint
test_endpoint() {
    local endpoint=$1
    local url="${DEPLOYMENT_URL}${endpoint}"
    
    echo "" >> "$LOG_FILE"
    echo "Testing: $url" >> "$LOG_FILE"
    
    # Use curl to test the endpoint
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>&1)
    
    if [ "$response" = "200" ] || [ "$response" = "201" ]; then
        echo "✓ SUCCESS: $endpoint (HTTP $response)" >> "$LOG_FILE"
        echo "✓ SUCCESS: $endpoint (HTTP $response)"
        return 0
    else
        echo "✗ FAILED: $endpoint (HTTP $response)" >> "$LOG_FILE"
        echo "✗ FAILED: $endpoint (HTTP $response)"
        return 1
    fi
}

# Test endpoints
echo "" >> "$LOG_FILE"
echo "Testing API endpoints..." >> "$LOG_FILE"
echo "Testing API endpoints..."

test_endpoint "/api/health"
test_endpoint "/api/pin"
test_endpoint "/api/queue"
test_endpoint "/api/notifications"

echo "" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"
echo "Verification completed at $TIMESTAMP" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"
echo ""
echo "Verification completed. Check $LOG_FILE for details."
