"""
Unified script to generate all anime data visualizations.
Creates both static PNG images (for README) and JSON data (for interactive web charts).
"""

import json
import pathlib
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime
from collections import defaultdict, Counter
import statistics
import argparse

# Parse arguments
parser = argparse.ArgumentParser(description='Generate anime data visualizations.')
parser.add_argument('--lang', type=str, default='en', choices=['en', 'cn'], help='Language for data generation (en/cn)')
args = parser.parse_args()

# Configuration
if args.lang == 'cn':
    DATA_DIR = pathlib.Path("data_cn")
    ASSETS_DIR = pathlib.Path("assets_cn")
    print(f"Mode: Chinese (Data: {DATA_DIR}, Assets: {ASSETS_DIR})")
else:
    DATA_DIR = pathlib.Path("data")
    ASSETS_DIR = pathlib.Path("assets")
    print(f"Mode: English (Data: {DATA_DIR}, Assets: {ASSETS_DIR})")

ASSETS_DIR.mkdir(exist_ok=True)

# Localization
TRANSLATIONS = {
    'en': {
        'rating_trend_title': 'Average Anime Rating Trend Over Time',
        'year': 'Year',
        'avg_rating': 'Average Rating',
        'seasonal_avg': 'Seasonal Average',
        'moving_avg': 'Moving Average (4 seasons)',
        'overall_avg': 'Overall Average',
        'genre_trend_title': 'Top 10 Genre Trends Over Time',
        'count': 'Number of Anime',
        'production_title': 'Anime Production Volume by Year',
        'total_anime': 'Total Anime',
        'seasonal_rating_title': 'Seasonal Patterns: Average Rating',
        'seasonal_volume_title': 'Seasonal Patterns: Production Volume',
        'season': 'Season',
        'studio_scatter_title': 'Studio Performance: Quantity vs Quality',
        'studio_count': 'Number of Anime Produced',
        'studio_rank_qty': 'Top 15 Studios by Production Volume',
        'studio_rank_qual': 'Top 15 Studios by Average Quality',
        'studio_scatter_filtered': 'Studio Performance (Filtered: 5+ Anime)',
        'popularity_rank': 'Popularity Rank',
        'score': 'Score',
        'rating_vs_popularity_title': 'Anime Rating vs Popularity',
    },
    'cn': {
        'rating_trend_title': '动画平均评分趋势',
        'year': '年份',
        'avg_rating': '平均评分',
        'seasonal_avg': '季度平均',
        'moving_avg': '移动平均线（4季）',
        'overall_avg': '总体平均',
        'genre_trend_title': '十大类型趋势',
        'count': '数量',
        'production_title': '年度动画产量',
        'total_anime': '总数',
        'seasonal_rating_title': '各季度平均评分',
        'seasonal_volume_title': '各季度产量',
        'season': '季度',
        'studio_scatter_title': '制作公司表现：数量 vs 质量',
        'studio_count': '作品数量',
        'studio_rank_qty': '产量 TOP 15 制作公司',
        'studio_rank_qual': '质量 TOP 15 制作公司',
        'studio_scatter_filtered': '制作公司表现（筛选：5部以上）',
        'popularity_rank': '人气排名',
        'score': '评分',
        'rating_vs_popularity_title': '动画评分 vs 人气',
    }
}

TEXT = TRANSLATIONS[args.lang]

# Font Configuration for Chinese
if args.lang == 'cn':
    # Try Chinese fonts in order of preference
    plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei', 'STSong', 'STHeiti', 'Arial Unicode MS', 'sans-serif']
    plt.rcParams['axes.unicode_minus'] = False  # Fix minus sign display
    # Increase font rendering quality
    plt.rcParams['font.serif'] = ['Microsoft YaHei', 'SimHei', 'STSong', 'serif']
    plt.rcParams['mathtext.fontset'] = 'stix'  # Better math rendering

def load_all_anime_data():
    """Load all anime data from JSON files."""
    all_anime = []
    manifest_path = DATA_DIR / "manifest.json"
    
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    
    for entry in manifest:
        year = entry['year']
        season = entry['season']
        file_path = DATA_DIR / str(year) / f"{season}.json"
        
        if file_path.exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                anime_list = json.load(f)
                # Inject season and year if missing (crucial for Bangumi data)
                for anime in anime_list:
                    if 'season' not in anime:
                        anime['season'] = season
                    if 'year' not in anime:
                        anime['year'] = year
                all_anime.extend(anime_list)
    
    return all_anime, manifest

def generate_rating_trend():
    """Generate rating trend visualization."""
    print("\nGenerating rating trend...")
    
    # Read manifest
    manifest_path = DATA_DIR / "manifest.json"
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    
    # Get current year for filtering
    current_year = datetime.now().year
    
    # Collect rating data
    season_data = []
    
    for entry in manifest:
        year = entry['year']
        season = entry['season']
        
        # Filter to only include 2006 to current year
        if year < 2006 or year > current_year:
            continue
        
        season_file = DATA_DIR / str(year) / f"{season}.json"
        
        if not season_file.exists():
            continue
        
        with open(season_file, 'r', encoding='utf-8') as f:
            anime_list = json.load(f)
        
        ratings = [anime['score'] for anime in anime_list if anime.get('score') is not None]
        
        if ratings:
            avg_rating = statistics.mean(ratings)
            season_month = {'winter': 1, 'spring': 4, 'summer': 7, 'fall': 10}
            date = datetime(year, season_month.get(season, 1), 1)
            
            season_data.append({
                'date': date,
                'avg_rating': avg_rating,
                'count': len(ratings),
                'year': year,
                'season': season
            })
            print(f"  {year} {season}: {avg_rating:.2f} (from {len(ratings)} rated anime)")
    
    # Sort by date
    season_data.sort(key=lambda x: x['date'])
    
    # Prepare data for plotting
    dates = [d['date'] for d in season_data]
    ratings = [d['avg_rating'] for d in season_data]
    
    if not ratings:
        print("No rating data found. Skipping rating trend generation.")
        return

    # Calculate moving average
    window_size = 4
    moving_avg = []
    for i in range(len(ratings)):
        if i < window_size - 1:
            moving_avg.append(None)
        else:
            avg = statistics.mean(ratings[i - window_size + 1:i + 1])
            moving_avg.append(avg)
    
    # Create the plot
    fig, ax = plt.subplots(figsize=(14, 6))
    
    ax.plot(dates, ratings, marker='o', linewidth=2, markersize=4, 
            label=TEXT['seasonal_avg'], color='#1f2937')
    ax.plot(dates, moving_avg, linewidth=3, linestyle='--', 
            label=TEXT['moving_avg'], color='#ef4444')
    
    ax.set_title(TEXT['rating_trend_title'], fontsize=16, fontweight='bold', pad=20)
    ax.set_xlabel(TEXT['year'], fontsize=12, fontweight='bold')
    ax.set_ylabel(TEXT['avg_rating'], fontsize=12, fontweight='bold')
    ax.grid(True, alpha=0.3, linestyle='--')
    ax.legend(loc='best', fontsize=10)
    
    # Format x-axis
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y'))
    ax.xaxis.set_major_locator(mdates.YearLocator(1))
    plt.gcf().autofmt_xdate()
    
    # Y-axis limits
    min_rating = min(ratings)
    max_rating = max(ratings)
    ax.set_ylim(min_rating - 0.3, max_rating + 0.3)
    
    # Overall average line
    overall_avg = statistics.mean(ratings)
    ax.axhline(y=overall_avg, color='#10b981', linestyle=':', linewidth=2, 
               label=f"{TEXT['overall_avg']}: {overall_avg:.2f}", alpha=0.6)
    ax.legend(loc='best', fontsize=10)
    
    plt.tight_layout()
    
    # Save
    output_path = ASSETS_DIR / "rating-trend.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"[OK] Saved rating trend graph to {output_path}")
    
    # Save JSON for web
    labels = []
    prev_year = None
    for d in season_data:
        if d['year'] != prev_year:
            labels.append(str(d['year']))
            prev_year = d['year']
        else:
            labels.append('')
    
    web_data = {
        'labels': labels,
        'dates': [d['date'].strftime('%Y-%m-%d') for d in season_data],
        'ratings': [round(d['avg_rating'], 2) for d in season_data],
        'counts': [d['count'] for d in season_data],
        'overall_average': round(overall_avg, 2),
        'min_rating': round(min(ratings), 2),
        'max_rating': round(max(ratings), 2)
    }
    
    web_data_path = DATA_DIR / "rating-trend.json"
    with open(web_data_path, 'w', encoding='utf-8') as f:
        json.dump(web_data, f, indent=2)
    print(f"[OK] Saved rating trend data to {web_data_path}")

