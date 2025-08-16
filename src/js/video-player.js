/**
 * Peaceful Yoga - Video Player
 * Custom YouTube player implementation with distraction-free controls
 */

// YouTube Player instances
const players = {};

// Load YouTube API
function loadYouTubeAPI() {
  if (window.YT) {
    // API already loaded
    initializePlayer();
    return;
  }

  // Create script tag and load API
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  // Function called by YouTube API when ready
  window.onYouTubeIframeAPIReady = initializePlayer;
}

// Initialize the player when on a video page
function initializePlayer() {
  const playerContainer = document.getElementById('player');
  if (!playerContainer) return;

  const videoId = playerContainer.getAttribute('data-video-id');
  if (!videoId) return;

  // Create YouTube player
  players.mainPlayer = new YT.Player('player', {
    videoId: videoId,
    playerVars: {
      rel: 0,                // Don't show related videos
      showinfo: 0,           // Hide video title and uploader info
      modestbranding: 1,     // Hide YouTube logo
      iv_load_policy: 3,     // Hide video annotations
      fs: 1,                 // Allow fullscreen
      controls: 0,           // Hide player controls to use our own
      autoplay: 0,           // Don't autoplay
      playsinline: 1,        // Play inline on mobile
      enablejsapi: 1,        // Enable JS API for custom controls
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

// Player is ready
function onPlayerReady(event) {
  setupCustomControls();

  // Make custom controls visible now that player is ready
  const customControls = document.querySelector('.custom-controls');
  if (customControls) {
    customControls.style.opacity = '1';
  }
}

// Player state has changed
function onPlayerStateChange(event) {
  const player = event.target;
  const state = event.data;

  // Update play/pause button UI
  const playPauseBtn = document.querySelector('.play-pause');
  const playIcon = playPauseBtn.querySelector('.play-icon');
  const pauseIcon = playPauseBtn.querySelector('.pause-icon');

  if (state === YT.PlayerState.PLAYING) {
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'inline-block';
  } else {
    playIcon.style.display = 'inline-block';
    pauseIcon.style.display = 'none';
  }
}

// Set up custom control buttons
function setupCustomControls() {
  // Play/Pause button
  const playPauseBtn = document.querySelector('.play-pause');
  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', function() {
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

  // Rewind 15 seconds button
  const rewindBtn = document.querySelector('.rewind-15');
  if (rewindBtn) {
    rewindBtn.addEventListener('click', function() {
      const player = players.mainPlayer;
      if (!player) return;

      const currentTime = player.getCurrentTime();
      player.seekTo(Math.max(0, currentTime - 15), true);
    });
  }

  // Forward 15 seconds button
  const forwardBtn = document.querySelector('.forward-15');
  if (forwardBtn) {
    forwardBtn.addEventListener('click', function() {
      const player = players.mainPlayer;
      if (!player) return;

      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();
      player.seekTo(Math.min(duration, currentTime + 15), true);
    });
  }

  // Fullscreen button
  const fullscreenBtn = document.querySelector('.fullscreen');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', function() {
      const player = players.mainPlayer;
      if (!player) return;

      const iframe = player.getIframe();
      requestFullscreen(iframe);
    });
  }

  // Make video container also toggle play/pause
  const videoContainer = document.querySelector('.video-container');
  if (videoContainer) {
    videoContainer.addEventListener('click', function(e) {
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

// Add keyboard controls
document.addEventListener('keydown', function(e) {
  const player = players.mainPlayer;
  if (!player) return;

  // Space bar: Play/Pause
  if (e.code === 'Space') {
    e.preventDefault();
    const state = player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  }

  // Left arrow: Rewind 15 seconds
  if (e.code === 'ArrowLeft') {
    e.preventDefault();
    const currentTime = player.getCurrentTime();
    player.seekTo(Math.max(0, currentTime - 15), true);
  }

  // Right arrow: Forward 15 seconds
  if (e.code === 'ArrowRight') {
    e.preventDefault();
    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();
    player.seekTo(Math.min(duration, currentTime + 15), true);
  }

  // F key: Fullscreen
  if (e.code === 'KeyF') {
    e.preventDefault();
    const iframe = player.getIframe();
    requestFullscreen(iframe);
  }
});

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', loadYouTubeAPI);
