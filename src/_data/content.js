/**
 * This file loads personal content data from the content directory
 * and makes it available to the Eleventy templates.
 */

const fs = require('fs');
const path = require('path');

// Get content data from JSON files
function loadContentData() {
  const contentDir = path.join(__dirname, 'content');
  const contentData = {};

  try {
    // Read all content files
    const files = fs.readdirSync(contentDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(contentDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);

        // Remove the file extension to get the content type
        const contentType = file.replace('.json', '');

        // Store the data in the contentData object
        contentData[contentType] = data;
      }
    }

    console.log(`✓ Loaded ${Object.keys(contentData).length} content files`);
    return contentData;
  } catch (error) {
    console.error('Error loading content data:', error);
    return {};
  }
}

// Extract yoga types from the content data
function getYogaTypes(contentData) {
  try {
    if (contentData.yogaTypes && contentData.yogaTypes[0].data.data) {
      return Object.keys(contentData.yogaTypes[0].data.data);
    }
    return [];
  } catch (error) {
    console.error('Error extracting yoga types:', error);
    return [];
  }
}

// Extract benefits categories from the content data
function getBenefitsCategories(contentData) {
  try {
    if (contentData.benefits && contentData.benefits[0].data.data) {
      return Object.keys(contentData.benefits[0].data.data);
    }
    return [];
  } catch (error) {
    console.error('Error extracting benefits categories:', error);
    return [];
  }
}

// Extract pose categories from the content data
function getPoseCategories(contentData) {
  try {
    if (contentData.poses && contentData.poses[0].data.data) {
      return Object.keys(contentData.poses[0].data.data);
    }
    return [];
  } catch (error) {
    console.error('Error extracting pose categories:', error);
    return [];
  }
}

// Extract tip categories from the content data
function getTipCategories(contentData) {
  try {
    if (contentData.tips && contentData.tips[0].data.data) {
      return Object.keys(contentData.tips[0].data.data);
    }
    return [];
  } catch (error) {
    console.error('Error extracting tip categories:', error);
    return [];
  }
}

// Load the content data
const contentData = loadContentData();

// Export the data for use in templates
module.exports = {
  // Raw content data
  data: contentData,

  // Processed data for easy use in templates
  yogaTypes: getYogaTypes(contentData),
  benefitsCategories: getBenefitsCategories(contentData),
  poseCategories: getPoseCategories(contentData),
  tipCategories: getTipCategories(contentData),

  // Helper function to get a specific content item
  getContent: function(type, category, item) {
    try {
      if (contentData[type] && contentData[type][0].data.data[category]) {
        if (item) {
          return contentData[type][0].data.data[category][item];
        }
        return contentData[type][0].data.data[category];
      }
      return null;
    } catch (error) {
      console.error(`Error getting content for ${type}.${category}.${item}:`, error);
      return null;
    }
  }
};
