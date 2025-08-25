#!/bin/bash

# Yoga All Sections Scraper Script
#
# This script runs all section-specific scrapers in sequence
# with a delay between sections to avoid rate limiting.
#
# Usage:
#   ./scripts/scrape-all-sections.sh [options]
#
# Options:
#   --http-only     Use HTTP-only mode (no browser automation)
#   --use-cache     Use cached content (don't re-download)
#   --onetime       Use extra-long delays for one-time scraping
#   --verbose       Show more detailed logs
#   --quick         Use shorter delays between sections

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}    Yoga All Sections Scraper      ${NC}"
echo -e "${BLUE}====================================${NC}"

# Default settings
DELAY_BETWEEN_SECTIONS=300 # 5 minutes by default
SECTIONS=("benefits" "poses" "types" "tips")
OPTIONS=()

# Process command-line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --quick)
      DELAY_BETWEEN_SECTIONS=60 # 1 minute in quick mode
      echo -e "${YELLOW}Quick mode enabled - shorter delays between sections${NC}"
      ;;
    --http-only|--use-cache|--onetime|--verbose)
      OPTIONS+=("$1")
      ;;
    --source=*)
      OPTIONS+=("$1")
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      ;;
  esac
  shift
done

# Create required directories if they don't exist
echo -e "${BLUE}Creating required directories...${NC}"
mkdir -p src/_data/scraped
mkdir -p _cache

# Function to run a single section scraper
run_section_scraper() {
  local section=$1
  echo -e "\n${PURPLE}========== SECTION: ${section} ==========${NC}"
  echo -e "${GREEN}Starting scraper for section: ${section}${NC}"
  echo -e "${YELLOW}Options: ${OPTIONS[*]}${NC}"

  ./scripts/scraping/scrape-section.sh "$section" "${OPTIONS[@]}"

  local result=$?
  if [ $result -eq 0 ]; then
    echo -e "${GREEN}✓ Successfully scraped ${section}${NC}"
  else
    echo -e "${RED}✗ Failed to scrape ${section} (exit code: $result)${NC}"
  fi

  echo -e "${PURPLE}========== END SECTION: ${section} ==========${NC}\n"
  return $result
}

# Run all sections
total_sections=${#SECTIONS[@]}
successful_sections=0

for i in "${!SECTIONS[@]}"; do
  section=${SECTIONS[$i]}
  section_num=$((i+1))

  echo -e "${BLUE}Processing section $section_num of $total_sections: ${section}${NC}"

  run_section_scraper "$section"
  if [ $? -eq 0 ]; then
    successful_sections=$((successful_sections+1))
  fi

  # Delay before next section (except after the last one)
  if [ $i -lt $((total_sections-1)) ]; then
    echo -e "${YELLOW}Waiting ${DELAY_BETWEEN_SECTIONS} seconds before next section...${NC}"
    sleep $DELAY_BETWEEN_SECTIONS
  fi
done

# Final step: update the guide content with all scraped data
echo -e "\n${BLUE}Updating guide content with all scraped data...${NC}"
node scripts/content/update-guide-content.js

if [ $? -eq 0 ]; then
  echo -e "${GREEN}Content updated successfully!${NC}"
else
  echo -e "${RED}Error updating content.${NC}"
fi

# Summary
echo -e "\n${BLUE}====================================${NC}"
echo -e "${GREEN}Process completed${NC}"
echo -e "${BLUE}Sections processed: $total_sections${NC}"
echo -e "${GREEN}Successful sections: $successful_sections${NC}"
if [ $successful_sections -lt $total_sections ]; then
  echo -e "${RED}Failed sections: $((total_sections-successful_sections))${NC}"
fi
echo -e "${YELLOW}Don't forget to rebuild the site to see the changes.${NC}"
echo -e "${BLUE}====================================${NC}"
