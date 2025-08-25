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
  puppeteerRetries: 5, // Number of times to retry puppeteer launch
  logLevel: "info", // 'debug', 'info', 'warn', 'error'
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
  requestDelay: 30000, // Delay between requests in ms (30 seconds)
  pageTimeout: 120000, // Timeout for page load in ms (120 seconds)
  retryDelay: 60000, // Delay between retries in ms (60 seconds)
  maxRetries: 5, // Maximum number of retries per source
  waitBetweenSources: 60000, // Wait 60 seconds between different sources
  randomDelay: true, // Add random delay between requests
  useCache: true, // Use cache if available
  cacheExpiry: 30, // Cache expiry in days
  onetimeMode: false, // Use extreme delays for one-time scraping
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
      name: "Yoga Alliance - Styles",
      url: "https://www.yogaalliance.org/About_Yoga/Article_What_Is_Yoga/Yoga_Styles",
      selector: ".article-body",
      processor: processYogaAllianceStyles,
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
      name: "Yoga International - Practice Tips",
      url: "https://yogainternational.com/ecourse/yoga-for-beginners-6-week-series/",
      selector: ".course-description",
      processor: processYogaInternationalTips,
      authority: 8,
    },
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

// Content quality thresholds
const QUALITY_THRESHOLDS = {
  minimumDescriptionLength: 100,
  minimumTitleLength: 3,
  requiredFields: {
    yogaTypes: ["name", "description"],
    poses: ["name", "description", "category"],
    benefits: [],
    tips: [],
  },
};