def generate_genre_trends():
    """Generate genre trends visualization."""
    print("\nGenerating genre trends...")
    all_anime, _ = load_all_anime_data()
    
    current_year = datetime.now().year
    
    genre_counts_by_year = defaultdict(lambda: defaultdict(int))
    
    for anime in all_anime:
        year = anime.get('year')
        if not year or year < 2006 or year > current_year:
            continue
        
        genres = anime.get('genres', [])
        for genre in genres:
            if genre:
                genre_counts_by_year[year][genre] += 1
    
    # Top 10 genres
    all_genre_counts = Counter()
    for year_data in genre_counts_by_year.values():
        for genre, count in year_data.items():
            all_genre_counts[genre] += count
    
    top_genres = [genre for genre, _ in all_genre_counts.most_common(10)]
    
    years = sorted(genre_counts_by_year.keys())
    genre_data = {genre: [] for genre in top_genres}
    
    for year in years:
        for genre in top_genres:
            genre_data[genre].append(genre_counts_by_year[year].get(genre, 0))
    
    # Plot
    fig, ax = plt.subplots(figsize=(14, 8))
    
    colors = plt.cm.tab10(range(10))
    for i, genre in enumerate(top_genres):
        ax.plot(years, genre_data[genre], marker='o', label=genre, 
                linewidth=2.5, markersize=5, color=colors[i])
    
    ax.set_xlabel(TEXT['year'], fontsize=12, fontweight='bold')
    ax.set_ylabel(TEXT['count'], fontsize=12, fontweight='bold')
    ax.set_title(TEXT['genre_trend_title'], fontsize=14, fontweight='bold', pad=20)
    ax.legend(loc='upper left', fontsize=10, framealpha=0.9)
    ax.grid(True, alpha=0.3, linestyle='--')
    
    ax.set_xticks(years)
    ax.set_xticklabels(years, rotation=45, ha='right')
    
    plt.tight_layout()
    
    output_path = ASSETS_DIR / "genre-trends.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"[OK] Saved genre trends graph to {output_path}")
    
    # Save JSON
    web_data = {
        'years': years,
        'genres': top_genres,
        'data': {genre: genre_data[genre] for genre in top_genres}
    }
    
    web_data_path = DATA_DIR / "genre-trends.json"
    with open(web_data_path, 'w', encoding='utf-8') as f:
        json.dump(web_data, f, indent=2)
    print(f"[OK] Saved genre trends data to {web_data_path}")

def generate_production_volume():
    """Generate production volume visualization."""
    print("\nGenerating production volume...")
    _, manifest = load_all_anime_data()
    
    current_year = datetime.now().year
    
    volume_by_year = defaultdict(int)
    for entry in manifest:
        year = entry['year']
        if 2006 <= year <= current_year:
            volume_by_year[year] += entry['count']
    
    years = sorted(volume_by_year.keys())
    counts = [volume_by_year[year] for year in years]
    
    # Growth rates
    growth_rates = []
    for i in range(1, len(counts)):
        growth = ((counts[i] - counts[i-1]) / counts[i-1]) * 100
        growth_rates.append(growth)
    
    # Plot
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 10))
    
    # Plot 1: Volume
    ax1.plot(years, counts, marker='o', linewidth=2.5, markersize=6, color='#2563eb')
    ax1.fill_between(years, counts, alpha=0.3, color='#2563eb')
    ax1.set_xlabel(TEXT['year'], fontsize=12, fontweight='bold')
    ax1.set_ylabel(TEXT['count'], fontsize=12, fontweight='bold')
    ax1.set_title(TEXT['production_title'], fontsize=14, fontweight='bold', pad=20)
    ax1.grid(True, alpha=0.3, linestyle='--')
    ax1.set_xticks(years)
    ax1.set_xticklabels([str(y) for y in years], rotation=45, ha='right')
    
    # Add ALL labels
    for year, count in zip(years, counts):
        ax1.annotate(f'{count}', xy=(year, count), xytext=(0, 10),
                    textcoords='offset points', ha='center', fontsize=7)
    
    # Plot 2: Growth rate
    ax2.bar(years[1:], growth_rates, color=['#22c55e' if g >= 0 else '#ef4444' for g in growth_rates])
    ax2.axhline(y=0, color='black', linestyle='-', linewidth=0.8)
    ax2.set_xlabel('Year', fontsize=12, fontweight='bold')
    ax2.set_ylabel('Growth Rate (%)', fontsize=12, fontweight='bold')
    ax2.set_title('Year-over-Year Growth Rate', fontsize=14, fontweight='bold', pad=20)
    ax2.grid(True, alpha=0.3, linestyle='--', axis='y')
    ax2.set_xticks(years[1:])
    ax2.set_xticklabels([str(y) for y in years[1:]], rotation=45, ha='right')
    
    plt.tight_layout()
    
    output_path = ASSETS_DIR / "production-volume.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"[OK] Saved production volume graph to {output_path}")
    
    # Save JSON
    web_data = {
        'years': years,
        'counts': counts,
        'growth_rates': growth_rates,
        'total_anime': sum(counts),
        'avg_per_year': round(sum(counts) / len(counts), 1),
        'peak_year': years[counts.index(max(counts))],
        'peak_count': max(counts)
    }
    
    web_data_path = DATA_DIR / "production-volume.json"
    with open(web_data_path, 'w', encoding='utf-8') as f:
        json.dump(web_data, f, indent=2)
    print(f"[OK] Saved production volume data to {web_data_path}")

