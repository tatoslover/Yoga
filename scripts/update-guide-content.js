/**
 * Guide Content Updater
 *
 * This script takes scraped yoga information and updates the guide sections.
 * It reads from the scraped data files and generates HTML content that can be
 * included in the guide page.
 *
 * Usage: node scripts/update-guide-content.js
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Configuration
const SCRAPED_DIR = path.join(__dirname, '../src/_data/scraped');
const GUIDE_TEMPLATE = path.join(__dirname, '../src/content/guide/template.html');
const GUIDE_INCLUDES_DIR = path.join(__dirname, '../src/_includes/guide');
const SECTIONS = ['yogaTypes', 'poses', 'benefits', 'tips'];
const MIN_CONTENT_PER_SECTION = 3; // Minimum items per section
const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true' || false;

// Ensure guide includes directory exists
if (!fs.existsSync(GUIDE_INCLUDES_DIR)) {
  fs.mkdirSync(GUIDE_INCLUDES_DIR, { recursive: true });
}

// Main function
async function updateGuideContent() {
  console.log('Updating guide content with scraped data...');

  // Read all the scraped data
  const scrapedData = {};
  const metadata = {
    lastUpdated: new Date().toISOString(),
    sources: {}
  };

  for (const section of SECTIONS) {
    const filePath = path.join(SCRAPED_DIR, `${section}.json`);
    const mockFilePath = path.join(SCRAPED_DIR, `mock-${section}.json`);

    if (fs.existsSync(filePath) && !USE_MOCK_DATA) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Process and merge data from multiple sources
        const processedData = processSectionData(section, data);
        scrapedData[section] = processedData.data;

        // Track sources for attribution
        metadata.sources[section] = processedData.sources;

        console.log(`✓ Loaded ${section} data from ${filePath} (${scrapedData[section].length} items from ${processedData.sources.length} sources)`);
      } catch (error) {
        console.error(`✗ Error loading ${section} data:`, error.message);
        // Try to load mock data as fallback
        if (fs.existsSync(mockFilePath)) {
          console.log(`  Attempting to load mock data for ${section}...`);
          try {
            const mockData = JSON.parse(fs.readFileSync(mockFilePath, 'utf8'));
            const processedMockData = processSectionData(section, mockData);
            scrapedData[section] = processedMockData.data;
            metadata.sources[section] = processedMockData.sources;
            console.log(`✓ Loaded mock data for ${section} as fallback`);
          } catch (mockError) {
            console.error(`✗ Error loading mock data:`, mockError.message);
            scrapedData[section] = [];
          }
        } else {
          scrapedData[section] = [];
        }
      }
    } else if (fs.existsSync(mockFilePath) && (USE_MOCK_DATA || !fs.existsSync(filePath))) {
      // Use mock data if requested or if real data doesn't exist
      console.log(`Using mock data for ${section}${USE_MOCK_DATA ? ' (forced)' : ' (fallback)'}`);
      try {
        const mockData = JSON.parse(fs.readFileSync(mockFilePath, 'utf8'));
        const processedMockData = processSectionData(section, mockData);
        scrapedData[section] = processedMockData.data;
        metadata.sources[section] = processedMockData.sources;
        console.log(`✓ Loaded mock data for ${section}`);
      } catch (mockError) {
        console.error(`✗ Error loading mock data:`, mockError.message);
        scrapedData[section] = [];
      }
    } else {
      console.log(`✗ No data file found for ${section}`);
      scrapedData[section] = [];
    }
  }

  // Generate content for each section
  for (const section of SECTIONS) {
    if (scrapedData[section] && scrapedData[section].length > 0) {
      try {
        // Check if we have enough content
        if (scrapedData[section].length < MIN_CONTENT_PER_SECTION) {
          console.log(`⚠ Warning: Only ${scrapedData[section].length} items for ${section} (minimum ${MIN_CONTENT_PER_SECTION})`);
        }

        const content = generateSectionContent(section, scrapedData[section], metadata.sources[section]);
        const outputPath = path.join(GUIDE_INCLUDES_DIR, `${section}.html`);

        // Save content
        fs.writeFileSync(outputPath, content);

        // Save a separate attribution file
        const attributionPath = path.join(GUIDE_INCLUDES_DIR, `${section}-attribution.html`);
        const attribution = generateAttributionHTML(section, metadata.sources[section]);
        fs.writeFileSync(attributionPath, attribution);

        console.log(`✓ Generated content for ${section} -> ${outputPath}`);
      } catch (error) {
        console.error(`✗ Error generating content for ${section}:`, error.message);
      }
    } else {
      console.log(`- Skipping ${section} (no data)`);
    }
  }

  // Save metadata
  const metadataPath = path.join(GUIDE_INCLUDES_DIR, 'content-metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  // Update the main guide template to include the generated content
  updateGuideTemplate();

  console.log('Guide content update completed!');
}

// Generate HTML content for a specific section
// Process and merge data from multiple sources
function processSectionData(section, data) {
  const mergedData = [];
  const sources = [];

  // Extract source information for attribution
  data.forEach(sourceData => {
    if (sourceData.source && sourceData.data) {
      // Add source metadata
      sources.push({
        name: sourceData.source,
        url: sourceData.data.metadata?.url || '',
        fetchDate: sourceData.data.metadata?.fetchDate || null,
        authority: sourceData.data.metadata?.authority || 5,
        license: sourceData.data.metadata?.license || "Content used for educational purposes with attribution"
      });

      // Extract the actual data
      if (Array.isArray(sourceData.data.data)) {
        // Process array data (like poses, yoga types)
        sourceData.data.data.forEach(item => {
          // Add source attribution to each item
          item._source = sourceData.source;
          item._sourceAuthority = sourceData.data.metadata?.authority || 5;
          mergedData.push(item);
        });
      } else if (typeof sourceData.data.data === 'object') {
        // Process object data (like benefits, tips)
        const dataObj = sourceData.data.data;

        // Handle each category within the object
        Object.keys(dataObj).forEach(category => {
          if (Array.isArray(dataObj[category])) {
            dataObj[category].forEach(item => {
              // Add source and category info
              item._source = sourceData.source;
              item._category = category;
              item._sourceAuthority = sourceData.data.metadata?.authority || 5;
              mergedData.push(item);
            });
          }
        });
      }
    }
  });

  // Remove duplicates and sort by authority
  const uniqueData = removeDuplicates(section, mergedData);

  return {
    data: uniqueData,
    sources: sources
  };
}

// Remove duplicate content based on section-specific rules
function removeDuplicates(section, data) {
  switch (section) {
    case 'yogaTypes':
      // Group by name, prioritize higher authority sources
      return deduplicateByField(data, 'name');

    case 'poses':
      // Group by name, prioritize higher authority sources
      return deduplicateByField(data, 'name');

    case 'benefits':
      // Group by title
      return deduplicateByField(data, 'title');

    case 'tips':
      // Group by title
      return deduplicateByField(data, 'title');

    default:
      return data;
  }
}

// Generic deduplication function that prioritizes higher authority
function deduplicateByField(data, field) {
  const groups = {};

  // Group items by the specified field
  data.forEach(item => {
    if (!item[field]) return;

    const key = item[field].toLowerCase().trim();

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(item);
  });

  // For each group, select the item with highest authority
  const result = [];
  Object.values(groups).forEach(group => {
    // Sort by authority (highest first)
    group.sort((a, b) => (b._sourceAuthority || 0) - (a._sourceAuthority || 0));

    // Take the highest authority item
    result.push(group[0]);
  });

  return result;
}

function generateSectionContent(section, data, sources) {
  // Add attribution comment
  let content = `<!-- Content from ${sources.length} source(s): ${sources.map(s => s.name).join(', ')} -->\n`;
  content += `<!-- Last updated: ${new Date().toISOString()} -->\n\n`;

  // Generate section-specific content
  switch (section) {
    case 'yogaTypes':
      content += generateYogaTypesContent(data);
      break;
    case 'poses':
      content += generateYogaPosesContent(data);
      break;
    case 'benefits':
      content += generateYogaBenefitsContent(data);
      break;
    case 'tips':
      content += generateYogaTipsContent(data);
      break;
    default:
      throw new Error(`Unknown section: ${section}`);
  }

  return content;
}

// Generate HTML for content attribution
function generateAttributionHTML(section, sources) {
  let html = `<div class="content-attribution">\n`;
  html += `  <h4>Content Sources</h4>\n`;
  html += `  <p class="last-updated">Last updated: ${new Date().toLocaleDateString()}</p>\n`;
  html += `  <ul class="sources-list">\n`;

  sources.forEach(source => {
    const date = source.fetchDate ? new Date(source.fetchDate).toLocaleDateString() : 'Unknown date';

    if (source.url) {
      html += `    <li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.name)}</a> (Retrieved: ${date})</li>\n`;
    } else {
      html += `    <li>${escapeHtml(source.name)} (Retrieved: ${date})</li>\n`;
    }
  });

  html += `  </ul>\n`;
  html += `  <p class="attribution-notice">Content used for educational purposes with attribution to original sources.</p>\n`;
  html += `</div>`;

  return html;
}

// Generate content for yoga types
function generateYogaTypesContent(sources) {
  let content = '';
  const yogaTypes = [];

  // Combine data from all sources
  for (const source of sources) {
    if (source.data && Array.isArray(source.data)) {
      for (const item of source.data) {
        // Check if this type already exists
        const existingIndex = yogaTypes.findIndex(
          t => t.name.toLowerCase() === item.name.toLowerCase()
        );

        if (existingIndex === -1) {
          // Add new type
          yogaTypes.push({
            ...item,
            source: source.source
          });
        } else {
          // Merge with existing type (take the longer description)
          if (item.description && item.description.length > yogaTypes[existingIndex].description.length) {
            yogaTypes[existingIndex].description = item.description;
          }

          // Merge benefits
          if (item.benefits && Array.isArray(item.benefits)) {
            const existingBenefits = new Set(yogaTypes[existingIndex].benefits || []);
            item.benefits.forEach(benefit => existingBenefits.add(benefit));
            yogaTypes[existingIndex].benefits = Array.from(existingBenefits);
          }

          // Merge suitable_for
          if (item.suitable_for && Array.isArray(item.suitable_for)) {
            const existingSuitable = new Set(yogaTypes[existingIndex].suitable_for || []);
            item.suitable_for.forEach(suitable => existingSuitable.add(suitable));
            yogaTypes[existingIndex].suitable_for = Array.from(existingSuitable);
          }

          // Add source attribution
          yogaTypes[existingIndex].source = [yogaTypes[existingIndex].source, source.source]
            .filter(Boolean)
            .join(', ');
        }
      }
    }
  }

  // Generate HTML for standard yoga types
  const standardTypes = ['Vinyasa', 'Hatha', 'Yin', 'Power', 'Restorative'];

  for (const typeName of standardTypes) {
    const typeData = yogaTypes.find(t => t.name.toLowerCase() === typeName.toLowerCase()) || {
      name: typeName,
      description: `${typeName} yoga is a popular style with many benefits.`,
      benefits: [],
      suitable_for: []
    };

    content += `{% if type == "${typeName}" %}\n`;
    content += `  <div class="content-section">\n`;
    content += `    <h4>Overview</h4>\n`;
    content += `    <p>${escapeHtml(typeData.description)}</p>\n`;
    content += `  </div>\n\n`;

    content += `  <div class="content-section">\n`;
    content += `    <h4>Benefits</h4>\n`;
    content += `    <p>${typeData.benefits.length > 0
      ? escapeHtml(typeData.benefits[0])
      : `${typeName} yoga offers numerous physical and mental benefits.`}</p>\n`;
    content += `  </div>\n\n`;

    content += `  <div class="content-section">\n`;
    content += `    <h4>Who It's For</h4>\n`;
    content += `    <p>${typeData.suitable_for.length > 0
      ? escapeHtml(typeData.suitable_for[0])
      : `${typeName} yoga can be adapted for practitioners of various levels.`}</p>\n`;
    content += `  </div>\n`;
    content += `{% endif %}\n\n`;
  }

  // Add attribution footer
  content += `<!-- Data sourced from: ${sources.map(s => s.source).join(', ')} -->\n`;

  return content;
}

// Generate content for yoga poses
function generateYogaPosesContent(sources) {
  let content = '';
  const posesByCategory = {
    standing: [],
    seated: [],
    backbends: [],
    inversions: []
  };

  // Combine data from all sources
  for (const source of sources) {
    if (source.data && Array.isArray(source.data)) {
      for (const pose of source.data) {
        const category = pose.category || 'other';

        // Add to the appropriate category if we're tracking it
        if (posesByCategory[category]) {
          // Check if pose already exists in this category
          const existingIndex = posesByCategory[category].findIndex(
            p => p.name.toLowerCase() === pose.name.toLowerCase()
          );

          if (existingIndex === -1) {
            posesByCategory[category].push({
              ...pose,
              source: source.source
            });
          } else {
            // Merge with existing pose
            if (pose.description && pose.description.length > posesByCategory[category][existingIndex].description.length) {
              posesByCategory[category][existingIndex].description = pose.description;
            }

            // Take image URL if we don't have one
            if (pose.image_url && !posesByCategory[category][existingIndex].image_url) {
              posesByCategory[category][existingIndex].image_url = pose.image_url;
            }

            // Add source attribution
            posesByCategory[category][existingIndex].source = [
              posesByCategory[category][existingIndex].source,
              source.source
            ].filter(Boolean).join(', ');
          }
        }
      }
    }
  }

  // Generate HTML for each category
  for (const [category, poses] of Object.entries(posesByCategory)) {
    content += `{% if target == "${category}" %}\n`;
    content += `  <div class="poses-description">\n`;

    // Different intro text based on category
    switch (category) {
      case 'standing':
        content += `    <p>Standing poses form the foundation of yoga practice. They build strength, improve balance, and enhance focus.</p>\n`;
        break;
      case 'seated':
        content += `    <p>Seated poses improve flexibility, especially in the hips and spine, and cultivate a sense of groundedness.</p>\n`;
        break;
      case 'backbends':
        content += `    <p>Backbends open the chest and shoulders, increase spinal mobility, and counteract the effects of sitting.</p>\n`;
        break;
      case 'inversions':
        content += `    <p>Inversions reverse the effects of gravity, bringing fresh blood flow to the brain and offering a new perspective.</p>\n`;
        break;
    }

    content += `    <div class="poses-list">\n`;

    // Add 3 poses (or placeholders if we don't have enough)
    const topPoses = poses.slice(0, 3);

    // Add placeholders if needed
    while (topPoses.length < 3) {
      const placeholders = [
        { name: 'Mountain Pose', description: 'A foundational standing pose that teaches proper alignment.' },
        { name: 'Easy Pose', description: 'A comfortable seated position for meditation and breathing.' },
        { name: 'Cobra Pose', description: 'A gentle backbend that strengthens the spine and opens the chest.' },
        { name: 'Downward-Facing Dog', description: 'An inversion that stretches the entire back of the body.' }
      ];

      // Pick an appropriate placeholder based on category
      let placeholder;
      if (category === 'standing') placeholder = placeholders[0];
      else if (category === 'seated') placeholder = placeholders[1];
      else if (category === 'backbends') placeholder = placeholders[2];
      else placeholder = placeholders[3];

      topPoses.push(placeholder);
    }

    // Generate HTML for each pose
    for (const pose of topPoses) {
      content += `      <div class="pose-item">\n`;
      content += `        <h4>${escapeHtml(pose.name)}</h4>\n`;
      content += `        <p>${escapeHtml(pose.description)}</p>\n`;
      content += `      </div>\n`;
    }

    content += `    </div>\n`;
    content += `  </div>\n`;
    content += `{% endif %}\n\n`;
  }

  // Add attribution footer
  content += `<!-- Data sourced from: ${sources.map(s => s.source).join(', ')} -->\n`;

  return content;
}

// Generate content for yoga benefits
function generateYogaBenefitsContent(sources) {
  let content = '';
  const benefits = {
    physical: new Set(),
    mental: new Set(),
    lifestyle: new Set() // Map from 'general' to 'lifestyle'
  };

  // Combine data from all sources
  for (const source of sources) {
    if (source.data) {
      if (source.data.physical && Array.isArray(source.data.physical)) {
        source.data.physical.forEach(benefit => benefits.physical.add(benefit));
      }

      if (source.data.mental && Array.isArray(source.data.mental)) {
        source.data.mental.forEach(benefit => benefits.mental.add(benefit));
      }

      if (source.data.general && Array.isArray(source.data.general)) {
        source.data.general.forEach(benefit => benefits.lifestyle.add(benefit));
      }
    }
  }

  // Generate HTML for each benefit category
  for (const category of ['physical', 'mental', 'lifestyle']) {
    content += `{% if target == "${category}" %}\n`;
    content += `  <div class="benefits-grid">\n`;

    // Get 4 benefits from this category, or add placeholders
    const categoryBenefits = Array.from(benefits[category]).slice(0, 4);

    // Add placeholders if needed
    const placeholders = {
      physical: [
        'Improved flexibility and range of motion in joints.',
        'Increased muscle strength and tone.',
        'Better posture and body alignment.',
        'Enhanced balance and stability.'
      ],
      mental: [
        'Reduced stress and anxiety levels.',
        'Improved focus and concentration.',
        'Enhanced mood and emotional regulation.',
        'Better sleep quality and reduced insomnia.'
      ],
      lifestyle: [
        'Healthier habits and mindful eating.',
        'Better energy management throughout the day.',
        'Improved breathing patterns and lung function.',
        'Enhanced body awareness and mindfulness.'
      ]
    };

    while (categoryBenefits.length < 4) {
      categoryBenefits.push(placeholders[category][categoryBenefits.length]);
    }

    // Generate HTML for each benefit
    for (const benefit of categoryBenefits) {
      content += `    <div class="benefit-card">\n`;

      // Extract a title from the benefit text
      const title = extractBenefitTitle(benefit);

      content += `      <h4>${escapeHtml(title)}</h4>\n`;
      content += `      <p>${escapeHtml(benefit)}</p>\n`;
      content += `    </div>\n`;
    }

    content += `  </div>\n`;
    content += `{% endif %}\n\n`;
  }

  // Add attribution footer
  content += `<!-- Data sourced from: ${sources.map(s => s.source).join(', ')} -->\n`;

  return content;
}

// Generate content for yoga tips
function generateYogaTipsContent(sources) {
  let content = '';
  const tips = {
    beginners: new Set(),
    mindful: new Set(), // 'practice' in data -> 'mindful' in UI
    props: new Set()
  };

  // Combine data from all sources
  for (const source of sources) {
    if (source.data) {
      if (source.data.beginners && Array.isArray(source.data.beginners)) {
        source.data.beginners.forEach(tip => tips.beginners.add(tip));
      }

      if (source.data.practice && Array.isArray(source.data.practice)) {
        source.data.practice.forEach(tip => tips.mindful.add(tip));
      }

      if (source.data.props && Array.isArray(source.data.props)) {
        source.data.props.forEach(tip => tips.props.add(tip));
      }
    }
  }

  // Generate HTML for each tip category
  for (const [dataCategory, uiCategory] of [
    ['beginners', 'beginners'],
    ['mindful', 'mindful'],
    ['props', 'props']
  ]) {
    content += `{% if target == "${uiCategory}" %}\n`;
    content += `  <div class="tips-grid">\n`;

    // Get 3 tips from this category, or add placeholders
    const categoryTips = Array.from(tips[dataCategory]).slice(0, 3);

    // Add placeholders if needed
    const placeholders = {
      beginners: [
        'Start with beginner-friendly classes to learn proper alignment.',
        'Don\'t push beyond your comfort zone; listen to your body.',
        'Consistency is more important than intensity; practice regularly.'
      ],
      mindful: [
        'Focus on your breath throughout your practice.',
        'Set an intention at the beginning of each session.',
        'Stay present by continually bringing your attention back to your mat.'
      ],
      props: [
        'Yoga blocks help bring the floor closer in forward folds.',
        'Straps extend your reach in poses where flexibility is limited.',
        'A dedicated yoga space helps establish a consistent practice routine.'
      ]
    };

    while (categoryTips.length < 3) {
      categoryTips.push(placeholders[dataCategory][categoryTips.length]);
    }

    // Generate HTML for each tip
    for (const tip of categoryTips) {
      content += `    <div class="tip-card">\n`;

      // Extract a title from the tip text
      const title = extractTipTitle(tip);

      content += `      <h4>${escapeHtml(title)}</h4>\n`;
      content += `      <p>${escapeHtml(tip)}</p>\n`;
      content += `    </div>\n`;
    }

    content += `  </div>\n`;
    content += `{% endif %}\n\n`;
  }

  // Add attribution footer
  content += `<!-- Data sourced from: ${sources.map(s => s.source).join(', ')} -->\n`;

  return content;
}

// Update the guide template to include the generated content
function updateGuideTemplate() {
  if (!fs.existsSync(GUIDE_TEMPLATE)) {
    console.error(`Guide template not found: ${GUIDE_TEMPLATE}`);
    return;
  }

  try {
    // Read the guide template
    let templateContent = fs.readFileSync(GUIDE_TEMPLATE, 'utf8');
    const $ = cheerio.load(templateContent, { xmlMode: true });

    // Update each section if we have generated content for it
    const sectionMapping = {
      'types': 'yoga-type-content',
      'poses': 'poses-description',
      'benefits': 'benefits-grid',
      'tips': 'tips-grid'
    };

    for (const [dataSection, htmlClass] of Object.entries(sectionMapping)) {
      const includePath = path.join(GUIDE_INCLUDES_DIR, `${dataSection}.html`);

      if (fs.existsSync(includePath)) {
        // Find the section and update it with an include statement
        const sectionContainer = $(`.${htmlClass}`);

        if (sectionContainer.length > 0) {
          // Replace sections that have handwritten content
          sectionContainer.each((i, element) => {
            const $element = $(element);

            // Special case for yoga types that use if/elif/else
            if (htmlClass === 'yoga-type-content') {
              // Only replace the content, not the entire structure
              const currentHTML = $element.html();
              if (!currentHTML.includes('{% include') && !currentHTML.includes('endfor %}')) {
                $element.html(`\n{% include "guide/${dataSection}.html" %}\n`);
              }
            } else {
              // For other sections, replace the entire HTML
              $element.html(`\n{% include "guide/${dataSection}.html" %}\n`);
            }
          });
        }
      }
    }

    // Save the updated template
    // Convert back to string carefully to preserve template tags
    let newContent = $.html()
      // Fix Cheerio's handling of Nunjucks template tags
      .replace(/&lt;%/g, '{%')
      .replace(/%&gt;/g, '%}')
      .replace(/&amp;#123;/g, '{')
      .replace(/&amp;#125;/g, '}');

    fs.writeFileSync(GUIDE_TEMPLATE, newContent);
    console.log(`✓ Updated guide template: ${GUIDE_TEMPLATE}`);
  } catch (error) {
    console.error(`✗ Error updating guide template:`, error.message);
  }
}

// Helper function to extract a title from a benefit description
function extractBenefitTitle(text) {
  // Try to extract a key phrase for the title
  const titleMatches = text.match(/improves? ([\w\s]+)|increases? ([\w\s]+)|enhances? ([\w\s]+)|reduces? ([\w\s]+)|better ([\w\s]+)/i);

  if (titleMatches) {
    const match = titleMatches.find((m, i) => i > 0 && m);
    if (match) {
      return capitalizeFirstLetter(match.trim()).replace(/\.$/, '');
    }
  }

  // Fallback: use the first few words
  const words = text.split(' ').slice(0, 3).join(' ');
  return capitalizeFirstLetter(words.replace(/\.$/, ''));
}

// Helper function to extract a title from a tip
function extractTipTitle(text) {
  // Look for imperative verbs at the start
  const titleMatches = text.match(/^([\w\s]+?)\s(your|the|for|when|to|by|and)/i);

  if (titleMatches && titleMatches[1]) {
    return capitalizeFirstLetter(titleMatches[1].trim());
  }

  // Fallback: use the first few words
  const words = text.split(' ').slice(0, 3).join(' ');
  return capitalizeFirstLetter(words.replace(/\.$/, ''));
}

// Helper function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Helper function to escape HTML special characters
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Run the update
updateGuideContent().catch(error => {
  console.error('Error updating guide content:', error);
  process.exit(1);
});
