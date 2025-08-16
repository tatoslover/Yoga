/**
 * Peaceful Yoga - Theme Switcher
 * Controls the theme switching functionality for the site
 */

// Theme options
const THEMES = [
  { id: "forrest", name: "Forest", type: "nature" },
  { id: "ocean", name: "Ocean", type: "nature" },
  { id: "beach", name: "Beach", type: "nature" },
  { id: "water", name: "Water", type: "elemental" },
  { id: "lights", name: "Lights", type: "elemental" },
  { id: "mountain", name: "Mountain", type: "elemental" },
];

// Preload theme images
function preloadThemeImages() {
  console.log("Preloading theme images...");

  // Create a promise for each image load
  const imagePromises = [];

  // Preload thumbnails first (smaller and faster)
  THEMES.forEach((theme) => {
    const thumbPromise = new Promise((resolve) => {
      const thumb = new Image();
      thumb.onload = () => resolve();
      thumb.onerror = () => {
        console.warn(`Failed to load thumbnail: ${theme.id}-thumb.jpg`);
        resolve();
      };
      thumb.src = `/assets/themes/thumbnails/${theme.id}-thumb.jpg`;
    });
    imagePromises.push(thumbPromise);
  });

  // Then preload optimized background images
  THEMES.forEach((theme) => {
    const imgPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => {
        console.warn(`Failed to load optimized image: ${theme.id}.jpg`);
        resolve();
      };
      img.src = `/assets/themes/optimized/${theme.id}.jpg`;
    });
    imagePromises.push(imgPromise);
  });

  // When all thumbnails are loaded, log completion
  Promise.all(imagePromises).then(() => {
    console.log("All theme images preloaded successfully");
  });
}

// Get stored theme or use default from site data
function getStoredTheme() {
  // Check if we have site data with a default theme
  const siteData = window.siteData || {};
  const defaultTheme = siteData.defaultTheme || "forest-night";

  return localStorage.getItem("mat-and-mind-theme") || defaultTheme;
}

// Initialize theme
function initTheme() {
  const storedTheme = getStoredTheme();
  applyTheme(storedTheme);

  // Create a loading indicator with thumbnail preview
  const loadingIndicator = document.createElement("div");
  loadingIndicator.className = "theme-loading-indicator";
  loadingIndicator.innerHTML = `
    <div class="theme-thumbnail">
      <img src="" alt="Theme preview">
    </div>
    <div class="loading-spinner"></div>
    <div class="loading-text">Loading theme...</div>
  `;
  document.body.appendChild(loadingIndicator);
}

// Apply theme to document
function applyTheme(themeId) {
  // Validate theme exists
  if (!THEMES.find((theme) => theme.id === themeId)) {
    themeId = "forrest"; // Fallback to default
  }

  // Show loading indicator with thumbnail preview
  const loadingIndicator = document.querySelector(".theme-loading-indicator");
  if (loadingIndicator) {
    // Update thumbnail preview
    const thumbnailImg = loadingIndicator.querySelector(".theme-thumbnail img");
    if (thumbnailImg) {
      thumbnailImg.src = `/assets/themes/thumbnails/${themeId}-thumb.jpg`;
    }

    // Show loading indicator
    loadingIndicator.classList.add("active");
  }

  // Preload the specific theme image first
  const img = new Image();
  img.onload = () => {
    // Apply theme attribute to body
    document.body.setAttribute("data-theme", themeId);

    // Hide loading indicator
    if (loadingIndicator) {
      setTimeout(() => {
        loadingIndicator.classList.remove("active");
      }, 500); // Slightly longer to show the nice thumbnail
    }
  };
  img.src = `/assets/themes/optimized/${themeId}.jpg`;

  // Store theme preference
  localStorage.setItem("mat-and-mind-theme", themeId);

  // Update UI to show active theme
  updateActiveThemeUI(themeId);

  // Dispatch a custom event for theme change
  const themeChangedEvent = new CustomEvent('themeChanged', {
    detail: { theme: themeId }
  });
  document.dispatchEvent(themeChangedEvent);

  // Preload other theme images in the background for faster future switching
  // But only after the current theme has been applied
  setTimeout(() => {
    THEMES.forEach((theme) => {
      if (theme.id !== themeId) {
        const bgImg = new Image();
        bgImg.src = `/assets/themes/optimized/${theme.id}.jpg`;
      }
    });
  }, 1000); // Wait 1 second before loading other themes
}

