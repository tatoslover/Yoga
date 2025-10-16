/**
 * Theme Management Script for Yoga Website
 *
 * This script provides a comprehensive set of tools for managing themes:
 * 1. Optimizing all images (source → optimized)
 * 2. Generating thumbnails for all images
 * 3. Verifying image attributions
 * 4. Adding a new theme from a source image
 *
 * Usage:
 * - npm run themes                 → Run interactive menu
 * - npm run themes -- optimize     → Optimize all images
 * - npm run themes -- thumbnails   → Generate thumbnails
 * - npm run themes -- add [path]   → Add a new theme from an image
 * - npm run themes -- verify       → Verify all themes have proper credits
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const DIRS = {
  source: path.join(__dirname, '../assets/themes/source'),
  optimized: path.join(__dirname, '../assets/themes/optimized'),
  thumbnails: path.join(__dirname, '../assets/themes/thumbnails')
};

const CONFIG = {
  imageExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 80,
  thumbWidth: 200,
  thumbHeight: 120,
  thumbQuality: 70
};

// Ensure directories exist
Object.values(DIRS).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Create readline interface for interactive mode
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Optimize all source images to the optimized directory
 */
async function optimizeImages() {
  try {
    // Get all image files from source directory
    const files = fs.readdirSync(DIRS.source)
      .filter(file => CONFIG.imageExtensions.includes(path.extname(file).toLowerCase()));

    console.log(`Found ${files.length} images to process...`);

    if (files.length === 0) {
      console.log('No images found in source directory.');
      return;
    }

    // Track original and optimized sizes
    const sizes = { original: {}, optimized: {} };

    // Process each image
    for (const file of files) {
      const filePath = path.join(DIRS.source, file);
      const fileName = path.basename(file, path.extname(file));
      const fileExt = path.extname(file);
      const outputPath = path.join(DIRS.optimized, `${fileName}${fileExt}`);

      console.log(`Optimizing ${file}...`);

      // Record original size
      sizes.original[file] = fs.statSync(filePath).size;

      // Optimize image
      await sharp(filePath)
        .resize({
          width: CONFIG.maxWidth,
          height: CONFIG.maxHeight,
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: CONFIG.quality, progressive: true })
        .toFile(outputPath);

      // Record optimized size
      sizes.optimized[file] = fs.statSync(outputPath).size;

      console.log(`✅ Optimized ${file}`);
    }

    // Display results
    console.log('\nOptimization Results:');
    console.log('=====================');

    for (const file of files) {
      const originalSize = formatBytes(sizes.original[file]);
      const optimizedSize = formatBytes(sizes.optimized[file]);
      const reductionPercent = (1 - (sizes.optimized[file] / sizes.original[file])) * 100;

      console.log(`${file}:`);
      console.log(`  Original: ${originalSize}`);
      console.log(`  Optimized: ${optimizedSize}`);
      console.log(`  Reduction: ${reductionPercent.toFixed(1)}%`);
      console.log('');
    }

    console.log('✅ All images optimized successfully!');

  } catch (error) {
    console.error('Error optimizing images:', error);
  }
}

/**
 * Generate thumbnails for all optimized images
 */
async function generateThumbnails() {
  try {
    // Use optimized images as the source for thumbnails
    const files = fs.readdirSync(DIRS.optimized)
      .filter(file => CONFIG.imageExtensions.includes(path.extname(file).toLowerCase()));

    console.log(`Found ${files.length} optimized images for thumbnail generation...`);

    if (files.length === 0) {
      console.log('No optimized images found. Run optimization first.');
      return;
    }

    // Track existing thumbnails
    const existingThumbs = fs.readdirSync(DIRS.thumbnails);

    // Process each image
    for (const file of files) {
      const filePath = path.join(DIRS.optimized, file);
      const fileName = path.basename(file, path.extname(file));
      const thumbName = `${fileName}-thumb.jpg`;
      const thumbPath = path.join(DIRS.thumbnails, thumbName);

      // Skip if thumbnail already exists and is newer than source
      if (existingThumbs.includes(thumbName)) {
        const thumbStat = fs.statSync(thumbPath);
        const fileStat = fs.statSync(filePath);

        if (thumbStat.mtime > fileStat.mtime) {
          console.log(`Thumbnail for ${file} is up to date, skipping...`);
          continue;
        }
      }

      console.log(`Generating thumbnail for ${file}...`);

      // Create thumbnail
      await sharp(filePath)
        .resize({
          width: CONFIG.thumbWidth,
          height: CONFIG.thumbHeight,
          fit: 'cover'
        })
        .jpeg({ quality: CONFIG.thumbQuality })
        .toFile(thumbPath);

      console.log(`✅ Generated thumbnail: ${thumbName}`);
    }

    console.log('\n✅ All thumbnails generated successfully!');

  } catch (error) {
    console.error('Error generating thumbnails:', error);
  }
}

