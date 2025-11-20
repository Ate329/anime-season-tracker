// Global state
let manifest = [];
let selectedGenres = new Set(); // Changed from single genre to Set
let allGenres = []; // Store all available genres
let filterMode = 'OR'; // 'OR' or 'AND' filter mode
let allAnimeCache = []; // Cache all anime for reuse
let allAnimePromise = null; // Track in-flight data fetch
let showHentai = false; // Default OFF
let hideNotRated = true; // Default ON

// Language detection
const isChinese = document.documentElement.lang === 'zh';
const dataDir = isChinese ? 'data_cn' : 'data';

// Localization strings
const t = {
    noGenres: isChinese ? '暂无类型' : 'No genres available',
    all: isChinese ? '全部' : 'All',
    showAny: isChinese ? '显示包含<strong>任意</strong>选中类型的动画' : 'Show anime with <strong>any</strong> of the selected genres',
    showAll: isChinese ? '显示包含<strong>所有</strong>选中类型的动画' : 'Show anime with <strong>all</strong> of the selected genres',
    noAnimeFound: isChinese ? '未找到动画' : 'No anime found',
    adjustFilters: isChinese ? '请尝试调整筛选条件' : 'Try adjusting your filters',
    errorOccurred: isChinese ? '发生错误' : 'An error occurred',
    tryAgain: isChinese ? '请重试' : 'Please try again',
    loadError: isChinese ? '加载数据失败，请刷新页面。' : 'Failed to load anime data. Please refresh the page.',
    genreLoadError: isChinese ? '加载类型失败，请刷新页面。' : 'Failed to load genres. Please refresh the page.',
    users: isChinese ? '用户' : 'users',
    popularity: isChinese ? '热度' : 'Popularity',
    studio: isChinese ? '工作室' : 'Studio',
    source: isChinese ? '来源' : 'Source',
    genres: isChinese ? '类型' : 'Genres',
    themes: isChinese ? '题材' : 'Themes',
    synopsis: isChinese ? '简介' : 'Synopsis',
    noSynopsis: isChinese ? '暂无简介。' : 'No synopsis available.',
    viewOn: isChinese ? '在 Bangumi 上查看 →' : 'View on MyAnimeList →',
    winter: isChinese ? '冬' : 'Winter',
    spring: isChinese ? '春' : 'Spring',
    summer: isChinese ? '夏' : 'Summer',
    fall: isChinese ? '秋' : 'Fall',
    eps: isChinese ? '话' : 'eps'
};

/**
 * Load the manifest of all available seasons
 */
async function loadManifest() {
    try {
        const response = await fetch(`${dataDir}/manifest.json`);
        if (!response.ok) {
            throw new Error('Failed to load manifest');
        }
        manifest = await response.json();
        await loadGenres();
    } catch (error) {
        console.error('Error loading manifest:', error);
        showError(t.loadError);
    }
}

/**
 * Load all anime across the manifest (with caching)
 */
async function loadAllAnimeData() {
    if (allAnimeCache.length > 0) {
        return allAnimeCache;
    }

    if (allAnimePromise) {
        return allAnimePromise;
    }

    if (!manifest || manifest.length === 0) {
        return [];
    }

    allAnimePromise = (async () => {
        try {
            const allAnimePromises = manifest.map(async (item) => {
                try {
                    const response = await fetch(`${dataDir}/${item.year}/${item.season}.json`);
                    if (!response.ok) return [];
                    const seasonData = await response.json();
                    return seasonData.map(anime => ({
                        ...anime,
                        year: item.year,
                        season: item.season
                    }));
                } catch (error) {
                    console.error(`Error fetching ${item.year} ${item.season}:`, error);
                    return [];
                }
            });

            const allAnimeArrays = await Promise.all(allAnimePromises);
            allAnimeCache = allAnimeArrays.flat();
            return allAnimeCache;
        } finally {
            allAnimePromise = null;
        }
    })();

    return allAnimePromise;
}

/**
 * Load all genres from all anime
 */
async function loadGenres() {
    try {
        const genreCounts = new Map();
        const allAnime = await loadAllAnimeData();

        allAnime.forEach(anime => {
            if (anime.genres && Array.isArray(anime.genres)) {
                anime.genres.forEach(genre => {
                    if (genre && genre !== 'Hentai') { // Exclude Hentai from genre filters
                        genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
                    }
                });
            }
        });

        // Get top 30 genres by frequency, then sort alphabetically
        allGenres = Array.from(genreCounts.entries())
            .sort((a, b) => b[1] - a[1]) // Sort by count desc
            .slice(0, 30)                // Take top 30
            .map(entry => entry[0])      // Get genre name
            .sort();                     // Sort alphabetically

        renderGenreFilters();
    } catch (error) {
        console.error('Error loading genres:', error);
        showError(t.genreLoadError);
    }
}

