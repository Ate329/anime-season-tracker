// Global state
let manifest = [];
let allAnimeData = [];
let showHentai = false; // Default: OFF
let hideNotRated = false; // Will be set based on season timing
let selectedGenres = new Set(); // Selected genres for filtering
let allGenres = []; // All available genres for current season
let filterMode = 'OR'; // 'OR' or 'AND' - default is OR
let sortMode = 'default'; // 'default', 'rating', 'popularity'
let currentYear = null;
let currentSeason = null;
let searchResults = []; // Store search results
let isSearching = false; // Track if in search mode
/**
 * Load and display collection statistics
 */
async function loadCollectionStats() {
    try {
        const response = await fetch('data/collection-stats.json');
        if (!response.ok) {
            console.log('Collection stats not available');
            return;
        }
        
        const stats = await response.json();
        
        // Update stat displays
        document.getElementById('stat-total-anime').textContent = stats.total_anime.toLocaleString();
        document.getElementById('stat-year-range').textContent = stats.year_range;
        document.getElementById('stat-seasons').textContent = stats.total_seasons;
        document.getElementById('stat-studios').textContent = stats.total_studios.toLocaleString();
        document.getElementById('stat-avg-rating').textContent = stats.average_rating.toFixed(2);
        document.getElementById('stat-rated-percent').textContent = `${stats.rating_percentage}%`;
        document.getElementById('stat-last-updated').textContent = stats.last_updated;
        
    } catch (error) {
        console.error('Error loading collection stats:', error);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadCollectionStats();
    loadManifest();
    setupHentaiToggles();
    setupNotRatedToggle();
    setupFilterModeToggle();
    setupSortButtons();
    setupBackButton();
    setupSearch();
    handleHashNavigation();
    
    // Listen for hash changes (back/forward browser buttons)
    window.addEventListener('hashchange', handleHashNavigation);
});

/**
 * Handle URL hash navigation
 */
function handleHashNavigation() {
    const hash = window.location.hash.substring(1); // Remove #
    
    if (hash) {
        const [year, season] = hash.split('-');
        if (year && season) {
            showAnimePage(year, season);
        } else {
            showHomePage();
        }
    } else {
        showHomePage();
    }
}

/**
 * Show home page
 */
function showHomePage() {
    document.getElementById('home-page').classList.remove('hidden');
    document.getElementById('anime-page').classList.add('hidden');
    window.location.hash = ''; // Clear hash
    allAnimeData = [];
    selectedGenres.clear();
    allGenres = [];
}

/**
 * Show anime page
 */
function showAnimePage(year, season) {
    document.getElementById('home-page').classList.add('hidden');
    document.getElementById('anime-page').classList.remove('hidden');
    window.location.hash = `${year}-${season}`;
    loadSeason(year, season);
}

/**
 * Load manifest and display years
 */
async function loadManifest() {
    try {
        const response = await fetch('data/manifest.json');
        if (!response.ok) throw new Error('Failed to load manifest');
        
        manifest = await response.json();
        displayYears();
    } catch (error) {
        console.error('Error loading manifest:', error);
        showError('Failed to load data. Please try again later.');
    }
}

/**
 * Display all years with their seasons
 */
function displayYears() {
    const container = document.getElementById('years-container');
    container.innerHTML = '';
    
    // Group by year
    const yearGroups = {};
    manifest.forEach(item => {
        if (!yearGroups[item.year]) {
            yearGroups[item.year] = [];
        }
        yearGroups[item.year].push(item);
    });
    
    // Sort years descending
    const years = Object.keys(yearGroups).sort((a, b) => b - a);
    
    // Create year sections
    years.forEach(year => {
        const yearSection = createYearSection(year, yearGroups[year]);
        container.appendChild(yearSection);
    });
}

/**
 * Create a year section with seasons
 */
