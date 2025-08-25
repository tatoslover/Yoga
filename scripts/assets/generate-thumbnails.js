/**
 * Thumbnail Generator for Yoga Website Themes
 *
 * This script creates thumbnails for theme images that don't have them yet.
 * It takes all images in the assets/themes directory (except thumbnails and
 * existing optimized images) and generates thumbnail versions in the thumbnails directory.
 *
 * Usage: node scripts/generate-thumbnails.js
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Configuration
const sourceDir = path.join(__dirname, "../assets/themes/source");
const thumbnailsDir = path.join(__dirname, "../assets/themes/thumbnails");
const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
const thumbnailWidth = 200;
const thumbnailHeight = 120;
const thumbnailQuality = 70;

// Ensure thumbnails directory exists
if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true });
  console.log(`Created thumbnails directory: ${thumbnailsDir}`);
}

async function generateThumbnails() {
  try {
    // Get all files in the source directory
    const files = fs.readdirSync(sourceDir);

    // Filter for image files only, excluding thumbnails and optimized images
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });

    console.log(`Found ${imageFiles.length} images to process...`);

    // Keep track of which themes have thumbnails
    const existingThumbnails = fs
      .readdirSync(thumbnailsDir)
      .map((file) => file);

    // Process each image
    for (const file of imageFiles) {
      const filePath = path.join(sourceDir, file);
      const fileName = path.basename(file, path.extname(file));
      const thumbnailName = `${fileName}-thumb.jpg`;
      const thumbnailPath = path.join(thumbnailsDir, thumbnailName);

      // Skip if thumbnail already exists
      if (existingThumbnails.includes(thumbnailName)) {
        console.log(`Thumbnail already exists for ${file}, skipping...`);
        continue;
      }

      console.log(`Generating thumbnail for ${file}...`);

      // Create thumbnail (200x120)
      await sharp(filePath)
        .resize({
          width: thumbnailWidth,
          height: thumbnailHeight,
          fit: "cover",
        })
        .jpeg({ quality: thumbnailQuality })
        .toFile(thumbnailPath);

      console.log(`✅ Generated thumbnail: ${thumbnailName}`);
    }

    console.log("\n✅ All thumbnails generated successfully!");
    console.log(
      `Thumbnails saved to: ${path.relative(__dirname, thumbnailsDir)}`,
    );
  } catch (error) {
    console.error("Error generating thumbnails:", error);
  }
}

// Run the script
generateThumbnails();
