// Peaceful Yoga - Main JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // Mobile menu toggle
  const menuButton = document.querySelector('.mobile-menu-toggle');
  const mainNav = document.querySelector('.main-nav');

  if (menuButton) {
    menuButton.addEventListener('click', function() {
      mainNav.classList.toggle('active');
      menuButton.classList.toggle('active');
    });
  }

  // Filter functionality for video grid (if present)
  const filterButtons = document.querySelectorAll('.filter-button');
  const videoItems = document.querySelectorAll('.video-card');

  if (filterButtons.length > 0) {
    filterButtons.forEach(button => {
      button.addEventListener('click', function() {
        const filterValue = this.getAttribute('data-filter');

        // Remove active class from all buttons
        filterButtons.forEach(btn => btn.classList.remove('active'));

        // Add active class to current button
        this.classList.add('active');

        // Filter videos
        videoItems.forEach(item => {
          if (filterValue === 'all') {
            item.style.display = 'block';
          } else {
            if (item.classList.contains(filterValue)) {
              item.style.display = 'block';
            } else {
              item.style.display = 'none';
            }
          }
        });
      });
    });
  }

  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();

      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        window.scrollTo({
          top: target.offsetTop - 100,
          behavior: 'smooth'
        });
      }
    });
  });

  // Load YouTube API if there are video players on the page
  const videoPlayers = document.querySelectorAll('.youtube-player');
  if (videoPlayers.length > 0) {
    loadYouTubeAPI();
  }
});

// Load YouTube IFrame API
function loadYouTubeAPI() {
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  // The API will call onYouTubeIframeAPIReady automatically
  window.onYouTubeIframeAPIReady = initializeVideoPlayers;
}

// Initialize all video players on the page
function initializeVideoPlayers() {
  const videoPlayers = document.querySelectorAll('.youtube-player');

  videoPlayers.forEach(playerElement => {
    const videoId = playerElement.getAttribute('data-video-id');
    const playerId = playerElement.id;

    if (!videoId || !playerId) return;

    new YT.Player(playerId, {
      videoId: videoId,
      playerVars: {
        rel: 0,                // Don't show related videos
        modestbranding: 1,     // Hide YouTube logo
        iv_load_policy: 3,     // Hide video annotations
        fs: 1,                 // Allow fullscreen
        enablejsapi: 1,        // Enable JS API for custom controls
        playsinline: 1,        // Play inline on mobile
        controls: 1            // Show player controls
      },
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange
      }
    });
  });
}

// Handle player ready event
function onPlayerReady(event) {
  const player = event.target;
  const iframe = player.getIframe();
  const playerId = iframe.id;

  // Set up custom control buttons if they exist
  setupCustomControls(playerId, player);
}

// Handle player state change event
function onPlayerStateChange(event) {
  const player = event.target;
  const iframe = player.getIframe();
  const playerId = iframe.id;
  const playerState = event.data;

  // Update UI based on player state
  updatePlayerUI(playerId, playerState);
}

// Set up custom controls for a specific player
function setupCustomControls(playerId, player) {
  // Find controls that belong to this player
  const container = document.getElementById(playerId).closest('.video-wrapper') ||
                    document.getElementById(playerId).closest('.video-container');

  if (!container) return;

  const playPauseBtn = container.querySelector('.play-pause');
  const rewindBtn = container.querySelector('.rewind-15');
  const forwardBtn = container.querySelector('.forward-15');
  const fullscreenBtn = container.querySelector('.fullscreen');

  // Play/Pause button
  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', function() {
      const state = player.getPlayerState();
      if (state === YT.PlayerState.PLAYING) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    });
  }

  // Rewind 15 seconds button
  if (rewindBtn) {
    rewindBtn.addEventListener('click', function() {
      const currentTime = player.getCurrentTime();
      player.seekTo(Math.max(0, currentTime - 15), true);
    });
  }

  // Forward 15 seconds button
  if (forwardBtn) {
    forwardBtn.addEventListener('click', function() {
      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();
      player.seekTo(Math.min(duration, currentTime + 15), true);
    });
  }

  // Fullscreen button
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', function() {
      const iframe = player.getIframe();
      if (iframe) {
        requestFullscreen(iframe);
      }
    });
  }
}

// Update UI based on player state
function updatePlayerUI(playerId, playerState) {
  const container = document.getElementById(playerId).closest('.video-wrapper') ||
                    document.getElementById(playerId).closest('.video-container');

  if (!container) return;

  const playPauseBtn = container.querySelector('.play-pause');
  const playIcon = playPauseBtn?.querySelector('.play-icon');
  const pauseIcon = playPauseBtn?.querySelector('.pause-icon');

  if (playIcon && pauseIcon) {
    if (playerState === YT.PlayerState.PLAYING) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }
}

// Cross-browser fullscreen helper function
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

// Add year to footer copyright
document.addEventListener('DOMContentLoaded', function() {
  const yearElements = document.querySelectorAll('.current-year');
  const currentYear = new Date().getFullYear();

  yearElements.forEach(element => {
    element.textContent = currentYear;
  });
});