function createYearSection(year, seasons) {
    const section = document.createElement('div');
    section.className = 'year-section rounded-lg p-6';
    section.style.backgroundColor = 'var(--bg-secondary)';
    section.style.border = '1px solid var(--border-color)';
    
    // Sort seasons
    const seasonOrder = ['winter', 'spring', 'summer', 'fall'];
    const sortedSeasons = seasons.sort((a, b) => 
        seasonOrder.indexOf(a.season) - seasonOrder.indexOf(b.season)
    );
    
    // Season icons
    const seasonIcons = {
        'winter': '❄️',
        'spring': '🌸',
        'summer': '☀️',
        'fall': '🍂'
    };
    
    section.innerHTML = `
        <h2 class="text-2xl font-bold mb-4" style="color: var(--text-primary);">${year}</h2>
        <div class="flex flex-wrap gap-2">
            ${sortedSeasons.map(s => `
                <button 
                    class="season-btn px-4 py-2 rounded-lg font-medium"
                    style="border: 1px solid var(--border-color); color: var(--text-primary);"
                    data-year="${year}"
                    data-season="${s.season}">
                    ${seasonIcons[s.season]} ${capitalize(s.season)} 
                    <span class="text-sm" style="color: var(--text-secondary);">(${s.count})</span>
                </button>
            `).join('')}
        </div>
    `;
    
    // Add click listeners
    section.querySelectorAll('.season-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const year = btn.dataset.year;
            const season = btn.dataset.season;
            showAnimePage(year, season);
        });
    });
    
    return section;
}

/**
 * Determine if "Hide Not Rated" should be ON by default
 * - OFF for upcoming seasons (future)
 * - OFF for first month of current season
 * - ON after first month of current season
 */
function shouldHideNotRatedByDefault(year, season) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    
    // Season start months: Winter=1, Spring=4, Summer=7, Fall=10
    const seasonMonths = {
        'winter': 1,
        'spring': 4,
        'summer': 7,
        'fall': 10
    };
    
    const seasonStartMonth = seasonMonths[season.toLowerCase()];
    
    // Future season (year is in the future)
    if (year > currentYear) {
        return false; // OFF for upcoming seasons
    }
    
    // Past season (year is in the past)
    if (year < currentYear) {
        return true; // ON for past seasons
    }
    
    // Current year - check if it's the current season
    if (year === currentYear) {
        // Check if the season is in the future (hasn't started yet)
        if (currentMonth < seasonStartMonth) {
            return false; // OFF for upcoming seasons in current year
        }
        
        // Check if this is the current season
        let isCurrentSeason = false;
        
        if (season === 'winter' && (currentMonth >= 1 && currentMonth <= 3)) {
            isCurrentSeason = true;
        } else if (season === 'spring' && (currentMonth >= 4 && currentMonth <= 6)) {
            isCurrentSeason = true;
        } else if (season === 'summer' && (currentMonth >= 7 && currentMonth <= 9)) {
            isCurrentSeason = true;
        } else if (season === 'fall' && (currentMonth >= 10 && currentMonth <= 12)) {
            isCurrentSeason = true;
        }
        
        if (isCurrentSeason) {
            // First month of current season -> OFF
            // After first month -> ON
            return currentMonth > seasonStartMonth;
        } else {
            // Past season in current year -> ON
            return true;
        }
    }
    
    // Default: ON
    return true;
}

/**
 * Load and display anime for a season
 */
async function loadSeason(year, season) {
    currentYear = parseInt(year);
    currentSeason = season;
    
    const titleEl = document.getElementById('anime-page-title');
    const loadingEl = document.getElementById('anime-loading');
    const gridEl = document.getElementById('anime-grid');
    
    // Show loading
    loadingEl.classList.remove('hidden');
    gridEl.innerHTML = '';
    
    // Update title
    titleEl.textContent = `${capitalize(season)} ${year}`;
    
    // Set default for "Hide Not Rated" based on season timing
    hideNotRated = shouldHideNotRatedByDefault(currentYear, currentSeason);
    const notRatedToggle = document.getElementById('not-rated-toggle');
    if (notRatedToggle) {
        notRatedToggle.checked = hideNotRated;
    }
    
    try {
        const response = await fetch(`data/${year}/${season}.json`);
        if (!response.ok) throw new Error('Failed to load anime data');
        
        allAnimeData = await response.json();
        
        // Extract all unique genres
        extractGenres();
        
        // Hide loading
        loadingEl.classList.add('hidden');
        
        // Render genre filters and anime
        renderGenreFilters();
        renderAnime();
        
    } catch (error) {
        console.error('Error loading season:', error);
        loadingEl.classList.add('hidden');
        gridEl.innerHTML = '<div class="col-span-full text-center text-gray-600 py-8">Failed to load anime data.</div>';
    }
}

