/**
 * Peaceful Yoga - Video Player
 * Custom YouTube player implementation with distraction-free controls
 */

// YouTube Player instances
const players = {};

// Global state
let controlsTimeout;
let focusModeEnabled = false;
let sessionTimerEnabled = false;
let sessionTime = 0;
let sessionTimerInterval = null;
let lastTimeUpdate = 0;
let videoData = null;

// Load YouTube API
function loadYouTubeAPI() {
  if (window.YT) {
    // API already loaded
    initializePlayer();
    return;
  }

  // Create script tag and load API
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName("script")[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  // Function called by YouTube API when ready
  window.onYouTubeIframeAPIReady = initializePlayer;
}

// Initialize the player when on a video page
function initializePlayer() {
  const playerContainer = document.getElementById("player");
  if (!playerContainer) return;

  const videoId = playerContainer.getAttribute("data-video-id");
  if (!videoId) return;

  // Get video metadata from the page
  videoData = {
    id: videoId,
    slug: window.location.pathname.split("/").filter(Boolean).pop() || "",
    title: document.querySelector(".video-title")?.textContent || "Yoga Video",
  };

  // Create YouTube player
  players.mainPlayer = new YT.Player("player", {
    videoId: videoId,
    playerVars: {
      rel: 0, // Don't show related videos
      showinfo: 0, // Hide video title and uploader info
      modestbranding: 1, // Hide YouTube logo
      iv_load_policy: 3, // Hide video annotations
      fs: 1, // Allow fullscreen
      controls: 0, // Hide player controls to use our own
      autoplay: 0, // Don't autoplay
      playsinline: 1, // Play inline on mobile
      enablejsapi: 1, // Enable JS API for custom controls
      cc_load_policy: 0, // Default hide closed captions
      color: "white", // Use white progress bar
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onPlaybackQualityChange: onPlaybackQualityChange,
      onPlaybackRateChange: onPlaybackRateChange,
      onError: onPlayerError,
      onApiChange: onApiChange,
    },
  });
}

// Player is ready
function onPlayerReady(event) {
  setupCustomControls();

  // Make custom controls visible now that player is ready
  const customControls = document.querySelector(".custom-controls");
  if (customControls) {
    customControls.style.opacity = "1";
  }

  // Create focus mode button
  createFocusModeButton();

  // Add favorites button
  addFavoritesButton();

  // Check if we should resume playback from a saved position
  if (window.UserPreferences && window.UserPreferences.isAvailable) {
    const savedTime = window.UserPreferences.ContinueWatching.getTimestamp(
      videoData.id,
    );

    if (savedTime && savedTime > 10) {
      // Create resume prompt
      createResumePrompt(savedTime);
    }
  }

  // Start tracking playback progress
  startProgressTracking();

  // Apply saved playback settings
  applyPlaybackSettings();
}

// Player state has changed
function onPlayerStateChange(event) {
  const player = event.target;
  const state = event.data;

  // Get play/pause button icons
  const playIcon = document.querySelector(".play-icon");
  const pauseIcon = document.querySelector(".pause-icon");

  // Update play/pause button based on player state
  if (state === YT.PlayerState.PLAYING) {
    playIcon.style.display = "none";
    pauseIcon.style.display = "inline-block";

    // Start session timer if enabled
    if (sessionTimerEnabled) {
      startSessionTimer();
    }
  } else {
    playIcon.style.display = "inline-block";
    pauseIcon.style.display = "none";

    // Stop session timer if video is paused or ended
    if (sessionTimerEnabled) {
      stopSessionTimer();
    }
  }

  // Save progress when video is paused
  if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
    saveVideoProgress();
  }
}

