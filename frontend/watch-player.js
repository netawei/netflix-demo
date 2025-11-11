// watch-player.js
const BACKEND_URL = localStorage.getItem("BackendURL") || 'http://localhost:5001';
const WATCH_HISTORY_BASE = `${BACKEND_URL}/api/watchHistory`;
const CONTENT_BASE = `${BACKEND_URL}/api/content`;

const activeProfile = JSON.parse(localStorage.getItem("activeProfile"));
const userId = activeProfile?.userId || localStorage.getItem("userId");

const params = new URLSearchParams(window.location.search);
const contentId = params.get('contentId');
const seasonNumber = params.get('seasonNumber');
const episodeNumber = params.get('episodeNumber');
const restart = params.get('restart') === '1';

const videoPlayer = document.getElementById('videoPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const progressBar = document.getElementById('progressBar');
const progressFilled = document.getElementById('progressFilled');
const timeDisplay = document.getElementById('timeDisplay');
const rewindBtn = document.getElementById('rewindBtn');
const forwardBtn = document.getElementById('forwardBtn');
const restartBtn = document.getElementById('restartBtn');
const muteBtn = document.getElementById('muteBtn');
const volumeSlider = document.getElementById('volumeSlider');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const closeOverlayBtn = document.getElementById('closeOverlayBtn');
const videoControls = document.getElementById('videoControls');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const episodeDropdownBtn = document.getElementById('episodeDropdownBtn');
const episodeDropdownMenu = document.getElementById('episodeDropdownMenu');
const episodeSelector = document.getElementById('episodeSelector');
const currentEpisodeText = document.getElementById('currentEpisodeText');
const prevEpisodeBtn = document.getElementById('prevEpisodeBtn');
const nextEpisodeBtn = document.getElementById('nextEpisodeBtn');

let contentData = null;
let currentSeasonNum = seasonNumber ? parseInt(seasonNumber) : null;
let currentEpisodeNum = episodeNumber ? parseInt(episodeNumber) : null;
let isSeries = false;
let allSeasons = [];
let saveProgressInterval = null;
let hideControlsTimeout = null;

function showLoading(text = 'Loading...') {
  loadingText.textContent = text;
  loadingOverlay.style.display = 'flex';
}

function hideLoading() {
  loadingOverlay.style.display = 'none';
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

async function loadContent() {
  try {
    showLoading('Loading content...');
    const response = await fetch(`${CONTENT_BASE}/${contentId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load content');
    }
    
    contentData = await response.json();
    isSeries = contentData.type === 'series';
    
    if (isSeries) {
      allSeasons = contentData.seasons || [];
      episodeSelector.style.display = 'block';
      prevEpisodeBtn.style.display = 'flex';
      nextEpisodeBtn.style.display = 'flex';
      
      if (!currentSeasonNum || !currentEpisodeNum) {
        await loadWatchHistory();
      }
      
      setupEpisodeDropdown();
      updateEpisodeButtons();
    }
    
    await loadVideo();
  } catch (error) {
    console.error('Error loading content:', error);
    alert('Error loading content. Please try again.');
    closeOverlay();
  }
}

async function loadWatchHistory() {
  if (!userId) return;
  
  try {
    if (isSeries) {
      const response = await fetch(`${WATCH_HISTORY_BASE}/episode-progress/${userId}/${contentId}`);
      if (response.ok) {
        const data = await response.json();
        
        if (!currentSeasonNum || !currentEpisodeNum) {
          if (data.currentEpisode) {
            currentSeasonNum = data.currentEpisode.seasonNumber;
            currentEpisodeNum = data.currentEpisode.episodeNumber;
          } else if (allSeasons.length > 0 && allSeasons[0].episodes.length > 0) {
            currentSeasonNum = allSeasons[0].seasonNumber;
            currentEpisodeNum = allSeasons[0].episodes[0].episodeNumber;
          }
        }
        
        if (!restart && data.episodeProgress) {
          const episodeProgress = data.episodeProgress.find(
            ep => ep.seasonNumber === currentSeasonNum && ep.episodeNumber === currentEpisodeNum
          );
          if (episodeProgress && episodeProgress.progress > 0) {
            videoPlayer.currentTime = episodeProgress.progress;
          }
        }
      }
    } else {
      const response = await fetch(`${WATCH_HISTORY_BASE}/user/${userId}`);
      if (response.ok) {
        const histories = await response.json();
        const history = histories.find(h => String(h.content._id || h.content) === String(contentId));
        
        if (history && history.progress > 0 && !restart) {
          videoPlayer.currentTime = history.progress;
        }
      }
    }
  } catch (error) {
    console.error('Error loading watch history:', error);
  }
}

async function loadVideo() {
  try {
    let videoUrl = '';
    
    if (isSeries) {
      const season = allSeasons.find(s => s.seasonNumber === currentSeasonNum);
      if (!season) {
        throw new Error('Season not found');
      }
      
      const episode = season.episodes.find(e => e.episodeNumber === currentEpisodeNum);
      if (!episode) {
        throw new Error('Episode not found');
      }
      
      videoUrl = episode.videoUrl;
      currentEpisodeText.textContent = `S${currentSeasonNum}E${currentEpisodeNum}`;
    } else {
      videoUrl = contentData.videoUrl;
    }
    
    if (!videoUrl) {
      throw new Error('Video URL not found');
    }
    
    videoPlayer.src = videoUrl;
    
    if (!restart) {
      await loadWatchHistory();
    }
    
    hideLoading();
    
    videoPlayer.play().catch(err => {
      console.error('Auto-play failed:', err);
    });
    
  } catch (error) {
    console.error('Error loading video:', error);
    alert('Error loading video. Please try again.');
    closeOverlay();
  }
}

function setupEpisodeDropdown() {
  episodeDropdownMenu.innerHTML = '';
  
  allSeasons.forEach(season => {
    const seasonGroup = document.createElement('div');
    seasonGroup.className = 'season-group';
    
    const seasonHeader = document.createElement('div');
    seasonHeader.className = 'season-header';
    seasonHeader.innerHTML = `
      <span>▼</span>
      <span>Season ${season.seasonNumber}</span>
    `;
    
    const seasonEpisodes = document.createElement('div');
    seasonEpisodes.className = 'season-episodes';
    
    season.episodes.forEach(episode => {
      const episodeOption = document.createElement('div');
      episodeOption.className = 'episode-option';
      
      if (season.seasonNumber === currentSeasonNum && episode.episodeNumber === currentEpisodeNum) {
        episodeOption.classList.add('current');
        seasonEpisodes.classList.add('expanded');
      }
      
      episodeOption.innerHTML = `
        <div class="episode-info-dropdown">
          <div class="episode-number-dropdown">Episode ${episode.episodeNumber}</div>
          <div class="episode-title-dropdown">${episode.title || `Episode ${episode.episodeNumber}`}</div>
        </div>
      `;
      
      episodeOption.addEventListener('click', () => {
        changeEpisode(season.seasonNumber, episode.episodeNumber);
        episodeDropdownMenu.classList.remove('open');
      });
      
      seasonEpisodes.appendChild(episodeOption);
    });
    
    seasonHeader.addEventListener('click', () => {
      seasonEpisodes.classList.toggle('expanded');
    });
    
    seasonGroup.appendChild(seasonHeader);
    seasonGroup.appendChild(seasonEpisodes);
    episodeDropdownMenu.appendChild(seasonGroup);
  });
}

async function changeEpisode(newSeasonNum, newEpisodeNum) {
  await saveProgress();
  
  currentSeasonNum = newSeasonNum;
  currentEpisodeNum = newEpisodeNum;
  
  showLoading('Loading episode...');
  await loadVideo();
  updateEpisodeButtons();
  setupEpisodeDropdown();
}

function updateEpisodeButtons() {
  if (!isSeries) return;
  
  const currentSeason = allSeasons.find(s => s.seasonNumber === currentSeasonNum);
  if (!currentSeason) return;
  
  const currentIndex = currentSeason.episodes.findIndex(e => e.episodeNumber === currentEpisodeNum);
  
  // Previous button logic
  if (currentIndex > 0) {
    prevEpisodeBtn.disabled = false;
    prevEpisodeBtn.style.opacity = '1';
  } else if (currentSeasonNum > 1) {
    const prevSeason = allSeasons.find(s => s.seasonNumber === currentSeasonNum - 1);
    prevEpisodeBtn.disabled = !prevSeason || prevSeason.episodes.length === 0;
    prevEpisodeBtn.style.opacity = prevEpisodeBtn.disabled ? '0.3' : '1';
  } else {
    prevEpisodeBtn.disabled = true;
    prevEpisodeBtn.style.opacity = '0.3';
  }
  
  // Next button logic
  if (currentIndex < currentSeason.episodes.length - 1) {
    nextEpisodeBtn.disabled = false;
    nextEpisodeBtn.style.opacity = '1';
  } else if (currentSeasonNum < allSeasons.length) {
    const nextSeason = allSeasons.find(s => s.seasonNumber === currentSeasonNum + 1);
    nextEpisodeBtn.disabled = !nextSeason || nextSeason.episodes.length === 0;
    nextEpisodeBtn.style.opacity = nextEpisodeBtn.disabled ? '0.3' : '1';
  } else {
    nextEpisodeBtn.disabled = true;
    nextEpisodeBtn.style.opacity = '0.3';
  }
}

async function previousEpisode() {
  if (!isSeries) return;
  
  const currentSeason = allSeasons.find(s => s.seasonNumber === currentSeasonNum);
  if (!currentSeason) return;
  
  const currentIndex = currentSeason.episodes.findIndex(e => e.episodeNumber === currentEpisodeNum);
  
  if (currentIndex > 0) {
    await changeEpisode(currentSeasonNum, currentSeason.episodes[currentIndex - 1].episodeNumber);
  } else if (currentSeasonNum > 1) {
    const prevSeason = allSeasons.find(s => s.seasonNumber === currentSeasonNum - 1);
    if (prevSeason && prevSeason.episodes.length > 0) {
      await changeEpisode(prevSeason.seasonNumber, prevSeason.episodes[prevSeason.episodes.length - 1].episodeNumber);
    }
  }
}

async function nextEpisode() {
  if (!isSeries) return;
  
  const currentSeason = allSeasons.find(s => s.seasonNumber === currentSeasonNum);
  if (!currentSeason) return;
  
  const currentIndex = currentSeason.episodes.findIndex(e => e.episodeNumber === currentEpisodeNum);
  
  if (currentIndex < currentSeason.episodes.length - 1) {
    await changeEpisode(currentSeasonNum, currentSeason.episodes[currentIndex + 1].episodeNumber);
  } else if (currentSeasonNum < allSeasons.length) {
    const nextSeason = allSeasons.find(s => s.seasonNumber === currentSeasonNum + 1);
    if (nextSeason && nextSeason.episodes.length > 0) {
      await changeEpisode(nextSeason.seasonNumber, nextSeason.episodes[0].episodeNumber);
    }
  }
}

async function saveProgress() {
  if (!userId || !videoPlayer.currentTime) return;
  
  try {
    if (isSeries) {
      await fetch(`${WATCH_HISTORY_BASE}/episode-progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user: userId,
          content: contentId,
          seasonNumber: currentSeasonNum,
          episodeNumber: currentEpisodeNum,
          progress: videoPlayer.currentTime
        })
      });
    } else {
      await fetch(`${WATCH_HISTORY_BASE}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user: userId,
          content: contentId,
          progress: videoPlayer.currentTime
        })
      });
    }
  } catch (error) {
    console.error('Error saving progress:', error);
  }
}

function closeOverlay() {
  saveProgress();
  
  if (saveProgressInterval) {
    clearInterval(saveProgressInterval);
  }
  
  if (document.referrer && document.referrer.includes(window.location.host)) {
    window.history.back();
  } else {
    window.location.href = 'main-page.html';
  }
}

// Event Listeners
closeOverlayBtn.addEventListener('click', closeOverlay);

playPauseBtn.addEventListener('click', () => {
  if (videoPlayer.paused) {
    videoPlayer.play();
  } else {
    videoPlayer.pause();
  }
});

videoPlayer.addEventListener('play', () => {
  playPauseBtn.textContent = '⏸';
});

videoPlayer.addEventListener('pause', () => {
  playPauseBtn.textContent = '▶';
});

videoPlayer.addEventListener('timeupdate', () => {
  const percent = (videoPlayer.currentTime / videoPlayer.duration) * 100;
  progressFilled.style.width = percent + '%';
  timeDisplay.textContent = `${formatTime(videoPlayer.currentTime)} / ${formatTime(videoPlayer.duration)}`;
});

progressBar.addEventListener('click', (e) => {
  const rect = progressBar.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  videoPlayer.currentTime = percent * videoPlayer.duration;
});

rewindBtn.addEventListener('click', () => {
  videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 10);
});

forwardBtn.addEventListener('click', () => {
  videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 10);
});

restartBtn.addEventListener('click', () => {
  videoPlayer.currentTime = 0;
  videoPlayer.play();
});

prevEpisodeBtn.addEventListener('click', previousEpisode);
nextEpisodeBtn.addEventListener('click', nextEpisode);

volumeSlider.addEventListener('input', (e) => {
  videoPlayer.volume = e.target.value / 100;
  updateMuteIcon();
});

muteBtn.addEventListener('click', () => {
  videoPlayer.muted = !videoPlayer.muted;
  updateMuteIcon();
});

function updateMuteIcon() {
  if (videoPlayer.muted || videoPlayer.volume === 0) {
    muteBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
      </svg>
    `;
  } else {
    muteBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
      </svg>
    `;
  }
}

fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

episodeDropdownBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  episodeDropdownMenu.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (!episodeSelector.contains(e.target)) {
    episodeDropdownMenu.classList.remove('open');
  }
});

let controlsVisible = true;

function showControls() {
  videoControls.classList.add('visible');
  controlsVisible = true;
  
  clearTimeout(hideControlsTimeout);
  hideControlsTimeout = setTimeout(() => {
    if (!videoPlayer.paused) {
      videoControls.classList.remove('visible');
      controlsVisible = false;
    }
  }, 3000);
}

document.addEventListener('mousemove', showControls);
document.addEventListener('touchstart', showControls);

videoPlayer.addEventListener('click', () => {
  if (videoPlayer.paused) {
    videoPlayer.play();
  } else {
    videoPlayer.pause();
  }
});

document.addEventListener('keydown', (e) => {
  switch(e.key) {
    case ' ':
    case 'k':
      e.preventDefault();
      if (videoPlayer.paused) {
        videoPlayer.play();
      } else {
        videoPlayer.pause();
      }
      break;
    case 'ArrowLeft':
      e.preventDefault();
      videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 10);
      break;
    case 'ArrowRight':
      e.preventDefault();
      videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 10);
      break;
    case 'ArrowUp':
      e.preventDefault();
      videoPlayer.volume = Math.min(1, videoPlayer.volume + 0.1);
      volumeSlider.value = videoPlayer.volume * 100;
      break;
    case 'ArrowDown':
      e.preventDefault();
      videoPlayer.volume = Math.max(0, videoPlayer.volume - 0.1);
      volumeSlider.value = videoPlayer.volume * 100;
      break;
    case 'm':
      e.preventDefault();
      videoPlayer.muted = !videoPlayer.muted;
      updateMuteIcon();
      break;
    case 'f':
      e.preventDefault();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
      break;
    case 'Escape':
      if (!document.fullscreenElement) {
        closeOverlay();
      }
      break;
  }
});

saveProgressInterval = setInterval(saveProgress, 5000);
window.addEventListener('beforeunload', saveProgress);

loadContent();