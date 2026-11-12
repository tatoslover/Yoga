/* Mat & Mind - video grid, inline playback, theme switching */

const THEMES = [
    { id: "forrest", name: "Forest" },
    { id: "ocean", name: "Ocean" },
    { id: "beach", name: "Beach" },
    { id: "water", name: "Water" },
    { id: "lights", name: "Lights" },
    { id: "mountain", name: "Mountain" },
];

const THEME_STORAGE_KEY = "mat-and-mind-theme";

const PREFERS_REDUCED_MOTION = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
).matches;

/* ---------- Videos ---------- */

let allVideos = [];
const activeFilters = { type: null, difficulty: null };

async function loadVideos() {
    const response = await fetch("data/videos.yaml");
    const yamlText = await response.text();
    const data = jsyaml.load(yamlText);
    return (data && Array.isArray(data.videos)) ? data.videos : [];
}

function checkForDuplicates(videos) {
    const seenIds = new Set();
    const seenSlugs = new Set();
    videos.forEach((video) => {
        if (seenIds.has(video.id)) {
            console.warn(`Duplicate video id: ${video.id} (${video.title})`);
        }
        seenIds.add(video.id);

        if (seenSlugs.has(video.slug)) {
            console.warn(`Duplicate video slug: ${video.slug} (${video.title})`);
        }
        seenSlugs.add(video.slug);
    });
}

function playButtonSvg() {
    return `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
}

function closeButtonSvg() {
    return `<svg viewBox="0 0 24 24"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
}

function thumbnailMarkup(video) {
    return `
        <img src="https://img.youtube.com/vi/${video.id}/hqdefault.jpg" alt="${video.title}" loading="lazy">
        <button class="play-button" aria-label="Play ${video.title}">
            ${playButtonSvg()}
        </button>
        <span class="video-duration">${video.duration}</span>
    `;
}

function renderVideoCard(video) {
    const card = document.createElement("article");
    card.className = "video-card";
    card.id = video.slug;

    const meta = [video.type, video.difficulty]
        .filter(Boolean)
        .map((label) => `<span class="badge">${label}</span>`)
        .join("");

    card.innerHTML = `
        <div class="video-media">${thumbnailMarkup(video)}</div>
        <div class="video-card-body">
            <h3 class="video-card-title">${video.title}</h3>
            <div class="video-card-meta">${meta}</div>
            <p class="video-instructor">${video.instructor}</p>
        </div>
    `;

    card.querySelector(".play-button").addEventListener("click", () => {
        playVideo(card, video);
    });

    return card;
}

function playVideo(card, video) {
    const media = card.querySelector(".video-media");
    media.innerHTML = `
        <iframe
            src="https://www.youtube.com/embed/${video.id}?modestbranding=1&rel=0&autoplay=1"
            title="${video.title}"
            allow="accelerate-compute; autoplay; encrypted-media; picture-in-picture"
            allowfullscreen
        ></iframe>
        <button class="close-button" aria-label="Close ${video.title}">
            ${closeButtonSvg()}
        </button>
    `;
    media.querySelector(".close-button").addEventListener("click", (e) => {
        e.stopPropagation();
        stopVideo(card, video);
    });
    history.replaceState(null, "", `#${video.slug}`);
}

function stopVideo(card, video) {
    const media = card.querySelector(".video-media");
    media.innerHTML = thumbnailMarkup(video);
    media.querySelector(".play-button").addEventListener("click", () => {
        playVideo(card, video);
    });
}

function renderGrid(videos) {
    const grid = document.getElementById("video-grid");
    grid.innerHTML = "";

    if (!videos.length) {
        grid.innerHTML = `<p class="no-videos-message">No videos match these filters.</p>`;
        return;
    }

    videos.forEach((video) => grid.appendChild(renderVideoCard(video)));
}

/* ---------- Filtering ---------- */

function uniqueValues(videos, key) {
    return [...new Set(videos.map((video) => video[key]).filter(Boolean))].sort();
}

function updateFilterPillStates() {
    document.querySelectorAll(".filter-pill").forEach((pill) => {
        const key = pill.dataset.filterKey;
        const value = pill.dataset.filterValue || null;
        pill.setAttribute("aria-pressed", String(activeFilters[key] === value));
    });
}

function createFilterPill(label, key, value) {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "filter-pill";
    pill.textContent = label;
    pill.dataset.filterKey = key;
    pill.dataset.filterValue = value || "";
    pill.setAttribute("aria-pressed", String(activeFilters[key] === value));
    pill.addEventListener("click", () => {
        activeFilters[key] = value;
        updateFilterPillStates();
        applyFilters();
    });
    return pill;
}

