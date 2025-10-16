/**
 * user-preferences.js
 * Handles localStorage for user preferences and state
 * - Continue watching functionality
 * - Favorites management
 * - Volume/playback settings
 */

// Namespace for localStorage keys
const STORAGE_KEYS = {
  FAVORITES: 'mat_and_mind_favorites',
  CONTINUE_WATCHING: 'mat_and_mind_continue_watching',
  PLAYBACK_SETTINGS: 'mat_and_mind_playback_settings',
  THEME: 'mat_and_mind_theme'
};

// Maximum number of videos to keep in continue watching
const MAX_CONTINUE_WATCHING = 5;

/**
 * Favorites Management
 */
const Favorites = {
  /**
   * Get all favorite videos
   * @returns {Array} Array of favorite video IDs
   */
  getAll: function() {
    const favorites = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return favorites ? JSON.parse(favorites) : [];
  },

  /**
   * Check if a video is favorited
   * @param {string} videoId - YouTube video ID
   * @returns {boolean} True if video is in favorites
   */
  isFavorite: function(videoId) {
    const favorites = this.getAll();
    return favorites.includes(videoId);
  },

  /**
   * Toggle favorite status for a video
   * @param {string} videoId - YouTube video ID
   * @param {string} videoSlug - Video slug for URL
   * @param {string} videoTitle - Video title
   * @returns {boolean} New favorite status
   */
  toggle: function(videoId, videoSlug, videoTitle) {
    const favorites = this.getAll();
    const index = favorites.indexOf(videoId);

    // If not in favorites, add it with metadata
    if (index === -1) {
      const newFavorite = {
        id: videoId,
        slug: videoSlug,
        title: videoTitle,
        addedAt: new Date().toISOString()
      };

      // Store as array of objects with metadata
      const favoritesData = this.getAllWithMetadata();
      favoritesData.push(newFavorite);
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favoritesData));
      return true;
    }
    // If already in favorites, remove it
    else {
      const favoritesData = this.getAllWithMetadata();
      const updatedFavorites = favoritesData.filter(item => item.id !== videoId);
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updatedFavorites));
      return false;
    }
  },

  /**
   * Get all favorites with metadata
   * @returns {Array} Array of favorite video objects with metadata
   */
  getAllWithMetadata: function() {
    const favorites = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return favorites ? JSON.parse(favorites) : [];
  }
};

/**
 * Continue Watching Management
 */
const ContinueWatching = {
  /**
   * Get all videos in continue watching list
   * @returns {Array} Array of video objects with timestamps
   */
  getAll: function() {
    const continueWatching = localStorage.getItem(STORAGE_KEYS.CONTINUE_WATCHING);
    return continueWatching ? JSON.parse(continueWatching) : [];
  },

  /**
   * Update or add a video in continue watching
   * @param {Object} videoData - Video data object
   * @param {string} videoData.id - YouTube video ID
   * @param {string} videoData.slug - Video slug for URL
   * @param {string} videoData.title - Video title
   * @param {number} timestamp - Current playback position in seconds
   * @param {number} duration - Total video duration in seconds
   */
  update: function(videoData, timestamp, duration) {
    if (!videoData || !videoData.id) return;

    // Don't save if near the beginning (less than 10 seconds) or very end (last 10 seconds)
    if (timestamp < 10 || (duration && timestamp > duration - 10)) {
      return;
    }

    const continueWatching = this.getAll();

    // Calculate progress percentage
    const progress = duration ? Math.round((timestamp / duration) * 100) : 0;

    // Check if video already exists in the list
    const existingIndex = continueWatching.findIndex(item => item.id === videoData.id);

    // Prepare updated video data
    const updatedVideo = {
      id: videoData.id,
      slug: videoData.slug,
      title: videoData.title,
      timestamp: timestamp,
      progress: progress,
      lastWatched: new Date().toISOString()
    };

    // If video exists, update it and move to top
    if (existingIndex !== -1) {
      continueWatching.splice(existingIndex, 1);
    }

    // Add to the beginning of the array
    continueWatching.unshift(updatedVideo);

    // Keep only the most recent MAX_CONTINUE_WATCHING videos
    const trimmedList = continueWatching.slice(0, MAX_CONTINUE_WATCHING);

    localStorage.setItem(STORAGE_KEYS.CONTINUE_WATCHING, JSON.stringify(trimmedList));
  },

  /**
   * Get timestamp for a specific video
   * @param {string} videoId - YouTube video ID
   * @returns {number|null} Timestamp in seconds or null if not found
   */
  getTimestamp: function(videoId) {
    const continueWatching = this.getAll();
    const video = continueWatching.find(item => item.id === videoId);
    return video ? video.timestamp : null;
  },

  /**
   * Remove a video from continue watching
   * @param {string} videoId - YouTube video ID
   */
  remove: function(videoId) {
    const continueWatching = this.getAll();
    const updatedList = continueWatching.filter(item => item.id !== videoId);
    localStorage.setItem(STORAGE_KEYS.CONTINUE_WATCHING, JSON.stringify(updatedList));
  }
};

/**
 * Playback Settings Management
 */
const PlaybackSettings = {
  /**
   * Get all playback settings
   * @returns {Object} Playback settings object
   */
  getAll: function() {
    const settings = localStorage.getItem(STORAGE_KEYS.PLAYBACK_SETTINGS);
    const defaults = {
      volume: 80, // 0-100
      speed: 1.0, // Playback speed
      captions: false, // Captions enabled
      autoFocusMode: false // Automatically enter focus mode
    };

    return settings ? { ...defaults, ...JSON.parse(settings) } : defaults;
  },

  /**
   * Update a specific playback setting
   * @param {string} setting - Setting name
   * @param {*} value - Setting value
   */
  update: function(setting, value) {
    const settings = this.getAll();
    settings[setting] = value;
    localStorage.setItem(STORAGE_KEYS.PLAYBACK_SETTINGS, JSON.stringify(settings));
  },

  /**
   * Get a specific playback setting
   * @param {string} setting - Setting name
   * @returns {*} Setting value
   */
  get: function(setting) {
    const settings = this.getAll();
    return settings[setting];
  }
};

/**
 * Theme Preferences Management
 */
const ThemePreferences = {
  /**
   * Get current theme
   * @returns {string} Theme name
   */
  getCurrentTheme: function() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'default';
  },

  /**
   * Set current theme
   * @param {string} themeName - Theme name
   */
  setTheme: function(themeName) {
    localStorage.setItem(STORAGE_KEYS.THEME, themeName);
    // Apply theme immediately if possible
    if (document.body.dataset) {
      document.body.dataset.theme = themeName;
    }
  }
};

/**
 * Check if browser supports localStorage
 * @returns {boolean} True if localStorage is available
 */
function isLocalStorageAvailable() {
  try {
    const test = 'test';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch(e) {
    return false;
  }
}

// Export modules
const UserPreferences = {
  isAvailable: isLocalStorageAvailable(),
  Favorites,
  ContinueWatching,
  PlaybackSettings,
  ThemePreferences
};

// Export to window for global access
window.UserPreferences = UserPreferences;
