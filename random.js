// Global state
let manifest = [];
let selectedGenres = new Set(); // Changed from single genre to Set
let allGenres = []; // Store all available genres
let filterMode = 'OR'; // 'OR' or 'AND' filter mode
let allAnimeCache = []; // Cache all anime for reuse
let allAnimePromise = null; // Track in-flight data fetch
let showHentai = false; // Default OFF
let hideNotRated = true; // Default ON
/**
 * Load the manifest of all available seasons
 */
async function loadManifest() {
    try {
        const response = await fetch('data/manifest.json');
        if (!response.ok) {
            throw new Error('Failed to load manifest');
        }
        manifest = await response.json();
        await loadGenres();
    } catch (error) {
        console.error('Error loading manifest:', error);
        showError('Failed to load anime data. Please refresh the page.');
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
                    const response = await fetch(`data/${item.year}/${item.season}.json`);
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
        showError('Failed to load genres. Please refresh the page.');
    }
}

/**
 * Render genre filter buttons (copied from app.js)
 */
function renderGenreFilters() {
    const container = document.getElementById('genre-filters');
    container.innerHTML = '';
    
    if (allGenres.length === 0) {
        const p = document.createElement('p');
        p.className = 'text-sm';
        p.style.color = 'var(--text-secondary)';
        p.textContent = 'No genres available';
        container.appendChild(p);
        return;
    }
    
    // Add "All" button
    const allBtn = document.createElement('button');
    allBtn.className = 'genre-btn px-3 py-1 rounded-lg text-sm font-medium';
    if (selectedGenres.size === 0) {
        allBtn.className += ' bg-gray-900 text-white';
        allBtn.style.border = '1px solid #111827';
    } else {
        allBtn.style.backgroundColor = 'var(--bg-secondary)';
        allBtn.style.color = 'var(--text-primary)';
        allBtn.style.border = '1px solid var(--border-color)';
    }
    allBtn.textContent = 'All';
    allBtn.addEventListener('click', () => {
        selectedGenres.clear();
        renderGenreFilters();
    });
    container.appendChild(allBtn);
    
    // Add genre buttons
    allGenres.forEach(genre => {
        const btn = document.createElement('button');
        const isSelected = selectedGenres.has(genre);
        btn.className = 'genre-btn px-3 py-1 rounded-lg text-sm font-medium';
        if (isSelected) {
            btn.className += ' bg-gray-900 text-white';
            btn.style.border = '1px solid #111827';
        } else {
            btn.style.backgroundColor = 'var(--bg-secondary)';
            btn.style.color = 'var(--text-primary)';
            btn.style.border = '1px solid var(--border-color)';
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
 * Setup filter mode toggle (copied from app.js)
 */
function setupFilterModeToggle() {
    const orBtn = document.getElementById('filter-mode-or');
    const andBtn = document.getElementById('filter-mode-and');
    const descriptionEl = document.getElementById('filter-mode-description');
    
    const updateFilterMode = (mode) => {
        filterMode = mode;
        
        // Update button styles
        if (mode === 'OR') {
            orBtn.className = 'filter-mode-btn px-3 py-1 text-sm font-medium bg-gray-900 text-white';
            andBtn.className = 'filter-mode-btn px-3 py-1 text-sm font-medium bg-white text-gray-700 hover:bg-gray-50';
            descriptionEl.innerHTML = 'Show anime with <strong>any</strong> of the selected genres';
        } else {
            orBtn.className = 'filter-mode-btn px-3 py-1 text-sm font-medium bg-white text-gray-700 hover:bg-gray-50';
            andBtn.className = 'filter-mode-btn px-3 py-1 text-sm font-medium bg-gray-900 text-white';
            descriptionEl.innerHTML = 'Show anime with <strong>all</strong> of the selected genres';
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
                    <p class="text-2xl font-bold mb-2" style="color: var(--text-primary);">No anime found</p>
                    <p class="text-lg" style="color: var(--text-secondary);">Try adjusting your filters</p>
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
                <p class="text-2xl font-bold" style="color: var(--text-primary);">An error occurred</p>
                <p class="text-lg mt-2" style="color: var(--text-secondary);">Please try again</p>
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
    const scoredBy = anime.scored_by ? `(${anime.scored_by.toLocaleString()} users)` : '';
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
    const synopsis = anime.synopsis || 'No synopsis available.';

    card.innerHTML = `
        <div class="flex flex-row">
            <div class="w-1/3 relative">
                <img
                    src="${anime.image_url || 'https://via.placeholder.com/400x600?text=No+Image'}"
                    alt="${anime.title}"
                    class="w-full h-full object-cover"
                    onerror="this.src='https://via.placeholder.com/400x600?text=No+Image'">
                <div class="absolute top-4 left-4 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium">
                    ${capitalize(anime.season)} ${anime.year}
                </div>
                ${anime.episodes ?
                    `<div class="absolute top-4 right-4 bg-black/75 text-white px-3 py-2 rounded-lg text-sm font-medium">
                        ${anime.episodes} eps
                    </div>` :
                    ''}
            </div>
            <div class="w-2/3 p-6 flex flex-col">
                <div class="mb-4">
                    <h2 class="text-2xl lg:text-3xl font-bold" style="color: var(--text-primary);">${anime.title}</h2>
                    ${englishTitle ? `<p class="text-md lg:text-lg" style="color: var(--text-secondary);">${englishTitle}</p>` : ''}
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-center">
                    <div>
                        <div class="text-xl lg:text-2xl font-bold" style="color: var(--text-primary);">${score}</div>
                        <div class="text-xs lg:text-sm mt-1" style="color: var(--text-secondary);">${scoredBy}</div>
                    </div>
                    <div>
                        <div class="text-xl lg:text-2xl font-bold" style="color: var(--text-primary);">${popularity}</div>
                        <div class="text-sm mt-1" style="color: var(--text-secondary);">Popularity</div>
                    </div>
                    <div>
                        <div class="text-xl lg:text-2xl font-bold" style="color: var(--text-primary);">${studios}</div>
                        <div class="text-sm mt-1" style="color: var(--text-secondary);">Studio</div>
                    </div>
                    <div>
                        <div class="text-xl lg:text-2xl font-bold" style="color: var(--text-primary);">${source}</div>
                        <div class="text-sm mt-1" style="color: var(--text-secondary);">Source</div>
                    </div>
                </div>

                <div class="mb-4">
                    <h3 class="font-semibold mb-1" style="color: var(--text-primary);">Genres</h3>
                    <p class="text-sm" style="color: var(--text-secondary);">${genres}</p>
                    ${themes ? 
                        `<h3 class="font-semibold mt-3 mb-1" style="color: var(--text-primary);">Themes</h3>
                        <p class="text-sm" style="color: var(--text-secondary);">${themes}</p>` : 
                        ''}
                </div>

                <div class="flex-grow min-h-0">
                    <h3 class="font-semibold mb-1" style="color: var(--text-primary);">Synopsis</h3>
                    <p class="leading-relaxed text-sm" style="color: var(--text-primary); max-height: 200px; overflow-y: auto;">${synopsis}</p>
                </div>

                ${anime.url ?
                    `<a href="${anime.url}" target="_blank"
                        class="block text-center mt-4 py-2.5 rounded-lg font-medium transition-colors hover:opacity-80" style="background-color: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);">
                        View on MyAnimeList →
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
            <p class="text-2xl font-bold mb-2" style="color: var(--text-primary);">Error</p>
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

