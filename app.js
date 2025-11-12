// Global state
let manifest = [];
let allAnimeData = [];
let showHentai = false; // Default: OFF
let hideNotRated = false; // Will be set based on season timing
let japaneseOnly = false; // Default: OFF (matching adult content filter style)
let selectedGenres = new Set(); // Selected genres for filtering
let allGenres = []; // All available genres for current season
let filterMode = 'OR'; // 'OR' or 'AND' - default is OR
let currentYear = null;
let currentSeason = null;
let ratingTrendChart = null; // Chart.js instance

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadManifest();
    loadRatingTrend();
    setupHentaiToggles();
    setupNotRatedToggle();
    setupJapaneseOnlyToggle();
    setupFilterModeToggle();
    setupBackButton();
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
    section.className = 'year-section bg-white rounded-lg border border-gray-200 p-6';
    
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
        <h2 class="text-2xl font-bold text-gray-900 mb-4">${year}</h2>
        <div class="flex flex-wrap gap-2">
            ${sortedSeasons.map(s => `
                <button 
                    class="season-btn px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium"
                    data-year="${year}"
                    data-season="${s.season}">
                    ${seasonIcons[s.season]} ${capitalize(s.season)} 
                    <span class="text-sm text-gray-500">(${s.count})</span>
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
        container.innerHTML = '<p class="text-sm text-gray-500">No genres available</p>';
        return;
    }
    
    // Add "All" button
    const allBtn = document.createElement('button');
    allBtn.className = `genre-btn px-3 py-1 rounded-lg border text-sm font-medium ${
        selectedGenres.size === 0 
            ? 'bg-gray-900 text-white border-gray-900' 
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
    }`;
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
        btn.className = `genre-btn px-3 py-1 rounded-lg border text-sm font-medium ${
            isSelected
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`;
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
    
    const filtered = filterAnime(allAnimeData);
    
    if (filtered.length === 0) {
        gridEl.innerHTML = '<div class="col-span-full text-center text-gray-600 py-8">No anime found with current filters.</div>';
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
    card.className = 'anime-card bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow flex flex-col';
    
    // Prepare data
    const synopsis = anime.synopsis || 'No synopsis available.';
    const synopsisPreview = synopsis.length > 150 ? synopsis.substring(0, 150) + '...' : synopsis;
    const showReadMore = synopsis.length > 150;
    
    const score = anime.score ? `⭐ ${anime.score}` : '❓ Not rated';
    const scoredBy = anime.scored_by ? `${(anime.scored_by / 1000).toFixed(1)}K ratings` : '';
    
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
        <div class="p-3 space-y-2 flex flex-col flex-grow">
            <div>
                <h3 class="font-semibold text-sm text-gray-900 line-clamp-2 mb-0.5" title="${anime.title}">
                    ${anime.title}
                </h3>
                ${englishTitle ? 
                    `<p class="text-xs text-gray-500 line-clamp-1" title="${englishTitle}">${englishTitle}</p>` 
                    : ''}
            </div>
            
            <div class="flex items-center justify-between text-xs">
                <span class="font-medium text-gray-900">${score}</span>
                ${scoredBy ? `<span class="text-gray-500">${scoredBy}</span>` : ''}
            </div>
            
            <div class="space-y-1 text-xs">
                <div class="flex">
                    <span class="text-gray-500 min-w-[60px]">Studio:</span>
                    <span class="text-gray-900 font-medium line-clamp-1">${studios}</span>
                </div>
                <div class="flex">
                    <span class="text-gray-500 min-w-[60px]">Source:</span>
                    <span class="text-gray-700">${source}</span>
                </div>
                <div class="flex">
                    <span class="text-gray-500 min-w-[60px]">Aired:</span>
                    <span class="text-gray-700">${airedFrom}</span>
                </div>
            </div>
            
            <div class="text-xs">
                <div class="text-gray-500 mb-1">Genres:</div>
                <div class="text-gray-700 line-clamp-2">${genres}</div>
            </div>
            
            ${themes ? `
                <div class="text-xs">
                    <div class="text-gray-500 mb-1">Themes:</div>
                    <div class="text-gray-700 line-clamp-2">${themes}</div>
                </div>
            ` : ''}
            
            <div class="synopsis-container">
                <p class="synopsis-text text-xs text-gray-600 leading-relaxed ${showReadMore ? 'line-clamp-3' : ''}" data-full-text="${synopsis.replace(/"/g, '&quot;')}">${synopsisPreview}</p>
                ${showReadMore ? 
                    `<button class="read-more-btn text-xs text-gray-900 font-medium mt-1 hover:underline">
                        Read more
                    </button>` 
                    : ''}
            </div>
            
            ${anime.url ? 
                `<a href="${anime.url}" target="_blank" 
                    class="block text-center text-xs bg-gray-900 text-white py-2 rounded hover:bg-gray-800 transition-colors mt-auto">
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
        
        // Filter Japanese only
        if (japaneseOnly) {
            // Check if anime is marked as non-Japanese
            if (anime.is_japanese === false) {
                return false;
            }
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
 * Setup Japanese only toggle
 */
function setupJapaneseOnlyToggle() {
    const toggle = document.getElementById('japanese-only-toggle');
    
    // Default to ON (checked)
    toggle.checked = true;
    japaneseOnly = true;
    
    toggle.addEventListener('change', (e) => {
        japaneseOnly = e.target.checked;
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
    container.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p class="text-red-800 font-semibold">${message}</p>
        </div>
    `;
}

/**
 * Load and display rating trend
 */
async function loadRatingTrend() {
    try {
        const response = await fetch('data/rating-trend.json');
        if (!response.ok) {
            console.log('Rating trend data not available');
            document.getElementById('rating-trend-section').style.display = 'none';
            return;
        }
        
        const trendData = await response.json();
        
        // Update statistics
        document.getElementById('overall-avg').textContent = trendData.overall_average.toFixed(2);
        document.getElementById('highest-avg').textContent = trendData.max_rating.toFixed(2);
        document.getElementById('lowest-avg').textContent = trendData.min_rating.toFixed(2);
        
        // Create the chart
        const ctx = document.getElementById('rating-trend-chart').getContext('2d');
        
        // Calculate moving average
        const movingAvg = calculateMovingAverage(trendData.ratings, 4);
        
        ratingTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.labels,
                datasets: [
                    {
                        label: 'Average Rating',
                        data: trendData.ratings,
                        borderColor: '#1f2937',
                        backgroundColor: 'rgba(31, 41, 55, 0.1)',
                        borderWidth: 2,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        tension: 0.1,
                        fill: true
                    },
                    {
                        label: 'Moving Average (4 seasons)',
                        data: movingAvg,
                        borderColor: '#ef4444',
                        backgroundColor: 'transparent',
                        borderWidth: 3,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                size: 12,
                                weight: '600'
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(2);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Season',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            autoSkip: true,
                            maxTicksLimit: 20
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Average Rating',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        min: Math.floor(trendData.min_rating - 0.3),
                        max: Math.ceil(trendData.max_rating + 0.3),
                        ticks: {
                            stepSize: 0.2
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading rating trend:', error);
        document.getElementById('rating-trend-section').style.display = 'none';
    }
}

/**
 * Calculate moving average
 */
function calculateMovingAverage(data, windowSize) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
        if (i < windowSize - 1) {
            result.push(null);
        } else {
            const sum = data.slice(i - windowSize + 1, i + 1).reduce((a, b) => a + b, 0);
            result.push(sum / windowSize);
        }
    }
    return result;
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