function renderFilterGroup(container, label, key, values) {
    if (!values.length) return;

    const group = document.createElement("div");
    group.className = "filter-group";

    const groupLabel = document.createElement("span");
    groupLabel.className = "filter-group-label";
    groupLabel.textContent = label;
    group.appendChild(groupLabel);

    group.appendChild(createFilterPill("All", key, null));
    values.forEach((value) => group.appendChild(createFilterPill(value, key, value)));

    container.appendChild(group);
}

function renderFilterBar(videos) {
    const container = document.getElementById("filter-bar");
    const types = uniqueValues(videos, "type");
    const difficulties = uniqueValues(videos, "difficulty");

    renderFilterGroup(container, "Style", "type", types);
    renderFilterGroup(container, "Level", "difficulty", difficulties);
}

function applyFilters() {
    const filtered = allVideos.filter((video) => {
        if (activeFilters.type && video.type !== activeFilters.type) return false;
        if (activeFilters.difficulty && video.difficulty !== activeFilters.difficulty) return false;
        return true;
    });
    renderGrid(filtered);
}

async function initVideos() {
    const grid = document.getElementById("video-grid");
    grid.innerHTML = `<p class="loading-message">Loading videos&hellip;</p>`;

    try {
        allVideos = await loadVideos();
    } catch (err) {
        console.error("Failed to load videos.yaml", err);
        allVideos = [];
    }

    if (!allVideos.length) {
        grid.innerHTML = `<p class="no-videos-message">No videos found.</p>`;
        return;
    }

    checkForDuplicates(allVideos);
    renderFilterBar(allVideos);
    applyFilters();

    const targetSlug = window.location.hash.replace("#", "");
    if (targetSlug) {
        const targetCard = document.getElementById(targetSlug);
        if (targetCard) {
            targetCard.scrollIntoView({
                behavior: PREFERS_REDUCED_MOTION ? "auto" : "smooth",
                block: "center",
            });
        }
    }
}

/* ---------- Theme switcher ---------- */

function getStoredTheme() {
    return localStorage.getItem(THEME_STORAGE_KEY) || "forrest";
}

function applyTheme(themeId) {
    if (!THEMES.find((theme) => theme.id === themeId)) {
        themeId = "forrest";
    }
    document.documentElement.setAttribute("data-theme", themeId);
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
    updateActiveThemeUI(themeId);
}

function updateActiveThemeUI(themeId) {
    document.querySelectorAll(".theme-option").forEach((option) => {
        const isActive = option.dataset.theme === themeId;
        option.classList.toggle("active", isActive);
        option.setAttribute("aria-pressed", String(isActive));
    });
}

function renderThemeOptions() {
    const container = document.getElementById("theme-options");
    THEMES.forEach((theme) => {
        const option = document.createElement("div");
        option.className = "theme-option";
        option.dataset.theme = theme.id;
        option.setAttribute("role", "button");
        option.setAttribute("tabindex", "0");
        option.setAttribute("aria-pressed", "false");
        option.setAttribute("aria-label", `Switch to ${theme.name} theme`);
        option.innerHTML = `
            <div class="theme-preview">
                <img src="assets/themes/${theme.id}-thumb.jpg" alt="${theme.name}" loading="lazy">
            </div>
            <span class="theme-name">${theme.name}</span>
        `;
        option.addEventListener("click", () => applyTheme(theme.id));
        option.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                applyTheme(theme.id);
            }
        });
        container.appendChild(option);
    });
}

function initThemeSwitcher() {
    renderThemeOptions();
    applyTheme(getStoredTheme());

    const switcher = document.querySelector(".theme-switcher");
    const panel = document.querySelector(".theme-panel");
    const closeBtn = document.querySelector(".theme-panel-close");

    switcher.addEventListener("click", () => {
        const isActive = panel.classList.toggle("active");
        switcher.setAttribute("aria-expanded", String(isActive));
    });

    closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        panel.classList.remove("active");
        switcher.setAttribute("aria-expanded", "false");
    });

    document.addEventListener("click", (e) => {
        if (!panel.contains(e.target) && !switcher.contains(e.target)) {
            panel.classList.remove("active");
            switcher.setAttribute("aria-expanded", "false");
        }
    });
}

/* ---------- Init ---------- */

document.addEventListener("DOMContentLoaded", () => {
    initThemeSwitcher();
    initVideos();
});
