#!/usr/bin/env node

/**
 * Mat & Mind Scripts Index
 *
 * This script provides a user-friendly command-line interface to access
 * all the scripts in the project. It organizes scripts by category and
 * provides documentation for each one.
 *
 * Usage:
 *   npm run scripts
 *   node scripts/index.js
 */

const { execSync } = require("child_process");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

// ANSI color codes for pretty console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",

  fg: {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    crimson: "\x1b[38m",
  },

  bg: {
    black: "\x1b[40m",
    red: "\x1b[41m",
    green: "\x1b[42m",
    yellow: "\x1b[43m",
    blue: "\x1b[44m",
    magenta: "\x1b[45m",
    cyan: "\x1b[46m",
    white: "\x1b[47m",
    crimson: "\x1b[48m",
  },
};

// Scripts organized by category
const scripts = {
  Scraping: [
    {
      name: "Full Scraper",
      command: "node scripts/scraping/scrape-yoga-info.js",
      description: "Scrape all yoga content from trusted sources",
      options: [
        {
          flag: "--http-only",
          description: "Use HTTP-only mode (no browser automation)",
        },
        {
          flag: "--onetime",
          description: "Use extra-long delays for one-time scraping",
        },
      ],
    },
    {
      name: "Section Scraper",
      command: "./scripts/scraping/scrape-section.sh",
      description: "Scrape content for a specific yoga section",
      args: "<section>",
      options: [
        {
          flag: "--http-only",
          description: "Use HTTP-only mode (no browser automation)",
        },
        {
          flag: "--use-cache",
          description: "Use cached content (don't re-download)",
        },
        {
          flag: "--onetime",
          description: "Use extra-long delays for one-time scraping",
        },
        { flag: "--verbose", description: "Show more detailed logs" },
        {
          flag: "--source=NAME",
          description: "Scrape only the specified source",
        },
      ],
    },
    {
      name: "All Sections Scraper",
      command: "./scripts/scraping/scrape-all-sections.sh",
      description: "Run all section scrapers in sequence",
      options: [
        {
          flag: "--http-only",
          description: "Use HTTP-only mode (no browser automation)",
        },
        {
          flag: "--use-cache",
          description: "Use cached content (don't re-download)",
        },
        {
          flag: "--onetime",
          description: "Use extra-long delays for one-time scraping",
        },
        { flag: "--verbose", description: "Show more detailed logs" },
        { flag: "--quick", description: "Use shorter delays between sections" },
      ],
    },
  ],

  "Content Processing": [
    {
      name: "Update Guide Content",
      command: "node scripts/content/update-guide-content.js",
      description: "Process scraped data into guide HTML templates",
    },
    {
      name: "Generate Static Content",
      command: "node scripts/content/generate-static-content.js",
      description: "Generate static HTML from mock data",
    },
  ],

  "Build & Deployment": [
    {
      name: "Trusted Content Workflow",
      command: "./scripts/build/trusted-content-workflow.sh",
      description:
        "Complete workflow for scraping, processing, and building the site",
      options: [
        {
          flag: "--use-cache",
          description: "Use cached content (don't re-download)",
        },
        {
          flag: "--http-only",
          description: "Use HTTP-only mode (no browser automation)",
        },
        {
          flag: "--skip-scrape",
          description: "Skip scraping step (use existing data)",
        },
        {
          flag: "--use-mock",
          description: "Use mock data instead of scraped data",
        },
        {
          flag: "--static-build",
          description: "Use static build instead of Eleventy",
        },
        {
          flag: "--onetime",
          description: "Use extra-long delays for one-time scraping",
        },
      ],
    },
    {
      name: "Refresh Content",
      command: "./scripts/build/refresh-content.sh",
      description: "Refresh content and rebuild the site",
    },
    {
      name: "Static Build",
      command: "node scripts/build/static-build.js",
      description: "Generate a static site without Eleventy",
    },
  ],

  "Asset Management": [
    {
      name: "Optimize Images",
      command: "node scripts/assets/optimize-images.js",
      description: "Optimize and resize theme images",
    },
    {
      name: "Generate Thumbnails",
      command: "node scripts/assets/generate-thumbnails.js",
      description: "Generate thumbnails for theme images",
    },
    {
      name: "Manage Themes",
      command: "node scripts/assets/manage-themes.js",
      description: "Comprehensive tool for managing themes",
      options: [
        { flag: "optimize", description: "Optimize all images" },
        { flag: "thumbnails", description: "Generate thumbnails" },
        { flag: "add [path]", description: "Add a new theme from an image" },
        {
          flag: "verify",
          description: "Verify all themes have proper credits",
        },
      ],
    },
  ],

  Maintenance: [
    {
      name: "Cleanup Old Files",
      command: "node scripts/maintenance/cleanup-old-files.js",
      description: "Clean up old project files",
      options: [
        {
          flag: "--dry",
          description: "Show what would be deleted without deleting",
        },
        { flag: "--force", description: "Run without confirmation prompt" },
      ],
    },
  ],
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Clear the console
function clearConsole() {
  process.stdout.write("\x1Bc");
}

// Display the main menu
function displayMainMenu() {
  clearConsole();

  console.log(
    `${colors.bright}${colors.fg.cyan}════════════════════════════════════════════════════════════${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.fg.cyan}           MAT & MIND - SCRIPT RUNNER UTILITY              ${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.fg.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`,
  );

  console.log(`${colors.fg.white}Select a category:${colors.reset}\n`);

  let categoryIndex = 1;
  for (const category in scripts) {
    console.log(
      `  ${colors.fg.green}${categoryIndex}.${colors.reset} ${colors.bright}${category}${colors.reset} (${scripts[category].length} scripts)`,
    );
    categoryIndex++;
  }

  console.log(`\n  ${colors.fg.red}0.${colors.reset} Exit\n`);

  rl.question(
    `${colors.fg.yellow}Enter your choice: ${colors.reset}`,
    (answer) => {
      const choice = parseInt(answer);

      if (choice === 0) {
        console.log(`\n${colors.fg.cyan}Goodbye!${colors.reset}\n`);
        rl.close();
        return;
      }

      const categories = Object.keys(scripts);
      if (choice > 0 && choice <= categories.length) {
        const selectedCategory = categories[choice - 1];
        displayCategoryMenu(selectedCategory);
      } else {
        console.log(
          `\n${colors.fg.red}Invalid choice. Please try again.${colors.reset}`,
        );
        setTimeout(() => {
          displayMainMenu();
        }, 1500);
      }
    },
  );
}

// Display menu for a specific category
function displayCategoryMenu(category) {
  clearConsole();

  console.log(
    `${colors.bright}${colors.fg.cyan}════════════════════════════════════════════════════════════${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.fg.cyan}              ${category.toUpperCase()} SCRIPTS              ${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.fg.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`,
  );

  console.log(`${colors.fg.white}Select a script to run:${colors.reset}\n`);

  scripts[category].forEach((script, index) => {
    console.log(
      `  ${colors.fg.green}${index + 1}.${colors.reset} ${colors.bright}${script.name}${colors.reset}`,
    );
    console.log(`     ${colors.dim}${script.description}${colors.reset}`);

    if (script.args) {
      console.log(
        `     ${colors.fg.yellow}Args: ${script.args}${colors.reset}`,
      );
    }

    if (script.options && script.options.length > 0) {
      console.log(
        `     ${colors.fg.magenta}Options: ${script.options.map((o) => o.flag).join(", ")}${colors.reset}`,
      );
    }

    console.log();
  });

  console.log(`  ${colors.fg.red}0.${colors.reset} Back to main menu\n`);

  rl.question(
    `${colors.fg.yellow}Enter your choice: ${colors.reset}`,
    (answer) => {
      const choice = parseInt(answer);

      if (choice === 0) {
        displayMainMenu();
        return;
      }

      if (choice > 0 && choice <= scripts[category].length) {
        const selectedScript = scripts[category][choice - 1];
        promptScriptOptions(selectedScript);
      } else {
        console.log(
          `\n${colors.fg.red}Invalid choice. Please try again.${colors.reset}`,
        );
        setTimeout(() => {
          displayCategoryMenu(category);
        }, 1500);
      }
    },
  );
}

// Prompt for script options
function promptScriptOptions(script) {
  clearConsole();

  console.log(
    `${colors.bright}${colors.fg.cyan}════════════════════════════════════════════════════════════${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.fg.cyan}              RUNNING: ${script.name.toUpperCase()}              ${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.fg.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`,
  );

  console.log(`${colors.fg.white}${script.description}${colors.reset}\n`);
  console.log(`${colors.bright}Command:${colors.reset} ${script.command}\n`);

  if (script.args) {
    console.log(
      `${colors.fg.yellow}Required Arguments:${colors.reset} ${script.args}`,
    );
  }

  if (script.options && script.options.length > 0) {
    console.log(`\n${colors.fg.magenta}Available Options:${colors.reset}`);
    script.options.forEach((option, index) => {
      console.log(
        `  ${index + 1}. ${colors.bright}${option.flag}${colors.reset} - ${option.description}`,
      );
    });
  }

  let promptMessage = `\n${colors.fg.green}Enter arguments and options: ${colors.reset}`;

  rl.question(promptMessage, (args) => {
    runScript(script, args);
  });
}

// Run the selected script
function runScript(script, args) {
  const command = `${script.command} ${args}`.trim();

  console.log(
    `\n${colors.bright}${colors.fg.cyan}Executing: ${colors.reset}${command}\n`,
  );

  try {
    // Run the command
    execSync(command, { stdio: "inherit" });

    console.log(
      `\n${colors.fg.green}Command completed successfully.${colors.reset}\n`,
    );
  } catch (error) {
    console.error(
      `\n${colors.fg.red}Command failed with error:${colors.reset}`,
      error.message,
    );
  }

  rl.question(
    `\n${colors.fg.yellow}Press Enter to return to the menu...${colors.reset}`,
    () => {
      displayMainMenu();
    },
  );
}

// Check if scripts exist in their new locations
function checkScriptPaths() {
  let missingScripts = [];

  for (const category in scripts) {
    for (const script of scripts[category]) {
      const commandParts = script.command.split(" ");
      let scriptPath;

      // Handle both node and shell script formats
      if (commandParts[0] === "node") {
        scriptPath = commandParts[1]; // Extract the path after "node"
      } else if (commandParts[0].startsWith("./scripts/")) {
        scriptPath = commandParts[0].substring(2); // Remove the ./ prefix
      }

      // Check if path exists (only if we extracted a valid path)
      if (scriptPath && !fs.existsSync(scriptPath)) {
        missingScripts.push({ name: script.name, path: scriptPath });
      }
    }
  }

  if (missingScripts.length > 0) {
    console.log(
      `${colors.fg.yellow}Warning: Some script paths may need updating:${colors.reset}`,
    );
    missingScripts.forEach((script) => {
      console.log(`  - ${script.name}: ${script.path} not found`);
    });
    console.log();
  }
}

// Main program
function main() {
  checkScriptPaths();
  displayMainMenu();
}

// Run the program
main();
