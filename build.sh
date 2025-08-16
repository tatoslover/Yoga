#!/bin/bash

# Peaceful Yoga Build Script

# Set error handling
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Header
echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}  Peaceful Yoga - Build Script        ${NC}"
echo -e "${GREEN}=======================================${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js before running this script"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    echo "Please install npm before running this script"
    exit 1
fi

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
npm install

# Clean previous build
echo -e "\n${YELLOW}Cleaning previous build...${NC}"
if [ -d "_site" ]; then
    rm -rf _site
fi

# Build the site
echo -e "\n${YELLOW}Building the site...${NC}"
npm run build

# Success message
if [ -d "_site" ]; then
    echo -e "\n${GREEN}Build completed successfully!${NC}"
    echo -e "The site has been built in the ${YELLOW}_site${NC} directory"
    echo -e "\nTo preview the site locally, run: ${YELLOW}npm start${NC}"
    echo -e "To deploy to Netlify, push to your GitHub repository"
else
    echo -e "\n${RED}Build failed. The _site directory was not created.${NC}"
    exit 1
fi

# Deploy instructions
echo -e "\n${GREEN}=======================================${NC}"
echo -e "${GREEN}  Deployment Instructions              ${NC}"
echo -e "${GREEN}=======================================${NC}"
echo -e "1. Push your changes to GitHub"
echo -e "2. Connect your repository to Netlify"
echo -e "3. Configure the build settings in Netlify:"
echo -e "   - Build command: ${YELLOW}npm run build${NC}"
echo -e "   - Publish directory: ${YELLOW}_site${NC}"
echo -e "\nFor local development, use: ${YELLOW}npm start${NC}"