def generate_genre_trends_percentage():
    """Generate genre trends as percentage of total production."""
    print("\nGenerating genre trends (percentage)...")
    all_anime, _ = load_all_anime_data()
    
    current_year = datetime.now().year
    
    genre_counts_by_year = defaultdict(lambda: defaultdict(int))
    total_by_year = defaultdict(int)
    
    for anime in all_anime:
        year = anime.get('year')
        if not year or year < 2006 or year > current_year:
            continue
        
        total_by_year[year] += 1
        genres = anime.get('genres', [])
        for genre in genres:
            if genre:
                genre_counts_by_year[year][genre] += 1
    
    # Top 10 genres by total count
    all_genre_counts = Counter()
    for year_data in genre_counts_by_year.values():
        for genre, count in year_data.items():
            all_genre_counts[genre] += count
    
    top_genres = [genre for genre, _ in all_genre_counts.most_common(10)]
    
    years = sorted(genre_counts_by_year.keys())
    genre_percentages = {genre: [] for genre in top_genres}
    
    for year in years:
        total = total_by_year[year]
        for genre in top_genres:
            count = genre_counts_by_year[year].get(genre, 0)
            percentage = (count / total * 100) if total > 0 else 0
            genre_percentages[genre].append(percentage)
    
    # Plot
    fig, ax = plt.subplots(figsize=(14, 8))
    
    colors = plt.cm.tab10(range(10))
    for i, genre in enumerate(top_genres):
        ax.plot(years, genre_percentages[genre], marker='o', label=genre, 
                linewidth=2.5, markersize=5, color=colors[i])
    
    ax.set_xlabel(TEXT['year'], fontsize=12, fontweight='bold')
    ax.set_ylabel(TEXT['genre_trend_title'] + ' (%)', fontsize=12, fontweight='bold')
    ax.set_title(TEXT['genre_trend_title'] + ' (%)', fontsize=14, fontweight='bold', pad=20)
    ax.legend(loc='upper left', fontsize=10, framealpha=0.9)
    ax.grid(True, alpha=0.3, linestyle='--')
    
    ax.set_xticks(years)
    ax.set_xticklabels(years, rotation=45, ha='right')
    
    plt.tight_layout()
    
    output_path = ASSETS_DIR / "genre-trends-percentage.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"[OK] Saved genre trends percentage graph to {output_path}")
    
    # Save JSON
    web_data = {
        'years': years,
        'genres': top_genres,
        'data': {genre: [round(p, 2) for p in genre_percentages[genre]] for genre in top_genres}
    }
    
    web_data_path = DATA_DIR / "genre-trends-percentage.json"
    with open(web_data_path, 'w', encoding='utf-8') as f:
        json.dump(web_data, f, indent=2)
    print(f"[OK] Saved genre trends percentage data to {web_data_path}")

def generate_genre_trends_by_season():
    """Generate genre trends visualization by season."""
    print("\nGenerating genre trends by season...")
    all_anime, manifest = load_all_anime_data()
    
    current_year = datetime.now().year
    
    # Sort manifest chronologically
    season_month = {'winter': 1, 'spring': 4, 'summer': 7, 'fall': 10}
    manifest_sorted = sorted(manifest, key=lambda x: (x['year'], season_month.get(x['season'], 0)))
    
    # Create season labels and count genres per season
    season_labels = []
    genre_counts_by_season = []
    
    for entry in manifest_sorted:
        year = entry['year']
        season = entry['season']
        
        if year < 2006 or year > current_year:
            continue
            
        season_label = f"{season.capitalize()} {year}"
        season_labels.append(season_label)
        
        # Count genres for this specific season
        genre_count = defaultdict(int)
        season_file = DATA_DIR / str(year) / f"{season}.json"
        
        if season_file.exists():
            with open(season_file, 'r', encoding='utf-8') as f:
                anime_list = json.load(f)
            
            for anime in anime_list:
                genres = anime.get('genres', [])
                for genre in genres:
                    if genre:
                        genre_count[genre] += 1
        
        genre_counts_by_season.append(genre_count)
    
    # Get top 10 genres overall
    all_genre_counts = Counter()
    for season_counts in genre_counts_by_season:
        for genre, count in season_counts.items():
            all_genre_counts[genre] += count
    
    top_genres = [genre for genre, _ in all_genre_counts.most_common(10)]
    
    # Build data structure
    genre_data = {genre: [] for genre in top_genres}
    for season_counts in genre_counts_by_season:
        for genre in top_genres:
            genre_data[genre].append(season_counts.get(genre, 0))
    
    # Plot
    fig, ax = plt.subplots(figsize=(20, 8))
    
    colors = plt.cm.tab10(range(10))
    for i, genre in enumerate(top_genres):
        ax.plot(range(len(season_labels)), genre_data[genre], marker='o', label=genre, 
                linewidth=2, markersize=3, color=colors[i])
    
    ax.set_xlabel(TEXT['year'], fontsize=12, fontweight='bold')
    ax.set_ylabel(TEXT['count'], fontsize=12, fontweight='bold')
    ax.set_title(TEXT['genre_trend_title'] + ' (' + TEXT['season'] + ')', fontsize=14, fontweight='bold', pad=20)
    ax.legend(loc='upper left', fontsize=10, framealpha=0.9)
    ax.grid(True, alpha=0.3, linestyle='--')
    
    # Show only years on x-axis (at start of each year - Winter season)
    year_positions = []
    year_labels = []
    for i, label in enumerate(season_labels):
        if label.startswith('Winter'):
            year = label.split()[-1]
            year_positions.append(i)
            year_labels.append(year)
    
    ax.set_xticks(year_positions)
    ax.set_xticklabels(year_labels, rotation=45, ha='right')
    
    plt.tight_layout()
    
    output_path = ASSETS_DIR / "genre-trends-by-season.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"[OK] Saved genre trends by season graph to {output_path}")
    
    # Save JSON
    web_data = {
        'labels': season_labels,
        'genres': top_genres,
        'data': {genre: genre_data[genre] for genre in top_genres}
    }
    
    web_data_path = DATA_DIR / "genre-trends-by-season.json"
    with open(web_data_path, 'w', encoding='utf-8') as f:
        json.dump(web_data, f, indent=2)
    print(f"[OK] Saved genre trends by season data to {web_data_path}")

