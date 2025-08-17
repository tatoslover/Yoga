# Mat & Mind Content Workflow

This document outlines the workflow for maintaining trusted content on the Mat & Mind website.

## Overview

Mat & Mind is committed to providing accurate, trustworthy yoga information from reputable sources. All content in the guide sections is sourced from established yoga authorities, medical institutions, and professional yoga organizations rather than being AI-generated.

## Content Sources

We prioritize content from the following trusted sources:

1. **Professional Yoga Organizations**
   - Yoga Alliance
   - International Association of Yoga Therapists

2. **Health and Medical Institutions**
   - Harvard Health
   - Johns Hopkins Medicine
   - Mayo Clinic
   - Medical News Today

3. **Established Yoga Publications**
   - Yoga Journal
   - Yoga International
   - DoYogaWithMe
   - Yoga Basics

## Content Refresh Workflow

### Automated Content Scraping

We use an automated scraping system to ethically collect and process content from trusted sources:

1. **Run the content refresh script**:
   ```bash
   npm run refresh-content
   ```

   This script:
   - Scrapes content from configured trusted sources
   - Processes and validates the content
   - Updates the site with the latest information
   - Preserves attribution to original sources

2. **Using cached content** (for development/testing):
   ```bash
   npm run refresh-content:cache
   ```

   This uses previously downloaded content instead of making new requests.

### Manual Content Review

After automated scraping, follow these steps for quality control:

1. **Review generated content**:
   - Check the updated files in `src/_includes/guide/*.html`
   - Verify attribution is present and correct
   - Ensure content meets our quality standards

2. **Test the site**:
   ```bash
   npm run build
   npm start
   ```

3. **Commit changes** once satisfied:
   ```bash
   git add .
   git commit -m "Update content from trusted sources: YYYY-MM-DD"
   git push
   ```

## Content Quality Standards

All content must meet these standards:

1. **Accuracy**: Information must be factually correct and current
2. **Attribution**: Original sources must be clearly credited
3. **Clarity**: Content must be accessible and understandable
4. **Safety**: Content must promote safe yoga practices
5. **Inclusivity**: Content should be respectful of diverse practitioners

## Adding New Content Sources

To add a new content source:

1. **Evaluate the source** based on:
   - Expertise and authority
   - Content quality and accuracy
   - Ethical content licensing
   - Professional reputation

2. **Add the source configuration** to `scripts/scrape-yoga-info.js`:
   ```javascript
   {
     name: 'Source Name',
     url: 'https://source-url.com/content-path',
     selector: '.css-selector-for-content',
     processor: processSourceNameContent,
     authority: 8 // Score from 1-10 based on source credibility
   }
   ```

3. **Create a processor function** for the new source
4. **Test** with the cache option first: `npm run refresh-content:cache`
5. **Review** the scraped content for quality

## Troubleshooting

### Common Issues

1. **Scraping failures**:
   - Check if source websites have changed their structure
   - Update selectors in `scrape-yoga-info.js`
   - Try with explicit headless browser: `FORCE_PUPPETEER=true npm run refresh-content`

2. **Content quality issues**:
   - Adjust validation thresholds in `QUALITY_THRESHOLDS`
   - Update the processor functions to better clean data
   - Add more specific category detection

3. **Attribution problems**:
   - Verify source metadata is being correctly passed
   - Check the attribution component is included in templates

## Content Update Schedule

Maintain content freshness with this schedule:

- **Weekly**: Check all sources are accessible
- **Monthly**: Run full content refresh to incorporate new information
- **Quarterly**: Evaluate source quality and add new sources as needed
- **Annually**: Comprehensive review of all content and sources

## Responsible Scraping Practices

We follow these ethical guidelines:

1. Only scrape public content intended for sharing
2. Respect robots.txt and website terms of service
3. Provide clear attribution to original sources
4. Cache content to minimize requests to source sites
5. Use reasonable request timing to avoid overloading sources
6. Respond promptly to any requests from content owners

---

By following this workflow, Mat & Mind maintains high-quality, trustworthy content that serves our community while respecting the original content creators.