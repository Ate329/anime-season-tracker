
let ratingTrendChart = null;
let genreTrendsChart = null;
let genreTrendsPercentageChart = null;
let genreTrendsBySeasonChart = null;
let genreTrendsBySeasonPercentageChart = null;
let productionVolumeChart = null;
let seasonalRatingsChart = null;
let seasonalCountsChart = null;
let studioQuantityChart = null;
let studioQualityChart = null;
let studioScatterChart = null;
let studioScatterFilteredChart = null;
let studioScatterFiltered10Chart = null;
let animeRatingPopularityChart = null;

// Language detection
const isChinese = true;
const dataDir = 'data_cn';

/**
 * Get theme-aware colors for charts
 */
function getChartColors() {
    const isDark = document.documentElement.classList.contains('dark');
    return {
        textColor: isDark ? '#f9fafb' : '#111827',
        gridColor: isDark ? '#374151' : '#e5e7eb',
        borderColor: isDark ? '#6b7280' : '#9ca3af',
        tooltipBg: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(0, 0, 0, 0.8)'
    };
}

/**
 * Configure Chart.js global defaults for theme
 */
function configureChartDefaults() {
    const colors = getChartColors();

    // Set Chart.js defaults
    Chart.defaults.color = colors.textColor;
    Chart.defaults.borderColor = colors.gridColor;
    Chart.defaults.backgroundColor = colors.gridColor;

    // Plugin defaults
    Chart.defaults.plugins.legend.labels.color = colors.textColor;
    Chart.defaults.plugins.tooltip.backgroundColor = colors.tooltipBg;

    // Scale defaults
    Chart.defaults.scale.grid.color = colors.gridColor;
    Chart.defaults.scale.ticks.color = colors.textColor;
    Chart.defaults.scale.title.color = colors.textColor;
}

// Apply defaults on load
configureChartDefaults();

/**
 * Reload all charts with current theme colors
 */
function reloadAllCharts() {
    // Reconfigure Chart.js defaults for new theme
    configureChartDefaults();

    // Destroy existing charts
    if (ratingTrendChart) ratingTrendChart.destroy();
    if (genreTrendsChart) genreTrendsChart.destroy();
    if (genreTrendsPercentageChart) genreTrendsPercentageChart.destroy();
    if (genreTrendsBySeasonChart) genreTrendsBySeasonChart.destroy();
    if (genreTrendsBySeasonPercentageChart) genreTrendsBySeasonPercentageChart.destroy();
    if (productionVolumeChart) productionVolumeChart.destroy();
    if (seasonalRatingsChart) seasonalRatingsChart.destroy();
    if (seasonalCountsChart) seasonalCountsChart.destroy();
    if (studioQuantityChart) studioQuantityChart.destroy();
    if (studioQualityChart) studioQualityChart.destroy();
    if (studioScatterChart) studioScatterChart.destroy();
    if (studioScatterFilteredChart) studioScatterFilteredChart.destroy();
    if (studioScatterFiltered10Chart) studioScatterFiltered10Chart.destroy();
    if (animeRatingPopularityChart) animeRatingPopularityChart.destroy();

    // Reload all data and recreate charts
    loadAllData();
}

/**
 * Load and display rating trend
 */