def generate_genre_trends_by_season_percentage():
    """Generate genre trends by season as percentage of total production."""
    print("\nGenerating genre trends by season (percentage)...")
    all_anime, manifest = load_all_anime_data()
    
    current_year = datetime.now().year
    
    # Sort manifest chronologically
    season_month = {'winter': 1, 'spring': 4, 'summer': 7, 'fall': 10}
    manifest_sorted = sorted(manifest, key=lambda x: (x['year'], season_month.get(x['season'], 0)))
    
    # Create season labels and count genres per season
    season_labels = []
    genre_counts_by_season = []
    total_by_season = []
    
    for entry in manifest_sorted:
        year = entry['year']
        season = entry['season']
        
        if year < 2006 or year > current_year:
            continue
            
        season_label = f"{season.capitalize()} {year}"
        season_labels.append(season_label)
        
        # Count genres for this specific season
        genre_count = defaultdict(int)
        season_file = DATA_DIR / str(year) / f"{season}.json"
        total_count = 0
        
        if season_file.exists():
            with open(season_file, 'r', encoding='utf-8') as f:
                anime_list = json.load(f)
            
            total_count = len(anime_list)
            for anime in anime_list:
                genres = anime.get('genres', [])
                for genre in genres:
                    if genre:
                        genre_count[genre] += 1
        
        genre_counts_by_season.append(genre_count)
        total_by_season.append(total_count)
    
    # Get top 10 genres overall
    all_genre_counts = Counter()
    for season_counts in genre_counts_by_season:
        for genre, count in season_counts.items():
            all_genre_counts[genre] += count
    
    top_genres = [genre for genre, _ in all_genre_counts.most_common(10)]
    
    # Build data structure with percentages
    genre_percentages = {genre: [] for genre in top_genres}
    for i, season_counts in enumerate(genre_counts_by_season):
        total = total_by_season[i]
        for genre in top_genres:
            count = season_counts.get(genre, 0)
            percentage = (count / total * 100) if total > 0 else 0
            genre_percentages[genre].append(percentage)
    
    # Plot
    fig, ax = plt.subplots(figsize=(20, 8))
    
    colors = plt.cm.tab10(range(10))
    for i, genre in enumerate(top_genres):
        ax.plot(range(len(season_labels)), genre_percentages[genre], marker='o', label=genre, 
                linewidth=2, markersize=3, color=colors[i])
    
    ax.set_xlabel('Year', fontsize=12, fontweight='bold')
    ax.set_ylabel('Percentage of Total Anime (%)', fontsize=12, fontweight='bold')
    ax.set_title('Genre Trends by Season - Percentage (Top 10 Genres)', fontsize=14, fontweight='bold', pad=20)
    ax.legend(loc='upper left', fontsize=10, framealpha=0.9)
    ax.grid(True, alpha=0.3, linestyle='--')
    
    # Show only years on x-axis (at start of each year - Winter season)
    year_positions = []
    year_labels = []
    for i, label in enumerate(season_labels):
        if label.startswith('Winter'):
            year = label.split()[-1]
            year_positions.append(i)
            year_labels.append(year)
    
    ax.set_xticks(year_positions)
    ax.set_xticklabels(year_labels, rotation=45, ha='right')
    
    plt.tight_layout()
    
    output_path = ASSETS_DIR / "genre-trends-by-season-percentage.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"[OK] Saved genre trends by season percentage graph to {output_path}")
    
    # Save JSON
    web_data = {
        'labels': season_labels,
        'genres': top_genres,
        'data': {genre: [round(p, 2) for p in genre_percentages[genre]] for genre in top_genres}
    }
    
    web_data_path = DATA_DIR / "genre-trends-by-season-percentage.json"
    with open(web_data_path, 'w', encoding='utf-8') as f:
        json.dump(web_data, f, indent=2)
    print(f"[OK] Saved genre trends by season percentage data to {web_data_path}")

def generate_seasonal_patterns():
    """Generate seasonal patterns visualization."""
    print("\nGenerating seasonal patterns...")
    all_anime, _ = load_all_anime_data()
    
    season_order = ['winter', 'spring', 'summer', 'fall']
    season_stats = {season: {'scores': [], 'count': 0} for season in season_order}
    
    for anime in all_anime:
        season = anime.get('season')
        score = anime.get('score')
        
        if season in season_order:
            season_stats[season]['count'] += 1
            if score:
                season_stats[season]['scores'].append(score)
    
    season_avg_scores = {}
    season_counts = {}
    
    for season in season_order:
        scores = season_stats[season]['scores']
        season_counts[season] = season_stats[season]['count']
        season_avg_scores[season] = sum(scores) / len(scores) if scores else 0
    
    # Plot
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    
    seasons_display = [s.capitalize() for s in season_order]
    avg_scores = [season_avg_scores[s] for s in season_order]
    colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444']
    
    # Chart 1: Ratings
    bars1 = ax1.bar(seasons_display, avg_scores, color=colors, alpha=0.8)
    ax1.set_ylabel(TEXT['avg_rating'], fontsize=12, fontweight='bold')
    ax1.set_title(TEXT['seasonal_rating_title'], fontsize=14, fontweight='bold', pad=20)
    # Dynamic y-axis based on data
    min_score = min(avg_scores)
    max_score = max(avg_scores)
    padding = (max_score - min_score) * 0.2 if max_score > min_score else 0.5
    ax1.set_ylim(max(0, min_score - padding), max_score + padding)
    ax1.grid(True, alpha=0.3, linestyle='--', axis='y')
    
    for bar, score in zip(bars1, avg_scores):
        height = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width()/2., height,
                f'{score:.2f}',
                ha='center', va='bottom', fontweight='bold', fontsize=11)
    
    # Chart 2: Counts
    counts = [season_counts[s] for s in season_order]
    bars2 = ax2.bar(seasons_display, counts, color=colors, alpha=0.8)
    ax2.set_ylabel(TEXT['count'], fontsize=12, fontweight='bold')
    ax2.set_title(TEXT['seasonal_volume_title'], fontsize=14, fontweight='bold', pad=20)
    ax2.grid(True, alpha=0.3, linestyle='--', axis='y')
    
    for bar, count in zip(bars2, counts):
        height = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width()/2., height,
                f'{count}',
                ha='center', va='bottom', fontweight='bold', fontsize=11)
    
    plt.tight_layout()
    
    output_path = ASSETS_DIR / "seasonal-patterns.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"[OK] Saved seasonal patterns graph to {output_path}")
    
    # Save JSON
    web_data = {
        'seasons': season_order,
        'avg_scores': {season: round(season_avg_scores[season], 2) for season in season_order},
        'counts': season_counts,
        'highest_rated_season': max(season_avg_scores.items(), key=lambda x: x[1])[0],
        'most_productive_season': max(season_counts.items(), key=lambda x: x[1])[0]
    }
    
    web_data_path = DATA_DIR / "seasonal-patterns.json"
    with open(web_data_path, 'w', encoding='utf-8') as f:
        json.dump(web_data, f, indent=2)
    print(f"[OK] Saved seasonal patterns data to {web_data_path}")

