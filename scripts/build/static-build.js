/**
 * Static Build Script for Mat & Mind
 *
 * This script provides a fallback build process when the Eleventy build encounters issues.
 * It creates a minimal static site structure using the generated content files.
 *
 * Usage: node scripts/static-build.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SOURCE_DIR = path.join(__dirname, '../src');
const OUTPUT_DIR = path.join(__dirname, '../_site');
const INCLUDES_DIR = path.join(SOURCE_DIR, '_includes');
const ASSETS_DIRS = ['css', 'js', 'assets'];

// HTML templates
const BASE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mat & Mind - Trusted Yoga Information</title>
  <meta name="description" content="A distraction-free yoga practice website with trustworthy content">
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="stylesheet" href="/css/themes.css">
</head>
<body class="theme-forrest">
  <div class="site-container">
    <header class="site-header">
      <div class="container">
        <h1 class="site-title"><a href="/">Mat & Mind</a></h1>
        <nav class="main-nav">
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/guide/">Guide</a></li>
            <li><a href="/about/">About</a></li>
          </ul>
        </nav>
      </div>
    </header>
    <main class="site-content">
      {{content}}
    </main>
    <footer class="site-footer">
      <div class="container">
        <p class="copyright">&copy; 2024 Mat & Mind. All content sourced from trusted yoga authorities.</p>
        <div class="footer-links">
          <a href="https://github.com/yourusername/mat-and-mind" target="_blank" rel="noopener">GitHub</a>
        </div>
      </div>
    </footer>
  </div>
  <script src="/js/theme-switcher.js"></script>
  <script src="/js/main.js"></script>
</body>
</html>`;

const HOME_HTML = `<section class="hero">
  <div class="container">
    <h1>Practice with Purpose</h1>
    <p>Discover trusted yoga information from reputable sources</p>
  </div>
</section>

<section class="featured-content">
  <div class="container">
    <h2>Explore Our Guide</h2>
    <div class="feature-cards">
      <a href="/guide/#benefits" class="feature-card">
        <h3>Yoga Benefits</h3>
        <p>Discover how yoga improves physical and mental wellbeing</p>
      </a>
      <a href="/guide/#types" class="feature-card">
        <h3>Yoga Styles</h3>
        <p>Explore different yoga traditions and approaches</p>
      </a>
      <a href="/guide/#poses" class="feature-card">
        <h3>Common Poses</h3>
        <p>Learn fundamental yoga postures and proper alignment</p>
      </a>
      <a href="/guide/#tips" class="feature-card">
        <h3>Practice Tips</h3>
        <p>Get advice for developing a sustainable yoga practice</p>
      </a>
    </div>
  </div>
</section>`;

const GUIDE_HTML = `<section class="page-header">
  <h1>Yoga Guide</h1>
  <p>Trusted information from reputable yoga sources</p>
</section>

<section class="guide-container">
  <div class="container">
    <!-- Benefits Section -->
    <div id="benefits" class="guide-section">
      <div class="guide-section-header">
        <h2>Yoga Benefits</h2>
        <p>Discover the physical, mental and lifestyle benefits of a regular yoga practice</p>
      </div>

      <div class="guide-selector">
        <div class="guide-selector-buttons">
          <button class="guide-selector-btn" data-section="benefits" data-target="physical">
            <span>Physical</span>
          </button>
          <button class="guide-selector-btn" data-section="benefits" data-target="mental">
            <span>Mental</span>
          </button>
          <button class="guide-selector-btn" data-section="benefits" data-target="lifestyle">
            <span>Lifestyle</span>
          </button>
        </div>
      </div>

      <div class="guide-content-container" id="benefits-container">
        <div class="guide-content-box" id="benefits-physical-content">
          <h3>Physical Benefits</h3>
          <div class="benefits-grid">
            {{benefits-physical}}
          </div>
        </div>

        <div class="guide-content-box" id="benefits-mental-content">
          <h3>Mental Benefits</h3>
          <div class="benefits-grid">
            {{benefits-mental}}
          </div>
        </div>

        <div class="guide-content-box" id="benefits-lifestyle-content">
          <h3>Lifestyle Benefits</h3>
          <div class="benefits-grid">
            {{benefits-lifestyle}}
          </div>
        </div>

        <div class="content-attribution">
          {{benefits-attribution}}
        </div>
      </div>
    </div>

    <!-- Tips Section -->
    <div id="tips" class="guide-section">
      <div class="guide-section-header">
        <h2>Practice Tips</h2>
        <p>Guidance to enhance your yoga practice from trusted sources</p>
      </div>

      <div class="guide-selector">
        <div class="guide-selector-buttons">
          <button class="guide-selector-btn" data-section="tips" data-target="beginners">
            <span>For Beginners</span>
          </button>
          <button class="guide-selector-btn" data-section="tips" data-target="practice">
            <span>Practice Tips</span>
          </button>
          <button class="guide-selector-btn" data-section="tips" data-target="props">
            <span>Using Props</span>
          </button>
        </div>
      </div>

      <div class="guide-content-container" id="tips-container">
        <div class="guide-content-box" id="tips-beginners-content">
          <h3>Tips for Beginners</h3>
          <div class="tips-grid">
            {{tips-beginners}}
          </div>
        </div>

        <div class="guide-content-box" id="tips-practice-content">
          <h3>Practice Tips</h3>
          <div class="tips-grid">
            {{tips-practice}}
          </div>
        </div>

        <div class="guide-content-box" id="tips-props-content">
          <h3>Using Props</h3>
          <div class="tips-grid">
            {{tips-props}}
          </div>
        </div>

        <div class="content-attribution">
          {{tips-attribution}}
        </div>
      </div>
    </div>
  </div>
</section>

<script>
  document.addEventListener('DOMContentLoaded', function() {
    // Initialize all sections to hide content boxes except the first one
    const sections = ['benefits', 'types', 'poses', 'tips'];

    sections.forEach(section => {
      const container = document.getElementById(section + '-container');
      if (container) {
        const contentBoxes = container.querySelectorAll('.guide-content-box');
        if (contentBoxes.length > 0) {
          contentBoxes.forEach((box, index) => {
            if (index === 0) {
              box.classList.add('active');
            } else {
              box.classList.remove('active');
            }
          });
        }
      }
    });

    // Add click handlers for selector buttons
    const selectorButtons = document.querySelectorAll('.guide-selector-btn');
    selectorButtons.forEach(button => {
      button.addEventListener('click', function() {
        const section = this.getAttribute('data-section');
        const target = this.getAttribute('data-target');

        // Remove active class from all buttons in this section
        const sectionButtons = document.querySelectorAll('.guide-selector-btn[data-section="' + section + '"]');
        sectionButtons.forEach(btn => btn.classList.remove('active'));

        // Add active class to clicked button
        this.classList.add('active');

        // Hide all content boxes for this section
        const contentBoxes = document.querySelectorAll('#' + section + '-container .guide-content-box');
        contentBoxes.forEach(box => box.classList.remove('active'));

        // Show the target content box
        const targetBox = document.getElementById(section + '-' + target + '-content');
        if (targetBox) {
          targetBox.classList.add('active');
        }
      });
    });

    // Activate the first button in each section
    sections.forEach(section => {
      const firstButton = document.querySelector('.guide-selector-btn[data-section="' + section + '"]');
      if (firstButton) {
        firstButton.classList.add('active');
      }
    });
  });
</script>`;

const ABOUT_HTML = `<section class="page-header">
  <h1>About Mat & Mind</h1>
</section>

<section class="about-content">
  <div class="container narrow-container">
    <div class="about-section">
      <h2>Our Purpose</h2>
      <p>
        Mat & Mind was created to provide a distraction-free environment for yoga practice.
        In today's digital world, even something as mindful as yoga can become entangled with
        addictive algorithms, endless recommendations, and attention-grabbing features.
      </p>
      <p>
        This site offers a simple solution: a curated collection of high-quality yoga content
        from trusted, reputable sources. Practice with intention, not distraction.
      </p>
    </div>

    <div class="about-section">
      <h2>Trusted Content</h2>
      <p>
        Mat & Mind is committed to providing only accurate, reliable information from reputable yoga sources.
        All content in our guide sections is sourced from established yoga authorities, medical institutions,
        and professional yoga organizations.
      </p>
      <p>
        We believe in transparency and proper attribution. Every piece of information on our site
        includes references to its original source, allowing you to explore further if desired.
      </p>
    </div>

    <div class="about-section">
      <h2>Our Approach</h2>
      <p>
        Mat & Mind takes several approaches to create a more mindful experience:
      </p>
      <ul>
        <li><strong>Trusted Content</strong>: Information sourced only from reputable yoga authorities</li>
        <li><strong>Minimal Interface</strong>: Clean design without flashy distractions</li>
        <li><strong>No Recommendations</strong>: We don't use algorithms to suggest "what to read next"</li>
        <li><strong>Clear Attribution</strong>: All sources are properly credited</li>
        <li><strong>Regular Updates</strong>: Content is refreshed to ensure accuracy</li>
      </ul>
    </div>

    <div class="about-section">
      <h2>Technology</h2>
      <p>
        This site is built using <a href="https://www.11ty.dev/" target="_blank" rel="noopener">11ty (Eleventy)</a>,
        a simple static site generator. The content is ethically scraped and processed from trusted yoga sources
        with proper attribution. The site is hosted on <a href="https://www.netlify.com/" target="_blank" rel="noopener">Netlify</a>.
      </p>
      <p>
        The project is open source and contributions are welcome. If you'd like to suggest
        improvements, please visit our <a href="https://github.com/yourusername/mat-and-mind" target="_blank" rel="noopener">GitHub repository</a>.
      </p>
    </div>
  </div>
</section>`;

// Extract HTML from template files
function extractContentFromTemplate(templatePath, targetSection) {
  if (!fs.existsSync(templatePath)) {
    console.log(`Template not found: ${templatePath}`);
    return '';
  }

  try {
    const content = fs.readFileSync(templatePath, 'utf8');

    if (targetSection === 'physical' || targetSection === 'mental' || targetSection === 'lifestyle') {
      const regex = new RegExp('{% if target == "' + targetSection + '" %}([\\s\\S]*?){% endif %}', 'g');
      const match = regex.exec(content);
      return match ? match[1].trim() : '';
    }

    if (targetSection === 'beginners' || targetSection === 'practice' || targetSection === 'props') {
      const regex = new RegExp('{% if target == "' + targetSection + '" %}([\\s\\S]*?){% endif %}', 'g');
      const match = regex.exec(content);
      return match ? match[1].trim() : '';
    }

    return content;
  } catch (error) {
    console.error(`Error reading template ${templatePath}:`, error.message);
    return '';
  }
}

// Create a directory if it doesn't exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Write HTML file with content
function writeHtmlFile(filePath, content) {
  try {
    // Create the directory if it doesn't exist
    const dir = path.dirname(filePath);
    ensureDirectoryExists(dir);

    // Write the file
    fs.writeFileSync(filePath, content);
    console.log(`Created: ${filePath}`);
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
  }
}

// Copy directory recursively
function copyDirectoryRecursive(source, destination) {
  ensureDirectoryExists(destination);

  try {
    const items = fs.readdirSync(source);

    for (const item of items) {
      const sourcePath = path.join(source, item);
      const destPath = path.join(destination, item);

      const stat = fs.statSync(sourcePath);

      if (stat.isDirectory()) {
        copyDirectoryRecursive(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }

    console.log(`Copied directory: ${source} -> ${destination}`);
  } catch (error) {
    console.error(`Error copying directory ${source}:`, error.message);
  }
}

// Run the static build
async function runStaticBuild() {
  console.log('Starting static build...');

  // Clean output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    console.log(`Cleaned output directory: ${OUTPUT_DIR}`);
  }

  // Create output directory
  ensureDirectoryExists(OUTPUT_DIR);

  // Copy static assets
  for (const dir of ASSETS_DIRS) {
    const sourceDir = path.join(SOURCE_DIR, dir);
    const destDir = path.join(OUTPUT_DIR, dir);

    if (fs.existsSync(sourceDir)) {
      copyDirectoryRecursive(sourceDir, destDir);
    }
  }

  // Generate home page
  const homePage = BASE_HTML.replace('{{content}}', HOME_HTML);
  writeHtmlFile(path.join(OUTPUT_DIR, 'index.html'), homePage);

  // Generate about page
  const aboutPage = BASE_HTML.replace('{{content}}', ABOUT_HTML);
  ensureDirectoryExists(path.join(OUTPUT_DIR, 'about'));
  writeHtmlFile(path.join(OUTPUT_DIR, 'about/index.html'), aboutPage);

  // Generate guide page
  let guidePage = BASE_HTML.replace('{{content}}', GUIDE_HTML);

  // Insert benefits content
  for (const section of ['physical', 'mental', 'lifestyle']) {
    const content = extractContentFromTemplate(path.join(INCLUDES_DIR, 'guide/benefits.html'), section);
    guidePage = guidePage.replace('{{benefits-' + section + '}}', content || '<p>Content for ' + section + ' benefits is being updated.</p>');
  }

  // Insert tips content
  for (const section of ['beginners', 'practice', 'props']) {
    const content = extractContentFromTemplate(path.join(INCLUDES_DIR, 'guide/tips.html'), section);
    guidePage = guidePage.replace('{{tips-' + section + '}}', content || '<p>Content for ' + section + ' tips is being updated.</p>');
  }

  // Insert attribution
  const benefitsAttribution = fs.existsSync(path.join(INCLUDES_DIR, 'guide/benefits-attribution.html')) ?
    fs.readFileSync(path.join(INCLUDES_DIR, 'guide/benefits-attribution.html'), 'utf8') :
    '<p>Content attribution information is being updated.</p>';

  const tipsAttribution = fs.existsSync(path.join(INCLUDES_DIR, 'guide/tips-attribution.html')) ?
    fs.readFileSync(path.join(INCLUDES_DIR, 'guide/tips-attribution.html'), 'utf8') :
    '<p>Content attribution information is being updated.</p>';

  guidePage = guidePage.replace('{{benefits-attribution}}', benefitsAttribution);
  guidePage = guidePage.replace('{{tips-attribution}}', tipsAttribution);

  // Write guide page
  ensureDirectoryExists(path.join(OUTPUT_DIR, 'guide'));
  writeHtmlFile(path.join(OUTPUT_DIR, 'guide/index.html'), guidePage);

  // Generate 404 page
  const notFoundPage = BASE_HTML.replace('{{content}}', `
    <section class="error-page">
      <div class="container">
        <h1>Page Not Found</h1>
        <p>The page you were looking for doesn't exist.</p>
        <a href="/" class="btn">Return to Home</a>
      </div>
    </section>
  `);
  writeHtmlFile(path.join(OUTPUT_DIR, '404.html'), notFoundPage);

  console.log('Static build completed successfully!');
  console.log(`The site has been built in the ${OUTPUT_DIR} directory.`);
  console.log('\nTo preview the site, run a local server in the _site directory:');
  console.log('  npx http-server _site');
}

// Run the build
runStaticBuild().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});