/**
 * Render genre filter buttons (Simple style matching index.html)
 */
function renderGenreFilters() {
    const container = document.getElementById('genre-filters');
    container.innerHTML = '';

    if (allGenres.length === 0) {
        const p = document.createElement('p');
        p.className = 'text-sm w-full text-center text-gray-400 italic';
        p.textContent = t.noGenres;
        container.appendChild(p);
        return;
    }

    // Common button class
    const btnClass = 'px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-colors border';

    // Add "All" button
    const allBtn = document.createElement('button');
    const isAllSelected = selectedGenres.size === 0;

    if (isAllSelected) {
        allBtn.className = `${btnClass} bg-gray-900 text-white border-gray-900`;
    } else {
        allBtn.className = `${btnClass} bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600`;
    }

    allBtn.textContent = t.all;
    allBtn.addEventListener('click', () => {
        selectedGenres.clear();
        renderGenreFilters();
    });
    container.appendChild(allBtn);

    // Add genre buttons
    allGenres.forEach(genre => {
        const btn = document.createElement('button');
        const isSelected = selectedGenres.has(genre);

        if (isSelected) {
            btn.className = `${btnClass} bg-gray-900 text-white border-gray-900`;
        } else {
            btn.className = `${btnClass} bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600`;
        }

        btn.textContent = genre;
        btn.addEventListener('click', () => {
            if (isSelected) {
                selectedGenres.delete(genre);
            } else {
                selectedGenres.add(genre);
            }
            renderGenreFilters();
        });
        container.appendChild(btn);
    });
}

/**
 * Setup filter mode toggle (Simple Style)
 */
function setupFilterModeToggle() {
    const orBtn = document.getElementById('filter-mode-or');
    const andBtn = document.getElementById('filter-mode-and');
    const descriptionEl = document.getElementById('filter-mode-description');

    const updateFilterMode = (mode) => {
        filterMode = mode;

        // Button Classes
        const activeClass = 'px-3 py-1 text-xs font-bold bg-gray-900 text-white transition-colors';
        const inactiveClass = 'px-3 py-1 text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors';

        // Update button styles
        if (mode === 'OR') {
            orBtn.className = activeClass;
            andBtn.className = inactiveClass;
            if (descriptionEl) descriptionEl.innerHTML = t.showAny;
        } else {
            orBtn.className = inactiveClass;
            andBtn.className = activeClass;
            if (descriptionEl) descriptionEl.innerHTML = t.showAll;
        }
    };

    orBtn.addEventListener('click', () => updateFilterMode('OR'));
    andBtn.addEventListener('click', () => updateFilterMode('AND'));

    updateFilterMode(filterMode);
}

/**
 * Setup picker content toggles (mature, rated, japanese)
 */
function setupContentFilters() {
    const hentaiToggle = document.getElementById('picker-hentai-toggle');
    const notRatedToggle = document.getElementById('picker-not-rated-toggle');
    if (hentaiToggle) {
        hentaiToggle.checked = showHentai;
        hentaiToggle.addEventListener('change', (e) => {
            showHentai = e.target.checked;
        });
    }

    if (notRatedToggle) {
        hideNotRated = true;
        notRatedToggle.checked = hideNotRated;
        notRatedToggle.addEventListener('change', (e) => {
            hideNotRated = e.target.checked;
        });
    }

}

/**
 * Setup random anime picker
 */
function setupRandomPicker() {
    const ratingSlider = document.getElementById('random-rating');
    const ratingDisplay = document.getElementById('rating-display');
    const getRandomButton = document.getElementById('get-random-anime');
    const getAnotherButton = document.getElementById('get-another-random');
    const closeButton = document.getElementById('close-random');

    // Update rating display as slider moves
    ratingSlider.addEventListener('input', (e) => {
        ratingDisplay.textContent = parseFloat(e.target.value).toFixed(1);
    });

    // Get random anime on button click
    getRandomButton.addEventListener('click', () => {
        getRandomAnime();
    });

    // Get another random anime
    getAnotherButton.addEventListener('click', () => {
        getRandomAnime();
    });

    // Close random result and return to picker
    closeButton.addEventListener('click', () => {
        closeRandomResult();
    });
}

/**
 * Get a random anime based on filters
 */