/**
 * Extract all unique genres from current season's anime
 */
function extractGenres() {
    const genreSet = new Set();
    
    allAnimeData.forEach(anime => {
        if (anime.genres && Array.isArray(anime.genres)) {
            anime.genres.forEach(genre => {
                if (genre && genre !== 'Hentai') { // Exclude Hentai from genre filters
                    genreSet.add(genre);
                }
            });
        }
    });
    
    allGenres = Array.from(genreSet).sort();
}

/**
 * Render genre filter buttons
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
        renderAnime();
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
            renderAnime();
        });
        container.appendChild(btn);
    });
}

/**
 * Render anime cards
 */
function renderAnime() {
    const gridEl = document.getElementById('anime-grid');
    gridEl.innerHTML = '';
    
    let filtered = filterAnime(allAnimeData);
    
    // Sort based on sortMode
    filtered = sortAnime(filtered);
    
    if (filtered.length === 0) {
        const div = document.createElement('div');
        div.className = 'col-span-full text-center py-8';
        div.style.color = 'var(--text-secondary)';
        div.textContent = 'No anime found with current filters.';
        gridEl.appendChild(div);
        return;
    }
    
    filtered.forEach(anime => {
        const card = createAnimeCard(anime);
        gridEl.appendChild(card);
    });
}

/**
 * Create anime card
 */
