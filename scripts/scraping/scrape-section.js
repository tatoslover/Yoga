#!/usr/bin/env node

/**
 * Section-Specific Scraper
 *
 * This script scrapes data for a specific section of the yoga guide.
 * It's designed to be more targeted and easier to troubleshoot than the all-in-one scraper.
 *
 * Usage:
 *   node scripts/scrape-section.js <section> [options]
 *
 * Where <section> is one of:
 *   - benefits
 *   - poses
 *   - types (or yogaTypes)
 *   - tips
 *
 * Options:
 *   --http-only     Use HTTP-only mode (no browser automation)
 *   --use-cache     Use cached content (don't re-download)
 *   --onetime       Use extra-long delays for one-time scraping
 *   --verbose       Show more detailed logs
 *   --source=NAME   Scrape only the specified source
 *   --help          Show this help message
 */

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const axios = require("axios");

// Configuration
const OUTPUT_DIR = path.join(__dirname, "../../src/_data/scraped");
const CACHE_DIR = path.join(__dirname, "../../_cache");

// Ensure output directories exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Configuration options
const CONFIG = {
  usePuppeteer: true, // Set to true to use Puppeteer for browser-based scraping
  puppeteerRetries: 3, // Number of times to retry puppeteer launch
  logLevel: "info", // 'debug', 'info', 'warn', 'error'
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
  requestDelay: 10000, // Delay between requests in ms (10 seconds)
  pageTimeout: 60000, // Timeout for page load in ms (60 seconds)
  retryDelay: 30000, // Delay between retries in ms (30 seconds)
  maxRetries: 3, // Maximum number of retries per source
  waitBetweenSources: 20000, // Wait 20 seconds between different sources
  randomDelay: true, // Add random delay between requests
  useCache: true, // Use cache if available
  cacheExpiry: 30, // Cache expiry in days
  onetimeMode: false, // Use extreme delays for one-time scraping
  verbose: false, // Show verbose logs
};

// Sources to scrape (add reputable yoga websites here)
// Each source has an authority score (1-10) used for conflict resolution
const SOURCES = {
  yogaTypes: [
    {
      name: "Yoga Journal - Types of Yoga",
      url: "https://www.yogajournal.com/yoga-101/types-of-yoga/",
      selector: "article .page-container",
      processor: processYogaJournalTypes,
      authority: 9,
    },
    {
      name: "Yoga Alliance - Styles",
      url: "https://www.yogaalliance.org/About_Yoga/Yoga_Styles",
      selector: ".content-body",
      processor: processYogaAllianceStyles,
      authority: 10,
    },
    {
      name: "DoYogaWithMe - Styles",
      url: "https://www.doyogawithme.com/types-of-yoga",
      selector: ".main-content",
      processor: processDoYogaWithMeStyles,
      authority: 9,
    },
    {
      name: "Yoga Basics - Styles",
      url: "https://www.yogabasics.com/learn/yoga-styles/",
      selector: ".entry-content",
      processor: processYogaBasicsStyles,
      authority: 8,
    },
  ],
  poses: [
    {
      name: "Yoga Journal - Poses",
      url: "https://www.yogajournal.com/poses/yoga-poses-library/",
      selector: ".archive-item-component, .card, article",
      processor: processYogaJournalPoses,
      authority: 9,
    },
    {
      name: "Pocket Yoga - Pose Dictionary",
      url: "https://www.pocketyoga.com/pose/",
      selector: ".pose-table",
      processor: processPocketYogaPoses,
      authority: 7,
    },
    {
      name: "DoYogaWithMe - Pose Guide",
      url: "https://www.doyogawithme.com/yoga-poses",
      selector: ".view-content",
      processor: processDoYogaWithMePoses,
      authority: 8,
    },
  ],
  benefits: [
    {
      name: "Harvard Health - Yoga Benefits",
      url: "https://www.health.harvard.edu/staying-healthy/yoga-benefits-beyond-the-mat",
      selector:
        "article, #page-content, .content-body, .article-body, main, #content",
      processor: processHarvardHealthBenefits,
      waitForSelector:
        "article p, #page-content p, .content-body p, .article-body p, main p",
      authority: 10,
    },
    {
      name: "Johns Hopkins Medicine - Yoga Benefits",
      url: "https://www.hopkinsmedicine.org/health/wellness-and-prevention/9-benefits-of-yoga",
      selector: ".content, article, .article-body",
      waitForSelector: ".content p, article p, .article-body p",
      processor: processJohnsHopkinsBenefits,
      authority: 9,
    },
    {
      name: "Medical News Today - Yoga Benefits",
      url: "https://www.medicalnewstoday.com/articles/yoga-benefits",
      selector: ".article-body",
      processor: processMedicalNewsTodayBenefits,
      authority: 8,
    },
  ],
  tips: [
    {
      name: "Yoga Journal - Practice Tips",
      url: "https://www.yogajournal.com/practice/",
      selector: ".entry-content",
      processor: processYogaJournalTips,
      authority: 9,
    },
    {
      name: "Yoga With Adriene - Practice Tips",
      url: "https://yogawithadriene.com/category/yoga-tips/",
      selector: ".entry-content",
      processor: processYogaWithAdrieneTips,
      authority: 7,
    },
    {
      name: "Ekhart Yoga - Beginners Guide",
      url: "https://www.ekhartyoga.com/articles/practice/yoga-for-beginners",
      selector: ".article__content",
      processor: processEkhartYogaTips,
      authority: 8,
    },
  ],
};