def generate_studio_rankings():
    """Generate studio rankings visualization."""
    print("\nGenerating studio rankings...")
    all_anime, _ = load_all_anime_data()
    
    current_year = datetime.now().year
    
    studio_anime_counts = defaultdict(list)
    
    for anime in all_anime:
        year = anime.get('year')
        if not year or year < 2006 or year > current_year:
            continue
        
        studios = anime.get('studios', [])
        score = anime.get('score')
        
        for studio in studios:
            if studio:
                studio_anime_counts[studio].append({
                    'score': score,
                    'title': anime.get('title', '')
                })
    
    # Calculate stats
    studio_stats = {}
    for studio, anime_list in studio_anime_counts.items():
        total_count = len(anime_list)
        scores = [a['score'] for a in anime_list if a['score'] is not None]
        avg_score = sum(scores) / len(scores) if scores else 0
        
        studio_stats[studio] = {
            'count': total_count,
            'avg_score': avg_score,
            'rated_count': len(scores)
        }
    
    # Filter for quality (min 10 rated)
    quality_studios = {
        studio: stats for studio, stats in studio_stats.items()
        if stats['rated_count'] >= 10
    }
    
    top_by_quantity = sorted(studio_stats.items(), key=lambda x: x[1]['count'], reverse=True)[:15]
    top_by_quality = sorted(quality_studios.items(), key=lambda x: x[1]['avg_score'], reverse=True)[:15]
    
    # Plot
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 8))
    
    # Chart 1: Quantity
    studios_qty = [item[0] for item in top_by_quantity]
    counts_qty = [item[1]['count'] for item in top_by_quantity]
    
    bars1 = ax1.barh(range(len(studios_qty)), counts_qty, color='#3b82f6')
    ax1.set_yticks(range(len(studios_qty)))
    ax1.set_yticklabels(studios_qty, fontsize=9)
    ax1.set_xlabel(TEXT['studio_count'], fontsize=12, fontweight='bold')
    ax1.set_title(TEXT['studio_rank_qty'], fontsize=14, fontweight='bold', pad=20)
    ax1.grid(True, alpha=0.3, linestyle='--', axis='x')
    ax1.invert_yaxis()
    
    for i, (bar, count) in enumerate(zip(bars1, counts_qty)):
        ax1.text(count, i, f' {count}', va='center', fontsize=9, fontweight='bold')
    
    # Chart 2: Quality
    studios_qual = [item[0] for item in top_by_quality]
    scores_qual = [item[1]['avg_score'] for item in top_by_quality]
    rated_counts = [item[1]['rated_count'] for item in top_by_quality]
    
    bars2 = ax2.barh(range(len(studios_qual)), scores_qual, color='#10b981')
    ax2.set_yticks(range(len(studios_qual)))
    ax2.set_yticklabels(studios_qual, fontsize=9)
    ax2.set_xlabel(TEXT['avg_rating'], fontsize=12, fontweight='bold')
    ax2.set_title(TEXT['studio_rank_qual'], fontsize=14, fontweight='bold', pad=20)
    # Dynamic x-axis based on data
    min_score = min(scores_qual)
    max_score = max(scores_qual)
    padding = (max_score - min_score) * 0.15 if max_score > min_score else 0.5
    ax2.set_xlim(max(0, min_score - padding), max_score + padding)
    ax2.grid(True, alpha=0.3, linestyle='--', axis='x')
    ax2.invert_yaxis()
    
    for i, (bar, score, rated_count) in enumerate(zip(bars2, scores_qual, rated_counts)):
        ax2.text(score, i, f' {score:.2f} ({rated_count} anime)', 
                va='center', fontsize=8, fontweight='bold')
    
    plt.tight_layout()
    
    output_path = ASSETS_DIR / "studio-rankings.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"[OK] Saved studio rankings graph to {output_path}")
    
    # Save JSON
    web_data = {
        'by_quantity': [
            {
                'studio': studio,
                'count': stats['count'],
                'avg_score': round(stats['avg_score'], 2) if stats['avg_score'] > 0 else None
            }
            for studio, stats in top_by_quantity
        ],
        'by_quality': [
            {
                'studio': studio,
                'avg_score': round(stats['avg_score'], 2),
                'count': stats['count'],
                'rated_count': stats['rated_count']
            }
            for studio, stats in top_by_quality
        ]
    }
    
    web_data_path = DATA_DIR / "studio-rankings.json"
    with open(web_data_path, 'w', encoding='utf-8') as f:
        json.dump(web_data, f, indent=2)
    print(f"[OK] Saved studio rankings data to {web_data_path}")

