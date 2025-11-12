import json
import pathlib
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime
import statistics

def generate_rating_trend_graph():
    """
    Generates a graph showing average anime ratings over time.
    Creates both a PNG image for README and returns data for web visualization.
    """
    print("Generating rating trend graph...")
    
    # Read manifest to get all available seasons
    manifest_path = pathlib.Path("data/manifest.json")
    
    if not manifest_path.exists():
        print("Error: manifest.json not found!")
        return
    
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    
    # Collect rating data for each season
    season_data = []
    
    for entry in manifest:
        year = entry['year']
        season = entry['season']
        
        # Load season data
        season_file = pathlib.Path(f"data/{year}/{season}.json")
        
        if not season_file.exists():
            continue
        
        try:
            with open(season_file, 'r', encoding='utf-8') as f:
                anime_list = json.load(f)
            
            # Calculate average rating for this season (exclude unrated anime)
            ratings = [anime['score'] for anime in anime_list if anime.get('score') is not None]
            
            if len(ratings) > 0:
                avg_rating = statistics.mean(ratings)
                
                # Create a date for the season (approximate start date)
                season_month = {
                    'winter': 1,
                    'spring': 4,
                    'summer': 7,
                    'fall': 10
                }
                
                date = datetime(year, season_month[season], 1)
                
                season_data.append({
                    'date': date,
                    'year': year,
                    'season': season,
                    'avg_rating': avg_rating,
                    'count': len(ratings),
                    'total_anime': len(anime_list)
                })
                
                print(f"  {year} {season}: {avg_rating:.2f} (from {len(ratings)} rated anime)")
        
        except Exception as e:
            print(f"  Error processing {year} {season}: {e}")
            continue
    
    # Sort by date
    season_data.sort(key=lambda x: x['date'])
    
    if not season_data:
        print("No data available to generate graph!")
        return
    
    # Prepare data for plotting
    dates = [d['date'] for d in season_data]
    ratings = [d['avg_rating'] for d in season_data]
    
    # Create the plot
    plt.figure(figsize=(14, 7))
    
    # Plot the trend line
    plt.plot(dates, ratings, linewidth=2, color='#1f2937', marker='o', markersize=4, alpha=0.8)
    
    # Add a trend line (moving average)
    window_size = 4  # 1 year moving average (4 seasons)
    if len(ratings) >= window_size:
        moving_avg = []
        moving_dates = []
        for i in range(len(ratings) - window_size + 1):
            moving_avg.append(statistics.mean(ratings[i:i+window_size]))
            moving_dates.append(dates[i + window_size//2])
        plt.plot(moving_dates, moving_avg, linewidth=3, color='#ef4444', 
                linestyle='--', label='Moving Average (4 seasons)', alpha=0.7)
    
    # Styling
    plt.title('Average Anime Rating Trend Over Time', fontsize=16, fontweight='bold', pad=20)
    plt.xlabel('Year', fontsize=12, fontweight='bold')
    plt.ylabel('Average Rating (MAL Score)', fontsize=12, fontweight='bold')
    plt.grid(True, alpha=0.3, linestyle='--')
    plt.legend(loc='best', fontsize=10)
    
    # Format x-axis to show years
    plt.gca().xaxis.set_major_formatter(mdates.DateFormatter('%Y'))
    plt.gca().xaxis.set_major_locator(mdates.YearLocator(2))  # Every 2 years
    plt.gcf().autofmt_xdate()  # Rotate dates
    
    # Set y-axis limits for better visibility
    min_rating = min(ratings)
    max_rating = max(ratings)
    plt.ylim(min_rating - 0.3, max_rating + 0.3)
    
    # Add horizontal line at overall average
    overall_avg = statistics.mean(ratings)
    plt.axhline(y=overall_avg, color='#10b981', linestyle=':', linewidth=2, 
                label=f'Overall Average: {overall_avg:.2f}', alpha=0.6)
    plt.legend(loc='best', fontsize=10)
    
    # Tight layout
    plt.tight_layout()
    
    # Create assets directory if it doesn't exist
    assets_path = pathlib.Path("assets")
    assets_path.mkdir(exist_ok=True)
    
    # Save the graph
    output_path = assets_path / "rating-trend.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    print(f"\n[OK] Graph saved to {output_path}")
    
    plt.close()
    
    # Also save the data as JSON for web visualization
    web_data = {
        'labels': [f"{d['season'].capitalize()} {d['year']}" for d in season_data],
        'dates': [d['date'].strftime('%Y-%m-%d') for d in season_data],
        'ratings': [round(d['avg_rating'], 2) for d in season_data],
        'counts': [d['count'] for d in season_data],
        'overall_average': round(overall_avg, 2),
        'min_rating': round(min(ratings), 2),
        'max_rating': round(max(ratings), 2)
    }
    
    web_data_path = pathlib.Path("data/rating-trend.json")
    with open(web_data_path, 'w', encoding='utf-8') as f:
        json.dump(web_data, f, indent=2)
    
    print(f"[OK] Web data saved to {web_data_path}")
    print(f"\nStatistics:")
    print(f"  Overall Average Rating: {overall_avg:.2f}")
    print(f"  Highest Season Average: {max(ratings):.2f}")
    print(f"  Lowest Season Average: {min(ratings):.2f}")
    print(f"  Total Seasons Analyzed: {len(season_data)}")

if __name__ == "__main__":
    generate_rating_trend_graph()

