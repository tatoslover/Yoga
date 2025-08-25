#!/bin/bash

# Yoga Section Scraper Script
#
# This script runs the section-specific scraper for a particular
# section of the yoga guide content.
#
# Usage:
#   ./scripts/scrape-section.sh <section> [options]
#
# Where <section> is one of:
#   - benefits
#   - poses
#   - types (or yogaTypes)
#   - tips
#
# Options:
#   --http-only     Use HTTP-only mode (no browser automation)
#   --use-cache     Use cached content (don't re-download)
#   --onetime       Use extra-long delays for one-time scraping
#   --verbose       Show more detailed logs
#   --source=NAME   Scrape only the specified source

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}    Yoga Section Scraper Script     ${NC}"
echo -e "${BLUE}====================================${NC}"

# Check if section parameter was provided
if [ $# -eq 0 ]; then
  echo -e "${RED}Error: No section specified${NC}"
  echo -e "Usage: ./scripts/scrape-section.sh <section> [options]"
  echo -e "Where <section> is one of: benefits, poses, types, tips"
  exit 1
fi

# Extract the section argument
SECTION=$1
shift # Remove the first argument, leaving any remaining options

# Validate section
if [[ ! $SECTION =~ ^(benefits|poses|types|yogaTypes|tips)$ ]]; then
  echo -e "${RED}Error: Invalid section '${SECTION}'${NC}"
  echo -e "Valid sections are: benefits, poses, types, tips"
  exit 1
fi

# Create required directories if they don't exist
echo -e "${BLUE}Creating required directories...${NC}"
mkdir -p src/_data/scraped
mkdir -p _cache

# Run the section-specific scraper
echo -e "${GREEN}Starting scraper for section: ${SECTION}${NC}"
echo -e "${YELLOW}Options: $*${NC}"

node scripts/scraping/scrape-section.js $SECTION "$@"

# Check if the scraper was successful
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Scraper completed successfully!${NC}"

  # Check if the data was generated
  if [ -f "src/_data/scraped/${SECTION}.json" ]; then
    echo -e "${GREEN}Data file created: src/_data/scraped/${SECTION}.json${NC}"

    # Process the scraped data
    echo -e "${BLUE}Processing scraped data...${NC}"
    node scripts/content/update-guide-content.js

    if [ $? -eq 0 ]; then
      echo -e "${GREEN}Content updated successfully!${NC}"
      echo -e "${YELLOW}Don't forget to rebuild the site to see the changes.${NC}"
    else
      echo -e "${RED}Error processing scraped data.${NC}"
      exit 1
    fi
  else
    echo -e "${RED}Warning: No data file was created for ${SECTION}${NC}"
  fi
else
  echo -e "${RED}Scraper failed. Check the logs above for errors.${NC}"
  exit 1
fi

echo -e "${BLUE}====================================${NC}"
echo -e "${GREEN}Process completed${NC}"