function createAnimeCard(anime) {
    const card = document.createElement('div');
    card.className = 'anime-card rounded-lg overflow-hidden hover:shadow-lg transition-shadow flex flex-col';
    card.style.backgroundColor = 'var(--bg-secondary)';
    card.style.border = '1px solid var(--border-color)';
    
    // Prepare data
    const synopsis = anime.synopsis || 'No synopsis available.';
    const synopsisPreview = synopsis.length > 150 ? synopsis.substring(0, 150) + '...' : synopsis;
    const showReadMore = synopsis.length > 150;
    
    const score = anime.score ? `⭐ ${anime.score}` : '❓ Not rated';
    const scoredBy = anime.scored_by ? `${(anime.scored_by / 1000).toFixed(1)}K ratings` : '';
    const popularity = anime.popularity ? `#${anime.popularity.toLocaleString()}` : 'N/A';
    
    const genres = anime.genres && anime.genres.length > 0 ? 
        anime.genres.join(', ') : 'N/A';
    
    const themes = anime.themes && anime.themes.length > 0 ?
        anime.themes.join(', ') : null;
    
    const studios = anime.studios && anime.studios.length > 0 ?
        anime.studios.join(', ') : 'Unknown';
    
    const source = anime.source || 'Unknown';
    
    const airedFrom = anime.aired_from ? new Date(anime.aired_from).toLocaleDateString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric' 
    }) : 'TBA';
    
    const englishTitle = anime.title_english && anime.title_english !== anime.title ? 
        anime.title_english : null;
    
    card.innerHTML = `
        <div class="aspect-[2/3] bg-gray-100 relative">
            <img 
                src="${anime.image_url || 'https://via.placeholder.com/300x450?text=No+Image'}" 
                alt="${anime.title}"
                class="w-full h-full object-cover"
                onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
            ${anime.episodes ? 
                `<div class="absolute top-2 right-2 bg-black/75 text-white px-2 py-1 rounded text-xs font-medium">
                    ${anime.episodes} eps
                </div>` : 
                ''}
        </div>
        <div class="p-3 flex flex-col flex-grow">
            <div class="space-y-2 flex-grow">
                <div>
                    <h3 class="font-semibold text-sm line-clamp-2 mb-0.5" style="color: var(--text-primary);" title="${anime.title}">
                        ${anime.title}
                    </h3>
                    ${englishTitle ? 
                        `<p class="text-xs line-clamp-1" style="color: var(--text-secondary);" title="${englishTitle}">${englishTitle}</p>` 
                        : ''}
                </div>
                
                <div class="flex items-center justify-between text-xs">
                    <span class="font-medium" style="color: var(--text-primary);">${score}</span>
                    ${scoredBy ? `<span style="color: var(--text-secondary);">${scoredBy}</span>` : ''}
                </div>
                
                <div class="flex items-center justify-between text-xs">
                    <span style="color: var(--text-secondary);">Popularity:</span>
                    <span class="font-medium" style="color: var(--text-primary);">${popularity}</span>
                </div>
                
                <div class="space-y-1 text-xs">
                    <div class="flex">
                        <span style="color: var(--text-secondary);" class="min-w-[60px]">Studio:</span>
                        <span style="color: var(--text-primary);" class="font-medium line-clamp-1">${studios}</span>
                    </div>
                    <div class="flex">
                        <span style="color: var(--text-secondary);" class="min-w-[60px]">Source:</span>
                        <span style="color: var(--text-primary);">${source}</span>
                    </div>
                    <div class="flex">
                        <span style="color: var(--text-secondary);" class="min-w-[60px]">Aired:</span>
                        <span style="color: var(--text-primary);">${airedFrom}</span>
                    </div>
                </div>
                
                <div class="text-xs">
                    <div style="color: var(--text-secondary);" class="mb-1">Genres:</div>
                    <div style="color: var(--text-primary);" class="line-clamp-2">${genres}</div>
                </div>
                
                ${themes ? `
                    <div class="text-xs">
                        <div style="color: var(--text-secondary);" class="mb-1">Themes:</div>
                        <div style="color: var(--text-primary);" class="line-clamp-2">${themes}</div>
                    </div>
                ` : ''}
                
                <div class="synopsis-container">
                    <p class="synopsis-text text-xs leading-relaxed ${showReadMore ? 'line-clamp-3' : ''}" style="color: var(--text-secondary);" data-full-text="${synopsis.replace(/"/g, '&quot;')}">${synopsisPreview}</p>
                    ${showReadMore ? 
                        `<button class="read-more-btn text-xs font-medium mt-1 hover:underline" style="color: var(--text-primary);">
                            Read more
                        </button>` 
                        : ''}
                </div>
            </div>
            
            ${anime.url ? 
                `<a href="${anime.url}" target="_blank" 
                    class="block text-center text-xs bg-gray-900 text-white py-2 rounded hover:bg-gray-800 transition-colors mt-2">
                    View on MyAnimeList →
                </a>` : 
                ''}
        </div>
    `;
    
    // Add read more/less functionality
    if (showReadMore) {
        const readMoreBtn = card.querySelector('.read-more-btn');
        const synopsisText = card.querySelector('.synopsis-text');
        let isExpanded = false;
        
        readMoreBtn.addEventListener('click', () => {
            isExpanded = !isExpanded;
            if (isExpanded) {
                synopsisText.classList.remove('line-clamp-3');
                synopsisText.textContent = synopsis;
                readMoreBtn.textContent = 'Read less';
            } else {
                synopsisText.classList.add('line-clamp-3');
                synopsisText.textContent = synopsisPreview;
                readMoreBtn.textContent = 'Read more';
            }
        });
    }
    
    return card;
}

/**
 * Filter anime based on settings
 */
function filterAnime(animeList) {
    return animeList.filter(anime => {
        // Filter hentai
        if (!showHentai && anime.is_hentai) {
            return false;
        }
        
        // Filter not rated
        if (hideNotRated && (!anime.score || anime.score === null || anime.score === undefined)) {
            return false;
        }
        
        
        // Filter by genres (if any selected)
        if (selectedGenres.size > 0) {
            const animeGenres = anime.genres || [];
            
            if (filterMode === 'OR') {
                // OR mode: anime must have at least one selected genre
                const hasSelectedGenre = Array.from(selectedGenres).some(genre => 
                    animeGenres.includes(genre)
                );
                if (!hasSelectedGenre) {
                    return false;
                }
            } else {
                // AND mode: anime must have all selected genres
                const hasAllGenres = Array.from(selectedGenres).every(genre => 
                    animeGenres.includes(genre)
                );
                if (!hasAllGenres) {
                    return false;
                }
            }
        }
        
        return true;
    });
}