async function getRandomAnime() {
    const ratingFilter = parseFloat(document.getElementById('random-rating').value);
    const resultSection = document.getElementById('random-result-section');
    const loadingEl = document.getElementById('random-loading');
    const resultCard = document.getElementById('random-result-card');
    const pickerSection = document.getElementById('picker-section');

    // Show loading
    resultSection.classList.remove('hidden');
    loadingEl.classList.remove('hidden');
    resultCard.innerHTML = '';
    pickerSection.classList.add('hidden');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
        let allAnime = await loadAllAnimeData();

        // Apply filters
        let filtered = allAnime.filter(anime => {
            const hasScore = typeof anime.score === 'number' && !Number.isNaN(anime.score);
            const scoreValue = hasScore ? anime.score : 0;

            // Mature content filter
            if (!showHentai && anime.is_hentai) {
                return false;
            }

            // Hide not rated
            if (hideNotRated && !hasScore) {
                return false;
            }


            // Genre filter (multi-select with OR/AND mode)
            if (selectedGenres.size > 0) {
                const animeGenres = anime.genres || [];

                if (filterMode === 'OR') {
                    // OR mode: anime must have at least one of the selected genres
                    const hasAnyGenre = Array.from(selectedGenres).some(genre =>
                        animeGenres.includes(genre)
                    );
                    if (!hasAnyGenre) {
                        return false;
                    }
                } else {
                    // AND mode: anime must have all of the selected genres
                    const hasAllGenres = Array.from(selectedGenres).every(genre =>
                        animeGenres.includes(genre)
                    );
                    if (!hasAllGenres) {
                        return false;
                    }
                }
            }

            // Rating filter
            if (!hasScore && ratingFilter > 0) {
                return false;
            }

            if (hasScore && scoreValue < ratingFilter) {
                return false;
            }

            return true;
        });

        // Hide loading
        loadingEl.classList.add('hidden');

        if (filtered.length === 0) {
            resultCard.innerHTML = `
                <div class="text-center py-16 rounded-xl" style="background-color: var(--bg-secondary); border: 2px solid var(--border-color);">
                    <div class="text-6xl mb-4">😞</div>
                    <p class="text-2xl font-bold mb-2" style="color: var(--text-primary);">${t.noAnimeFound}</p>
                    <p class="text-lg" style="color: var(--text-secondary);">${t.adjustFilters}</p>
                </div>
            `;
            return;
        }

        // Pick a random anime
        const randomIndex = Math.floor(Math.random() * filtered.length);
        const randomAnime = filtered[randomIndex];

        // Display the random anime
        displayRandomAnime(randomAnime);

    } catch (error) {
        console.error('Error getting random anime:', error);
        loadingEl.classList.add('hidden');
        resultCard.innerHTML = `
            <div class="text-center py-16 rounded-xl" style="background-color: var(--bg-secondary); border: 2px solid var(--border-color);">
                <div class="text-6xl mb-4">❌</div>
                <p class="text-2xl font-bold" style="color: var(--text-primary);">${t.errorOccurred}</p>
                <p class="text-lg mt-2" style="color: var(--text-secondary);">${t.tryAgain}</p>
            </div>
        `;
    }
}

/**
 * Display a random anime result
 */