// Process command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    section: null,
    httpOnly: false,
    useCache: true,
    onetimeMode: false,
    verbose: false,
    sourceName: null,
  };

  // Check for help first
  if (args.includes("--help") || args.length === 0) {
    showUsage();
    process.exit(0);
  }

  // First argument should be the section
  options.section = args[0];

  // Handle "types" as an alias for "yogaTypes"
  if (options.section === "types") {
    options.section = "yogaTypes";
  }

  // Validate section
  if (!["benefits", "poses", "yogaTypes", "tips"].includes(options.section)) {
    console.error(`Error: Invalid section "${options.section}"`);
    showUsage();
    process.exit(1);
  }

  // Process flags
  options.httpOnly = args.includes("--http-only");
  options.useCache = args.includes("--use-cache") || CONFIG.useCache;
  options.onetimeMode = args.includes("--onetime");
  options.verbose = args.includes("--verbose");

  // Look for source parameter
  const sourceArg = args.find((arg) => arg.startsWith("--source="));
  if (sourceArg) {
    options.sourceName = sourceArg.split("=")[1];
  }

  return options;
}

function showUsage() {
  console.log(`
Section-Specific Scraper

Usage:
  node scripts/scrape-section.js <section> [options]

Where <section> is one of:
  - benefits
  - poses
  - types (or yogaTypes)
  - tips

Options:
  --http-only     Use HTTP-only mode (no browser automation)
  --use-cache     Use cached content (don't re-download)
  --onetime       Use extra-long delays for one-time scraping
  --verbose       Show more detailed logs
  --source=NAME   Scrape only the specified source
  --help          Show this help message

Examples:
  node scripts/scrape-section.js benefits                  # Scrape all benefits sources
  node scripts/scrape-section.js poses --http-only         # Scrape poses using HTTP only
  node scripts/scrape-section.js tips --source="Yoga Journal - Practice Tips"   # Scrape only specified source
  `);
}