// Main function to run the scraper
async function scrapeYogaInfo() {
  console.log("Starting yoga information scraper...");

  // Browser instance (will be set if puppeteer is used)
  let browser = null;

  // Parse command line arguments
  const args = process.argv.slice(2);
  const httpOnly =
    args.includes("--http-only") || process.env.HTTP_ONLY === "true";
  const onetimeMode =
    args.includes("--onetime") || process.env.ONETIME === "true";

  if (httpOnly) {
    console.log("HTTP-only mode enabled via command line argument");
    CONFIG.usePuppeteer = false;
  }

  if (onetimeMode) {
    console.log("One-time mode enabled via command line argument");
    console.log("Using extremely long delays to bypass anti-scraping measures");
    CONFIG.onetimeMode = true;
    CONFIG.requestDelay = 60000; // 1 minute
    CONFIG.waitBetweenSources = 180000; // 3 minutes
    CONFIG.retryDelay = 300000; // 5 minutes
    CONFIG.pageTimeout = 300000; // 5 minutes
  }

  // Only try to launch browser if configured to use puppeteer
  if (CONFIG.usePuppeteer && !httpOnly) {
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
    // Process each category
    for (const [category, sources] of Object.entries(SOURCES)) {
      console.log(`\nScraping ${category}...`);
      const results = [];

      // Process each source in the category
      for (let index = 0; index < sources.length; index++) {
        const source = sources[index];
        console.log(`- Scraping from ${source.name}`);

        try {
          // Add delay between sources to avoid rate limiting
          if (index > 0) {
            let delay = CONFIG.waitBetweenSources;

            // Add randomness to make scraping look more human
            if (CONFIG.randomDelay) {
              if (CONFIG.onetimeMode) {
                delay += Math.floor(Math.random() * 120000); // Add up to 2 minutes randomly in one-time mode
              } else {
                delay += Math.floor(Math.random() * 30000); // Add up to 30 seconds randomly
              }
            }

            console.log(
              `  Waiting ${delay / 1000} seconds before next source...`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          }

          const data = await scrapeSource(browser, source);

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
        }
      }

      // Save the combined results for this category
      if (results.length > 0) {
        const outputPath = path.join(OUTPUT_DIR, `${category}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
        console.log(
          `✓ Saved ${results.length} ${category} results to ${outputPath}`,
        );
      } else {
        console.log(`✗ No ${category} results were found to save`);
      }
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

// Function to scrape a single source
async function scrapeSource(browser, source) {
  const cacheFile = path.join(
    CACHE_DIR,
    `${sanitizeFilename(source.name)}.html`,
  );
  const metadataFile = path.join(
    CACHE_DIR,
    `${sanitizeFilename(source.name)}.meta.json`,
  );
  let content;
  let metadata = { lastFetched: null, success: false };

  // Check if metadata exists
  if (fs.existsSync(metadataFile)) {
    try {
      metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
    } catch (e) {
      console.log(`  Error reading metadata: ${e.message}`);
    }
  }

  const cacheAge = metadata.lastFetched
    ? (Date.now() - metadata.lastFetched) / (1000 * 60 * 60 * 24)
    : null;
  const shouldUseCache =
    fs.existsSync(cacheFile) &&
    (process.env.USE_CACHE === "true" ||
      CONFIG.useCache ||
      CONFIG.onetimeMode) &&
    cacheAge !== null &&
    cacheAge < CONFIG.cacheExpiry; // Use cache if less than specified days old

  if (shouldUseCache) {
    console.log(
      `  Using cached data for ${source.name} (${cacheAge.toFixed(1)} days old)`,
    );
    content = fs.readFileSync(cacheFile, "utf8");
  } else {
    // Fetch fresh data
    console.log(`  Fetching fresh data for ${source.name}`);

    // Track retries
    let retryCount = 0;
    let success = false;

    while (retryCount <= CONFIG.maxRetries && !success) {
      if (retryCount > 0) {
        console.log(
          `  Retry attempt ${retryCount}/${CONFIG.maxRetries} for ${source.name}`,
        );
        // Delay between retries to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, CONFIG.retryDelay));
      }

      try {
        // Try with axios first if no browser or if we want to prioritize HTTP
        if (!browser || retryCount % 2 === 0) {
          console.log(`  Attempting HTTP request for ${source.name}`);
          const response = await axios.get(source.url, {
            headers: {
              "User-Agent": CONFIG.userAgent,
              Accept: "text/html,application/xhtml+xml,application/xml",
              "Accept-Language": "en-US,en;q=0.9",
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
              Referer: "https://www.google.com/",
            },
            timeout: CONFIG.pageTimeout / 2,
          });
          content = response.data;
          success = true;
        } else if (browser) {
          // If browser is available, try with puppeteer
          console.log(`  Using browser automation for ${source.name}`);

          const page = await browser.newPage();

          // Configure page settings
          await page.setUserAgent(CONFIG.userAgent);
          await page.setDefaultNavigationTimeout(CONFIG.pageTimeout);

          // Set extra headers
          await page.setExtraHTTPHeaders({
            "Accept-Language": "en-US,en;q=0.9",
            Referer:
              "https://www.google.com/search?q=" +
              encodeURIComponent(source.name.replace(/ - /g, " ")),
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            Connection: "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "sec-ch-ua":
              '"Google Chrome";v="118", "Chromium";v="118", "Not=A?Brand";v="99"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "Cache-Control": "max-age=0",
            "x-forwarded-for": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          });

          // Set viewport to desktop size
          await page.setViewport({
            width: 1920,
            height: 1080,
          });

          // Handle dialogs automatically
          page.on("dialog", async (dialog) => {
            console.log(`  Auto-dismissing dialog: ${dialog.message()}`);
            await dialog.dismiss().catch(() => {});
          });

          // Attempt to mask automation
          await page.evaluateOnNewDocument(() => {
            // Overwrite the 'navigator' property to hide automation
            const originalNavigator = window.navigator;
            delete window.navigator;
            window.navigator = {
              ...originalNavigator,
              webdriver: false,
            };

            // Remove automation-related properties
            delete window.navigator.webdriver;

            // Overwrite chrome property
            window.chrome = {
              runtime: {},
              loadTimes: function () {},
              csi: function () {},
              app: {},
            };

            // Overwrite permissions API
            window.Notification = {
              permission: "default",
            };

            // Add language data
            Object.defineProperty(navigator, "languages", {
              get: function () {
                return ["en-US", "en", "es"];
              },
            });
          });

          try {
            // First navigate to Google and then to the target URL to seem more natural
            console.log(`  Navigating first to Google...`);
            await page.goto("https://www.google.com", {
              waitUntil: "networkidle2",
              timeout: CONFIG.pageTimeout / 2,
            });

            // Wait a bit - longer in one-time mode
            await page.waitForTimeout(CONFIG.onetimeMode ? 10000 : 3000);

            // Type the search query
            await page.type('input[name="q"]', source.name + " yoga", {
              delay: 100,
            });

            // Submit the form
            await page.keyboard.press("Enter");

            // Wait for search results
            await page
              .waitForSelector("#search", { timeout: 10000 })
              .catch(() => {});

            // Wait some more to seem natural
            await page.waitForTimeout(5000);

            // Now navigate to the actual URL
            console.log(`  Navigating to ${source.url}`);
            await page.goto(source.url, {
              waitUntil: "networkidle2",
              timeout: CONFIG.pageTimeout,
            });

            // Wait for page to fully load with a longer timeout
            const randomWait = CONFIG.onetimeMode
              ? 20000 + Math.floor(Math.random() * 20000) // 20-40 seconds in one-time mode
              : 8000 + Math.floor(Math.random() * 5000); // 8-13 seconds normally
            console.log(
              `  Waiting ${randomWait / 1000} seconds for page to stabilize...`,
            );
            await page.waitForTimeout(randomWait);

            // Sometimes we need to wait for specific content to load
            if (source.waitForSelector) {
              console.log(`  Waiting for selector: ${source.waitForSelector}`);
              await page
                .waitForSelector(source.waitForSelector, { timeout: 20000 })
                .catch((e) =>
                  console.log(`  Selector wait timed out: ${e.message}`),
                );
            }

            // Check if page has a consent page or cookie banner
            const hasConsentPage = await page.evaluate(() => {
              return (
                document.querySelector(
                  "#consent-page, #onetrust-banner-sdk, #gdpr-banner, .cookie-banner, .consent-banner, #cookie-consent, .osano-cm-window, #CybotCookiebotDialog, .truste-banner, #cookie-law-info-bar, .cookieBar, #cookie-notice, .js-cookie-banner",
                ) !== null
              );
            });

            if (hasConsentPage) {
              console.log(
                "  Found consent page or cookie banner, attempting to accept...",
              );
            }

            // Handle cookie consent popups and overlays (expanded list of common patterns)
            const cookieSelectors = [
              ".cookie-banner button",
              "#cookie-consent button",
              ".cc-accept",
              ".cc-btn.cc-allow",
              ".cc-btn.cc-dismiss",
              '[data-action="accept-cookies"]',
              ".consent-banner .accept",
              ".accept-cookies",
              ".accept-cookie",
              ".gdpr-banner .accept",
              ".cookie-notice .accept",
              "#onetrust-accept-btn-handler",
              "#accept-cookies",
              ".js-accept-cookies",
              ".js-cookie-accept",
              '[aria-label="Accept cookies"]',
              '[aria-label="Accept all cookies"]',
              ".cookie-accept-button",
              ".cookie-banner__accept",
              ".accept-all-cookies",
              "#accept-all-cookies",
              ".accept_cookies",
              ".accept_all_cookies",
              "#CybotCookiebotDialogBodyButtonAccept",
              ".cookieconsent-button",
              ".osano-cm-accept-all",
              "#gdpr-banner-accept",
              "#cookie-consent-accept",
              ".cookie-consent__accept-button",
              'button[data-testid="cookie-accept"]',
              '[data-purpose="cookie-policy-accept-button"]',
              "#cookies-accept-button",
              ".cookie-consent-accept-button",
              ".cookie-banner-accept-button",
              'button:contains("Accept")',
              'button:contains("Accept All")',
              'button:contains("I Accept")',
              'button:contains("Allow All")',
              'button:contains("Allow Cookies")',
              ".agree-button",
              "button[data-tracking-opt-in-accept]",
              ".consent-accept",
              ".cookie-agree",
              ".agree-consent",
              "#truste-consent-button",
              ".cookie-wall__button",
              "#cookie-button-accept",
            ];

            for (const selector of cookieSelectors) {
              try {
                const buttonExists = (await page.$(selector)) !== null;
                if (buttonExists) {
                  console.log(`  Found cookie consent button: ${selector}`);
                  await page.click(selector).catch(() => {});
                  await page.waitForTimeout(1000);
                }
              } catch (e) {
                // Ignore errors
              }
            }

            // Make some random mouse movements to appear more human-like
            console.log("  Performing random mouse movements...");
            for (let i = 0; i < 5; i++) {
              const x = 100 + Math.floor(Math.random() * 500);
              const y = 100 + Math.floor(Math.random() * 500);
              await page.mouse.move(x, y);
              await page.waitForTimeout(500 + Math.floor(Math.random() * 1000));
            }

            // Auto-scroll to load lazy-loaded content with realistic speed
            console.log("  Auto-scrolling page to load all content...");
            await autoScroll(page, { slowScroll: true });

            // Click on a few random non-link elements to simulate user interest
            try {
              const randomElements = await page.evaluate(() => {
                const elements = Array.from(
                  document.querySelectorAll("p, h2, h3, li"),
                ).filter((el) => !el.closest("a"));
                const selected = [];
                if (elements.length > 5) {
                  for (let i = 0; i < 3; i++) {
                    const randIndex = Math.floor(
                      Math.random() * elements.length,
                    );
                    selected.push({
                      x: elements[randIndex].getBoundingClientRect().left + 10,
                      y: elements[randIndex].getBoundingClientRect().top + 10,
                    });
                  }
                }
                return selected;
              });

              for (const pos of randomElements) {
                await page.mouse.click(pos.x, pos.y);
                await page.waitForTimeout(1000);
              }
            } catch (e) {
              console.log("  Error during random clicks:", e.message);
            }

            // Get page content
            content = await page.content();
            success = true;
          } catch (pageError) {
            console.log(`  Browser navigation error: ${pageError.message}`);
          } finally {
            // Always close the page to avoid memory leaks
            await page.close().catch(() => {});
          }
        }
      } catch (error) {
        console.error(`  Attempt ${retryCount + 1} failed: ${error.message}`);
      }

      retryCount++;
    }

    // If we still don't have content after all retries
    if (!success) {
      throw new Error(
        `Failed to fetch content with axios and ${browser ? "browser automation" : "no browser is available"}`,
      );
    }
  }

  // Save the fetched content to cache
  if (content) {
    fs.writeFileSync(cacheFile, content);

    // Update metadata
    metadata = {
      lastFetched: Date.now(),
      success: true,
      url: source.url,
    };
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
  }

  // Try to find the content using the selector
  const $ = cheerio.load(content);
  const elements = $(source.selector);

  if (elements.length === 0) {
    console.log(`  ✗ Could not find selector "${source.selector}" in the page`);
    return null;
  }

  // Process the content using the source-specific processor
  try {
    // Create data object
    const data = {
      data: source.processor($, elements),
      metadata: {
        source: source.name,
        url: source.url,
        fetchDate: Date.now(),
        authority: source.authority || 5,
        license: "Content used for educational purposes with attribution",
      },
    };

    return data;
  } catch (error) {
    console.error(`  ✗ Error processing content: ${error.message}`);
    return null;
  }
}

// Validate content quality
function validateContent(data, source) {
  if (!data) return null;

  // Different validation for different content types
  const category = Object.keys(SOURCES).find((key) =>
    SOURCES[key].some((s) => s.name === source.name),
  );

  if (!category) return data;

  // Apply category-specific validation
  if (Array.isArray(data)) {
    return data.filter((item) => {
      // Check required fields
      if (QUALITY_THRESHOLDS.requiredFields[category]) {
        for (const field of QUALITY_THRESHOLDS.requiredFields[category]) {
          if (!item[field]) return false;
        }
      }

      // Check content length for text fields
      if (item.name && item.name.length < QUALITY_THRESHOLDS.minimumTitleLength)
        return false;
      if (
        item.description &&
        item.description.length < QUALITY_THRESHOLDS.minimumDescriptionLength
      )
        return false;

      return true;
    });
  }

  return data;
}

// Process functions for different sources
function processYogaJournalTypes($, element) {
  const yogaTypes = [];

  // Look for article sections that describe yoga types
  element
    .find(".article-section, section, .card-content")
    .each((index, section) => {
      // Try to find a heading for the yoga type
      const heading = $(section)
        .find("h1, h2, h3, h4, h5, .heading, .title")
        .first();
      let title = heading.text().trim();

      // If no title found or it's not a yoga type, skip
      if (
        !title ||
        title.length < 3 ||
        title.includes("References") ||
        title.includes("Comment") ||
        title.includes("Newsletter")
      ) {
        return;
      }

      // Extract description from paragraphs
      let description = "";
      $(section)
        .find("p")
        .each((i, para) => {
          const text = $(para).text().trim();
          if (
            text &&
            !text.includes("Subscribe") &&
            !text.includes("Sign up")
          ) {
            description += text + " ";
          }
        });

      // If we found a valid yoga type with description
      if (title && description && description.length > 30) {
        yogaTypes.push({
          name: title,
          description: description.trim(),
          benefits: extractBenefits(description),
          suitable_for: extractSuitableFor(description),
        });
      }
    });

  // If we didn't find anything with the above approach, try an alternative
  if (yogaTypes.length === 0) {
    console.log("  Trying alternative parsing approach for Yoga Journal");

    // Try to find content in any structured format
    element.find("div, section").each((index, div) => {
      const heading = $(div).find("h2, h3, h4, .heading").first();
      const title = heading.text().trim();

      if (!title || title.length < 3) {
        return;
      }

      let description = "";
      const paragraphs = $(div).find("p");

      if (paragraphs.length > 0) {
        paragraphs.each((i, p) => {
          const text = $(p).text().trim();
          if (text) {
            description += text + " ";
          }
        });

        if (title && description && description.length > 30) {
          yogaTypes.push({
            name: title,
            description: description.trim(),
            benefits: extractBenefits(description),
            suitable_for: extractSuitableFor(description),
          });
        }
      }
    });
  }

  return yogaTypes;
}

function processYogaAllianceStyles($, element) {
  // Extract yoga styles from Yoga Alliance
  const yogaStyles = [];

  // Try to find style sections or articles
  element
    .find(".yoga-style, article, section, .card")
    .each((index, styleSection) => {
      // Try different selectors for the title
      let title = "";
      const titleSelectors = [
        "h2",
        "h3",
        "h4",
        ".title",
        ".style-name",
        ".card-title",
      ];

      for (const selector of titleSelectors) {
        const titleElement = $(styleSection).find(selector).first();
        if (titleElement.length) {
          title = titleElement.text().trim();
          break;
        }
      }

      if (!title || title.length < 3) {
        return;
      }

      // Get description from paragraphs
      let description = "";
      $(styleSection)
        .find("p")
        .each((i, para) => {
          const text = $(para).text().trim();
          if (text) {
            description += text + " ";
          }
        });

      // If no paragraphs found, try div text
      if (!description) {
        $(styleSection)
          .find("div")
          .each((i, div) => {
            // Skip if it contains headings (likely a container)
            if ($(div).find("h1, h2, h3, h4, h5").length === 0) {
              const text = $(div).text().trim();
              if (text && text !== title && text.length > 20) {
                description += text + " ";
              }
            }
          });
      }

      if (title && description) {
        yogaStyles.push({
          name: title,
          description: description.trim(),
          benefits: extractBenefits(description),
          suitable_for: extractSuitableFor(description),
        });
      }
    });

  // If the above method didn't work, try the heading-based approach
  if (yogaStyles.length === 0) {
    console.log("  Trying alternative parsing approach for Yoga Alliance");

    element.find("h2, h3, h4").each((index, heading) => {
      const title = $(heading).text().trim();

      if (!title || title.length < 3) {
        return;
      }

      let description = "";
      let currentEl = $(heading).next();
      let paragraphCount = 0;

      while (
        currentEl.length &&
        !currentEl.is("h2, h3, h4") &&
        paragraphCount < 3
      ) {
        if (currentEl.is("p, div")) {
          const text = currentEl.text().trim();
          if (text && text.length > 15) {
            description += text + " ";
            paragraphCount++;
          }
        }
        currentEl = currentEl.next();
      }

      if (title && description) {
        yogaStyles.push({
          name: title,
          description: description.trim(),
          benefits: extractBenefits(description),
          suitable_for: extractSuitableFor(description),
        });
      }
    });
  }

  return yogaStyles;
}

function processYogaJournalPoses($, element) {
  // Extract yoga poses from Yoga Journal
  const poses = [];

  // Find pose articles or cards
  $(element).each((index, container) => {
    // Look for pose items inside the container
    $(container)
      .find(".pose-widget, .card, .archive-item-component, .post, article")
      .each((i, poseElement) => {
        const poseEl = $(poseElement);

        // Extract title
        let title = "";
        const titleSelectors = [
          "h2",
          "h3",
          "h4",
          ".pose-title",
          ".card-title",
          ".title",
          "a.heading",
        ];
        for (const selector of titleSelectors) {
          const titleEl = poseEl.find(selector).first();
          if (titleEl.length && titleEl.text().trim()) {
            title = titleEl.text().trim();
            break;
          }
        }

        // Skip if no title found
        if (!title || title.length < 3) {
          return;
        }

        // Get Sanskrit name if available
        let sanskritName = "";
        const sanskritSelectors = [
          ".sanskrit-name",
          ".pose-sanskrit",
          ".sanskrit",
        ];
        for (const selector of sanskritSelectors) {
          const sanskritEl = poseEl.find(selector).first();
          if (sanskritEl.length) {
            sanskritName = sanskritEl.text().trim();
            break;
          }
        }

        // Extract description
        let description = "";
        poseEl
          .find("p, .pose-description, .description, .excerpt")
          .each((j, p) => {
            const text = $(p).text().trim();
            if (
              text &&
              !text.includes("Subscribe") &&
              !text.includes("Sign up") &&
              !text.includes("Join") &&
              text.length > 10
            ) {
              description += text + " ";
            }
          });

        // If no description found yet, try extracting from other elements
        if (!description) {
          const contentEl = poseEl
            .find(".content, .card-content, .pose-content")
            .first();
          if (contentEl.length) {
            description = contentEl.text().trim();
          }
        }

        // Try to find image
        let imageUrl = "";
        const img = poseEl.find("img").first();
        if (img.length) {
          imageUrl = img.attr("src") || img.attr("data-src") || "";
        }

        // Try to find difficulty
        let difficulty = "";
        poseEl.find(".difficulty, .level").each((i, el) => {
          difficulty = $(el).text().trim();
        });

        if (title) {
          poses.push({
            name: title,
            sanskrit_name: sanskritName,
            description: description.trim(),
            image_url: imageUrl,
            difficulty: difficulty,
            benefits: extractBenefits(description),
            category: determinePoseCategory(title, description),
          });
        }
      });
  });

  return poses;
}

function processHarvardHealthBenefits($, element) {
  // Extract yoga benefits from Harvard Health
  const benefits = {
    physical: [],
    mental: [],
    general: [],
  };

  let foundHeadings = false;

  // First try to find headings that might indicate benefit categories
  element
    .find("h1, h2, h3, h4, h5, .heading, .title")
    .each((index, heading) => {
      const headingText = $(heading).text().trim();

      if (headingText.match(/physical|body|health benefits|physical health/i)) {
        foundHeadings = true;
        // Extract physical benefits from paragraphs following this heading
        let currentEl = $(heading).next();
        while (currentEl.length && !currentEl.is("h1, h2, h3, h4, h5")) {
          if (currentEl.is("p, li")) {
            const text = currentEl.text().trim();
            if (text && text.length > 15) {
              benefits.physical.push(text);
            }
          } else if (currentEl.is("ul, ol")) {
            currentEl.find("li").each((i, li) => {
              const text = $(li).text().trim();
              if (text && text.length > 15) {
                benefits.physical.push(text);
              }
            });
          }
          currentEl = currentEl.next();
        }
      } else if (
        headingText.match(
          /mental|mind|psychological|emotional|cognitive|stress|anxiety/i,
        )
      ) {
        foundHeadings = true;
        // Extract mental benefits
        let currentEl = $(heading).next();
        while (currentEl.length && !currentEl.is("h1, h2, h3, h4, h5")) {
          if (currentEl.is("p, li")) {
            const text = currentEl.text().trim();
            if (text && text.length > 15) {
              benefits.mental.push(text);
            }
          } else if (currentEl.is("ul, ol")) {
            currentEl.find("li").each((i, li) => {
              const text = $(li).text().trim();
              if (text && text.length > 15) {
                benefits.mental.push(text);
              }
            });
          }
          currentEl = currentEl.next();
        }
      } else if (headingText.match(/benefits|advantages|improve|health/i)) {
        foundHeadings = true;
        // Extract general benefits
        let currentEl = $(heading).next();
        while (currentEl.length && !currentEl.is("h1, h2, h3, h4, h5")) {
          if (currentEl.is("p, li")) {
            const text = currentEl.text().trim();
            if (text && text.length > 15) {
              // Categorize based on content
              if (
                text.match(
                  /mind|stress|anxiety|depress|mood|focus|relax|calm|mental|brain|cognit/i,
                )
              ) {
                benefits.mental.push(text);
              } else if (
                text.match(
                  /body|muscle|strength|flexib|heart|blood|pressure|pain|posture|balance|bone/i,
                )
              ) {
                benefits.physical.push(text);
              } else {
                benefits.general.push(text);
              }
            }
          } else if (currentEl.is("ul, ol")) {
            currentEl.find("li").each((i, li) => {
              const text = $(li).text().trim();
              if (text && text.length > 15) {
                // Categorize based on content
                if (
                  text.match(
                    /mind|stress|anxiety|depress|mood|focus|relax|calm|mental|brain|cognit/i,
                  )
                ) {
                  benefits.mental.push(text);
                } else if (
                  text.match(
                    /body|muscle|strength|flexib|heart|blood|pressure|pain|posture|balance|bone/i,
                  )
                ) {
                  benefits.physical.push(text);
                } else {
                  benefits.general.push(text);
                }
              }
            });
          }
          currentEl = currentEl.next();
        }
      }
    });

  // Look for list items, they often contain benefits
  element.find("li").each((index, li) => {
    const text = $(li).text().trim();

    if (
      text &&
      text.length > 15 &&
      !text.includes("Subscribe") &&
      !text.includes("Sign up")
    ) {
      // Categorize the benefit
      if (
        text.match(
          /mind|stress|anxiety|depress|mood|focus|relax|calm|mental|brain|cognit/i,
        )
      ) {
        benefits.mental.push(text);
      } else if (
        text.match(
          /body|muscle|strength|flexib|heart|blood|pressure|pain|posture|balance|bone/i,
        )
      ) {
        benefits.physical.push(text);
      } else {
        benefits.general.push(text);
      }
    }
  });

  // If we didn't find structured content with headings, or if we have too few benefits,
  // also look for paragraphs with potential benefits
  if (
    !foundHeadings ||
    benefits.physical.length +
      benefits.mental.length +
      benefits.general.length <
      4
  ) {
    console.log("  Trying to extract benefits from paragraphs and list items");

    // Look for lists which often contain benefits
    element.find("ul, ol").each((index, list) => {
      $(list)
        .find("li")
        .each((i, item) => {
          const text = $(item).text().trim();
          if (text && text.length > 15 && !text.includes("Subscribe")) {
            // Categorize the benefit
            if (
              text.match(
                /mind|stress|anxiety|depress|mood|focus|relax|calm|mental|brain|cognit|memory/i,
              )
            ) {
              benefits.mental.push(text);
            } else if (
              text.match(
                /body|muscle|strength|flexib|heart|blood|pressure|pain|posture|balance|bone|weight|physical|immune|health/i,
              )
            ) {
              benefits.physical.push(text);
            } else {
              benefits.general.push(text);
            }
          }
        });
    });

    // Extract from paragraphs as well
    element.find("p, .paragraph, .text, div > span").each((index, p) => {
      const text = $(p).text().trim();

      if (
        !text ||
        text.length < 20 ||
        text.includes("Subscribe") ||
        text.includes("Sign up")
      ) {
        return;
      }

      // Extract sentences that look like benefits
      const sentences = text.split(/\.\s+/);
      sentences.forEach((sentence) => {
        if (
          sentence.match(
            /benefit|improve|increase|enhance|reduce|lower|help|support|promote|boost|yoga can|yoga helps/i,
          )
        ) {
          // Only use sentences of reasonable length
          if (sentence.length > 20 && sentence.length < 300) {
            // Categorize the benefit
            if (
              sentence.match(
                /mind|stress|anxiety|depress|mood|focus|relax|calm|mental|brain|cognit|memory/i,
              )
            ) {
              benefits.mental.push(sentence.trim() + ".");
            } else if (
              sentence.match(
                /body|muscle|strength|flexib|heart|blood|pressure|pain|posture|balance|bone|weight|physical|immune|health/i,
              )
            ) {
              benefits.physical.push(sentence.trim() + ".");
            } else {
              benefits.general.push(sentence.trim() + ".");
            }
          }
        }
      });
    });
  }

  // Deduplicate benefits
  benefits.physical = [...new Set(benefits.physical)];
  benefits.mental = [...new Set(benefits.mental)];
  benefits.general = [...new Set(benefits.general)];

  return benefits;
}

function processYogaInternationalTips($, element) {
  // Extract yoga practice tips from Yoga International
  const tips = {
    beginners: [],
    practice: [],
    props: [],
  };

  // Look for paragraphs with tips
  element.find("p, li").each((index, el) => {
    const text = $(el).text().trim();

    if (!text) return;

    // Categorize the tip
    if (text.match(/beginner|start|new to yoga|first time|basic/i)) {
      tips.beginners.push(text);
    } else if (text.match(/prop|block|strap|blanket|bolster|chair|wall/i)) {
      tips.props.push(text);
    } else if (
      text.match(
        /practice|breathe|alignment|pose|asana|technique|form|body|position/i,
      )
    ) {
      tips.practice.push(text);
    }
  });

  return tips;
}

// Helper functions
function extractBenefits(text) {
  const benefitWords = [
    "improve",
    "increase",
    "enhance",
    "strengthen",
    "boost",
    "benefit",
    "help",
    "reduce",
    "relieve",
    "lower",
    "calm",
    "support",
    "promote",
    "develop",
    "facilitate",
    "build",
    "maintain",
    "encourage",
    "stimulate",
    "balance",
    "optimize",
  ];

  const benefits = [];
  const sentences = text.split(/\.\s+/);

  sentences.forEach((sentence) => {
    for (const word of benefitWords) {
      if (sentence.toLowerCase().includes(word)) {
        // Remove marketing language and clean the sentence
        let cleanSentence = sentence
          .trim()
          .replace(/in our opinion|we believe|we think|studies suggest/gi, "")
          .replace(/\byou\b/gi, "practitioners")
          .replace(/\bwe\b/gi, "yoga teachers")
          .trim();

        if (cleanSentence.length > 10) {
          benefits.push(
            cleanSentence + (cleanSentence.endsWith(".") ? "" : "."),
          );
          break;
        }
      }
    }
  });

  return benefits;
}

function extractSuitableFor(text) {
  const suitablePhrases = [
    "good for",
    "great for",
    "ideal for",
    "perfect for",
    "recommended for",
    "suitable for",
    "best for",
  ];

  const suitable = [];
  const sentences = text.split(/\.\s+/);

  sentences.forEach((sentence) => {
    for (const phrase of suitablePhrases) {
      if (sentence.toLowerCase().includes(phrase)) {
        suitable.push(sentence.trim() + ".");
        break;
      }
    }
  });

  return suitable;
}

function determinePoseCategory(title, description) {
  // Determine the category of a yoga pose based on its title and description

  // Standing poses
  if (
    title.match(
      /mountain|warrior|triangle|chair|tree|eagle|goddess|extended|standing/i,
    ) ||
    description.match(/standing pose|standing position|stand on|standing with/i)
  ) {
    return "standing";
  }

  // Seated poses
  if (
    title.match(
      /seated|sitting|lotus|sukhasana|butterfly|hero|cobbler|staff|dandasana/i,
    ) ||
    description.match(/seated pose|sitting pose|seat on|sit with/i)
  ) {
    return "seated";
  }

  // Backbends
  if (
    title.match(
      /backbend|cobra|up-dog|upward dog|upward-facing|camel|bridge|wheel|bow|locust/i,
    ) ||
    description.match(/backbend|bend backward|arch your back|bend back/i)
  ) {
    return "backbends";
  }

  // Inversions
  if (
    title.match(
      /inversion|headstand|handstand|shoulder stand|forearm stand|plow|dolphin|downward dog|downward-facing/i,
    ) ||
    description.match(/inversion|upside down|feet above|head below/i)
  ) {
    return "inversions";
  }

  // Default
  return "other";
}

function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9]/gi, "-").toLowerCase();
}

/**
 * Safely extract text from an element with fallbacks
 * @param {CheerioStatic} $ - Cheerio instance
 * @param {Cheerio} element - Element to extract text from
 * @param {string} selector - Optional selector within element
 */
function safeExtract($, element, selector = null) {
  try {
    const target = selector ? $(element).find(selector) : $(element);

    // If target found, extract text
    if (target.length) {
      // Try to get only direct text without child elements
      let text = "";

      // Method 1: Try to get contents that are text nodes
      target.contents().each((i, node) => {
        if (node.type === "text") {
          text += $(node).text().trim() + " ";
        }
      });

      // If we got nothing, fallback to all text
      if (!text.trim()) {
        text = target.text().trim();
      }

      return text || "";
    }
    return "";
  } catch (e) {
    return "";
  }
}

/**
 * Auto-scroll function to ensure all lazy-loaded content is loaded
 * @param {Page} page - Puppeteer page object
 * @param {Object} options - Scrolling options
 */
async function autoScroll(page, options = {}) {
  const slowScroll = options.slowScroll || false;

  await page.evaluate(async (slowScroll) => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      // Use smaller distance and longer interval for more natural scrolling
      const distance = slowScroll ? 50 : 100;
      const interval = slowScroll ? 300 : 150;

      // Add some randomness to scrolling
      const randomizeScroll = () => {
        // Sometimes pause scrolling to seem more natural
        if (Math.random() < 0.2) {
          return new Promise((res) =>
            setTimeout(res, 1000 + Math.random() * 2000),
          );
        }

        // Sometimes scroll a bit up to seem more human
        if (Math.random() < 0.1 && totalHeight > 500) {
          window.scrollBy(0, -Math.floor(Math.random() * 200));
          return new Promise((res) => setTimeout(res, 500));
        }

        // Normal scrolling with some randomness
        const actualDistance =
          distance + Math.floor((Math.random() * distance) / 2);
        window.scrollBy(0, actualDistance);
        totalHeight += actualDistance;
        return Promise.resolve();
      };

      const timer = setInterval(async () => {
        const scrollHeight = document.body.scrollHeight;

        // Perform the random scroll action
        await randomizeScroll();

        // Check if we've reached the bottom
        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);

          // Wait at the bottom for a moment
          setTimeout(resolve, 2000);
        }
      }, interval);
    });
  }, slowScroll);

  // Wait a moment for any lazy-loaded content
  await page.waitForTimeout(CONFIG.onetimeMode ? 15000 : 4000);

  // Scroll back up slowly to catch any missed content
  await page.evaluate(async (slowScroll) => {
    await new Promise((resolve) => {
      let position = window.scrollY;
      const distance = slowScroll ? 70 : 100;
      const interval = slowScroll ? 200 : 100;

      const timer = setInterval(() => {
        // Add some randomness to the scroll speed
        const actualDistance = distance + Math.floor(Math.random() * 30);

        if (position <= 0) {
          clearInterval(timer);
          resolve();
        }

        // Sometimes pause scrolling
        if (Math.random() < 0.1) {
          setTimeout(() => {
            position = Math.max(0, position - actualDistance);
            window.scrollTo(0, position);
          }, 800);
        } else {
          position = Math.max(0, position - actualDistance);
          window.scrollTo(0, position);
        }
      }, interval);
    });
  }, slowScroll);

  // Wait a moment for any final loading
  await page.waitForTimeout(CONFIG.onetimeMode ? 10000 : 3000);
}

// New processors for added sources
function processDoYogaWithMeStyles($, element) {
  const yogaStyles = [];

  // Process DoYogaWithMe's style listings
  element.find(".yoga-style, article").each((index, styleElement) => {
    const styleEl = $(styleElement);

    const title = styleEl.find("h2, h3, .title").first().text().trim();
    let description = "";

    styleEl.find("p, .description").each((i, p) => {
      const text = $(p).text().trim();
      if (text) description += text + " ";
    });

    if (title && description) {
      yogaStyles.push({
        name: title,
        description: description.trim(),
        benefits: extractBenefits(description),
        suitable_for: extractSuitableFor(description),
      });
    }
  });

  return yogaStyles;
}

function processYogaBasicsStyles($, element) {
  const yogaStyles = [];

  // Find style sections
  element
    .find(".entry-content > div, .yoga-style")
    .each((index, styleSection) => {
      const section = $(styleSection);
      const title = section.find("h2, h3, h4").first().text().trim();

      if (!title || title.length < 3) return;

      let description = "";
      section.find("p").each((i, p) => {
        description += $(p).text().trim() + " ";
      });

      if (title && description) {
        yogaStyles.push({
          name: title,
          description: description.trim(),
          benefits: extractBenefits(description),
          suitable_for: extractSuitableFor(description),
        });
      }
    });

  return yogaStyles;
}

function processPocketYogaPoses($, element) {
  const poses = [];

  // Process pose listings
  element.find("tr, .pose-item").each((index, poseElement) => {
    const poseEl = $(poseElement);

    const title = poseEl.find("a, .pose-name").first().text().trim();
    const url = poseEl.find("a").first().attr("href");

    // Skip header rows or empty elements
    if (!title || title.length < 3 || title.toLowerCase() === "name") return;

    // Extract description from linked page if available
    let description = poseEl.find(".pose-description, p").text().trim();

    // Extract difficulty
    let difficulty = poseEl.find(".difficulty, .level").text().trim();
    if (!difficulty) {
      // Try to infer difficulty from class or text
      if (poseEl.hasClass("beginner") || poseEl.text().includes("beginner")) {
        difficulty = "Beginner";
      } else if (
        poseEl.hasClass("intermediate") ||
        poseEl.text().includes("intermediate")
      ) {
        difficulty = "Intermediate";
      } else if (
        poseEl.hasClass("advanced") ||
        poseEl.text().includes("advanced")
      ) {
        difficulty = "Advanced";
      }
    }

    // Extract image
    let imageUrl = "";
    const img = poseEl.find("img").first();
    if (img.length) {
      imageUrl = img.attr("src") || img.attr("data-src") || "";
    }

    if (title) {
      poses.push({
        name: title,
        description:
          description ||
          `${title} is a yoga pose that offers numerous benefits for practitioners.`,
        url: url,
        image_url: imageUrl,
        difficulty: difficulty || "All Levels",
        benefits: extractBenefits(description),
        category: determinePoseCategory(title, description),
      });
    }
  });

  return poses;
}

function processDoYogaWithMePoses($, element) {
  const poses = [];

  // Process pose listings
  element.find(".views-row, .pose-item").each((index, poseElement) => {
    const poseEl = $(poseElement);

    const title = poseEl.find("h2, h3, .pose-title").first().text().trim();
    let description = "";

    poseEl.find("p, .field-content").each((i, p) => {
      const text = $(p).text().trim();
      if (text) description += text + " ";
    });

    // Extract image
    let imageUrl = "";
    const img = poseEl.find("img").first();
    if (img.length) {
      imageUrl = img.attr("src") || img.attr("data-src") || "";
    }

    // Determine difficulty level
    let difficulty = poseEl.find(".difficulty, .level").text().trim();

    if (title) {
      poses.push({
        name: title,
        description: description.trim(),
        image_url: imageUrl,
        difficulty: difficulty || "All Levels",
        benefits: extractBenefits(description),
        category: determinePoseCategory(title, description),
      });
    }
  });

  return poses;
}

function processJohnsHopkinsBenefits($, element) {
  const benefits = {
    physical: [],
    mental: [],
    general: [],
  };

  // Look for benefit headers and descriptions
  element.find("h2, h3").each((index, heading) => {
    const title = $(heading).text().trim();

    if (!title || title.length < 3) return;

    let description = "";
    let currentEl = $(heading).next();

    while (currentEl.length && !currentEl.is("h2, h3")) {
      if (currentEl.is("p, li")) {
        const text = currentEl.text().trim();
        if (text) description += text + " ";
      }
      currentEl = currentEl.next();
    }

    if (description) {
      const benefit = {
        title: title,
        description: description.trim(),
      };

      // Categorize based on content
      if (
        title.match(
          /mind|stress|anxiety|depress|mood|focus|relax|calm|mental/i,
        ) ||
        description.match(
          /mind|stress|anxiety|depress|mood|focus|relax|calm|mental/i,
        )
      ) {
        benefits.mental.push(benefit);
      } else if (
        title.match(
          /body|muscle|strength|flexib|heart|blood|pressure|pain|posture|balance|bone/i,
        ) ||
        description.match(
          /body|muscle|strength|flexib|heart|blood|pressure|pain|posture|balance|bone/i,
        )
      ) {
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
    general: [],
  };

  // Process each section with benefits
  element.find("h2, h3").each((index, heading) => {
    const title = $(heading).text().trim();

    // Skip non-benefit sections
    if (
      !title ||
      title.length < 3 ||
      title.match(/reference|source|conclusion|summary|about|author/i)
    ) {
      return;
    }

    let description = "";
    let currentEl = $(heading).next();

    while (currentEl.length && !currentEl.is("h2, h3")) {
      if (currentEl.is("p, li")) {
        const text = currentEl.text().trim();
        if (text) description += text + " ";
      }
      currentEl = currentEl.next();
    }

    if (description) {
      const benefit = {
        title: title,
        description: description.trim(),
      };

      // Categorize
      if (
        title.match(
          /mind|stress|anxiety|depress|mood|focus|relax|calm|mental|emotional|psychological/i,
        ) ||
        description.match(
          /mind|stress|anxiety|depress|mood|focus|relax|calm|mental|emotional|psychological/i,
        )
      ) {
        benefits.mental.push(benefit);
      } else if (
        title.match(
          /body|muscle|strength|flexib|heart|blood|pressure|pain|posture|balance|bone|weight|physical|fitness/i,
        ) ||
        description.match(
          /body|muscle|strength|flexib|heart|blood|pressure|pain|posture|balance|bone|weight|physical|fitness/i,
        )
      ) {
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
    props: [],
  };

  // Find tip sections
  element.find("h2, h3, h4").each((index, heading) => {
    const title = $(heading).text().trim();

    if (!title || title.length < 3) return;

    let content = "";
    let currentEl = $(heading).next();

    while (currentEl.length && !currentEl.is("h2, h3, h4")) {
      if (currentEl.is("p, li")) {
        const text = currentEl.text().trim();
        if (text) content += text + " ";
      }
      currentEl = currentEl.next();
    }

    if (content) {
      const tip = {
        title: title,
        content: content.trim(),
      };

      // Categorize tips
      if (
        title.match(/beginner|start|new to yoga|first time|basic/i) ||
        content.match(/beginner|start|new to yoga|first time|basic/i)
      ) {
        tips.beginners.push(tip);
      } else if (
        title.match(/prop|block|strap|blanket|bolster|chair|wall/i) ||
        content.match(/prop|block|strap|blanket|bolster|chair|wall/i)
      ) {
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
    props: [],
  };

  // Process blog posts or articles
  element.find("article, .post").each((index, article) => {
    const articleEl = $(article);
    const title = articleEl.find("h2, h3, .entry-title").first().text().trim();

    if (!title || title.length < 3) return;

    let content = "";
    articleEl.find("p, .entry-content p").each((i, p) => {
      content += $(p).text().trim() + " ";
    });

    if (content) {
      const tip = {
        title: title,
        content: content.trim(),
      };

      // Categorize
      if (
        title.match(/beginner|start|new to yoga|first time|basic/i) ||
        content.match(/beginner|start|new to yoga|first time|basic/i)
      ) {
        tips.beginners.push(tip);
      } else if (
        title.match(/prop|block|strap|blanket|bolster|chair|wall/i) ||
        content.match(/prop|block|strap|blanket|bolster|chair|wall/i)
      ) {
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
    props: [],
  };

  // Process content sections
  element.find("h2, h3, h4").each((index, heading) => {
    const title = $(heading).text().trim();

    if (!title || title.length < 3) return;

    let content = "";
    let currentEl = $(heading).next();

    while (currentEl.length && !currentEl.is("h2, h3, h4")) {
      if (currentEl.is("p, li")) {
        const text = currentEl.text().trim();
        if (text) content += text + " ";
      }
      currentEl = currentEl.next();
    }

    if (content) {
      const tip = {
        title: title,
        content: content.trim(),
      };

      // Categorize
      if (
        title.match(/beginner|start|new|first|basic/i) ||
        content.match(/beginner|start|new to yoga|first time|basic/i)
      ) {
        tips.beginners.push(tip);
      } else if (
        title.match(/prop|block|strap|blanket|bolster|chair|wall/i) ||
        content.match(/prop|block|strap|blanket|bolster|chair|wall/i)
      ) {
        tips.props.push(tip);
      } else {
        tips.practice.push(tip);
      }
    }
  });

  return tips;
}

// Process command line arguments
process.argv.forEach((arg) => {
  if (arg === "--use-puppeteer") {
    CONFIG.usePuppeteer = true;
    console.log("Puppeteer usage enabled via command line argument");
  } else if (arg === "--http-only") {
    CONFIG.usePuppeteer = false;
    console.log("HTTP-only mode enabled via command line argument");
  }
});

// Check environment variables
if (process.env.USE_PUPPETEER === "true") {
  CONFIG.usePuppeteer = true;
  console.log("Puppeteer usage enabled via environment variable");
} else if (process.env.USE_PUPPETEER === "false") {
  CONFIG.usePuppeteer = false;
  console.log("Puppeteer usage disabled via environment variable");
}

// Run the scraper
scrapeYogaInfo().catch((error) => {
  console.error("Error in scraper:", error);
  console.log("\nTroubleshooting tips:");
  console.log(
    "- Try running with HTTP only: npm run refresh-content -- --http-only",
  );
  console.log(
    "- For MacOS users: you may need to grant permissions to the browser",
  );
  console.log("- Check your firewall settings");
  console.log("- Ensure you have sufficient disk space");
  process.exit(1);
});