function displayRandomAnime(anime) {
    const resultCard = document.getElementById('random-result-card');

    // Create a larger, featured anime card
    const card = document.createElement('div');
    card.className = 'rounded-xl overflow-hidden shadow-2xl animate-fade-in';
    card.style.backgroundColor = 'var(--bg-secondary)';
    card.style.border = '2px solid var(--border-color)';

    const englishTitle = anime.title_english && anime.title_english !== anime.title ? anime.title_english : '';
    const score = anime.score ? `⭐ ${anime.score.toFixed(2)}` : 'N/A';
    const scoredBy = anime.scored_by ? `(${anime.scored_by.toLocaleString()} ${t.users})` : '';
    const popularity = anime.popularity ? `#${anime.popularity.toLocaleString()}` : 'N/A';
    const studios = anime.studios && anime.studios.length > 0
        ? (typeof anime.studios[0] === 'string'
            ? anime.studios.join(', ')
            : anime.studios.map(s => s.name).join(', '))
        : 'Unknown';
    const source = anime.source || 'Unknown';
    const airedFrom = anime.aired?.from
        ? new Date(anime.aired.from).getFullYear()
        : 'TBA';
    const genres = anime.genres && anime.genres.length > 0
        ? anime.genres.join(', ')
        : 'N/A';
    const themes = anime.themes && anime.themes.length > 0
        ? anime.themes.join(', ')
        : '';
    const synopsis = anime.synopsis || t.noSynopsis;

    // Localize season name
    const seasonName = t[anime.season] || capitalize(anime.season);

    card.innerHTML = `
        <div class="flex flex-row">
            <div class="w-1/3 relative">
                <img
                    src="${anime.image_url || 'https://via.placeholder.com/400x600?text=No+Image'}"
                    alt="${anime.title}"
                    class="w-full h-full object-cover"
                    onerror="this.src='https://via.placeholder.com/400x600?text=No+Image'">
                <div class="absolute top-4 left-4 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium">
                    ${seasonName} ${anime.year}
                </div>
                ${anime.episodes ?
            `<div class="absolute top-4 right-4 bg-black/75 text-white px-3 py-2 rounded-lg text-sm font-medium">
                        ${anime.episodes} ${t.eps}
                    </div>` :
            ''}
            </div>
            <div class="w-2/3 p-6 flex flex-col">
                <div class="mb-4">
                    <h2 class="text-2xl lg:text-3xl font-bold" style="color: var(--text-primary);">${anime.title}</h2>
                    ${isChinese && anime.title_japanese ? `<p class="text-md lg:text-lg" style="color: var(--text-secondary);">${anime.title_japanese}</p>` : ''}
                    ${!isChinese && englishTitle ? `<p class="text-md lg:text-lg" style="color: var(--text-secondary);">${englishTitle}</p>` : ''}
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-center">
                    <div>
                        <div class="text-xl lg:text-2xl font-bold" style="color: var(--text-primary);">${score}</div>
                        <div class="text-xs lg:text-sm mt-1" style="color: var(--text-secondary);">${scoredBy}</div>
                    </div>
                    <div>
                        <div class="text-xl lg:text-2xl font-bold" style="color: var(--text-primary);">${popularity}</div>
                        <div class="text-sm mt-1" style="color: var(--text-secondary);">${t.popularity}</div>
                    </div>
                    <div>
                        <div class="text-xl lg:text-2xl font-bold" style="color: var(--text-primary);">${studios}</div>
                        <div class="text-sm mt-1" style="color: var(--text-secondary);">${t.studio}</div>
                    </div>
                    <div>
                        <div class="text-xl lg:text-2xl font-bold" style="color: var(--text-primary);">${source}</div>
                        <div class="text-sm mt-1" style="color: var(--text-secondary);">${t.source}</div>
                    </div>
                </div>

                <div class="mb-4">
                    <h3 class="font-semibold mb-1" style="color: var(--text-primary);">${t.genres}</h3>
                    <p class="text-sm" style="color: var(--text-secondary);">${genres}</p>
                    ${themes ?
            `<h3 class="font-semibold mt-3 mb-1" style="color: var(--text-primary);">${t.themes}</h3>
                        <p class="text-sm" style="color: var(--text-secondary);">${themes}</p>` :
            ''}
                </div>

                <div class="flex-grow min-h-0">
                    <h3 class="font-semibold mb-1" style="color: var(--text-primary);">${t.synopsis}</h3>
                    <p class="leading-relaxed text-sm" style="color: var(--text-primary); max-height: 200px; overflow-y: auto;">${synopsis}</p>
                </div>

                ${anime.url ?
            `<a href="${anime.url}" target="_blank"
                        class="block text-center mt-4 py-2.5 rounded-lg font-medium transition-colors hover:opacity-80" style="background-color: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);">
                        ${t.viewOn}
                    </a>` :
            ''}
            </div>
        </div>
    `;

    resultCard.appendChild(card);
}

/**
 * Close random anime result and return to picker
 */
function closeRandomResult() {
    const resultSection = document.getElementById('random-result-section');
    const resultCard = document.getElementById('random-result-card');
    const pickerSection = document.getElementById('picker-section');

    resultSection.classList.add('hidden');
    resultCard.innerHTML = '';
    pickerSection.classList.remove('hidden');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Show error message
 */
function showError(message) {
    const resultCard = document.getElementById('random-result-card');
    resultCard.innerHTML = `
        <div class="text-center py-16 rounded-xl" style="background-color: var(--bg-secondary); border: 2px solid var(--border-color);">
            <div class="text-6xl mb-4">❌</div>
            <p class="text-2xl font-bold mb-2" style="color: var(--text-primary);">${t.errorOccurred}</p>
            <p class="text-lg" style="color: var(--text-secondary);">${message}</p>
        </div>
    `;
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    await loadManifest();
    setupFilterModeToggle();
    setupContentFilters();
    setupRandomPicker();
});
