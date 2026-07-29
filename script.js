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

/* ---------- Videos ---------- */

async function loadVideos() {
    const response = await fetch("data/videos.yaml");
    const yamlText = await response.text();
    const data = jsyaml.load(yamlText);
    return (data && Array.isArray(data.videos)) ? data.videos : [];
}

function playButtonSvg() {
    return `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
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
        <div class="video-media">
            <img src="https://img.youtube.com/vi/${video.id}/hqdefault.jpg" alt="${video.title}" loading="lazy">
            <button class="play-button" aria-label="Play ${video.title}">
                ${playButtonSvg()}
            </button>
            <span class="video-duration">${video.duration}</span>
        </div>
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
    `;
    history.replaceState(null, "", `#${video.slug}`);
}

async function initVideos() {
    const grid = document.getElementById("video-grid");
    let videos = [];

    try {
        videos = await loadVideos();
    } catch (err) {
        console.error("Failed to load videos.yaml", err);
    }

    if (!videos.length) {
        grid.innerHTML = `<p class="no-videos-message">No videos found.</p>`;
        return;
    }

    videos.forEach((video) => grid.appendChild(renderVideoCard(video)));

    const targetSlug = window.location.hash.replace("#", "");
    if (targetSlug) {
        const targetCard = document.getElementById(targetSlug);
        if (targetCard) {
            targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
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
        option.classList.toggle("active", option.dataset.theme === themeId);
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