def generate_studio_scatter():
    """Generate scatter plot of studio average rating vs production volume."""
    print("\nGenerating studio scatter plot...")
    all_anime, _ = load_all_anime_data()
    
    current_year = datetime.now().year
    
    # Collect studio data
    studio_anime_data = defaultdict(list)
    
    for anime in all_anime:
        year = anime.get('year')
        if not year or year < 2006 or year > current_year:
            continue
        
        studios = anime.get('studios', [])
        score = anime.get('score')
        
        for studio in studios:
            if studio:  # Only if studio name exists
                studio_anime_data[studio].append({
                    'score': score,
                    'title': anime.get('title', '')
                })
    
    # Calculate average rating and count for each studio
    studio_stats = []
    for studio, anime_list in studio_anime_data.items():
        total_count = len(anime_list)
        scores = [a['score'] for a in anime_list if a['score'] is not None]
        
        if scores:  # Only include studios with at least one rated anime
            avg_score = statistics.mean(scores)
            studio_stats.append({
                'studio': studio,
                'avg_rating': avg_score,
                'anime_count': total_count,
                'rated_count': len(scores)
            })
    
    # Extract data for plotting
    avg_ratings = [s['avg_rating'] for s in studio_stats]
    anime_counts = [s['anime_count'] for s in studio_stats]
    studio_names = [s['studio'] for s in studio_stats]
    
    if not studio_stats:
        print("  [SKIP] No studio data found for scatter plot")
        return

    # Calculate means
    mean_rating = statistics.mean(avg_ratings)
    mean_count = statistics.mean(anime_counts)
    
    print(f"  Total studios: {len(studio_stats)}")
    print(f"  Mean rating: {mean_rating:.2f}")
    print(f"  Mean production count: {mean_count:.1f}")
    
    # Create scatter plot
    fig, ax = plt.subplots(figsize=(14, 10))
    
    # Plot scatter points
    scatter = ax.scatter(avg_ratings, anime_counts, alpha=0.6, s=50, c='#3b82f6', edgecolors='white', linewidth=0.5)
    
    # Add mean lines
    ax.axvline(x=mean_rating, color='#ef4444', linestyle='--', linewidth=2.5, 
               label=f'Mean Rating: {mean_rating:.2f}', alpha=0.8)
    ax.axhline(y=mean_count, color='#22c55e', linestyle='--', linewidth=2.5, 
               label=f'Mean Production Count: {mean_count:.1f}', alpha=0.8)
    
    # Label notable studios (high volume or high rating)
    # Top 5 by volume and top 5 by rating
    top_by_volume = sorted(studio_stats, key=lambda x: x['anime_count'], reverse=True)[:5]
    top_by_rating = sorted([s for s in studio_stats if s['rated_count'] >= 10], 
                          key=lambda x: x['avg_rating'], reverse=True)[:5]
    
    notable_studios = set([s['studio'] for s in top_by_volume] + [s['studio'] for s in top_by_rating])
    
    for stats in studio_stats:
        if stats['studio'] in notable_studios:
            ax.annotate(stats['studio'], 
                       xy=(stats['avg_rating'], stats['anime_count']),
                       xytext=(5, 5), textcoords='offset points',
                       fontsize=8, alpha=0.7, fontweight='bold')
    
    # Labels and title
    ax.set_xlabel(TEXT['avg_rating'], fontsize=12, fontweight='bold')
    ax.set_ylabel(TEXT['studio_count'], fontsize=12, fontweight='bold')
    ax.set_title(TEXT['studio_scatter_title'], fontsize=14, fontweight='bold', pad=20)
    ax.grid(True, alpha=0.3, linestyle='--')
    ax.legend(loc='upper left', fontsize=11, framealpha=0.9)
    
    plt.tight_layout()
    
    # Save PNG
    output_path = ASSETS_DIR / "studio-scatter.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"[OK] Saved studio scatter plot to {output_path}")
    
    # Save JSON data
    web_data = {
        'studios': [
            {
                'name': s['studio'],
                'avg_rating': round(s['avg_rating'], 2),
                'anime_count': s['anime_count'],
                'rated_count': s['rated_count']
            }
            for s in studio_stats
        ],
        'mean_rating': round(mean_rating, 2),
        'mean_count': round(mean_count, 1),
        'total_studios': len(studio_stats)
    }
    
    web_data_path = DATA_DIR / "studio-scatter.json"
    with open(web_data_path, 'w', encoding='utf-8') as f:
        json.dump(web_data, f, indent=2)
    print(f"[OK] Saved studio scatter data to {web_data_path}")

def generate_studio_scatter_filtered():
    """Generate scatter plot of studio average rating vs production volume (filtered: 5+ anime)."""
    print("\nGenerating studio scatter plot (filtered: 5+ anime)...")
    all_anime, _ = load_all_anime_data()
    
    current_year = datetime.now().year
    
    # Collect studio data
    studio_anime_data = defaultdict(list)
    
    for anime in all_anime:
        year = anime.get('year')
        if not year or year < 2006 or year > current_year:
            continue
        
        studios = anime.get('studios', [])
        score = anime.get('score')
        
        for studio in studios:
            if studio:  # Only if studio name exists
                studio_anime_data[studio].append({
                    'score': score,
                    'title': anime.get('title', '')
                })
    
    # Calculate average rating and count for each studio, FILTER for 5+ anime
    studio_stats = []
    for studio, anime_list in studio_anime_data.items():
        total_count = len(anime_list)
        
        # Filter: only include studios with 5 or more anime
        if total_count < 5:
            continue
            
        scores = [a['score'] for a in anime_list if a['score'] is not None]
        
        if scores:  # Only include studios with at least one rated anime
            avg_score = statistics.mean(scores)
            studio_stats.append({
                'studio': studio,
                'avg_rating': avg_score,
                'anime_count': total_count,
                'rated_count': len(scores)
            })
    
    # Extract data for plotting
    avg_ratings = [s['avg_rating'] for s in studio_stats]
    anime_counts = [s['anime_count'] for s in studio_stats]
    studio_names = [s['studio'] for s in studio_stats]
    
    if not studio_stats:
        print("  [SKIP] No studio data found for filtered scatter plot")
        return

    # Calculate means
    mean_rating = statistics.mean(avg_ratings)
    mean_count = statistics.mean(anime_counts)
    
    print(f"  Total studios (5+ anime): {len(studio_stats)}")
    print(f"  Mean rating: {mean_rating:.2f}")
    print(f"  Mean production count: {mean_count:.1f}")
    
    # Create scatter plot
    fig, ax = plt.subplots(figsize=(14, 10))
    
    # Plot scatter points
    scatter = ax.scatter(avg_ratings, anime_counts, alpha=0.6, s=50, c='#3b82f6', edgecolors='white', linewidth=0.5)
    
    # Add mean lines
    ax.axvline(x=mean_rating, color='#ef4444', linestyle='--', linewidth=2.5, 
               label=f'Mean Rating: {mean_rating:.2f}', alpha=0.8)
    ax.axhline(y=mean_count, color='#22c55e', linestyle='--', linewidth=2.5, 
               label=f'Mean Production Count: {mean_count:.1f}', alpha=0.8)
    
    # Label notable studios (high volume or high rating)
    # Top 5 by volume and top 5 by rating
    top_by_volume = sorted(studio_stats, key=lambda x: x['anime_count'], reverse=True)[:5]
    top_by_rating = sorted([s for s in studio_stats if s['rated_count'] >= 10], 
                          key=lambda x: x['avg_rating'], reverse=True)[:5]
    
    notable_studios = set([s['studio'] for s in top_by_volume] + [s['studio'] for s in top_by_rating])
    
    for stats in studio_stats:
        if stats['studio'] in notable_studios:
            ax.annotate(stats['studio'], 
                       xy=(stats['avg_rating'], stats['anime_count']),
                       xytext=(5, 5), textcoords='offset points',
                       fontsize=8, alpha=0.7, fontweight='bold') 
    # Save PNG
    output_path = ASSETS_DIR / "studio-scatter-filtered.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"[OK] Saved filtered studio scatter plot to {output_path}")
    
    # Save JSON data
    web_data = {
        'studios': [
            {
                'name': s['studio'],
                'avg_rating': round(s['avg_rating'], 2),
                'anime_count': s['anime_count'],
                'rated_count': s['rated_count']
            }
            for s in studio_stats
        ],
        'mean_rating': round(mean_rating, 2),
        'mean_count': round(mean_count, 1),
        'total_studios': len(studio_stats),
        'min_anime_count': 5
    }
    
    web_data_path = DATA_DIR / "studio-scatter-filtered.json"
    with open(web_data_path, 'w', encoding='utf-8') as f:
        json.dump(web_data, f, indent=2)
    print(f"[OK] Saved filtered studio scatter data to {web_data_path}")