/**
 * Sort anime based on selected sort mode
 */
function sortAnime(animeList) {
    const sorted = [...animeList]; // Create a copy to avoid mutating original
    
    if (sortMode === 'rating') {
        // Sort by score (highest first), then by scored_by for tie-breaking
        sorted.sort((a, b) => {
            const scoreA = a.score || 0;
            const scoreB = b.score || 0;
            if (scoreB !== scoreA) {
                return scoreB - scoreA;
            }
            // Tie-breaker: more ratings first
            return (b.scored_by || 0) - (a.scored_by || 0);
        });
    } else if (sortMode === 'popularity') {
        // Sort by popularity (lower number = more popular)
        sorted.sort((a, b) => {
            const popA = a.popularity || 999999;
            const popB = b.popularity || 999999;
            return popA - popB;
        });
    }
    // 'default' mode: keep original order (as returned by MAL API)
    
    return sorted;
}

/**
 * Setup hentai toggle (anime page only)
 */
function setupHentaiToggles() {
    const togglePage = document.getElementById('hentai-toggle-page');
    
    // Default to OFF (showHentai = false)
    togglePage.checked = false;
    
    togglePage.addEventListener('change', (e) => {
        showHentai = e.target.checked;
        if (allAnimeData.length > 0) {
            renderAnime();
        }
    });
}

/**
 * Setup not rated toggle
 */
function setupNotRatedToggle() {
    const toggle = document.getElementById('not-rated-toggle');
    
    // Default will be set when season loads based on timing
    toggle.checked = false;
    hideNotRated = false;
    
    toggle.addEventListener('change', (e) => {
        hideNotRated = e.target.checked;
        if (allAnimeData.length > 0) {
            renderAnime();
        }
    });
}


/**
 * Setup filter mode toggle (OR/AND)
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
        
        // Re-render anime with new filter mode
        if (allAnimeData.length > 0) {
            renderAnime();
        }
    };
    
    orBtn.addEventListener('click', () => updateFilterMode('OR'));
    andBtn.addEventListener('click', () => updateFilterMode('AND'));
}

/**
 * Setup sort buttons
 */
function setupSortButtons() {
    const defaultBtn = document.getElementById('sort-default');
    const ratingBtn = document.getElementById('sort-rating');
    const popularityBtn = document.getElementById('sort-popularity');
    
    const updateSortMode = (mode) => {
        sortMode = mode;
        
        // Update button styles
        const buttons = [defaultBtn, ratingBtn, popularityBtn];
        const modes = ['default', 'rating', 'popularity'];
        
        buttons.forEach((btn, index) => {
            if (modes[index] === mode) {
                btn.className = 'sort-btn px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white transition-colors';
                // Clear inline styles so CSS class takes effect
                btn.style.backgroundColor = '';
                btn.style.color = '';
                btn.style.border = '';
            } else {
                btn.className = 'sort-btn px-4 py-2 text-sm font-medium rounded-lg transition-colors';
                btn.style.backgroundColor = 'var(--bg-tertiary)';
                btn.style.color = 'var(--text-primary)';
                btn.style.border = '1px solid var(--border-color)';
            }
        });
        
        // Re-render anime with new sort mode
        if (allAnimeData.length > 0) {
            renderAnime();
        }
    };
    
    defaultBtn.addEventListener('click', () => updateSortMode('default'));
    ratingBtn.addEventListener('click', () => updateSortMode('rating'));
    popularityBtn.addEventListener('click', () => updateSortMode('popularity'));
}

/**
 * Setup back button
 */
function setupBackButton() {
    document.getElementById('back-button').addEventListener('click', () => {
        showHomePage();
    });
}

/**
 * Show error message
 */