// Update UI to show active theme
function updateActiveThemeUI(themeId) {
  // Remove active class from all theme options
  document.querySelectorAll(".theme-option").forEach((option) => {
    option.classList.remove("active");
  });

  // Add active class to current theme
  const activeOption = document.querySelector(
    `.theme-option[data-theme="${themeId}"]`,
  );
  if (activeOption) {
    activeOption.classList.add("active");
  }
}

// Create theme switcher UI
function createThemeSwitcher() {
  // Create theme switcher button
  const switcher = document.createElement("div");
  switcher.className = "theme-switcher";
  switcher.innerHTML = `
    <svg class="theme-switcher-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm0-18c4.42 0 8 3.58 8 8s-3.58 8-8 8-8-3.58-8-8 3.58-8 8-8zm0 3c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5"/>
    </svg>
  `;

  // Create theme panel
  const panel = document.createElement("div");
  panel.className = "theme-panel";

  // Create panel header
  const panelHeader = document.createElement("div");
  panelHeader.className = "theme-panel-header";
  panelHeader.innerHTML = `
    <h3 class="theme-panel-title">Select Theme</h3>
    <button class="theme-panel-close">&times;</button>
  `;

  // Create theme options
  const options = document.createElement("div");
  options.className = "theme-options";

  // Add theme options
  THEMES.forEach((theme) => {
    const option = document.createElement("div");
    option.className = "theme-option";
    option.setAttribute("data-theme", theme.id);
    option.setAttribute("title", `Switch to ${theme.name} theme`);
    option.setAttribute("aria-label", `Switch to ${theme.name} theme`);

    // Use the actual thumbnail images instead of CSS backgrounds
    option.innerHTML = `
      <div class="theme-preview">
        <img src="/assets/themes/thumbnails/${theme.id}-thumb.jpg" alt="${theme.name}" loading="lazy">
      </div>
      <span class="theme-name">${theme.name}</span>
    `;

    // Add click event to option
    option.addEventListener("click", () => {
      // Only apply theme if it's different from current
      if (getStoredTheme() !== theme.id) {
        panel.classList.remove("active"); // Close panel
        applyTheme(theme.id);
      }
    });

    options.appendChild(option);
  });

  // Assemble panel
  panel.appendChild(panelHeader);
  panel.appendChild(options);

  // Add click event to switcher
  switcher.addEventListener("click", () => {
    panel.classList.toggle("active");
  });

  // Add click event to close button
  panelHeader
    .querySelector(".theme-panel-close")
    .addEventListener("click", (e) => {
      e.stopPropagation();
      panel.classList.remove("active");
    });

  // Close panel when clicking outside
  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && !switcher.contains(e.target)) {
      panel.classList.remove("active");
    }
  });

  // Add elements to document
  document.body.appendChild(switcher);
  document.body.appendChild(panel);

  // Update UI to show active theme
  updateActiveThemeUI(getStoredTheme());
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Initialize theme first
  initTheme();

  // Create theme switcher UI
  createThemeSwitcher();

  // Preload all theme images for faster switching after a short delay
  // to not compete with initial page load resources
  setTimeout(() => {
    preloadThemeImages();
  }, 1000);
});

// Expose theme functions globally
window.yogaThemes = {
  apply: applyTheme,
  getThemes: () => THEMES,
  getCurrent: getStoredTheme,
};
