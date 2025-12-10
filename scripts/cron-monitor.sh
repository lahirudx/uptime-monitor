#!/bin/sh

# Simple cron-based monitor that calls the API endpoint
# This mimics the production cron approach (Vercel Cron, Lambda EventBridge, etc.)

API_URL="${API_URL:-http://app:3200/api/cron/monitor}"
CRON_SECRET="${CRON_SECRET}"

echo "Starting cron-based monitor service..."
echo "API URL: $API_URL"

# Function to call the monitor API
check_monitors() {
    echo "[$(date)] Triggering monitor checks..."

    # Store response and HTTP code
    if [ -n "$CRON_SECRET" ]; then
        RESPONSE=$(curl -w "\n%{http_code}" -s -X GET "$API_URL" \
            -H "Authorization: Bearer $CRON_SECRET" \
            -H "Content-Type: application/json")
    else
        RESPONSE=$(curl -w "\n%{http_code}" -s -X GET "$API_URL" \
            -H "Content-Type: application/json")
    fi

    # Extract HTTP code and body
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    # Display results
    echo "HTTP Status: $HTTP_CODE"
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✓ Success - Response: $BODY"
    else
        echo "✗ FAILED - HTTP $HTTP_CODE"
        echo "Response: $BODY"
    fi
    
    echo "[$(date)] Monitor check completed"
    echo "---"
}

# Run checks every minute
while true; do
    check_monitors
    sleep 60
done