// Set up custom control buttons
function setupCustomControls() {
  // Play/Pause button
  const playPauseBtn = document.querySelector(".play-pause");
  if (playPauseBtn) {
    playPauseBtn.addEventListener("click", function () {
      const player = players.mainPlayer;
      if (!player) return;

      const state = player.getPlayerState();
      if (state === YT.PlayerState.PLAYING) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    });
  }

  // Session timer toggle button
  const sessionTimerBtn = document.querySelector(".session-timer-toggle");
  if (sessionTimerBtn) {
    sessionTimerBtn.addEventListener("click", function () {
      toggleSessionTimer();
    });
  }

  // Rewind 15 seconds button
  const rewindBtn = document.querySelector(".rewind-15");
  if (rewindBtn) {
    rewindBtn.addEventListener("click", function () {
      const player = players.mainPlayer;
      if (!player) return;

      const currentTime = player.getCurrentTime();
      player.seekTo(Math.max(0, currentTime - 15), true);
    });
  }

  // Forward 15 seconds button
  const forwardBtn = document.querySelector(".forward-15");
  if (forwardBtn) {
    forwardBtn.addEventListener("click", function () {
      const player = players.mainPlayer;
      if (!player) return;

      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();
      player.seekTo(Math.min(duration, currentTime + 15), true);
    });
  }

  // Fullscreen button
  const fullscreenBtn = document.querySelector(".fullscreen");
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", function () {
      const player = players.mainPlayer;
      if (!player) return;

      const iframe = player.getIframe();
      requestFullscreen(iframe);
    });
  }

  // Make video container also toggle play/pause
  const videoContainer = document.querySelector(".video-container");
  if (videoContainer) {
    videoContainer.addEventListener("click", function (e) {
      // Only if click is directly on the container (not on controls)
      if (e.target === videoContainer) {
        const player = players.mainPlayer;
        if (!player) return;

        const state = player.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
          player.pauseVideo();
        } else {
          player.playVideo();
        }
      }
    });

    // Show controls on mouse movement
    videoContainer.addEventListener("mousemove", function () {
      showControlsTemporarily();

      // Also show session timer if enabled
      const sessionTimer = document.querySelector(".session-timer");
      if (sessionTimer && sessionTimerEnabled) {
        sessionTimer.style.opacity = "0.8";
      }
    });
  }
}

// Cross-browser fullscreen helper
function requestFullscreen(element) {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
}

/**
 * Toggle session timer visibility and functionality
 */
function toggleSessionTimer() {
  sessionTimerEnabled = !sessionTimerEnabled;
  const sessionTimer = document.querySelector(".session-timer");

  if (sessionTimerEnabled) {
    // Show timer
    sessionTimer.style.display = "block";

    // Reset the timer if it was previously running
    clearInterval(sessionTimerInterval);
    sessionTime = 0;
    updateTimerDisplay();

    // Start timer if video is playing
    const player = players.mainPlayer;
    if (player && player.getPlayerState() === YT.PlayerState.PLAYING) {
      startSessionTimer();
    }

    // Show notification
    showNotification("Session timer enabled");
  } else {
    // Hide timer
    sessionTimer.style.display = "none";

    // Stop timer
    clearInterval(sessionTimerInterval);
    sessionTimerInterval = null;

    // Show notification
    showNotification("Session timer disabled");
  }

  // Store preference if available
  if (window.UserPreferences && window.UserPreferences.PlaybackSettings) {
    window.UserPreferences.PlaybackSettings.update(
      "sessionTimer",
      sessionTimerEnabled,
    );
  }
}

/**
 * Start session timer counting
 */
function startSessionTimer() {
  // Clear any existing interval
  if (sessionTimerInterval) {
    clearInterval(sessionTimerInterval);
  }

  // Update timer every second
  sessionTimerInterval = setInterval(function () {
    sessionTime++;
    updateTimerDisplay();
  }, 1000);
}

/**
 * Stop session timer
 */
function stopSessionTimer() {
  if (sessionTimerInterval) {
    clearInterval(sessionTimerInterval);
    sessionTimerInterval = null;
  }
}

/**
 * Update the timer display with formatted time
 */
function updateTimerDisplay() {
  const timerDisplay = document.querySelector(".timer-display");
  if (!timerDisplay) return;

  const hours = Math.floor(sessionTime / 3600);
  const minutes = Math.floor((sessionTime % 3600) / 60);
  const seconds = sessionTime % 60;

  // Format: HH:MM:SS if hours > 0, otherwise MM:SS
  if (hours > 0) {
    timerDisplay.textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
  } else {
    timerDisplay.textContent = `${padZero(minutes)}:${padZero(seconds)}`;
  }
}

/**
 * Add leading zero to numbers less than 10
 */
function padZero(num) {
  return num < 10 ? `0${num}` : num;
}