/**
 * Add a new theme from a source image
 * @param {string} imagePath - Path to the source image
 */
async function addNewTheme(imagePath) {
  try {
    if (!imagePath) {
      console.error('Error: Please provide a path to the source image.');
      return;
    }

    if (!fs.existsSync(imagePath)) {
      console.error(`Error: Image not found at ${imagePath}`);
      return;
    }

    // Get filename details
    const filename = path.basename(imagePath);
    const themeName = path.basename(imagePath, path.extname(imagePath))
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Copy to source directory
    const destPath = path.join(DIRS.source, filename);
    fs.copyFileSync(imagePath, destPath);
    console.log(`✅ Copied image to source directory: ${destPath}`);

    // Optimize image
    const optimizedPath = path.join(DIRS.optimized, filename);
    await sharp(destPath)
      .resize({
        width: CONFIG.maxWidth,
        height: CONFIG.maxHeight,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: CONFIG.quality, progressive: true })
      .toFile(optimizedPath);
    console.log(`✅ Created optimized version: ${optimizedPath}`);

    // Generate thumbnail
    const thumbName = `${themeName}-thumb.jpg`;
    const thumbPath = path.join(DIRS.thumbnails, thumbName);
    await sharp(optimizedPath)
      .resize({
        width: CONFIG.thumbWidth,
        height: CONFIG.thumbHeight,
        fit: 'cover'
      })
      .jpeg({ quality: CONFIG.thumbQuality })
      .toFile(thumbPath);
    console.log(`✅ Created thumbnail: ${thumbPath}`);

    // Suggest CSS variables
    console.log('\nSuggested CSS Variables:');
    console.log('======================');
    console.log(`/* ${capitalizeWords(themeName.replace(/-/g, ' '))} Theme */`);
    console.log(`--${themeName}-bg: #0a0c12;`);
    console.log(`--${themeName}-bg-alt: #10141c;`);
    console.log(`--${themeName}-border: #1f2638;`);
    console.log(`--${themeName}-primary: #131824;`);
    console.log(`--${themeName}-accent: #2a3349;`);
    console.log(`--${themeName}-secondary: #8494b7;`);
    console.log(`--${themeName}-primary-ui: #2a3349;`);
    console.log(`--${themeName}-primary-light: #3d4a6a;`);
    console.log(`--${themeName}-primary-dark: #1c2335;`);
    console.log(`--${themeName}-secondary-ui: #8494b7;`);
    console.log(`--${themeName}-secondary-light: #a3b0cc;`);
    console.log(`--${themeName}-secondary-dark: #6a7a9d;`);
    console.log(`--${themeName}-image: url("/assets/themes/optimized/${filename}");`);
    console.log(`--${themeName}-opacity: 0.2;`);
    console.log(`--${themeName}-animation: 35s;`);

    console.log('\nNext Steps:');
    console.log('1. Add the CSS variables to themes.css');
    console.log('2. Add a new theme data-attribute section in themes.css');
    console.log('3. Add the theme to the THEMES array in theme-switcher.js');
    console.log('4. Add image attribution to the footer and image-sources.md');

  } catch (error) {
    console.error('Error adding new theme:', error);
  }
}

/**
 * Verify all themes have proper attribution in image-sources.md
 */
