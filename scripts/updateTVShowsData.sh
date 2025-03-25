#!/bin/bash

echo "========================================"
echo "TV SHOWS DATA UPDATE UTILITY"
echo "========================================"
echo "This script will update TV show data in your database."
echo "It will:"
echo "1. Update missing episode information"
echo "2. Verify TV show details and fix any issues"
echo "3. Update all TV show episode data"
echo ""

# Change to the server directory
cd "$(dirname "$0")/.."

echo "Step 1: Updating TV shows with missing episode information..."
echo "========================================"
node updateTVShowsWithMissingEpisodes.js

echo ""
echo "Step 2: Verifying and fixing TV show data..."
echo "========================================"
node scripts/verifyAndFixTVShows.js

echo ""
echo "Step 3: Final update pass for all TV show episodes..."
echo "========================================"
node updateTVShowEpisodes.js

echo ""
echo "========================================"
echo "All TV show data update processes completed!"
echo "========================================" 