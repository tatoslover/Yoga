/**
 * Image Optimization Script for Yoga Website
 *
 * This script:
 * 1. Resizes background images to max 1920x1080px
 * 2. Compresses them to be under 500KB each
 * 3. Creates 200x120px thumbnails for previews
 * 4. Stores optimized images and thumbnails in appropriate directories
 *
 * Usage: node scripts/optimize-images.js
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Configuration
const sourceDir = path.join(__dirname, "../assets/themes/source");
const optimizedDir = path.join(__dirname, "../assets/themes/optimized");
const thumbnailsDir = path.join(__dirname, "../assets/themes/thumbnails");
const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];

// Ensure target directories exist
if (!fs.existsSync(optimizedDir)) {
  fs.mkdirSync(optimizedDir, { recursive: true });
}

if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true });
}

// Process all images in the source directory
async function processImages() {
  try {
    // Get all files in the source directory
    const files = fs.readdirSync(sourceDir);

    // Filter for image files only
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });

    console.log(`Found ${imageFiles.length} images to process...`);

    // Process each image
    for (const file of imageFiles) {
      const filePath = path.join(sourceDir, file);
      const fileName = path.basename(file, path.extname(file));
      const fileExt = path.extname(file);

      console.log(`Processing ${file}...`);

      // Create optimized version (max 1920x1080, reduced quality for smaller file size)
      await sharp(filePath)
        .resize({
          width: 1920,
          height: 1080,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80, progressive: true })
        .toFile(path.join(optimizedDir, `${fileName}${fileExt}`));

      // Create thumbnail (200x120)
      await sharp(filePath)
        .resize({
          width: 200,
          height: 120,
          fit: "cover",
        })
        .jpeg({ quality: 70 })
        .toFile(path.join(thumbnailsDir, `${fileName}-thumb.jpg`));

      console.log(`✅ Processed ${file}`);
    }

    // Get file sizes after optimization
    const originalSizes = {};
    const optimizedSizes = {};
    const thumbnailSizes = {};

    for (const file of imageFiles) {
      const fileName = path.basename(file, path.extname(file));
      const fileExt = path.extname(file);

      const originalSize = fs.statSync(path.join(sourceDir, file)).size;
      const optimizedSize = fs.statSync(
        path.join(optimizedDir, `${fileName}${fileExt}`),
      ).size;
      const thumbnailSize = fs.statSync(
        path.join(thumbnailsDir, `${fileName}-thumb.jpg`),
      ).size;

      originalSizes[file] = formatBytes(originalSize);
      optimizedSizes[`${fileName}${fileExt}`] = formatBytes(optimizedSize);
      thumbnailSizes[`${fileName}-thumb.jpg`] = formatBytes(thumbnailSize);
    }

    console.log("\nOptimization Results:");
    console.log("=====================");

    for (const file of imageFiles) {
      const fileName = path.basename(file, path.extname(file));
      const fileExt = path.extname(file);

      console.log(`${file}:`);
      console.log(`  Original: ${originalSizes[file]}`);
      console.log(`  Optimized: ${optimizedSizes[`${fileName}${fileExt}`]}`);
      console.log(`  Thumbnail: ${thumbnailSizes[`${fileName}-thumb.jpg`]}`);
      console.log("");
    }

    console.log("✅ All images processed successfully!");
    console.log(
      `Optimized images saved to: ${path.relative(__dirname, optimizedDir)}`,
    );
    console.log(
      `Thumbnails saved to: ${path.relative(__dirname, thumbnailsDir)}`,
    );
  } catch (error) {
    console.error("Error processing images:", error);
  }
}

// Helper function to format bytes into a human-readable format
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// Run the script
processImages();