function showError(message) {
    const container = document.getElementById('years-container');
    const div = document.createElement('div');
    div.className = 'bg-red-50 border border-red-200 rounded-lg p-6 text-center';
    const p = document.createElement('p');
    p.className = 'text-red-800 font-semibold';
    p.textContent = message;
    div.appendChild(p);
    container.innerHTML = '';
    container.appendChild(div);
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Setup search functionality
 */
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const clearButton = document.getElementById('clear-search');
    
    // Search on Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Search on button click
    searchButton.addEventListener('click', () => {
        performSearch();
    });
    
    // Clear search
    clearButton.addEventListener('click', () => {
        clearSearch();
    });
}

/**
 * Perform search across all seasons
 */
async function performSearch() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput.value.trim();
    
    if (!query) {
        return;
    }
    
    // Show loading
    const resultsSection = document.getElementById('search-results-section');
    const loadingEl = document.getElementById('search-loading');
    const resultsGrid = document.getElementById('search-results-grid');
    const queryDisplay = document.getElementById('search-query-display');
    const countEl = document.getElementById('search-results-count');
    
    resultsSection.classList.remove('hidden');
    loadingEl.classList.remove('hidden');
    resultsGrid.innerHTML = '';
    queryDisplay.textContent = `"${query}"`;
    
    // Hide home content
    document.getElementById('collection-stats').classList.add('hidden');
    document.getElementById('years-container').classList.add('hidden');
    
    isSearching = true;
    searchResults = [];
    
    try {
        // Search through all seasons
        const searchPromises = manifest.map(async (item) => {
            try {
                const response = await fetch(`data/${item.year}/${item.season}.json`);
                if (!response.ok) return [];
                
                const seasonData = await response.json();
                const queryLower = query.toLowerCase();
                
                // Filter anime that match the search query
                return seasonData.filter(anime => {
                    const titleMatch = anime.title && anime.title.toLowerCase().includes(queryLower);
                    const englishMatch = anime.title_english && anime.title_english.toLowerCase().includes(queryLower);
                    const japaneseMatch = anime.title_japanese && anime.title_japanese.toLowerCase().includes(queryLower);
                    return titleMatch || englishMatch || japaneseMatch;
                }).map(anime => ({
                    ...anime,
                    searchYear: item.year,
                    searchSeason: item.season
                }));
            } catch (error) {
                console.error(`Error searching ${item.year} ${item.season}:`, error);
                return [];
            }
        });
        
        const results = await Promise.all(searchPromises);
        searchResults = results.flat();
        
        // Hide loading
        loadingEl.classList.add('hidden');
        
        // Display results
        if (searchResults.length === 0) {
            countEl.textContent = 'No results found';
            resultsGrid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <p class="text-lg mb-2" style="color: var(--text-primary);">No anime found matching "${query}"</p>
                    <p class="text-sm" style="color: var(--text-secondary);">Try a different search term</p>
                </div>
            `;
        } else {
            countEl.textContent = `Found ${searchResults.length} anime matching your search`;
            
            // Sort by popularity by default
            searchResults.sort((a, b) => {
                const popA = a.popularity || 999999;
                const popB = b.popularity || 999999;
                return popA - popB;
            });
            
            // Display results
            searchResults.forEach(anime => {
                const card = createAnimeCard(anime);
                
                // Add season info badge
                const seasonBadge = document.createElement('div');
                seasonBadge.className = 'absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium';
                seasonBadge.textContent = `${capitalize(anime.searchSeason)} ${anime.searchYear}`;
                card.querySelector('.aspect-\\[2\\/3\\]').appendChild(seasonBadge);
                
                resultsGrid.appendChild(card);
            });
        }
        
    } catch (error) {
        console.error('Error performing search:', error);
        loadingEl.classList.add('hidden');
        countEl.textContent = 'An error occurred while searching';
        resultsGrid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <p style="color: var(--text-primary);">An error occurred while searching. Please try again.</p>
            </div>
        `;
    }
}

/**
 * Clear search and return to home
 */
function clearSearch() {
    const searchInput = document.getElementById('search-input');
    const resultsSection = document.getElementById('search-results-section');
    
    searchInput.value = '';
    resultsSection.classList.add('hidden');
    
    // Show home content
    document.getElementById('collection-stats').classList.remove('hidden');
    document.getElementById('years-container').classList.remove('hidden');
    
    isSearching = false;
    searchResults = [];
}