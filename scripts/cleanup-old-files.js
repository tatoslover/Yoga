/**
 * cleanup-old-files.js
 *
 * This script safely deletes the original project files that have been
 * moved to the src directory during the file structure optimization.
 *
 * IMPORTANT: Only run this script AFTER verifying that the site
 * builds and functions correctly with the new structure.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

// Directories to remove
const DIRECTORIES_TO_REMOVE = [
  '_data',
  '_includes',
  'admin',
  'assets',
  'credits',
  'css',
  'guide',
  'js',
  'videos'
];

// Files to remove (excluding essential project files)
const FILES_TO_REMOVE = [
  '404.njk',
  'about.njk',
  'index.njk'
];

// Function to check if the build is working with the new structure
function checkBuildIsWorking() {
  try {
    console.log('🔍 Checking if the build works with the new structure...');
    execSync('npm run build', { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('❌ Build failed! Aborting cleanup to prevent data loss.');
    console.error('   Fix build issues before running this script.');
    return false;
  }
}

// Function to safely remove a file
function removeFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`   Skipping ${filePath} - file not found`);
    return;
  }

  if (DRY_RUN) {
    console.log(`   Would remove file: ${filePath}`);
  } else {
    try {
      fs.unlinkSync(fullPath);
      console.log(`   ✅ Removed file: ${filePath}`);
    } catch (error) {
      console.error(`   ❌ Failed to remove file ${filePath}: ${error.message}`);
    }
  }
}

// Function to safely remove a directory
function removeDirectory(dirPath) {
  const fullPath = path.join(process.cwd(), dirPath);

  if (!fs.existsSync(fullPath)) {
    console.log(`   Skipping ${dirPath} - directory not found`);
    return;
  }

  if (DRY_RUN) {
    console.log(`   Would remove directory: ${dirPath}`);
  } else {
    try {
      // Using rm -rf for directories
      execSync(`rm -rf "${fullPath}"`);
      console.log(`   ✅ Removed directory: ${dirPath}`);
    } catch (error) {
      console.error(`   ❌ Failed to remove directory ${dirPath}: ${error.message}`);
    }
  }
}

// Main function
function cleanup() {
  console.log('================================================');
  console.log('🧹 Mat & Mind - File Structure Cleanup Script');
  console.log('================================================');

  if (DRY_RUN) {
    console.log('🔍 Running in DRY RUN mode - no files will be deleted');
  }

  // Verify build works unless forced
  if (!FORCE && !DRY_RUN) {
    if (!checkBuildIsWorking()) {
      process.exit(1);
    }
  }

  // Confirmation prompt unless forced or dry run
  if (!FORCE && !DRY_RUN) {
    console.log('\n⚠️  WARNING: This will permanently delete original project files');
    console.log('   The script will remove files that have been moved to the src directory.');
    console.log('   Make sure you have committed your changes to git before proceeding.');
    console.log('\n   Run with --dry-run to see what would be deleted without actually deleting.');
    console.log('   Run with --force to skip this prompt.\n');

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('❓ Are you sure you want to proceed? (yes/no): ', (answer) => {
      readline.close();
      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Cleanup aborted.');
        process.exit(0);
      } else {
        executeCleanup();
      }
    });
  } else {
    executeCleanup();
  }
}

// Execute the actual cleanup
function executeCleanup() {
  console.log('\n🗑️  Removing directories...');
  DIRECTORIES_TO_REMOVE.forEach(removeDirectory);

  console.log('\n🗑️  Removing files...');
  FILES_TO_REMOVE.forEach(removeFile);

  console.log('\n' + (DRY_RUN ? '🔍 Dry run completed.' : '✅ Cleanup completed successfully!'));
  console.log('================================================');

  if (DRY_RUN) {
    console.log('To actually delete the files, run without the --dry-run flag:');
    console.log('   node scripts/cleanup-old-files.js');
  }
}

// Start the cleanup
cleanup();
