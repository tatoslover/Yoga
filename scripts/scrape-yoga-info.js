/**
 * Yoga Information Scraper
 *
 * This script scrapes yoga information from reputable sources and
 * formats it for use in the Mat & Mind guide sections.
 *
 * Usage: node scripts/scrape-yoga-info.js
 *
 * The script will:
 * 1. Scrape yoga information from reputable sources
 * 2. Format the data as structured JSON
 * 3. Save it to data files that can be used by the site
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const axios = require('axios');

// Configuration
const OUTPUT_DIR = path.join(__dirname, '../_data/scraped');
const CACHE_DIR = path.join(__dirname, '../_cache');

// Ensure output directories exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Sources to scrape (add reputable yoga websites here)
const SOURCES = {
  yogaTypes: [
    {
      name: 'Yoga Journal - Types of Yoga',
      url: 'https://www.yogajournal.com/yoga-101/types-of-yoga/',
      selector: '.entry-content',
      processor: processYogaJournalTypes
    },
    {
      name: 'Yoga Alliance - Styles',
      url: 'https://www.yogaalliance.org/About_Yoga/Yoga_Styles',
      selector: '.content-body',
      processor: processYogaAllianceStyles
    }
  ],
  poses: [
    {
      name: 'Yoga Journal - Poses',
      url: 'https://www.yogajournal.com/poses/',
      selector: '.category-poses',
      processor: processYogaJournalPoses
    }
  ],
  benefits: [
    {
      name: 'Harvard Health - Yoga Benefits',
      url: 'https://www.health.harvard.edu/staying-healthy/yoga-benefits-beyond-the-mat',
      selector: '.article-body',
      processor: processHarvardHealthBenefits
    }
  ],
  tips: [
    {
      name: 'Yoga International - Practice Tips',
      url: 'https://yogainternational.com/ecourse/yoga-for-beginners-6-week-series/',
      selector: '.course-description',
      processor: processYogaInternationalTips
    }
  ]
};

// Main function to run the scraper
async function scrapeYogaInfo() {
  console.log('Starting yoga information scraper...');

  // Launch browser for puppeteer
  const browser = await puppeteer.launch({
    headless: 'new', // Use new headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Process each category
    for (const [category, sources] of Object.entries(SOURCES)) {
      console.log(`\nScraping ${category}...`);
      const results = [];

      // Process each source in the category
      for (const source of sources) {
        console.log(`- Scraping from ${source.name}`);

        try {
          const data = await scrapeSource(browser, source);

          if (data) {
            console.log(`  ✓ Successfully scraped data from ${source.name}`);
            results.push({
              source: source.name,
              data: data
            });
          } else {
            console.log(`  ✗ Failed to scrape data from ${source.name}`);
          }
        } catch (error) {
          console.error(`  ✗ Error scraping ${source.name}:`, error.message);
        }
      }

      // Save the combined results for this category
      if (results.length > 0) {
        const outputPath = path.join(OUTPUT_DIR, `${category}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
        console.log(`✓ Saved ${results.length} ${category} results to ${outputPath}`);
      } else {
        console.log(`✗ No ${category} results were found to save`);
      }
    }
  } finally {
    // Close the browser
    await browser.close();
  }

  console.log('\nScraping completed!');
}

// Function to scrape a single source
async function scrapeSource(browser, source) {
  const cacheFile = path.join(CACHE_DIR, `${sanitizeFilename(source.name)}.html`);
  let content;

  // Check if we should use cached data (for development/testing)
  if (fs.existsSync(cacheFile) && process.env.USE_CACHE === 'true') {
    console.log(`  Using cached data for ${source.name}`);
    content = fs.readFileSync(cacheFile, 'utf8');
  } else {
    // Fetch fresh data
    try {
      // Try with axios first (faster)
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      content = response.data;
    } catch (error) {
      console.log(`  Failed with axios, trying puppeteer: ${error.message}`);

      // If axios fails, try with puppeteer (better for JavaScript-heavy sites)
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      try {
        await page.goto(source.url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Sometimes we need to wait for specific content to load
        if (source.waitForSelector) {
          await page.waitForSelector(source.waitForSelector, { timeout: 5000 }).catch(() => {});
        }

        content = await page.content();
      } finally {
        await page.close();
      }
    }

    // Save to cache
    fs.writeFileSync(cacheFile, content);
  }

  // Process the content with Cheerio
  const $ = cheerio.load(content);
  const targetElement = $(source.selector);

  if (targetElement.length === 0) {
    console.log(`  ✗ Could not find selector "${source.selector}" in the page`);
    return null;
  }

  // Process the scraped content using the source-specific processor
  return source.processor($, targetElement);
}

// Process functions for different sources
function processYogaJournalTypes($, element) {
  // Extract yoga types from Yoga Journal
  const yogaTypes = [];

  // Find headings that might indicate yoga types
  element.find('h2, h3').each((index, heading) => {
    const title = $(heading).text().trim();

    // Skip if it's not a yoga type heading
    if (!title || title.length < 3 || title.includes('References')) {
      return;
    }

    // Get the description - usually the paragraph after the heading
    let description = '';
    let currentEl = $(heading).next();

    // Collect paragraphs until the next heading or end
    while (currentEl.length && !currentEl.is('h1, h2, h3, h4')) {
      if (currentEl.is('p')) {
        const text = currentEl.text().trim();
        if (text) {
          description += text + ' ';
        }
      }
      currentEl = currentEl.next();
    }

    if (title && description) {
      yogaTypes.push({
        name: title,
        description: description.trim(),
        benefits: extractBenefits(description),
        suitable_for: extractSuitableFor(description)
      });
    }
  });

  return yogaTypes;
}

function processYogaAllianceStyles($, element) {
  // Extract yoga styles from Yoga Alliance
  const yogaStyles = [];

  element.find('h3, h4').each((index, heading) => {
    const title = $(heading).text().trim();

    if (!title || title.length < 3) {
      return;
    }

    let description = '';
    let currentEl = $(heading).next();

    while (currentEl.length && !currentEl.is('h3, h4, h5')) {
      if (currentEl.is('p')) {
        const text = currentEl.text().trim();
        if (text) {
          description += text + ' ';
        }
      }
      currentEl = currentEl.next();
    }

    if (title && description) {
      yogaStyles.push({
        name: title,
        description: description.trim(),
        benefits: extractBenefits(description),
        suitable_for: extractSuitableFor(description)
      });
    }
  });

  return yogaStyles;
}

function processYogaJournalPoses($, element) {
  // Extract yoga poses from Yoga Journal
  const poses = [];

  // Find pose articles or cards
  element.find('article, .pose-card, .pose-block').each((index, poseElement) => {
    const poseEl = $(poseElement);

    const title = poseEl.find('h2, h3, .pose-title').first().text().trim();
    let description = '';

    poseEl.find('p, .pose-description').each((i, p) => {
      const text = $(p).text().trim();
      if (text) {
        description += text + ' ';
      }
    });

    // Try to find image
    let imageUrl = '';
    const img = poseEl.find('img').first();
    if (img.length) {
      imageUrl = img.attr('src') || img.attr('data-src') || '';
    }

    // Try to find difficulty
    let difficulty = '';
    poseEl.find('.difficulty, .level').each((i, el) => {
      difficulty = $(el).text().trim();
    });

    if (title) {
      poses.push({
        name: title,
        description: description.trim(),
        image_url: imageUrl,
        difficulty: difficulty,
        benefits: extractBenefits(description),
        category: determinePoseCategory(title, description)
      });
    }
  });

  return poses;
}

function processHarvardHealthBenefits($, element) {
  // Extract yoga benefits from Harvard Health
  const benefits = {
    physical: [],
    mental: [],
    general: []
  };

  // Look for list items, they often contain benefits
  element.find('li').each((index, li) => {
    const text = $(li).text().trim();

    if (text) {
      // Categorize the benefit
      if (text.match(/mind|stress|anxiety|depress|mood|focus|relax|calm|mental/i)) {
        benefits.mental.push(text);
      } else if (text.match(/body|muscle|strength|flexib|heart|blood|pressure|pain|posture|balance|bone/i)) {
        benefits.physical.push(text);
      } else {
        benefits.general.push(text);
      }
    }
  });

  // Also look for paragraphs with potential benefits
  element.find('p').each((index, p) => {
    const text = $(p).text().trim();

    // Extract sentences that look like benefits
    const sentences = text.split(/\.\s+/);
    sentences.forEach(sentence => {
      if (sentence.match(/benefit|improve|increase|enhance|reduce|lower|help/i)) {
        // Categorize the benefit
        if (sentence.match(/mind|stress|anxiety|depress|mood|focus|relax|calm|mental/i)) {
          benefits.mental.push(sentence.trim() + '.');
        } else if (sentence.match(/body|muscle|strength|flexib|heart|blood|pressure|pain|posture|balance|bone/i)) {
          benefits.physical.push(sentence.trim() + '.');
        } else {
          benefits.general.push(sentence.trim() + '.');
        }
      }
    });
  });

  return benefits;
}

function processYogaInternationalTips($, element) {
  // Extract yoga practice tips from Yoga International
  const tips = {
    beginners: [],
    practice: [],
    props: []
  };

  // Look for paragraphs with tips
  element.find('p, li').each((index, el) => {
    const text = $(el).text().trim();

    if (!text) return;

    // Categorize the tip
    if (text.match(/beginner|start|new to yoga|first time|basic/i)) {
      tips.beginners.push(text);
    } else if (text.match(/prop|block|strap|blanket|bolster|chair|wall/i)) {
      tips.props.push(text);
    } else if (text.match(/practice|breathe|alignment|pose|asana|technique|form|body|position/i)) {
      tips.practice.push(text);
    }
  });

  return tips;
}

// Helper functions
function extractBenefits(text) {
  const benefitWords = [
    'improve', 'increase', 'enhance', 'strengthen', 'boost',
    'benefit', 'help', 'reduce', 'relieve', 'lower', 'calm'
  ];

  const benefits = [];
  const sentences = text.split(/\.\s+/);

  sentences.forEach(sentence => {
    for (const word of benefitWords) {
      if (sentence.toLowerCase().includes(word)) {
        benefits.push(sentence.trim() + '.');
        break;
      }
    }
  });

  return benefits;
}

function extractSuitableFor(text) {
  const suitablePhrases = [
    'good for', 'great for', 'ideal for', 'perfect for',
    'recommended for', 'suitable for', 'best for'
  ];

  const suitable = [];
  const sentences = text.split(/\.\s+/);

  sentences.forEach(sentence => {
    for (const phrase of suitablePhrases) {
      if (sentence.toLowerCase().includes(phrase)) {
        suitable.push(sentence.trim() + '.');
        break;
      }
    }
  });

  return suitable;
}

function determinePoseCategory(title, description) {
  // Determine the category of a yoga pose based on its title and description

  // Standing poses
  if (title.match(/mountain|warrior|triangle|chair|tree|eagle|goddess|extended|standing/i) ||
      description.match(/standing pose|standing position|stand on|standing with/i)) {
    return 'standing';
  }

  // Seated poses
  if (title.match(/seated|sitting|lotus|sukhasana|butterfly|hero|cobbler|staff|dandasana/i) ||
      description.match(/seated pose|sitting pose|seat on|sit with/i)) {
    return 'seated';
  }

  // Backbends
  if (title.match(/backbend|cobra|up-dog|upward dog|upward-facing|camel|bridge|wheel|bow|locust/i) ||
      description.match(/backbend|bend backward|arch your back|bend back/i)) {
    return 'backbends';
  }

  // Inversions
  if (title.match(/inversion|headstand|handstand|shoulder stand|forearm stand|plow|dolphin|downward dog|downward-facing/i) ||
      description.match(/inversion|upside down|feet above|head below/i)) {
    return 'inversions';
  }

  // Default
  return 'other';
}

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

// Run the scraper
scrapeYogaInfo().catch(error => {
  console.error('Error in scraper:', error);
  process.exit(1);
});