def generate_studio_scatter_filtered_10():
    """Generate scatter plot of studio average rating vs production volume (filtered: 10+ anime)."""
    print("\nGenerating studio scatter plot (filtered: 10+ anime)...")
    all_anime, _ = load_all_anime_data()
    
    current_year = datetime.now().year
    
    # Collect studio data
    studio_anime_data = defaultdict(list)
    
    for anime in all_anime:
        year = anime.get('year')
        if not year or year < 2006 or year > current_year:
            continue
        
        studios = anime.get('studios', [])
        score = anime.get('score')
        
        for studio in studios:
            if studio:  # Only if studio name exists
                studio_anime_data[studio].append({
                    'score': score,
                    'title': anime.get('title', '')
                })
    
    # Calculate average rating and count for each studio, FILTER for 10+ anime
    studio_stats = []
    for studio, anime_list in studio_anime_data.items():
        total_count = len(anime_list)
        
        # Filter: only include studios with 10 or more anime
        if total_count < 10:
            continue
            
        scores = [a['score'] for a in anime_list if a['score'] is not None]
        
        if scores:  # Only include studios with at least one rated anime
            avg_score = statistics.mean(scores)
            studio_stats.append({
                'studio': studio,
                'avg_rating': avg_score,
                'anime_count': total_count,
                'rated_count': len(scores)
            })
    
    # Extract data for plotting
    avg_ratings = [s['avg_rating'] for s in studio_stats]
    anime_counts = [s['anime_count'] for s in studio_stats]
    studio_names = [s['studio'] for s in studio_stats]
    
    # Check if we have enough data
    if not studio_stats:
        print(f"  [SKIP] No studios found with 10+ anime")
        return
    
    # Calculate means
    mean_rating = statistics.mean(avg_ratings)
    mean_count = statistics.mean(anime_counts)
    
    print(f"  Total studios (10+ anime): {len(studio_stats)}")
    print(f"  Mean rating: {mean_rating:.2f}")
    print(f"  Mean production count: {mean_count:.1f}")
    
    # Create scatter plot
    fig, ax = plt.subplots(figsize=(14, 10))
    
    # Plot scatter points
    scatter = ax.scatter(avg_ratings, anime_counts, alpha=0.6, s=50, c='#3b82f6', edgecolors='white', linewidth=0.5)
    
    # Add mean lines
    ax.axvline(x=mean_rating, color='#ef4444', linestyle='--', linewidth=2.5, 
               label=f'Mean Rating: {mean_rating:.2f}', alpha=0.8)
    ax.axhline(y=mean_count, color='#22c55e', linestyle='--', linewidth=2.5, 
               label=f'Mean Production Count: {mean_count:.1f}', alpha=0.8)
    
    # Label notable studios (high volume or high rating)
    # Top 5 by volume and top 5 by rating
    top_by_volume = sorted(studio_stats, key=lambda x: x['anime_count'], reverse=True)[:5]
    top_by_rating = sorted([s for s in studio_stats if s['rated_count'] >= 10], 
                          key=lambda x: x['avg_rating'], reverse=True)[:5]
    
    notable_studios = set([s['studio'] for s in top_by_volume] + [s['studio'] for s in top_by_rating])
    
    for stats in studio_stats:
        if stats['studio'] in notable_studios:
            ax.annotate(stats['studio'], 
                       xy=(stats['avg_rating'], stats['anime_count']),
                       xytext=(5, 5), textcoords='offset points',
                       fontsize=8, alpha=0.7, fontweight='bold')
    
    # Labels and title
    ax.set_xlabel(TEXT['avg_rating'], fontsize=12, fontweight='bold')
    ax.set_ylabel(TEXT['studio_count'], fontsize=12, fontweight='bold')
    ax.set_title(TEXT['studio_scatter_filtered'] + ' (10+)', fontsize=14, fontweight='bold', pad=20)
    ax.grid(True, alpha=0.3, linestyle='--')
    ax.legend(loc='upper left', fontsize=11, framealpha=0.9)
    
    plt.tight_layout()
    
    # Save PNG
    output_path = ASSETS_DIR / "studio-scatter-filtered-10.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"[OK] Saved filtered studio scatter plot (10+) to {output_path}")
    
    # Save JSON data
    web_data = {
        'studios': [
            {
                'name': s['studio'],
                'avg_rating': round(s['avg_rating'], 2),
                'anime_count': s['anime_count'],
                'rated_count': s['rated_count']
            }
            for s in studio_stats
        ],
        'mean_rating': round(mean_rating, 2),
        'mean_count': round(mean_count, 1),
        'total_studios': len(studio_stats),
        'min_anime_count': 10
    }
    
    web_data_path = DATA_DIR / "studio-scatter-filtered-10.json"
    with open(web_data_path, 'w', encoding='utf-8') as f:
        json.dump(web_data, f, indent=2)
    print(f"[OK] Saved filtered studio scatter data (10+) to {web_data_path}")