// Add keyboard controls
document.addEventListener("keydown", function (e) {
  const player = players.mainPlayer;
  if (!player) return;

  // Show controls temporarily on any key press
  showControlsTemporarily();

  // Space bar: Play/Pause
  if (e.code === "Space") {
    e.preventDefault();
    const state = player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  }

  // Left arrow: Rewind 15 seconds
  if (e.code === "ArrowLeft") {
    e.preventDefault();
    const currentTime = player.getCurrentTime();
    player.seekTo(Math.max(0, currentTime - 15), true);
  }

  // Right arrow: Forward 15 seconds
  if (e.code === "ArrowRight") {
    e.preventDefault();
    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();
    player.seekTo(Math.min(duration, currentTime + 15), true);
  }

  // F key: Fullscreen
  if (e.code === "KeyF") {
    e.preventDefault();
    const iframe = player.getIframe();
    requestFullscreen(iframe);
  }

  // Z key: Toggle focus mode
  if (e.code === "KeyZ") {
    e.preventDefault();
    toggleFocusMode();
  }

  // C key: Toggle captions
  if (e.code === "KeyC") {
    e.preventDefault();
    const iframe = player.getIframe();
    // Send postMessage to iframe to toggle captions
    iframe.contentWindow.postMessage(
      '{"event":"command","func":"toggleCaptions","args":""}',
      "*",
    );
  }
});

