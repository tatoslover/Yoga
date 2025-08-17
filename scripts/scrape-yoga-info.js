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

// Configuration options
const CONFIG = {
  usePuppeteer: false, // Set to false to use only axios for HTTP requests
  puppeteerRetries: 2,  // Number of times to retry puppeteer launch
  logLevel: 'info',     // 'debug', 'info', 'warn', 'error'
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

// Sources to scrape (add reputable yoga websites here)
// Each source has an authority score (1-10) used for conflict resolution
const SOURCES = {
  yogaTypes: [
    {
      name: 'Yoga Journal - Types of Yoga',
      url: 'https://www.yogajournal.com/yoga-101/types-of-yoga/',
      selector: '.entry-content',
      processor: processYogaJournalTypes,
      authority: 9
    },
    {
      name: 'Yoga Alliance - Styles',
      url: 'https://www.yogaalliance.org/About_Yoga/Yoga_Styles',
      selector: '.content-body',
      processor: processYogaAllianceStyles,
      authority: 10
    },
    {
      name: 'DoYogaWithMe - Styles',
      url: 'https://www.doyogawithme.com/types-of-yoga',
      selector: '.main-content',
      processor: processDoYogaWithMeStyles,
      authority: 7
    },
    {
      name: 'Yoga Basics - Styles',
      url: 'https://www.yogabasics.com/learn/yoga-styles/',
      selector: '.entry-content',
      processor: processYogaBasicsStyles,
      authority: 8
    }
  ],
  poses: [
    {
      name: 'Yoga Journal - Poses',
      url: 'https://www.yogajournal.com/poses/',
      selector: '.category-poses',
      processor: processYogaJournalPoses,
      authority: 9
    },
    {
      name: 'Pocket Yoga - Pose Dictionary',
      url: 'https://www.pocketyoga.com/pose/',
      selector: '.pose-table',
      processor: processPocketYogaPoses,
      authority: 7
    },
    {
      name: 'DoYogaWithMe - Pose Guide',
      url: 'https://www.doyogawithme.com/yoga-poses',
      selector: '.view-content',
      processor: processDoYogaWithMePoses,
      authority: 8
    }
  ],
  benefits: [
    {
      name: 'Harvard Health - Yoga Benefits',
      url: 'https://www.health.harvard.edu/staying-healthy/yoga-benefits-beyond-the-mat',
      selector: '.article-body',
      processor: processHarvardHealthBenefits,
      authority: 10
    },
    {
      name: 'Johns Hopkins Medicine - Yoga Benefits',
      url: 'https://www.hopkinsmedicine.org/health/wellness-and-prevention/9-benefits-of-yoga',
      selector: '.content-container',
      processor: processJohnsHopkinsBenefits,
      authority: 9
    },
    {
      name: 'Medical News Today - Yoga Benefits',
      url: 'https://www.medicalnewstoday.com/articles/yoga-benefits',
      selector: '.article-body',
      processor: processMedicalNewsTodayBenefits,
      authority: 8
    }
  ],
  tips: [
    {
      name: 'Yoga International - Practice Tips',
      url: 'https://yogainternational.com/ecourse/yoga-for-beginners-6-week-series/',
      selector: '.course-description',
      processor: processYogaInternationalTips,
      authority: 8
    },
    {
      name: 'Yoga Journal - Practice Tips',
      url: 'https://www.yogajournal.com/practice/',
      selector: '.entry-content',
      processor: processYogaJournalTips,
      authority: 9
    },
    {
      name: 'Yoga With Adriene - Practice Tips',
      url: 'https://yogawithadriene.com/category/yoga-tips/',
      selector: '.entry-content',
      processor: processYogaWithAdrieneTips,
      authority: 7
    },
    {
      name: 'Ekhart Yoga - Beginners Guide',
      url: 'https://www.ekhartyoga.com/articles/practice/yoga-for-beginners',
      selector: '.article__content',
      processor: processEkhartYogaTips,
      authority: 8
    }
  ]
};

// Content quality thresholds
const QUALITY_THRESHOLDS = {
  minimumDescriptionLength: 100,
  minimumTitleLength: 3,
  requiredFields: {
    yogaTypes: ['name', 'description'],
    poses: ['name', 'description', 'category'],
    benefits: [],
    tips: []
  }
};

// Main function to run the scraper
async function scrapeYogaInfo() {
  console.log('Starting yoga information scraper...');

  // Browser instance (will be set if puppeteer is used)
  let browser = null;

  // Only try to launch browser if configured to use puppeteer
  if (CONFIG.usePuppeteer || process.env.FORCE_PUPPETEER === 'true') {
    console.log('Attempting to launch headless browser...');

    // Try multiple times to launch the browser
    for (let attempt = 1; attempt <= CONFIG.puppeteerRetries; attempt++) {
      try {
        browser = await puppeteer.launch({
          headless: 'new', // Use new headless mode
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
          ]
        });
        console.log('Browser launched successfully');
        break;
      } catch (error) {
        console.error(`Browser launch attempt ${attempt} failed:`, error.message);

        if (attempt === CONFIG.puppeteerRetries) {
          console.warn('All browser launch attempts failed. Will use HTTP requests only.');
        } else {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  } else {
    console.log('Running in HTTP-only mode (no browser)');
  }

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
    // Close the browser if it was launched
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }

  console.log('\nScraping completed!');
}

// Function to scrape a single source
async function scrapeSource(browser, source) {
  const cacheFile = path.join(CACHE_DIR, `${sanitizeFilename(source.name)}.html`);
  const metadataFile = path.join(CACHE_DIR, `${sanitizeFilename(source.name)}.meta.json`);
  let content;
  let metadata = { lastFetched: null, success: false };

  // Check if metadata exists
  if (fs.existsSync(metadataFile)) {
    try {
      metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
    } catch (e) {
      console.log(`  Error reading metadata: ${e.message}`);
    }
  }

  const cacheAge = metadata.lastFetched ? (Date.now() - metadata.lastFetched) / (1000 * 60 * 60 * 24) : null;
  const shouldUseCache = fs.existsSync(cacheFile) &&
                         process.env.USE_CACHE === 'true' &&
                         cacheAge !== null &&
                         cacheAge < 7; // Use cache if less than 7 days old

  if (shouldUseCache) {
    console.log(`  Using cached data for ${source.name} (${cacheAge.toFixed(1)} days old)`);
    content = fs.readFileSync(cacheFile, 'utf8');
  } else {
    // Fetch fresh data
    console.log(`  Fetching fresh data for ${source.name}`);

    try {
      // Try with axios first (faster)
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': CONFIG.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 20000
      });
      content = response.data;
    } catch (error) {
      // If browser is available, try with puppeteer
      if (browser) {
        console.log(`  Failed with axios, trying puppeteer: ${error.message}`);

        const page = await browser.newPage();
        await page.setUserAgent(CONFIG.userAgent);

      // Set timeout
      await page.setDefaultNavigationTimeout(40000);

      try {
        // Add cookie consent handling for common cookie banners
        page.on('dialog', async dialog => {
          await dialog.dismiss();
        });

        await page.goto(source.url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Sometimes we need to wait for specific content to load
        if (source.waitForSelector) {
          await page.waitForSelector(source.waitForSelector, { timeout: 5000 }).catch(() => {});
        }

        // Handle cookie consent popups and overlays (common patterns)
        const cookieSelectors = [
          '.cookie-banner button', '#cookie-consent button',
          '[data-action="accept-cookies"]', '.consent-banner .accept',
          '.gdpr-banner .accept', '.cookie-notice .accept'
        ];

        for (const selector of cookieSelectors) {
          try {
            if (await page.$(selector) !== null) {
              await page.click(selector).catch(() => {});
              await page.waitForTimeout(500);
            }
          } catch (e) {
            // Ignore errors
          }
        }

        content = await page.content();
      } finally {
        await page.close();
      }
    } else {
      // If browser is not available and axios failed, throw the error
      throw new Error(`Failed to fetch content with axios and no browser is available: ${error.message}`);
    }
  }

    // Save to cache and update metadata
    try {
      fs.writeFileSync(cacheFile, content);
      metadata = {
        lastFetched: Date.now(),
        url: source.url,
        success: true,
        contentLength: content.length
      };
      fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    } catch (e) {
      console.error(`  Error saving cache: ${e.message}`);
    }
  }

  // Process the content with Cheerio
  const $ = cheerio.load(content);
  const targetElement = $(source.selector);

  if (targetElement.length === 0) {
    console.log(`  ✗ Could not find selector "${source.selector}" in the page`);
    return null;
  }

  // Process the scraped content using the source-specific processor
  const processedData = source.processor($, targetElement);

  // Validate the processed data
  const validatedData = validateContent(processedData, source);

  return {
    data: validatedData,
    metadata: {
      source: source.name,
      url: source.url,
      fetchDate: metadata.lastFetched,
      authority: source.authority || 5,
      license: "Content used for educational purposes with attribution"
    }
  };
}

// Validate content quality
function validateContent(data, source) {
  if (!data) return null;

  // Different validation for different content types
  const category = Object.keys(SOURCES).find(key =>
    SOURCES[key].some(s => s.name === source.name)
  );

  if (!category) return data;

  // Apply category-specific validation
  if (Array.isArray(data)) {
    return data.filter(item => {
      // Check required fields
      if (QUALITY_THRESHOLDS.requiredFields[category]) {
        for (const field of QUALITY_THRESHOLDS.requiredFields[category]) {
          if (!item[field]) return false;
        }
      }

      // Check content length for text fields
      if (item.name && item.name.length < QUALITY_THRESHOLDS.minimumTitleLength) return false;
      if (item.description && item.description.length < QUALITY_THRESHOLDS.minimumDescriptionLength) return false;

      return true;
    });
  }

  return data;
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
    'benefit', 'help', 'reduce', 'relieve', 'lower', 'calm',
    'support', 'promote', 'develop', 'facilitate', 'build',
    'maintain', 'encourage', 'stimulate', 'balance', 'optimize'
  ];

  const benefits = [];
  const sentences = text.split(/\.\s+/);

  sentences.forEach(sentence => {
    for (const word of benefitWords) {
      if (sentence.toLowerCase().includes(word)) {
        // Remove marketing language and clean the sentence
        let cleanSentence = sentence.trim()
          .replace(/in our opinion|we believe|we think|studies suggest/gi, '')
          .replace(/\byou\b/gi, 'practitioners')
          .replace(/\bwe\b/gi, 'yoga teachers')
          .trim();

        if (cleanSentence.length > 10) {
          benefits.push(cleanSentence + (cleanSentence.endsWith('.') ? '' : '.'));
          break;
        }
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

// New processors for added sources
function processDoYogaWithMeStyles($, element) {
  const yogaStyles = [];

  // Process DoYogaWithMe's style listings
  element.find('.yoga-style, article').each((index, styleElement) => {
    const styleEl = $(styleElement);

    const title = styleEl.find('h2, h3, .title').first().text().trim();
    let description = '';

    styleEl.find('p, .description').each((i, p) => {
      const text = $(p).text().trim();
      if (text) description += text + ' ';
    });

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

function processYogaBasicsStyles($, element) {
  const yogaStyles = [];

  // Find style sections
  element.find('.entry-content > div, .yoga-style').each((index, styleSection) => {
    const section = $(styleSection);
    const title = section.find('h2, h3, h4').first().text().trim();

    if (!title || title.length < 3) return;

    let description = '';
    section.find('p').each((i, p) => {
      description += $(p).text().trim() + ' ';
    });

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

function processPocketYogaPoses($, element) {
  const poses = [];

  // Process pose listings
  element.find('tr, .pose-item').each((index, poseElement) => {
    const poseEl = $(poseElement);

    const title = poseEl.find('a, .pose-name').first().text().trim();
    const url = poseEl.find('a').first().attr('href');

    // Skip header rows or empty elements
    if (!title || title.length < 3 || title.toLowerCase() === 'name') return;

    // Extract description from linked page if available
    let description = poseEl.find('.pose-description, p').text().trim();

    // Extract difficulty
    let difficulty = poseEl.find('.difficulty, .level').text().trim();
    if (!difficulty) {
      // Try to infer difficulty from class or text
      if (poseEl.hasClass('beginner') || poseEl.text().includes('beginner')) {
        difficulty = 'Beginner';
      } else if (poseEl.hasClass('intermediate') || poseEl.text().includes('intermediate')) {
        difficulty = 'Intermediate';
      } else if (poseEl.hasClass('advanced') || poseEl.text().includes('advanced')) {
        difficulty = 'Advanced';
      }
    }

    // Extract image
    let imageUrl = '';
    const img = poseEl.find('img').first();
    if (img.length) {
      imageUrl = img.attr('src') || img.attr('data-src') || '';
    }

    if (title) {
      poses.push({
        name: title,
        description: description || `${title} is a yoga pose that offers numerous benefits for practitioners.`,
        url: url,
        image_url: imageUrl,
        difficulty: difficulty || 'All Levels',
        benefits: extractBenefits(description),
        category: determinePoseCategory(title, description)
      });
    }
  });

  return poses;
}

function processDoYogaWithMePoses($, element) {
  const poses = [];

  // Process pose listings
  element.find('.views-row, .pose-item').each((index, poseElement) => {
    const poseEl = $(poseElement);

    const title = poseEl.find('h2, h3, .pose-title').first().text().trim();
    let description = '';

    poseEl.find('p, .field-content').each((i, p) => {
      const text = $(p).text().trim();
      if (text) description += text + ' ';
    });

    // Extract image
    let imageUrl = '';
    const img = poseEl.find('img').first();
    if (img.length) {
      imageUrl = img.attr('src') || img.attr('data-src') || '';
    }

    // Determine difficulty level
    let difficulty = poseEl.find('.difficulty, .level').text().trim();

    if (title) {
      poses.push({
        name: title,
        description: description.trim(),
        image_url: imageUrl,
        difficulty: difficulty || 'All Levels',
        benefits: extractBenefits(description),
        category: determinePoseCategory(title, description)
      });
    }
  });

  return poses;
}

function processJohnsHopkinsBenefits($, element) {
  const benefits = {
    physical: [],
    mental: [],
    general: []
  };

  // Look for benefit headers and descriptions
  element.find('h2, h3').each((index, heading) => {
    const title = $(heading).text().trim();

    if (!title || title.length < 3) return;

    let description = '';
    let currentEl = $(heading).next();

    while (currentEl.length && !currentEl.is('h2, h3')) {
      if (currentEl.is('p, li')) {
        const text = currentEl.text().trim();
        if (text) description += text + ' ';
      }
      currentEl = currentEl.next();
    }

    if (description) {
      const benefit = {
        title: title,
        description: description.trim()
      };

      // Categorize based on content
      if (title.match(/mind|stress|anxiety|depress|mood|focus|relax|calm|mental/i) ||
          description.match(/mind|stress|anxiety|depress|mood|focus|relax|calm|mental/i)) {
        benefits.mental.push(benefit);
      } else if (title.match(/body|muscle|strength|flexib|heart|blood|pressure|pain|posture|balance|bone/i) ||
                 description.match(/body|muscle|strength|flexib|heart|blood|pressure|pain|posture|balance|bone/i)) {
        benefits.physical.push(benefit);
      } else {
        benefits.general.push(benefit);
      }
    }
  });

  return benefits;
}

function processMedicalNewsTodayBenefits($, element) {
  const benefits = {
    physical: [],
    mental: [],
    general: []
  };

  // Process each section with benefits
  element.find('h2, h3').each((index, heading) => {
    const title = $(heading).text().trim();

    // Skip non-benefit sections
    if (!title || title.length < 3 ||
        title.match(/reference|source|conclusion|summary|about|author/i)) {
      return;
    }

    let description = '';
    let currentEl = $(heading).next();

    while (currentEl.length && !currentEl.is('h2, h3')) {
      if (currentEl.is('p, li')) {
        const text = currentEl.text().trim();
        if (text) description += text + ' ';
      }
      currentEl = currentEl.next();
    }

    if (description) {
      const benefit = {
        title: title,
        description: description.trim()
      };

      // Categorize
      if (title.match(/mind|stress|anxiety|depress|mood|focus|relax|calm|mental|emotional|psychological/i) ||
          description.match(/mind|stress|anxiety|depress|mood|focus|relax|calm|mental|emotional|psychological/i)) {
        benefits.mental.push(benefit);
      } else if (title.match(/body|muscle|strength|flexib|heart|blood|pressure|pain|posture|balance|bone|weight|physical|fitness/i) ||
                 description.match(/body|muscle|strength|flexib|heart|blood|pressure|pain|posture|balance|bone|weight|physical|fitness/i)) {
        benefits.physical.push(benefit);
      } else {
        benefits.general.push(benefit);
      }
    }
  });

  return benefits;
}

function processYogaJournalTips($, element) {
  const tips = {
    beginners: [],
    practice: [],
    props: []
  };

  // Find tip sections
  element.find('h2, h3, h4').each((index, heading) => {
    const title = $(heading).text().trim();

    if (!title || title.length < 3) return;

    let content = '';
    let currentEl = $(heading).next();

    while (currentEl.length && !currentEl.is('h2, h3, h4')) {
      if (currentEl.is('p, li')) {
        const text = currentEl.text().trim();
        if (text) content += text + ' ';
      }
      currentEl = currentEl.next();
    }

    if (content) {
      const tip = {
        title: title,
        content: content.trim()
      };

      // Categorize tips
      if (title.match(/beginner|start|new to yoga|first time|basic/i) ||
          content.match(/beginner|start|new to yoga|first time|basic/i)) {
        tips.beginners.push(tip);
      } else if (title.match(/prop|block|strap|blanket|bolster|chair|wall/i) ||
                content.match(/prop|block|strap|blanket|bolster|chair|wall/i)) {
        tips.props.push(tip);
      } else {
        tips.practice.push(tip);
      }
    }
  });

  return tips;
}

function processYogaWithAdrieneTips($, element) {
  const tips = {
    beginners: [],
    practice: [],
    props: []
  };

  // Process blog posts or articles
  element.find('article, .post').each((index, article) => {
    const articleEl = $(article);
    const title = articleEl.find('h2, h3, .entry-title').first().text().trim();

    if (!title || title.length < 3) return;

    let content = '';
    articleEl.find('p, .entry-content p').each((i, p) => {
      content += $(p).text().trim() + ' ';
    });

    if (content) {
      const tip = {
        title: title,
        content: content.trim()
      };

      // Categorize
      if (title.match(/beginner|start|new to yoga|first time|basic/i) ||
          content.match(/beginner|start|new to yoga|first time|basic/i)) {
        tips.beginners.push(tip);
      } else if (title.match(/prop|block|strap|blanket|bolster|chair|wall/i) ||
                content.match(/prop|block|strap|blanket|bolster|chair|wall/i)) {
        tips.props.push(tip);
      } else {
        tips.practice.push(tip);
      }
    }
  });

  return tips;
}

function processEkhartYogaTips($, element) {
  const tips = {
    beginners: [],
    practice: [],
    props: []
  };

  // Process content sections
  element.find('h2, h3, h4').each((index, heading) => {
    const title = $(heading).text().trim();

    if (!title || title.length < 3) return;

    let content = '';
    let currentEl = $(heading).next();

    while (currentEl.length && !currentEl.is('h2, h3, h4')) {
      if (currentEl.is('p, li')) {
        const text = currentEl.text().trim();
        if (text) content += text + ' ';
      }
      currentEl = currentEl.next();
    }

    if (content) {
      const tip = {
        title: title,
        content: content.trim()
      };

      // Categorize
      if (title.match(/beginner|start|new|first|basic/i) ||
          content.match(/beginner|start|new to yoga|first time|basic/i)) {
        tips.beginners.push(tip);
      } else if (title.match(/prop|block|strap|blanket|bolster|chair|wall/i) ||
                content.match(/prop|block|strap|blanket|bolster|chair|wall/i)) {
        tips.props.push(tip);
      } else {
        tips.practice.push(tip);
      }
    }
  });

  return tips;
}

// Process command line arguments
process.argv.forEach(arg => {
  if (arg === '--use-puppeteer') {
    CONFIG.usePuppeteer = true;
    console.log('Puppeteer usage enabled via command line argument');
  } else if (arg === '--http-only') {
    CONFIG.usePuppeteer = false;
    console.log('HTTP-only mode enabled via command line argument');
  }
});

// Check environment variables
if (process.env.USE_PUPPETEER === 'true') {
  CONFIG.usePuppeteer = true;
  console.log('Puppeteer usage enabled via environment variable');
} else if (process.env.USE_PUPPETEER === 'false') {
  CONFIG.usePuppeteer = false;
  console.log('Puppeteer usage disabled via environment variable');
}

// Run the scraper
scrapeYogaInfo().catch(error => {
  console.error('Error in scraper:', error);
  console.log('\nTroubleshooting tips:');
  console.log('- Try running with HTTP only: npm run refresh-content -- --http-only');
  console.log('- For MacOS users: you may need to grant permissions to the browser');
  console.log('- Check your firewall settings');
  console.log('- Ensure you have sufficient disk space');
  process.exit(1);
});