def generate_anime_rating_popularity_scatter():
    """Generate scatter plot of anime rating vs popularity."""
    print("\nGenerating anime rating vs popularity scatter plot...")
    all_anime, _ = load_all_anime_data()
    
    current_year = datetime.now().year
    
    # Collect anime data with both score and popularity
    anime_data = []
    
    for anime in all_anime:
        year = anime.get('year')
        if not year or year < 2006 or year > current_year:
            continue
        
        score = anime.get('score')
        popularity = anime.get('popularity')
        
        # Only include anime that have both score and popularity
        if score is not None and popularity is not None:
            anime_data.append({
                'title': anime.get('title', 'Unknown'),
                'score': score,
                'popularity': popularity,
                'members': anime.get('members', 0),
                'mal_id': anime.get('mal_id')
            })
    
    if not anime_data:
        print("  [WARNING] No anime with both score and popularity found")
        return
    
    # Extract data for plotting
    scores = [a['score'] for a in anime_data]
    popularities = [a['popularity'] for a in anime_data]
    
    # Calculate statistics
    mean_score = statistics.mean(scores)
    mean_popularity = statistics.mean(popularities)
    
    print(f"  Total anime with ratings and popularity: {len(anime_data)}")
    print(f"  Mean score: {mean_score:.2f}")
    print(f"  Mean popularity rank: {mean_popularity:.1f}")
    
    # Create scatter plot
    fig, ax = plt.subplots(figsize=(14, 10))
    
    # Use log scale for Y-axis to spread out the dense top-popularity region
    ax.set_yscale('log')
    
    # Plot scatter points with alpha for overlapping points
    scatter = ax.scatter(scores, popularities, alpha=0.5, s=30, c='#3b82f6', edgecolors='white', linewidth=0.5)
    
    # Add mean lines
    ax.axvline(x=mean_score, color='#ef4444', linestyle='--', linewidth=2.5, 
               label=f'Mean Score: {mean_score:.2f}', alpha=0.8)
    ax.axhline(y=mean_popularity, color='#22c55e', linestyle='--', linewidth=2.5, 
               label=f'Mean Popularity Rank: {mean_popularity:.1f}', alpha=0.8)
    
    # Find and label notable anime (top 10 most popular and highest rated with good popularity)
    # Top 10 most popular (lowest popularity rank)
    top_popular = sorted(anime_data, key=lambda x: x['popularity'])[:10]
    # Top 10 highest rated with popularity < 1000
    top_rated = sorted([a for a in anime_data if a['popularity'] < 1000], 
                       key=lambda x: x['score'], reverse=True)[:10]
    
    notable_anime = {a['mal_id']: a for a in top_popular + top_rated}
    
    for anime_id, anime in notable_anime.items():
        ax.annotate(anime['title'], 
                   xy=(anime['score'], anime['popularity']),
                   xytext=(5, 5), textcoords='offset points',
                   fontsize=7, alpha=0.7, fontweight='bold') 
    plt.tight_layout()
    
    # Save PNG
    output_path = ASSETS_DIR / "anime-rating-popularity-scatter.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"[OK] Saved anime rating vs popularity scatter plot to {output_path}")
    
    # Save JSON data
    web_data = {
        'anime': [
            {
                'title': a['title'],
                'score': round(a['score'], 2),
                'popularity': a['popularity'],
                'members': a['members'],
                'mal_id': a['mal_id']
            }
            for a in anime_data
        ],
        'mean_score': round(mean_score, 2),
        'mean_popularity': round(mean_popularity, 1),
        'total_anime': len(anime_data)
    }
    
    web_data_path = DATA_DIR / "anime-rating-popularity-scatter.json"
    with open(web_data_path, 'w', encoding='utf-8') as f:
        json.dump(web_data, f, indent=2)
    print(f"[OK] Saved anime rating vs popularity scatter data to {web_data_path}")

def generate_collection_stats():
    """Generate overall collection statistics."""
    print("\nGenerating collection statistics...")
    all_anime, manifest = load_all_anime_data()
    
    current_year = datetime.now().year
    
    # Filter to current year or earlier
    valid_anime = [a for a in all_anime if a.get('year') and 2006 <= a.get('year') <= current_year]
    
    # Basic stats
    total_anime = len(valid_anime)
    total_seasons = len(manifest)
    years_covered = sorted(set(entry['year'] for entry in manifest if 2006 <= entry['year'] <= current_year))
    year_range = f"{min(years_covered)}-{max(years_covered)}"
    
    # Studios
    all_studios = set()
    for anime in valid_anime:
        studios = anime.get('studios', [])
        all_studios.update(studios)
    all_studios.discard('')  # Remove empty strings
    total_studios = len(all_studios)
    
    # Genres
    all_genres = set()
    for anime in valid_anime:
        genres = anime.get('genres', [])
        all_genres.update(genres)
    all_genres.discard('')
    total_genres = len(all_genres)
    
    # Rated vs Unrated
    rated_anime = [a for a in valid_anime if a.get('score') is not None]
    total_rated = len(rated_anime)
    
    # Average ratings
    if rated_anime:
        avg_rating = statistics.mean([a['score'] for a in rated_anime])
    else:
        avg_rating = 0
    
    # Average anime per season
    avg_per_season = total_anime / len(years_covered) / 4 if years_covered else 0
    
    # Last updated
    last_updated = datetime.now().strftime('%Y-%m-%d')
    
    stats = {
        'total_anime': total_anime,
        'total_seasons': total_seasons,
        'year_range': year_range,
        'years_covered': len(years_covered),
        'total_studios': total_studios,
        'total_genres': total_genres,
        'total_rated': total_rated,
        'rating_percentage': round((total_rated / total_anime * 100), 1) if total_anime > 0 else 0,
        'average_rating': round(avg_rating, 2),
        'avg_per_season': round(avg_per_season, 1),
        'last_updated': last_updated
    }
    
    # Save stats
    stats_path = DATA_DIR / "collection-stats.json"
    with open(stats_path, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2)
    print(f"[OK] Saved collection statistics to {stats_path}")
    
    # Print summary
    print(f"\n  Total Anime: {total_anime:,}")
    print(f"  Year Range: {year_range}")
    print(f"  Total Seasons: {total_seasons}")
    print(f"  Studios Tracked: {total_studios:,}")
    print(f"  Genres: {total_genres}")
    print(f"  Average Rating: {avg_rating:.2f}")

def main():
    print("=" * 60)
    print("Generating All Anime Data Visualizations")
    print("=" * 60)
    
    generate_rating_trend()
    generate_genre_trends()
    generate_genre_trends_percentage()
    generate_genre_trends_by_season()
    generate_genre_trends_by_season_percentage()
    generate_production_volume()
    generate_seasonal_patterns()
    generate_studio_rankings()
    generate_studio_scatter()
    generate_studio_scatter_filtered()
    generate_studio_scatter_filtered_10()
    
    # Popularity scatter only for English version (Bangumi doesn't have popularity data)
    if args.lang == 'en':
        generate_anime_rating_popularity_scatter()
    else:
        print("\n[SKIP] Anime rating vs popularity scatter (not supported for Bangumi data)")
    
    generate_collection_stats()
    
    print("\n" + "=" * 60)
    print("[SUCCESS] All visualizations generated successfully!")
    print("=" * 60)

if __name__ == "__main__":
    main()

