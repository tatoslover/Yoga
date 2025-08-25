#!/bin/bash

# Mat & Mind - Trusted Content Workflow
# This script combines the content scraping, processing, and building steps
# into a reliable workflow that handles failures gracefully.

# Set error handling
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Print header
print_header() {
  echo -e "\n${GREEN}====================================================${NC}"
  echo -e "${GREEN}  Mat & Mind - Trusted Content Workflow             ${NC}"
  echo -e "${GREEN}====================================================${NC}"
}

# Print section header
print_section() {
  echo -e "\n${BLUE}${BOLD}$1${NC}"
  echo -e "${BLUE}---------------------------------------------------${NC}"
}

# Print success message
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Print warning message
print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# Print error message
print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# Parse command-line arguments
USE_CACHE=false
HTTP_ONLY=false
SKIP_SCRAPE=false
USE_MOCK=false
STATIC_BUILD=false
ONETIME=false

for arg in "$@"
do
  case $arg in
    --use-cache)
      USE_CACHE=true
      shift
      ;;
    --http-only)
      HTTP_ONLY=true
      shift
      ;;
    --skip-scrape)
      SKIP_SCRAPE=true
      shift
      ;;
    --use-mock)
      USE_MOCK=true
      shift
      ;;
    --static-build)
      STATIC_BUILD=true
      shift
      ;;
    --onetime)
      ONETIME=true
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --use-cache     Use cached content (don't re-download)"
      echo "  --http-only     Use HTTP-only mode (no browser automation)"
      echo "  --skip-scrape   Skip scraping step (use existing data)"
      echo "  --use-mock      Use mock data instead of scraped data"
      echo "  --static-build  Use static build instead of Eleventy"
      echo "  --onetime       Use extra-long delays for one-time scraping (bypass blocking)"
      echo "  --help          Show this help message"
      exit 0
      ;;
    *)
      # Unknown option
      shift
      ;;
  esac
done

# Print configuration
print_header
echo -e "\n${BLUE}Workflow Configuration:${NC}"
echo -e "Use cache: ${USE_CACHE}"
echo -e "HTTP-only mode: ${HTTP_ONLY}"
echo -e "Skip scraping: ${SKIP_SCRAPE}"
echo -e "Use mock data: ${USE_MOCK}"
echo -e "Static build: ${STATIC_BUILD}"
echo -e "One-time mode: ${ONETIME}"

# Step 1: Create required directories if they don't exist
mkdir -p src/_data/scraped
mkdir -p _cache

# Step 2: Scrape content from trusted sources (if not skipped)
if [ "$SKIP_SCRAPE" = false ]; then
  print_section "Step 1: Scraping content from trusted sources"

  # Set up command
  SCRAPE_CMD="node scripts/scraping/scrape-yoga-info.js"

  # Add options
  if [ "$USE_CACHE" = true ]; then
    SCRAPE_CMD="USE_CACHE=true $SCRAPE_CMD"
    echo -e "${BLUE}Using cached content${NC}"
  fi

  if [ "$HTTP_ONLY" = true ]; then
    SCRAPE_CMD="$SCRAPE_CMD --http-only"
    echo -e "${BLUE}Running in HTTP-only mode (no browser)${NC}"
  fi

  if [ "$ONETIME" = true ]; then
    SCRAPE_CMD="$SCRAPE_CMD --onetime"
    echo -e "${BLUE}Running in one-time mode with extra-long delays${NC}"
    echo -e "${YELLOW}Note: This will take much longer but should bypass blocking${NC}"
  fi

  # Execute scraping command
  echo -e "Executing: $SCRAPE_CMD"
  if eval $SCRAPE_CMD; then
    print_success "Content scraping completed successfully"
  else
    print_warning "Content scraping encountered issues, will try to proceed with available data"
    # Continue despite errors
  fi
else
  print_section "Step 1: Scraping [SKIPPED]"
  print_warning "Skipping content scraping as requested"
fi

# Step 3: Generate static content from mock data if needed
if [ "$USE_MOCK" = true ]; then
  print_section "Step 2: Generating content from mock data"
  echo -e "Using mock data for guide content"

  if node scripts/content/generate-static-content.js; then
    print_success "Generated static content from mock data"
  else
    print_error "Failed to generate content from mock data"
    exit 1
  fi
else
  print_section "Step 2: Processing scraped data"

  if USE_MOCK_DATA=false node scripts/content/update-guide-content.js; then
    print_success "Processed scraped data successfully"
  else
    print_warning "Issues processing scraped data, trying with mock data"

    if USE_MOCK_DATA=true node scripts/content/update-guide-content.js; then
      print_success "Generated content using mock data as fallback"
    else
      print_error "Failed to generate content with mock data"
      exit 1
    fi
  fi
fi

# Step 4: Build the site
print_section "Step 3: Building the site"

if [ "$STATIC_BUILD" = true ]; then
  echo -e "Using static build method"

  if node scripts/build/static-build.js; then
    print_success "Static build completed successfully"
  else
    print_error "Static build failed"
    exit 1
  fi
else
  echo -e "Using Eleventy build method"

  if npm run build; then
    print_success "Eleventy build completed successfully"
  else
    print_warning "Eleventy build failed, falling back to static build"

    if node scripts/build/static-build.js; then
      print_success "Static build completed successfully as fallback"
    else
      print_error "Static build also failed"
      exit 1
    fi
  fi
fi

# Success message
print_section "Workflow Completed"
print_success "The site has been updated with trusted content and built successfully!"
echo -e "\nTo preview the site, run: ${YELLOW}npm start${NC}"
echo -e "To deploy the site, commit and push your changes"

# Troubleshooting tips
echo -e "\n${BLUE}Troubleshooting Tips:${NC}"
echo -e "- If content scraping fails: ${YELLOW}./scripts/trusted-content-workflow.sh --use-mock${NC}"
echo -e "- If build fails: ${YELLOW}./scripts/trusted-content-workflow.sh --static-build${NC}"
echo -e "- For fastest workflow: ${YELLOW}./scripts/trusted-content-workflow.sh --skip-scrape --static-build${NC}"
echo -e "- For one-time scraping: ${YELLOW}./scripts/trusted-content-workflow.sh --onetime${NC}"