// Create focus mode button
function createFocusModeButton() {
  // Check if button already exists
  if (document.querySelector(".focus-mode-btn")) return;

  const videoContainer = document.querySelector(".video-container");
  if (!videoContainer) return;

  const focusModeBtn = document.createElement("button");
  focusModeBtn.className = "focus-mode-btn";
  focusModeBtn.setAttribute("aria-label", "Toggle focus mode");
  focusModeBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
    </svg>
    <span class="control-label">Focus</span>
  `;

  // Add to custom controls
  const customControls = document.querySelector(".custom-controls");
  if (customControls) {
    customControls.appendChild(focusModeBtn);

    // Add click event
    focusModeBtn.addEventListener("click", toggleFocusMode);
  }
}

// Toggle focus mode
function toggleFocusMode() {
  const videoPage = document.querySelector(".video-page");
  const header = document.querySelector(".site-header");
  const footer = document.querySelector(".site-footer");
  const videoInfo = document.querySelector(".video-info");
  const relatedVideos = document.querySelector(".related-videos");

  if (!videoPage) return;

  focusModeEnabled = !focusModeEnabled;

  if (focusModeEnabled) {
    // Enter focus mode
    document.body.classList.add("focus-mode");

    // Hide elements
    if (header) header.style.display = "none";
    if (footer) footer.style.display = "none";
    if (videoInfo) videoInfo.style.display = "none";
    if (relatedVideos) relatedVideos.style.display = "none";

    // Show temporary notification
    showFocusModeNotification("Focus mode enabled. Press Z to exit.");

    // Adjust video container
    const videoContainer = document.querySelector(".video-container");
    if (videoContainer) {
      videoContainer.style.maxWidth = "100%";
      videoContainer.style.height = "90vh";
    }
  } else {
    // Exit focus mode
    document.body.classList.remove("focus-mode");

    // Show elements
    if (header) header.style.display = "";
    if (footer) footer.style.display = "";
    if (videoInfo) videoInfo.style.display = "";
    if (relatedVideos) relatedVideos.style.display = "";

    // Show temporary notification
    showFocusModeNotification("Focus mode disabled.");

    // Reset video container
    const videoContainer = document.querySelector(".video-container");
    if (videoContainer) {
      videoContainer.style.maxWidth = "";
      videoContainer.style.height = "";
    }
  }

  // Update focus mode button text
  const focusModeBtn = document.querySelector(".focus-mode-btn .control-label");
  if (focusModeBtn) {
    focusModeBtn.textContent = focusModeEnabled ? "Normal" : "Focus";
  }
}

// Show focus mode notification
function showFocusModeNotification(message) {
  // Remove existing notification
  const existingNotification = document.querySelector(".focus-notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification
  const notification = document.createElement("div");
  notification.className = "focus-notification";
  notification.textContent = message;

  document.body.appendChild(notification);

  // Fade out after 3 seconds
  setTimeout(() => {
    notification.style.opacity = "0";

    // Remove from DOM after animation
    setTimeout(() => {
      notification.remove();
    }, 500);
  }, 3000);
}

// Setup auto-hiding controls
function setupAutoHidingControls() {
  const customControls = document.querySelector(".custom-controls");

  if (!customControls) return;

  // Initially hide controls after 3 seconds
  showControlsTemporarily();
}

// Show controls temporarily and then hide them
function showControlsTemporarily() {
  const customControls = document.querySelector(".custom-controls");

  if (!customControls) return;

  // Clear existing timeout
  if (controlsTimeout) {
    clearTimeout(controlsTimeout);
  }

  // Show controls
  customControls.style.opacity = "1";
  customControls.style.transform = "translateY(0)";

  // Set timeout to hide them
  controlsTimeout = setTimeout(() => {
    // Only hide if video is playing
    const player = players.mainPlayer;
    if (player && player.getPlayerState() === YT.PlayerState.PLAYING) {
      customControls.style.opacity = "0";
      customControls.style.transform = "translateY(10px)";
    }
  }, 3000);
}

// Create resume prompt
function createResumePrompt(timestamp) {
  const player = players.mainPlayer;
  if (!player) return;

  // Format time as mm:ss
  const minutes = Math.floor(timestamp / 60);
  const seconds = Math.floor(timestamp % 60);
  const formattedTime = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  // Create prompt element
  const resumePrompt = document.createElement("div");
  resumePrompt.className = "resume-prompt";
  resumePrompt.innerHTML = `
    <div class="resume-prompt-content">
      <p>Resume from ${formattedTime}?</p>
      <div class="resume-prompt-actions">
        <button class="resume-yes">Yes</button>
        <button class="resume-no">Start from beginning</button>
      </div>
    </div>
  `;

  // Add to video container
  const videoContainer = document.querySelector(".video-container");
  if (videoContainer) {
    videoContainer.appendChild(resumePrompt);

    // Add event listeners
    resumePrompt
      .querySelector(".resume-yes")
      .addEventListener("click", function () {
        player.seekTo(timestamp, true);
        player.playVideo();
        resumePrompt.remove();
      });

    resumePrompt
      .querySelector(".resume-no")
      .addEventListener("click", function () {
        player.seekTo(0, true);
        player.playVideo();
        resumePrompt.remove();

        // Remove this video from continue watching
        if (window.UserPreferences && window.UserPreferences.isAvailable) {
          window.UserPreferences.ContinueWatching.remove(videoData.id);
        }
      });

    // Auto-hide after 15 seconds
    setTimeout(() => {
      if (resumePrompt.parentNode) {
        resumePrompt.classList.add("hiding");
        setTimeout(() => resumePrompt.remove(), 1000);
      }
    }, 15000);
  }
}

// Add favorites button
function addFavoritesButton() {
  if (!window.UserPreferences || !window.UserPreferences.isAvailable) return;

  const videoContainer = document.querySelector(".video-container");
  if (!videoContainer) return;

  // Check if button already exists
  if (videoContainer.querySelector(".favorite-btn")) return;

  // Check if video is already favorited
  const isFavorite = window.UserPreferences.Favorites.isFavorite(videoData.id);

  // Create button
  const favoriteBtn = document.createElement("button");
  favoriteBtn.className = `favorite-btn ${isFavorite ? "is-favorite" : ""}`;
  favoriteBtn.setAttribute(
    "aria-label",
    isFavorite ? "Remove from favorites" : "Add to favorites",
  );
  favoriteBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  `;

  // Add to video container
  videoContainer.appendChild(favoriteBtn);

  // Add click event
  favoriteBtn.addEventListener("click", function () {
    const newStatus = window.UserPreferences.Favorites.toggle(
      videoData.id,
      videoData.slug,
      videoData.title,
    );

    // Update button appearance
    this.classList.toggle("is-favorite", newStatus);
    this.setAttribute(
      "aria-label",
      newStatus ? "Remove from favorites" : "Add to favorites",
    );

    // Show feedback
    showNotification(
      newStatus ? "Added to favorites" : "Removed from favorites",
    );
  });
}

// Start tracking video progress
function startProgressTracking() {
  if (!window.UserPreferences || !window.UserPreferences.isAvailable) return;

  const player = players.mainPlayer;
  if (!player) return;

  // Update progress every 5 seconds
  setInterval(() => {
    if (player.getPlayerState() === YT.PlayerState.PLAYING) {
      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();

      // Only update if time has changed significantly (1+ second)
      if (Math.abs(currentTime - lastTimeUpdate) >= 1) {
        lastTimeUpdate = currentTime;
        window.UserPreferences.ContinueWatching.update(
          videoData,
          currentTime,
          duration,
        );
      }
    }
  }, 5000);
}

// Save video progress when paused
function saveVideoProgress() {
  if (!window.UserPreferences || !window.UserPreferences.isAvailable) return;

  const player = players.mainPlayer;
  if (!player) return;

  const currentTime = player.getCurrentTime();
  const duration = player.getDuration();

  window.UserPreferences.ContinueWatching.update(
    videoData,
    currentTime,
    duration,
  );
}