function verifyAttributions() {
  try {
    const sourcesMdPath = path.join(__dirname, '../assets/themes/image-sources.md');

    // Check if image-sources.md exists
    if (!fs.existsSync(sourcesMdPath)) {
      console.error('Error: image-sources.md not found!');
      return;
    }

    // Read image-sources.md content
    const sourcesContent = fs.readFileSync(sourcesMdPath, 'utf8');

    // Get all theme images
    const optimizedImages = fs.readdirSync(DIRS.optimized)
      .filter(file => CONFIG.imageExtensions.includes(path.extname(file).toLowerCase()));

    console.log(`Checking attributions for ${optimizedImages.length} themes...`);

    // Check if each theme is mentioned in image-sources.md
    const missing = [];
    for (const image of optimizedImages) {
      const themeName = path.basename(image, path.extname(image));
      const capitalizedName = capitalizeWords(themeName.replace(/-/g, ' '));

      if (!sourcesContent.includes(`### ${capitalizedName}`)) {
        missing.push(themeName);
      }
    }

    if (missing.length === 0) {
      console.log('✅ All themes have proper attribution in image-sources.md');
    } else {
      console.log('❌ The following themes are missing attribution:');
      missing.forEach(theme => console.log(`- ${theme}`));
      console.log('\nPlease add attribution for these themes to image-sources.md');
    }

    // Check theme-switcher.js
    const themeJsPath = path.join(__dirname, '../js/theme-switcher.js');
    if (fs.existsSync(themeJsPath)) {
      const themeJsContent = fs.readFileSync(themeJsPath, 'utf8');
      const themesMatch = themeJsContent.match(/const THEMES = \[([\s\S]*?)\];/);

      if (themesMatch && themesMatch[1]) {
        const jsThemes = themesMatch[1].match(/id: "([^"]+)"/g).map(m => m.split('"')[1]);

        const missingFromJs = [];
        for (const image of optimizedImages) {
          const themeName = path.basename(image, path.extname(image));
          if (!jsThemes.includes(themeName)) {
            missingFromJs.push(themeName);
          }
        }

        if (missingFromJs.length === 0) {
          console.log('✅ All themes are defined in theme-switcher.js');
        } else {
          console.log('❌ The following themes are missing from theme-switcher.js:');
          missingFromJs.forEach(theme => console.log(`- ${theme}`));
        }
      }
    }

  } catch (error) {
    console.error('Error verifying attributions:', error);
  }
}

/**
 * Display interactive menu for theme management
 */
function showMenu() {
  console.log('\n=== Yoga Theme Management ===');
  console.log('1. Optimize all images');
  console.log('2. Generate thumbnails');
  console.log('3. Add a new theme');
  console.log('4. Verify theme attributions');
  console.log('5. Exit');

  rl.question('\nEnter your choice (1-5): ', async (answer) => {
    switch (answer.trim()) {
      case '1':
        await optimizeImages();
        showMenu();
        break;
      case '2':
        await generateThumbnails();
        showMenu();
        break;
      case '3':
        rl.question('Enter path to image file: ', async (imagePath) => {
          await addNewTheme(imagePath.trim());
          showMenu();
        });
        break;
      case '4':
        verifyAttributions();
        showMenu();
        break;
      case '5':
        console.log('Goodbye!');
        rl.close();
        break;
      default:
        console.log('Invalid choice. Please try again.');
        showMenu();
    }
  });
}

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper function to capitalize each word in a string
function capitalizeWords(str) {
  return str.split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Interactive mode
    showMenu();
  } else {
    // Command line mode
    const command = args[0];

    switch (command) {
      case 'optimize':
        await optimizeImages();
        process.exit(0);
        break;
      case 'thumbnails':
        await generateThumbnails();
        process.exit(0);
        break;
      case 'add':
        if (args[1]) {
          await addNewTheme(args[1]);
        } else {
          console.error('Error: Please provide a path to the source image.');
        }
        process.exit(0);
        break;
      case 'verify':
        verifyAttributions();
        process.exit(0);
        break;
      default:
        console.log('Unknown command. Available commands: optimize, thumbnails, add, verify');
        process.exit(1);
    }
  }
}

// Run the script
main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