async function loadRatingTrend() {
    try {
        const response = await fetch(`${dataDir}/rating-trend.json`);
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
        const colors = getChartColors();

        // Calculate moving average
        const movingAvg = calculateMovingAverage(trendData.ratings, 4);

        const isDark = document.documentElement.classList.contains('dark');
        const mainLineColor = isDark ? '#60a5fa' : '#1f2937';
        const mainLineBg = isDark ? 'rgba(96, 165, 250, 0.1)' : 'rgba(31, 41, 55, 0.1)';

        ratingTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.labels,
                datasets: [
                    {
                        label: '平均评分',
                        data: trendData.ratings,
                        borderColor: mainLineColor,
                        backgroundColor: mainLineBg,
                        borderWidth: 2,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        tension: 0.1,
                        fill: true
                    },
                    {
                        label: '移动平均线（4季）',
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
                            color: colors.textColor,
                            font: {
                                size: 12,
                                weight: '600'
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: colors.tooltipBg,
                        padding: 12,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: function (context) {
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
                        grid: {
                            color: colors.gridColor
                        },
                        title: {
                            display: true,
                            text: '年份',
                            color: colors.textColor,
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            color: colors.textColor,
                            maxRotation: 0,
                            minRotation: 0,
                            autoSkip: false
                        }
                    },
                    y: {
                        display: true,
                        grid: {
                            color: colors.gridColor
                        },
                        title: {
                            display: true,
                            text: '平均评分',
                            color: colors.textColor,
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        min: Math.floor(trendData.min_rating - 0.3),
                        max: Math.ceil(trendData.max_rating + 0.3),
                        ticks: {
                            color: colors.textColor,
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
 * Load and display genre trends
 */
async function loadGenreTrends() {
    try {
        const response = await fetch(`${dataDir}/genre-trends.json`);
        if (!response.ok) {
            console.log('Genre trends data not available');
            document.getElementById('genre-trends-section').style.display = 'none';
            return;
        }

        const trendData = await response.json();
        const ctx = document.getElementById('genre-trends-chart').getContext('2d');
        const chartColors = getChartColors();

        // Create datasets for each genre
        const colors = [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
            '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
        ];

        const datasets = trendData.genres.map((genre, index) => ({
            label: genre,
            data: trendData.data[genre],
            borderColor: colors[index % colors.length],
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.3
        }));

        genreTrendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.years,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'right',
                        labels: {
                            font: {
                                size: 11,
                                weight: '600'
                            },
                            boxWidth: 12,
                            padding: 10
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: chartColors.tooltipBg,
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                return context.dataset.label + ': ' + context.parsed.y + ' 部';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: '年份',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: '数量',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        beginAtZero: true
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
        console.error('Error loading genre trends:', error);
        document.getElementById('genre-trends-section').style.display = 'none';
    }
}

/**
 * Load and display production volume
 */
async function loadProductionVolume() {
    try {
        const response = await fetch(`${dataDir}/production-volume.json`);
        if (!response.ok) {
            console.log('Production volume data not available');
            document.getElementById('production-volume-section').style.display = 'none';
            return;
        }

        const volumeData = await response.json();

        // Update statistics
        document.getElementById('total-anime').textContent = volumeData.total_anime.toLocaleString();
        document.getElementById('avg-per-year').textContent = volumeData.avg_per_year.toFixed(1);
        document.getElementById('peak-year').textContent = volumeData.peak_year + ' (' + volumeData.peak_count + ')';

        // Create the chart
        const ctx = document.getElementById('production-volume-chart').getContext('2d');
        const chartColors = getChartColors();

        productionVolumeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: volumeData.years,
                datasets: [{
                    label: '动画数量',
                    data: volumeData.counts,
                    backgroundColor: '#3b82f6',
                    borderColor: '#2563eb',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: chartColors.tooltipBg,
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                return '动画总数: ' + context.parsed.y;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: '年份',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'TV 动画数量',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading production volume:', error);
        document.getElementById('production-volume-section').style.display = 'none';
    }
}


/**
 * Load and display seasonal patterns
 */
async function loadSeasonalPatterns() {
    try {
        const response = await fetch(`${dataDir}/seasonal-patterns.json`);
        if (!response.ok) {
            console.log('Seasonal patterns data not available');
            document.getElementById('seasonal-patterns-section').style.display = 'none';
            return;
        }

        const patternData = await response.json();
        const chartColors = getChartColors();

        // Update statistics
        const seasonMap = {
            'winter': '冬季',
            'spring': '春季',
            'summer': '夏季',
            'fall': '秋季'
        };

        document.getElementById('highest-rated-season').textContent =
            seasonMap[patternData.highest_rated_season] || patternData.highest_rated_season;
        document.getElementById('most-productive-season').textContent =
            seasonMap[patternData.most_productive_season] || patternData.most_productive_season;

        const seasons = patternData.seasons.map(s => seasonMap[s] || s);
        const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

        // Chart 1: Average Ratings by Season
        const ctx1 = document.getElementById('seasonal-ratings-chart').getContext('2d');
        seasonalRatingsChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: seasons,
                datasets: [{
                    label: '平均评分',
                    data: Object.values(patternData.avg_scores),
                    backgroundColor: colors,
                    borderWidth: 0,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: '各季度平均评分',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        backgroundColor: chartColors.tooltipBg,
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                return '平均评分: ' + context.parsed.y.toFixed(2);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        display: true,
                        beginAtZero: false,
                        suggestedMin: Math.max(0, Math.min(...Object.values(patternData.avg_scores)) - 0.3),
                        suggestedMax: Math.max(...Object.values(patternData.avg_scores)) + 0.3,
                        title: {
                            display: true,
                            text: '评分',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });

        // Chart 2: Total Anime Count by Season
        const ctx2 = document.getElementById('seasonal-counts-chart').getContext('2d');
        seasonalCountsChart = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: seasons,
                datasets: [{
                    label: '动画数量',
                    data: Object.values(patternData.counts),
                    backgroundColor: colors,
                    borderWidth: 0,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: '各季度动画总数',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        backgroundColor: chartColors.tooltipBg,
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                return '总数: ' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        display: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '数量',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading seasonal patterns:', error);
        document.getElementById('seasonal-patterns-section').style.display = 'none';
    }
}

/**
 * Load and display studio rankings
 */
async function loadStudioRankings() {
    try {
        const response = await fetch(`${dataDir}/studio-rankings.json`);
        if (!response.ok) {
            console.log('Studio rankings data not available');
            document.getElementById('studio-rankings-section').style.display = 'none';
            return;
        }

        const rankingData = await response.json();
        const chartColors = getChartColors();

        // Chart 1: Top Studios by Quantity
        const ctx1 = document.getElementById('studio-quantity-chart').getContext('2d');
        const studiosQty = rankingData.by_quantity.map(s => s.studio);
        const countsQty = rankingData.by_quantity.map(s => s.count);

        studioQuantityChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: studiosQty,
                datasets: [{
                    label: '动画数量',
                    data: countsQty,
                    backgroundColor: '#3b82f6',
                    borderWidth: 0,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: chartColors.tooltipBg,
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                return '动画总数: ' + context.parsed.x;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '作品数量',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        display: true,
                        ticks: {
                            font: {
                                size: 10
                            }
                        }
                    }
                }
            }
        });

        // Chart 2: Top Studios by Quality
        const ctx2 = document.getElementById('studio-quality-chart').getContext('2d');
        const studiosQual = rankingData.by_quality.map(s => s.studio);
        const scoresQual = rankingData.by_quality.map(s => s.avg_score);

        studioQualityChart = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: studiosQual,
                datasets: [{
                    label: '平均评分',
                    data: scoresQual,
                    backgroundColor: '#10b981',
                    borderWidth: 0,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: chartColors.tooltipBg,
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                const studio = rankingData.by_quality[context.dataIndex];
                                return [
                                    '平均评分: ' + studio.avg_score.toFixed(2),
                                    '动画总数: ' + studio.count,
                                    '已评分: ' + studio.rated_count
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        beginAtZero: false,
                        suggestedMin: Math.max(0, Math.min(...scoresQual) - 0.5),
                        suggestedMax: Math.max(...scoresQual) + 0.3,
                        title: {
                            display: true,
                            text: '平均评分',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        display: true,
                        ticks: {
                            font: {
                                size: 10
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading studio rankings:', error);
        document.getElementById('studio-rankings-section').style.display = 'none';
    }
}


/**
 * Load and display studio scatter plot
 */
async function loadStudioScatter() {
    try {
        const response = await fetch(`${dataDir}/studio-scatter.json`);
        if (!response.ok) {
            console.log('Studio scatter data not available');
            document.getElementById('studio-scatter-section').style.display = 'none';
            return;
        }

        const scatterData = await response.json();
        const chartColors = getChartColors();

        // Update statistics
        document.getElementById('total-studios').textContent = scatterData.total_studios;
        document.getElementById('mean-rating').textContent = scatterData.mean_rating.toFixed(2);
        document.getElementById('mean-count').textContent = scatterData.mean_count.toFixed(1);

        const ctx = document.getElementById('studio-scatter-chart').getContext('2d');

        const scatterPoints = scatterData.studios.map(s => ({
            x: s.avg_rating,
            y: s.anime_count,
            studio: s.name,
            rated_count: s.rated_count
        }));

        studioScatterChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: '制作公司',
                    data: scatterPoints,
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: '制作公司表现: 平均评分 vs 产量',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        backgroundColor: chartColors.tooltipBg,
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                const point = context.raw;
                                return point.studio + ': ' + point.x.toFixed(2) + ' 分, ' + point.y + ' 部动画';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: '平均评分',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        min: 5.0,
                        max: 9.0
                    },
                    y: {
                        title: {
                            display: true,
                            text: '动画数量',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading studio scatter:', error);
        document.getElementById('studio-scatter-section').style.display = 'none';
    }
}

/**
 * Load and display filtered studio scatter plot (5+ anime)
 */
async function loadStudioScatterFiltered() {
    try {
        const response = await fetch(`${dataDir}/studio-scatter-filtered.json`);
        if (!response.ok) {
            console.log('Filtered studio scatter data not available');
            document.getElementById('studio-scatter-filtered-section').style.display = 'none';
            return;
        }

        const scatterData = await response.json();
        const chartColors = getChartColors();

        // Update statistics
        document.getElementById('total-studios-filtered').textContent = scatterData.total_studios;
        document.getElementById('mean-rating-filtered').textContent = scatterData.mean_rating.toFixed(2);
        document.getElementById('mean-count-filtered').textContent = scatterData.mean_count.toFixed(1);

        const ctx = document.getElementById('studio-scatter-filtered-chart').getContext('2d');

        const scatterPoints = scatterData.studios.map(s => ({
            x: s.avg_rating,
            y: s.anime_count,
            studio: s.name,
            rated_count: s.rated_count
        }));

        studioScatterFilteredChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: '制作公司 (5+ 动画)',
                    data: scatterPoints,
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: '制作公司表现 (5+ 动画)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        backgroundColor: chartColors.tooltipBg,
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                const point = context.raw;
                                return point.studio + ': ' + point.x.toFixed(2) + ' 分, ' + point.y + ' 部动画';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: '平均评分',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        min: 5.0,
                        max: 9.0
                    },
                    y: {
                        title: {
                            display: true,
                            text: '动画数量',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading filtered studio scatter:', error);
        document.getElementById('studio-scatter-filtered-section').style.display = 'none';
    }
}

/**
 * Load and display filtered studio scatter plot (10+ anime)
 */
async function loadStudioScatterFiltered10() {
    try {
        const response = await fetch(`${dataDir}/studio-scatter-filtered-10.json`);
        if (!response.ok) {
            console.log('Filtered studio scatter data (10+) not available');
            document.getElementById('studio-scatter-filtered-10-section').style.display = 'none';
            return;
        }

        const scatterData = await response.json();
        const chartColors = getChartColors();

        // Update statistics
        document.getElementById('total-studios-filtered-10').textContent = scatterData.total_studios;
        document.getElementById('mean-rating-filtered-10').textContent = scatterData.mean_rating.toFixed(2);
        document.getElementById('mean-count-filtered-10').textContent = scatterData.mean_count.toFixed(1);

        const ctx = document.getElementById('studio-scatter-filtered-10-chart').getContext('2d');

        const scatterPoints = scatterData.studios.map(s => ({
            x: s.avg_rating,
            y: s.anime_count,
            studio: s.name,
            rated_count: s.rated_count
        }));

        studioScatterFiltered10Chart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: '制作公司 (10+ 动画)',
                    data: scatterPoints,
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: '制作公司表现 (10+ 动画)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        backgroundColor: chartColors.tooltipBg,
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                const point = context.raw;
                                return point.studio + ': ' + point.x.toFixed(2) + ' 分, ' + point.y + ' 部动画';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: '平均评分',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        min: 5.0,
                        max: 9.0
                    },
                    y: {
                        title: {
                            display: true,
                            text: '动画数量',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading filtered studio scatter (10+):', error);
        document.getElementById('studio-scatter-filtered-10-section').style.display = 'none';
    }
}

/**
 * Load and display anime rating vs popularity scatter plot
 */
async function loadAnimeRatingPopularityScatter() {
    try {
        const response = await fetch(`${dataDir}/anime-rating-popularity-scatter.json`);
        if (!response.ok) {
            console.log('Anime rating vs popularity data not available');
            document.getElementById('anime-rating-popularity-section').style.display = 'none';
            return;
        }

        const scatterData = await response.json();
        const chartColors = getChartColors();

        // Update statistics
        document.getElementById('total-rated-anime').textContent = scatterData.total_anime.toLocaleString();
        document.getElementById('mean-anime-rating').textContent = scatterData.mean_score.toFixed(2);
        document.getElementById('mean-anime-popularity').textContent = scatterData.mean_popularity.toFixed(1);

        const ctx = document.getElementById('anime-rating-popularity-chart').getContext('2d');

        const scatterPoints = scatterData.anime.map(a => ({
            x: a.score,
            y: a.popularity,
            title: a.title,
            members: a.members
        }));

        animeRatingPopularityChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: '动画',
                    data: scatterPoints,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: '动画评分 vs 热度',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        backgroundColor: chartColors.tooltipBg,
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                const point = context.raw;
                                return point.title + ': ' + point.x.toFixed(2) + ' 分, 第 ' + point.y + ' 名';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: '评分',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        min: 1.0,
                        max: 10.0
                    },
                    y: {
                        type: 'logarithmic',
                        title: {
                            display: true,
                            text: '热度排名 (越低越热门)',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        reverse: true // Lower rank is better (top)
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading anime rating vs popularity:', error);
        document.getElementById('anime-rating-popularity-section').style.display = 'none';
    }
}

async function loadAllData() {
    loadRatingTrend();
    loadGenreTrends();
    loadProductionVolume();
    loadSeasonalPatterns();
    loadStudioRankings();
    loadStudioScatter();
    loadStudioScatterFiltered();
    loadStudioScatterFiltered10();
    loadAnimeRatingPopularityScatter();
}

// Initial load
loadAllData();
