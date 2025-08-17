#!/bin/bash

# Mat & Mind Content Refresh Script
# This script automates the process of refreshing content from trusted sources

# Set error handling
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Header
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  Mat & Mind - Content Refresh Workflow     ${NC}"
echo -e "${GREEN}=============================================${NC}"

# Create directories if they don't exist
mkdir -p src/_data/scraped
mkdir -p _cache

# Parse command-line arguments
USE_CACHE=false
for arg in "$@"
do
    case $arg in
        --use-cache)
        USE_CACHE=true
        shift
        ;;
        *)
        # Unknown option
        ;;
    esac
done

echo -e "\n${BLUE}Content Refresh Options:${NC}"
echo -e "Use cache: ${USE_CACHE}"

# Step 1: Scrape content from trusted sources
echo -e "\n${YELLOW}Step 1: Scraping content from trusted yoga sources...${NC}"
if [ "$USE_CACHE" = true ] ; then
    USE_CACHE=true node scripts/scrape-yoga-info.js
else
    node scripts/scrape-yoga-info.js
fi

# Check if scraping was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Content scraping failed. See above for details.${NC}"
    exit 1
fi

# Step 2: Process scraped data and update guide content
echo -e "\n${YELLOW}Step 2: Processing scraped data and updating guide content...${NC}"
node scripts/update-guide-content.js

# Check if content update was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Content update failed. See above for details.${NC}"
    exit 1
fi

# Step 3: Build the site
echo -e "\n${YELLOW}Step 3: Building the site with updated content...${NC}"
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Site build failed. See above for details.${NC}"
    exit 1
fi

# Success message
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}  Content Refresh Completed Successfully!   ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "The site has been updated with fresh content from trusted sources."
echo -e "\nTo preview the updated site, run: ${YELLOW}npm start${NC}"
echo -e "To commit and push changes, use git."