async function scrapeSectionInfo(options) {
  console.log(`Starting section-specific scraper for: ${options.section}`);

  // Apply options to configuration
  CONFIG.usePuppeteer = !options.httpOnly;
  CONFIG.useCache = options.useCache;
  CONFIG.onetimeMode = options.onetimeMode;
  CONFIG.verbose = options.verbose;

  if (CONFIG.onetimeMode) {
    console.log("One-time mode enabled: Using longer delays between requests");
    CONFIG.requestDelay = 30000; // 30 seconds
    CONFIG.waitBetweenSources = 60000; // 1 minute
    CONFIG.retryDelay = 120000; // 2 minutes
  }

  // Browser instance (will be set if puppeteer is used)
  let browser = null;

  // Only try to launch browser if configured to use puppeteer
  if (CONFIG.usePuppeteer && !options.httpOnly) {
    console.log("Attempting to launch headless browser...");

    // Try multiple times to launch the browser
    for (let attempt = 1; attempt <= CONFIG.puppeteerRetries; attempt++) {
      try {
        console.log(`Launch attempt ${attempt}/${CONFIG.puppeteerRetries}...`);
        browser = await puppeteer.launch({
          headless: "new", // Use new headless mode
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-gpu",
            "--window-size=1920,1080",
            "--disable-web-security",
            "--disable-features=IsolateOrigins,site-per-process",
            "--disable-blink-features=AutomationControlled",
            "--user-agent=" + CONFIG.userAgent,
          ],
          ignoreHTTPSErrors: true,
          timeout: CONFIG.pageTimeout,
          protocolTimeout: CONFIG.pageTimeout,
        });
        console.log("Browser launched successfully");
        break;
      } catch (error) {
        console.error(
          `Browser launch attempt ${attempt} failed:`,
          error.message,
        );

        if (attempt === CONFIG.puppeteerRetries) {
          console.warn(
            "All browser launch attempts failed. Will use HTTP requests only.",
          );
        } else {
          // Wait before retrying with longer delay
          console.log(
            `Waiting ${CONFIG.retryDelay / 1000} seconds before retry...`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, CONFIG.retryDelay),
          );
        }
      }
    }
  } else {
    console.log("Running in HTTP-only mode (no browser)");
  }

  try {
    // Get sources for the specified section
    const sources = SOURCES[options.section] || [];
    if (sources.length === 0) {
      console.error(`No sources configured for section: ${options.section}`);
      return;
    }

    console.log(`Found ${sources.length} sources for ${options.section}`);

    // Filter sources if a specific one was requested
    const sourcesToScrape = options.sourceName
      ? sources.filter((source) => source.name === options.sourceName)
      : sources;

    if (options.sourceName && sourcesToScrape.length === 0) {
      console.error(
        `Source "${options.sourceName}" not found for section ${options.section}`,
      );
      console.log("Available sources:");
      sources.forEach((source) => console.log(`  - ${source.name}`));
      return;
    }

    const results = [];

    // Process each source in the category
    for (let index = 0; index < sourcesToScrape.length; index++) {
      const source = sourcesToScrape[index];
      console.log(`\n- Scraping from ${source.name}`);

      try {
        // Add delay between sources to avoid rate limiting
        if (index > 0) {
          let delay = CONFIG.waitBetweenSources;

          // Add randomness to make scraping look more human
          if (CONFIG.randomDelay) {
            if (CONFIG.onetimeMode) {
              delay += Math.floor(Math.random() * 30000); // Add up to 30 seconds randomly in one-time mode
            } else {
              delay += Math.floor(Math.random() * 10000); // Add up to 10 seconds randomly
            }
          }

          console.log(
            `  Waiting ${delay / 1000} seconds before next source...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        const data = await scrapeSource(browser, source, options);

        if (data) {
          console.log(`  ✓ Successfully scraped data from ${source.name}`);
          results.push({
            source: source.name,
            data: data,
          });
        } else {
          console.log(`  ✗ Failed to scrape data from ${source.name}`);
        }
      } catch (error) {
        console.error(`  ✗ Error scraping ${source.name}:`, error.message);
        if (CONFIG.verbose) {
          console.error(error.stack);
        }
      }
    }

    // Save the combined results for this category
    if (results.length > 0) {
      const outputPath = path.join(OUTPUT_DIR, `${options.section}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
      console.log(
        `✓ Saved ${results.length} ${options.section} results to ${outputPath}`,
      );
    } else {
      console.log(`✗ No ${options.section} results were found to save`);
    }
  } finally {
    // Close the browser if it was launched
    if (browser) {
      await browser.close();
      console.log("Browser closed");
    }
  }

  console.log("\nScraping completed!");
}

async function scrapeSource(browser, source, options) {
  const { url, selector, processor, waitForSelector } = source;

  // Check if we have a valid cache
  const cacheFile = path.join(
    CACHE_DIR,
    sanitizeFilename(`${source.name.toLowerCase().replace(/\s+/g, "-")}.html`),
  );
  let cacheValid = false;
  let content = null;

  if (CONFIG.useCache && fs.existsSync(cacheFile)) {
    const stats = fs.statSync(cacheFile);
    const fileAge =
      (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24); // age in days

    if (fileAge < CONFIG.cacheExpiry) {
      cacheValid = true;
      content = fs.readFileSync(cacheFile, "utf8");
      console.log(
        `  Using cached content (${Math.round(fileAge * 24)} hours old)`,
      );
    } else {
      console.log(`  Cache expired (${Math.round(fileAge)} days old)`);
    }
  }

  // Fetch fresh content if no valid cache
  if (!cacheValid) {
    console.log(`  Fetching content from ${url}`);

    let maxRetries = CONFIG.maxRetries;
    let retryCount = 0;
    let success = false;

    while (!success && retryCount <= maxRetries) {
      try {
        if (retryCount > 0) {
          console.log(`  Retry ${retryCount}/${maxRetries}...`);
          await new Promise((resolve) =>
            setTimeout(resolve, CONFIG.retryDelay),
          );
        }

        if (browser) {
          // Use puppeteer
          const page = await browser.newPage();

          // Set viewport
          await page.setViewport({ width: 1920, height: 1080 });

          // Set request timeout
          page.setDefaultNavigationTimeout(CONFIG.pageTimeout);

          // Intercept requests - this is just to add more human-like behavior
          await page.setRequestInterception(true);
          page.on("request", (request) => {
            // Skip images, fonts, stylesheets to speed things up
            const resourceType = request.resourceType();
            if (CONFIG.verbose) {
              console.log(`    Request: ${resourceType} - ${request.url()}`);
            }
            if (
              resourceType === "image" ||
              resourceType === "font" ||
              resourceType === "stylesheet"
            ) {
              request.abort();
            } else {
              request.continue();
            }
          });

          // Go to URL
          console.log(`  Navigating to page...`);
          await page.goto(url, { waitUntil: "domcontentloaded" });

          // Wait for selector if specified
          if (waitForSelector) {
            console.log(`  Waiting for content to load...`);
            await page.waitForSelector(waitForSelector, {
              timeout: CONFIG.pageTimeout,
            });
          } else {
            // Otherwise wait for standard selectors
            await page.waitForSelector(selector, {
              timeout: CONFIG.pageTimeout,
            });
          }

          // Auto-scroll to load lazy content
          console.log(`  Scrolling page to load content...`);
          await autoScroll(page);

          // Get page content
          content = await page.content();

          // Close page
          await page.close();
        } else {
          // Use axios
          console.log(`  Using HTTP request...`);
          const response = await axios.get(url, {
            headers: {
              "User-Agent": CONFIG.userAgent,
              Accept: "text/html,application/xhtml+xml,application/xml",
              "Accept-Language": "en-US,en;q=0.9",
            },
            timeout: CONFIG.pageTimeout,
          });
          content = response.data;
        }

        // Cache the result
        if (content && content.length > 0) {
          fs.writeFileSync(cacheFile, content);
          console.log(
            `  Content fetched and cached (${(content.length / 1024).toFixed(1)} KB)`,
          );
          success = true;
        } else {
          throw new Error("Empty content received");
        }
      } catch (error) {
        console.error(
          `  Error fetching content (attempt ${retryCount + 1}/${maxRetries + 1}):`,
          error.message,
        );
        retryCount++;

        if (retryCount > maxRetries) {
          console.error(`  All retries failed for ${url}`);
          return null;
        }
      }
    }
  }

  if (!content) {
    console.error(`  No content available for ${url}`);
    return null;
  }

  try {
    // Parse the content with cheerio
    const $ = cheerio.load(content);
    const selectedContent = $(selector);

    if (!selectedContent || selectedContent.length === 0) {
      console.error(`  Selector "${selector}" not found in the page`);
      if (CONFIG.verbose) {
        console.log(
          `  Page content structure:\n${$.html().substring(0, 500)}...`,
        );
      }
      return null;
    }

    console.log(`  Processing content...`);

    // Process content with the provided processor function
    let data = null;
    if (typeof processor === "function") {
      data = processor($, selectedContent, options);
    } else {
      // Default processing if no processor is provided
      data = selectedContent.text();
    }

    return data;
  } catch (error) {
    console.error(`  Error processing content:`, error.message);
    if (CONFIG.verbose) {
      console.error(error.stack);
    }
    return null;
  }
}

// Function implementations for processing different data sources

function processYogaJournalTypes($, content) {
  const types = [];
  const styleHeadings = content.find("h2, h3").filter(function () {
    const text = $(this).text().trim();
    return (
      text.length > 0 && !text.includes("Comment") && !text.includes("Related")
    );
  });

  console.log(`  Found ${styleHeadings.length} potential yoga types`);

  styleHeadings.each(function () {
    const title = $(this).text().trim();
    let description = "";
    let node = $(this).next();

    // Collect all paragraphs until the next heading
    while (node.length && !node.is("h2, h3")) {
      if (node.is("p")) {
        const text = node.text().trim();
        if (
          text &&
          !text.includes("Related:") &&
          !text.includes("Read also:")
        ) {
          description += text + " ";
        }
      }
      node = node.next();
    }

    description = description.trim();

    if (title && description) {
      // Extract key details
      const benefits = extractBenefits(description);
      const suitableFor = extractSuitableFor(description);

      types.push({
        name: title,
        description: description,
        benefits: benefits,
        suitableFor: suitableFor,
        source: "Yoga Journal",
      });
    }
  });

  return types;
}

function processYogaAllianceStyles($, content) {
  const types = [];
  const styleElements = content.find(".style");

  console.log(`  Found ${styleElements.length} yoga styles`);

  styleElements.each(function () {
    const title = $(this).find("h4").text().trim();
    let description = "";

    $(this)
      .find("p")
      .each(function () {
        description += $(this).text().trim() + " ";
      });

    description = description.trim();

    if (title && description) {
      // Extract key details
      const benefits = extractBenefits(description);
      const suitableFor = extractSuitableFor(description);

      types.push({
        name: title,
        description: description,
        benefits: benefits,
        suitableFor: suitableFor,
        source: "Yoga Alliance",
      });
    }
  });

  return types;
}

function processYogaBasicsStyles($, content) {
  const types = [];

  // Find all headings that might be yoga style names
  const styleHeadings = content.find("h2, h3, h4").filter(function () {
    const text = $(this).text().trim();
    // Look for likely yoga style headings
    return (
      text.length > 0 &&
      !text.includes("Comment") &&
      !text.toLowerCase().includes("related") &&
      !text.toLowerCase().includes("reference") &&
      !text.toLowerCase().includes("subscribe")
    );
  });

  console.log(`  Found ${styleHeadings.length} potential yoga types`);

  styleHeadings.each(function () {
    const title = $(this).text().trim();
    let description = "";
    let node = $(this).next();

    // Collect paragraphs until the next heading
    while (node.length && !node.is("h2, h3, h4")) {
      if (node.is("p")) {
        const text = node.text().trim();
        if (
          text &&
          !text.includes("Related:") &&
          !text.includes("Read also:") &&
          !text.includes("Subscribe") &&
          !text.includes("Copyright")
        ) {
          description += text + " ";
        }
      }
      node = node.next();
    }

    description = description.trim();

    if (title && description && description.length > 50) {
      // Extract key details
      const benefits = extractBenefits(description);
      const suitableFor = extractSuitableFor(description);

      types.push({
        name: title,
        description: description,
        benefits: benefits,
        suitableFor: suitableFor,
        source: "Yoga Basics",
      });
    }
  });

  return types;
}

function processDoYogaWithMeStyles($, content) {
  const types = [];

  // Look for the yoga style sections
  content.find(".yoga-type").each(function () {
    const title = $(this).find("h2, h3").first().text().trim();
    let description = "";

    $(this)
      .find("p")
      .each(function () {
        description += $(this).text().trim() + " ";
      });

    description = description.trim();

    if (title && description) {
      // Extract key details
      const benefits = extractBenefits(description);
      const suitableFor = extractSuitableFor(description);

      types.push({
        name: title,
        description: description,
        benefits: benefits,
        suitableFor: suitableFor,
        source: "DoYogaWithMe",
      });
    }
  });

  return types;
}

function processYogaJournalPoses($, content) {
  const poses = [];

  // Find pose elements
  content.each(function (i, el) {
    const poseElement = $(this);
    const title = poseElement.find("h2, h3").first().text().trim();

    if (!title) {
      return; // Skip if no title found
    }

    let description = "";
    poseElement.find("p").each(function () {
      const text = $(this).text().trim();
      if (
        text &&
        !text.includes("Related:") &&
        !text.includes("Read also:") &&
        !text.includes("Advertisement")
      ) {
        description += text + " ";
      }
    });

    description = description.trim();

    if (title && description) {
      // Determine pose category
      const category = determinePoseCategory(title, description);

      // Extract benefits
      const benefits = extractBenefits(description);

      poses.push({
        name: title,
        description: description,
        category: category,
        benefits: benefits,
        source: "Yoga Journal",
      });
    }
  });

  return poses;
}

function processPocketYogaPoses($, content) {
  const poses = [];

  // Process the pose table
  content.find("tr").each(function () {
    const cells = $(this).find("td");
    if (cells.length >= 2) {
      const nameCell = cells.eq(0);
      const title = nameCell.text().trim();

      // Skip the header row
      if (title === "Name" || title === "English" || title === "Sanskrit") {
        return;
      }

      // Extract link to pose detail page
      const poseLink = nameCell.find("a").attr("href");
      if (poseLink) {
        // Here we would normally fetch the details page
        // But for simplicity we'll just extract what we can from this table
        const description = cells.eq(1).text().trim();

        if (title && description) {
          // Determine pose category
          const category = determinePoseCategory(title, description);

          poses.push({
            name: title,
            description: description,
            category: category,
            benefits: [], // Would need detail page for benefits
            source: "Pocket Yoga",
          });
        }
      }
    }
  });

  return poses;
}

function processDoYogaWithMePoses($, content) {
  const poses = [];

  // Process the pose grid
  content.find(".pose-item, .yoga-pose").each(function () {
    const poseElement = $(this);
    const title = poseElement.find("h2, h3, .pose-title").first().text().trim();
    let description = "";

    poseElement.find("p, .pose-description").each(function () {
      description += $(this).text().trim() + " ";
    });

    description = description.trim();

    if (title && description) {
      // Determine pose category
      const category = determinePoseCategory(title, description);

      // Extract benefits
      const benefits = extractBenefits(description);

      poses.push({
        name: title,
        description: description,
        category: category,
        benefits: benefits,
        source: "DoYogaWithMe",
      });
    }
  });

  return poses;
}

function processHarvardHealthBenefits($, content) {
  console.log("  Processing Harvard Health benefits data...");
  const benefits = [];

  // Find all paragraphs that might contain benefit information
  const paragraphs = content.find("p");
  console.log(`  Found ${paragraphs.length} paragraphs to process`);

  let currentSection = "General";

  // Look for section headings
  content.find("h1, h2, h3, h4").each(function () {
    const headingText = $(this).text().trim();

    // Skip obvious non-section headings
    if (
      headingText.toLowerCase().includes("comment") ||
      headingText.toLowerCase().includes("related") ||
      headingText.toLowerCase().includes("subscribe") ||
      headingText.toLowerCase().includes("author")
    ) {
      return;
    }

    if (headingText) {
      currentSection = headingText;

      // Process paragraphs following this heading
      let paragraphs = [];
      let node = $(this).next();

      while (node.length && !node.is("h1, h2, h3, h4")) {
        if (node.is("p")) {
          const text = node.text().trim();
          if (
            text &&
            !text.includes("Related:") &&
            !text.includes("Read also:") &&
            !text.includes("Subscribe") &&
            !text.includes("Copyright")
          ) {
            paragraphs.push(text);
          }
        }
        node = node.next();
      }

      if (paragraphs.length > 0) {
        // Combine paragraphs into a single description
        const description = paragraphs.join(" ");

        // Categorize the benefit
        let category = "Physical";
        if (
          currentSection.toLowerCase().includes("mind") ||
          currentSection.toLowerCase().includes("mental") ||
          currentSection.toLowerCase().includes("brain") ||
          currentSection.toLowerCase().includes("stress") ||
          currentSection.toLowerCase().includes("anxiety")
        ) {
          category = "Mental";
        } else if (
          currentSection.toLowerCase().includes("lifestyle") ||
          currentSection.toLowerCase().includes("diet") ||
          currentSection.toLowerCase().includes("eating") ||
          currentSection.toLowerCase().includes("daily") ||
          currentSection.toLowerCase().includes("habit")
        ) {
          category = "Lifestyle";
        }

        benefits.push({
          title: currentSection,
          description: description,
          category: category,
          source: "Harvard Health",
        });
      }
    }
  });

  // If we didn't find specific sections, try to extract generic benefits
  if (benefits.length === 0) {
    paragraphs.each(function () {
      const text = $(this).text().trim();

      // Skip short paragraphs or those that seem like metadata
      if (
        text.length < 50 ||
        text.includes("Copyright") ||
        text.includes("Subscribe") ||
        text.toLowerCase().includes("related article")
      ) {
        return;
      }

      // Look for paragraphs that describe benefits
      if (
        text.includes("benefit") ||
        text.includes("improve") ||
        text.includes("help with") ||
        text.includes("reduce") ||
        text.includes("increase") ||
        text.includes("promote")
      ) {
        let category = "Physical";
        if (
          text.toLowerCase().includes("mind") ||
          text.toLowerCase().includes("mental") ||
          text.toLowerCase().includes("brain") ||
          text.toLowerCase().includes("stress") ||
          text.toLowerCase().includes("anxiety") ||
          text.toLowerCase().includes("depression")
        ) {
          category = "Mental";
        } else if (
          text.toLowerCase().includes("lifestyle") ||
          text.toLowerCase().includes("diet") ||
          text.toLowerCase().includes("eating") ||
          text.toLowerCase().includes("daily")
        ) {
          category = "Lifestyle";
        }

        benefits.push({
          title: `Yoga Benefit: ${text.substring(0, 40)}...`,
          description: text,
          category: category,
          source: "Harvard Health",
        });
      }
    });
  }

  console.log(`  Extracted ${benefits.length} benefits`);
  return benefits;
}

function processJohnsHopkinsBenefits($, content) {
  const benefits = [];

  // Find benefit sections
  content.find("h2, h3, h4, h5").each(function () {
    const title = $(this).text().trim();

    // Skip non-benefit headings
    if (
      title.toLowerCase().includes("comment") ||
      title.toLowerCase().includes("related") ||
      title.toLowerCase().includes("reference")
    ) {
      return;
    }

    let description = "";
    let node = $(this).next();

    while (node.length && !node.is("h2, h3, h4, h5")) {
      if (node.is("p")) {
        description += node.text().trim() + " ";
      }
      node = node.next();
    }

    description = description.trim();

    if (title && description) {
      // Categorize the benefit
      let category = "Physical";
      if (
        title.toLowerCase().includes("mind") ||
        title.toLowerCase().includes("mental") ||
        title.toLowerCase().includes("brain") ||
        title.toLowerCase().includes("stress") ||
        title.toLowerCase().includes("anxiety")
      ) {
        category = "Mental";
      } else if (
        title.toLowerCase().includes("lifestyle") ||
        title.toLowerCase().includes("diet") ||
        title.toLowerCase().includes("eating") ||
        title.toLowerCase().includes("daily")
      ) {
        category = "Lifestyle";
      }

      benefits.push({
        title: title,
        description: description,
        category: category,
        source: "Johns Hopkins Medicine",
      });
    }
  });

  return benefits;
}

function processMedicalNewsTodayBenefits($, content) {
  const benefits = [];

  // Find benefit sections
  content.find("h2, h3").each(function () {
    const title = $(this).text().trim();

    // Skip non-benefit headings
    if (
      title.toLowerCase().includes("summary") ||
      title.toLowerCase().includes("takeaway") ||
      title.toLowerCase().includes("related") ||
      title.toLowerCase().includes("reference")
    ) {
      return;
    }

    let description = "";
    let node = $(this).next();

    while (node.length && !node.is("h2, h3")) {
      if (node.is("p")) {
        description += node.text().trim() + " ";
      }
      node = node.next();
    }

    description = description.trim();

    if (title && description) {
      // Categorize the benefit
      let category = "Physical";
      if (
        title.toLowerCase().includes("mind") ||
        title.toLowerCase().includes("mental") ||
        title.toLowerCase().includes("brain") ||
        title.toLowerCase().includes("stress") ||
        title.toLowerCase().includes("anxiety")
      ) {
        category = "Mental";
      } else if (
        title.toLowerCase().includes("lifestyle") ||
        title.toLowerCase().includes("diet") ||
        title.toLowerCase().includes("eating")
      ) {
        category = "Lifestyle";
      }

      benefits.push({
        title: title,
        description: description,
        category: category,
        source: "Medical News Today",
      });
    }
  });

  return benefits;
}

function processYogaJournalTips($, content) {
  const tips = [];

  // Find tip sections in the content
  content.find("h2, h3, h4").each(function () {
    const title = $(this).text().trim();

    // Skip non-tip headings
    if (
      title.toLowerCase().includes("comment") ||
      title.toLowerCase().includes("related") ||
      title.toLowerCase().includes("subscribe")
    ) {
      return;
    }

    let description = "";
    let node = $(this).next();

    // Collect paragraphs until the next heading
    while (node.length && !node.is("h2, h3, h4")) {
      if (node.is("p")) {
        const text = node.text().trim();
        if (
          text &&
          !text.includes("Related:") &&
          !text.includes("Read also:") &&
          !text.includes("Subscribe")
        ) {
          description += text + " ";
        }
      }
      node = node.next();
    }

    description = description.trim();

    if (title && description) {
      // Categorize the tip
      let category = "General";

      if (
        title.toLowerCase().includes("beginner") ||
        description.toLowerCase().includes("beginner")
      ) {
        category = "Beginner";
      } else if (
        title.toLowerCase().includes("prop") ||
        description.toLowerCase().includes("prop") ||
        description.toLowerCase().includes("block") ||
        description.toLowerCase().includes("strap")
      ) {
        category = "Props";
      } else if (
        title.toLowerCase().includes("mind") ||
        description.toLowerCase().includes("mindful") ||
        description.toLowerCase().includes("breath") ||
        description.toLowerCase().includes("aware")
      ) {
        category = "Mindful";
      }

      tips.push({
        title: title,
        description: description,
        category: category,
        source: "Yoga Journal",
      });
    }
  });

  return tips;
}

function processYogaWithAdrieneTips($, content) {
  const tips = [];

  // Find tip paragraphs
  const paragraphs = content.find("p");

  paragraphs.each(function () {
    const text = $(this).text().trim();

    // Skip short or irrelevant paragraphs
    if (
      text.length < 40 ||
      text.includes("Subscribe") ||
      text.includes("Comment") ||
      text.includes("Copyright")
    ) {
      return;
    }

    // Find paragraphs that look like tips
    if (
      text.includes("practice") ||
      text.includes("yoga") ||
      text.includes("pose") ||
      text.includes("tip") ||
      text.includes("recommend") ||
      text.includes("suggest")
    ) {
      // Extract a title from the first part of the paragraph
      const title = text.substring(0, 40).split(".")[0].trim() + "...";

      // Categorize the tip
      let category = "General";

      if (
        text.toLowerCase().includes("beginner") ||
        text.toLowerCase().includes("start")
      ) {
        category = "Beginner";
      } else if (
        text.toLowerCase().includes("prop") ||
        text.toLowerCase().includes("block") ||
        text.toLowerCase().includes("strap")
      ) {
        category = "Props";
      } else if (
        text.toLowerCase().includes("mind") ||
        text.toLowerCase().includes("breath") ||
        text.toLowerCase().includes("aware") ||
        text.toLowerCase().includes("present")
      ) {
        category = "Mindful";
      }

      tips.push({
        title: title,
        description: text,
        category: category,
        source: "Yoga With Adriene",
      });
    }
  });

  return tips;
}

function processEkhartYogaTips($, content) {
  const tips = [];

  // Find headings that might contain tips
  content.find("h2, h3, h4").each(function () {
    const title = $(this).text().trim();

    // Skip non-tip headings
    if (
      title.toLowerCase().includes("comment") ||
      title.toLowerCase().includes("related") ||
      title.toLowerCase().includes("subscribe")
    ) {
      return;
    }

    let description = "";
    let node = $(this).next();

    // Collect paragraphs until the next heading
    while (node.length && !node.is("h2, h3, h4")) {
      if (node.is("p")) {
        const text = node.text().trim();
        if (
          text &&
          !text.includes("Related:") &&
          !text.includes("Read also:") &&
          !text.includes("Subscribe")
        ) {
          description += text + " ";
        }
      }
      node = node.next();
    }

    description = description.trim();

    if (title && description) {
      // Categorize the tip
      let category = "General";

      if (
        title.toLowerCase().includes("beginner") ||
        description.toLowerCase().includes("beginner") ||
        title.toLowerCase().includes("start") ||
        description.toLowerCase().includes("start")
      ) {
        category = "Beginner";
      } else if (
        title.toLowerCase().includes("prop") ||
        description.toLowerCase().includes("prop") ||
        description.toLowerCase().includes("block") ||
        description.toLowerCase().includes("strap")
      ) {
        category = "Props";
      } else if (
        title.toLowerCase().includes("mind") ||
        description.toLowerCase().includes("mindful") ||
        description.toLowerCase().includes("breath") ||
        description.toLowerCase().includes("aware") ||
        title.toLowerCase().includes("focus") ||
        description.toLowerCase().includes("focus")
      ) {
        category = "Mindful";
      }

      tips.push({
        title: title,
        description: description,
        category: category,
        source: "Ekhart Yoga",
      });
    }
  });

  return tips;
}

// Utility functions

function extractBenefits(text) {
  const benefits = [];

  // Look for phrases that indicate benefits
  const benefitPhrases = [
    "improves",
    "strengthens",
    "increases",
    "enhances",
    "boosts",
    "helps",
    "reduces",
    "relieves",
    "supports",
    "promotes",
    "beneficial for",
    "good for",
    "great for",
    "benefit",
  ];

  for (const phrase of benefitPhrases) {
    const regex = new RegExp(`${phrase}\\s+([^.!?]+)[.!?]`, "gi");
    let match;

    while ((match = regex.exec(text)) !== null) {
      const benefit = match[0].trim();
      if (benefit.length > 10 && benefit.length < 150) {
        benefits.push(benefit);
      }
    }
  }

  // Deduplicate
  return [...new Set(benefits)];
}

function extractSuitableFor(text) {
  const suitableFor = [];

  // Look for phrases that indicate who the yoga type is suitable for
  const suitablePhrases = [
    "perfect for",
    "ideal for",
    "great for",
    "good for",
    "designed for",
    "suitable for",
    "recommended for",
    "best for",
    "especially for",
    "beneficial for",
  ];

  for (const phrase of suitablePhrases) {
    const regex = new RegExp(`${phrase}\\s+([^.!?]+)[.!?]`, "gi");
    let match;

    while ((match = regex.exec(text)) !== null) {
      const suitable = match[0].trim();
      if (suitable.length > 10 && suitable.length < 150) {
        suitableFor.push(suitable);
      }
    }
  }

  // Deduplicate
  return [...new Set(suitableFor)];
}

function determinePoseCategory(title, description) {
  // Determine pose category based on title and description
  title = title.toLowerCase();
  description = description.toLowerCase();

  // Standing poses
  if (
    title.includes("mountain") ||
    title.includes("warrior") ||
    title.includes("triangle") ||
    title.includes("stand") ||
    title.includes("tree") ||
    title.includes("eagle") ||
    (title.includes("pose") && description.includes("standing"))
  ) {
    return "Standing";
  }

  // Seated poses
  if (
    title.includes("seated") ||
    title.includes("sitting") ||
    title.includes("staff") ||
    title.includes("lotus") ||
    title.includes("easy pose") ||
    title.includes("sukhasana") ||
    title.includes("dandasana")
  ) {
    return "Seated";
  }

  // Backbends
  if (
    title.includes("backbend") ||
    title.includes("wheel") ||
    title.includes("bow") ||
    title.includes("camel") ||
    title.includes("cobra") ||
    title.includes("up dog") ||
    title.includes("bridge") ||
    description.includes("backbend")
  ) {
    return "Backbends";
  }

  // Inversions
  if (
    title.includes("inversion") ||
    title.includes("headstand") ||
    title.includes("handstand") ||
    title.includes("shoulder stand") ||
    title.includes("downward") ||
    title.includes("upside down") ||
    description.includes("inversion") ||
    description.includes("blood flow to the head")
  ) {
    return "Inversions";
  }

  // Default to other
  return "Other";
}

function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9-_.]/gi, "_");
}

// Safely extract text from a nested selector that might not exist
function safeExtract($, parent, selector, attr = null) {
  try {
    const element = parent.find(selector);
    if (!element.length) return "";

    if (attr) {
      return element.attr(attr) || "";
    } else {
      return element.text().trim();
    }
  } catch (e) {
    return "";
  }
}

// Scroll the page to ensure all content is loaded (useful for lazy-loading sites)
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

// Run the script
const options = parseArgs();
scrapeSectionInfo(options).catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
