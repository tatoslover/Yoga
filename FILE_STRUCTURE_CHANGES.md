# File Structure Optimization

This document explains the file structure changes implemented in the `file-structure-optimization` branch.

## Overview

The project has been reorganized to follow a more modern and maintainable file structure, with all source files now contained within a `src` directory. This creates a clearer separation between source code and build artifacts, making the codebase easier to navigate and maintain.

## Key Changes

1. **Source Directory Structure**:
   - Created a `src` directory to contain all source files
   - Organized content into logical subdirectories
   - Improved separation between source files and build artifacts

2. **Consistent URL Patterns**:
   - Added or updated permalinks in all content files
   - Ensured consistent URL patterns across the site
   - Fixed issues with files being output to incorrect locations

3. **Updated Configuration**:
   - Modified `.eleventy.js` to use the new directory structure
   - Improved asset copying to prevent source directories leaking into output
   - Ensured proper mapping of source to output paths

4. **Rebranding**:
   - Changed package name from "peaceful-yoga-videos" to "mat-and-mind"
   - Updated references to the old project name throughout the codebase

## Directory Structure Before and After

### Before:

```
peaceful-yoga/
├── _data/             # JSON data files
├── _includes/         # Templates and components
├── admin/             # NetlifyCMS admin interface
├── assets/            # Static assets
├── credits/           # Credits page
├── css/               # Stylesheets
├── guide/             # Guide pages
├── js/                # JavaScript files
├── videos/            # Video page templates
├── .eleventy.js       # Eleventy configuration
├── index.njk          # Main pages in root directory
├── about.njk
├── 404.njk
└── netlify.toml       # Netlify deployment config
```

### After:

```
mat-and-mind/
├── src/                   # Source files
│   ├── _data/             # JSON data files
│   ├── _includes/         # Templates and components
│   ├── admin/             # NetlifyCMS admin interface
│   ├── assets/            # Static assets
│   ├── content/           # Content pages
│   │   ├── about/         # About page content
│   │   ├── guide/         # Guide page content
│   │   ├── credits/       # Credits page content
│   │   └── videos/        # Video page content
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript files
│   └── pages/             # Main site pages
├── scripts/               # Build and utility scripts
├── _site/                 # Build output directory
├── .eleventy.js           # Eleventy configuration
└── netlify.toml           # Netlify deployment config
```

## Benefits of the New Structure

1. **Clearer Separation of Concerns**: Source files vs. build files
2. **Better Content Organization**: Content grouped by type/section
3. **Easier Maintenance**: Files are easier to find and manage
4. **Improved Scalability**: Structure can accommodate future growth
5. **Updated Branding**: Consistent use of "Mat & Mind" throughout the codebase

## Cleanup Process

A cleanup script has been created to remove the original files after confirming the new structure works correctly:

```bash
# Dry run (shows what would be deleted without actually deleting)
npm run cleanup:dry

# Actual cleanup (permanently deletes original files)
npm run cleanup
```

**Important**: Only run the cleanup script after thoroughly testing that the site builds and functions correctly with the new structure.

## How to Merge These Changes

1. Review the changes in the `file-structure-optimization` branch
2. Test the build to ensure everything works correctly: `npm run build`
3. Merge the branch into main: `git checkout main && git merge file-structure-optimization`
4. After confirming everything works, run the cleanup script: `npm run cleanup`
5. Commit the cleanup changes: `git add -A && git commit -m "Remove original files after structure optimization"`

## Rollback Plan

If any issues arise after merging:

1. The original files are still present until you run the cleanup script
2. You can revert the merge if necessary: `git revert -m 1 <merge-commit-hash>`
3. If you've already run cleanup, you can restore from a previous commit

## Additional Notes

- The site functionality remains unchanged; only the file structure has been modified
- All paths in templates have been updated to reflect the new structure
- The build output directory (`_site`) remains the same