// Apply saved playback settings
function applyPlaybackSettings() {
  if (!window.UserPreferences || !window.UserPreferences.isAvailable) return;

  const player = players.mainPlayer;
  if (!player) return;

  const settings = window.UserPreferences.PlaybackSettings.getAll();

  // Set volume (0-100 to 0-1)
  player.setVolume(settings.volume);

  // Set playback speed
  player.setPlaybackRate(settings.speed);

  // Apply session timer preference if saved
  if (settings.sessionTimer) {
    sessionTimerEnabled = true;
    const sessionTimer = document.querySelector(".session-timer");
    if (sessionTimer) {
      sessionTimer.style.display = "block";
    }
    // Don't start the timer yet - it will start when video plays
  }

  // Enter focus mode if auto focus is enabled
  if (settings.autoFocusMode && !focusModeEnabled) {
    toggleFocusMode();
  }
}

// Show notification
function showNotification(message) {
  // Remove any existing notification
  document.querySelectorAll(".video-notification").forEach((el) => el.remove());

  // Create notification
  const notification = document.createElement("div");
  notification.className = "video-notification";
  notification.textContent = message;

  // Add to page
  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.add("hiding");
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// Additional player event handlers
function onPlaybackQualityChange(event) {
  // You can track quality changes here if needed
}

function onPlaybackRateChange(event) {
  // Save playback rate to preferences
  if (window.UserPreferences && window.UserPreferences.isAvailable) {
    window.UserPreferences.PlaybackSettings.update(
      "speed",
      event.target.getPlaybackRate(),
    );
  }
}

function onPlayerError(event) {
  console.error("Player error:", event.data);
}

function onApiChange(event) {
  // API availability changed
}

// Initialize when document is ready
document.addEventListener("DOMContentLoaded", function () {
  loadYouTubeAPI();

  // Add focus mode styles
  addFocusModeStyles();

  // Add styles for new elements
  addCustomStyles();
});

// Add custom styles for new elements
function addCustomStyles() {
  const style = document.createElement("style");
  style.textContent = `
    /* Resume prompt */
    .resume-prompt {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 20;
      animation: fadeIn 0.3s ease;
    }

    .resume-prompt.hiding {
      animation: fadeOut 0.5s ease;
    }

    .resume-prompt-content {
      background: var(--color-background-alt, #2a2a2a);
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      max-width: 300px;
    }

    .resume-prompt-actions {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-top: 15px;
    }

    .resume-prompt button {
      padding: 8px 16px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }

    .resume-yes {
      background: var(--color-primary, #8a2be2);
      color: white;
    }

    .resume-no {
      background: var(--color-background, #1a1a1a);
      color: var(--color-text, #fff);
      border: 1px solid var(--color-border, #444) !important;
    }

    /* Favorite button */
    .favorite-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.5);
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10;
      opacity: 0.7;
      transition: opacity 0.3s, transform 0.3s;
    }

    .favorite-btn svg {
      fill: white;
      stroke: white;
      stroke-width: 1px;
      fill-opacity: 0;
      transition: fill-opacity 0.3s;
    }

    .favorite-btn.is-favorite svg {
      fill-opacity: 1;
      fill: #ff4d4d;
    }

    .favorite-btn:hover {
      opacity: 1;
      transform: scale(1.1);
    }

    /* Notification */
    .video-notification {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      z-index: 1000;
      animation: fadeIn 0.3s ease;
    }

    .video-notification.hiding {
      animation: fadeOut 0.5s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes fadeOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(10px); }
    }
  `;

  document.head.appendChild(style);
}

// Add focus mode styles
function addFocusModeStyles() {
  const style = document.createElement("style");
  style.textContent = `
    body.focus-mode {
      background: #000;
    }

    .focus-mode .video-container {
      box-shadow: 0 0 40px rgba(0,0,0,0.8);
      border-radius: 8px;
      overflow: hidden;
    }

    .custom-controls {
      transition: opacity 0.3s ease, transform 0.3s ease;
    }

    .focus-notification {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      z-index: 1000;
      transition: opacity 0.5s ease;
      font-size: 14px;
    }

    .focus-mode-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 5px;
      opacity: 0.8;
      transition: opacity 0.3s;
    }

    .focus-mode-btn:hover {
      opacity: 1;
    }
  `;

  document.head.appendChild(style);
}
