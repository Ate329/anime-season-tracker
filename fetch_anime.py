import requests
import json
import pathlib
import datetime
import time
import sys

def fetch_anime_data(current_years_only=False):
    """
    Fetches anime data from Jikan API and organizes it by year and season.
    Creates a manifest.json file listing all available season data.
    
    The script automatically fetches data from START_YEAR to current year + 1,
    so it will always include new years without manual updates.
    
    Args:
        current_years_only (bool): If True, only fetch current and next year.
                                   If False, fetch all years from START_YEAR.
    """
    # Configuration: Starting year for data collection (change if needed)
    START_YEAR = 2010
    
    # Get current year
    current_year = datetime.date.today().year
    
    # Define years to fetch based on mode
    if current_years_only:
        # Only fetch current and next year (for weekly updates)
        years = list(range(current_year, current_year + 2))
        print(f"Mode: Current years only ({current_year}, {current_year + 1})")
    else:
        # Fetch all years dynamically from START_YEAR to current + 1 (for quarterly updates)
        years = list(range(START_YEAR, current_year + 2))
        print(f"Mode: All years ({START_YEAR}-{current_year + 1})")
    
    # Define seasons
    seasons = ["winter", "spring", "summer", "fall"]
    
    # Initialize manifest list
    available_seasons = []
    
    # Base URL for Jikan API
    base_url = "https://api.jikan.moe/v4/seasons"
    
    print(f"Starting to fetch anime data for years: {years}")
    
    # Main loop through years and seasons
    for year in years:
        for season in seasons:
            try:
                print(f"\nFetching data for {year} {season}...")
                
                # Fetch all pages for this season
                anime_list = []
                page = 1
                has_next_page = True
                
                while has_next_page:
                    # Construct API URL with pagination
                    api_url = f"{base_url}/{year}/{season}?page={page}"
                    
                    # Make API request
                    response = requests.get(api_url)
                    
                    # Check if request was successful
                    if response.status_code == 200:
                        data = response.json()
                        
                        # Check if there's more data
                        if 'data' in data and len(data['data']) > 0:
                            print(f"  Page {page}: Found {len(data['data'])} anime")
                            
                            # Extract and process anime data from this page
                            for anime in data['data']:
                                # Filter: Only include TV series (no movies, OVAs, etc.)
                                anime_type = anime.get('type', '')
                                if anime_type != 'TV':
                                    continue
                                
                                # Check for hentai genre
                                genres = anime.get('genres', [])
                                genre_names = [genre.get('name', '') for genre in genres]
                                is_hentai = 'Hentai' in genre_names
                                
                                # Get producers and studios to determine if it's Japanese anime
                                producers = anime.get('producers', [])
                                producer_names = [p.get('name', '') for p in producers]
                                studios = anime.get('studios', [])
                                studio_names = [s.get('name', '') for s in studios]
                                
                                # Major Japanese anime studios (if produced by these, it's Japanese anime)
                                japanese_studios = [
                                    'a-1 pictures', 'trigger', 'mappa', 'ufotable', 'bones', 'kyoto animation',
                                    'madhouse', 'wit studio', 'production i.g', 'cloverworks', 'shaft', 'j.c.staff',
                                    'toei animation', 'studio deen', 'david production', 'sunrise', 'gainax',
                                    'pierrot', 'silver link', 'lerche', 'kinema citrus', 'white fox', 'doga kobo',
                                    'p.a. works', 'studio ghibli', 'tms entertainment', 'olm', 'toho animation'
                                ]
                                
                                # Check if it's produced by a Japanese studio
                                has_japanese_studio = any(
                                    any(jp_studio in studio.lower() for jp_studio in japanese_studios)
                                    for studio in studio_names
                                )
                                
                                # If produced by a Japanese studio, it's Japanese anime regardless of source
                                if has_japanese_studio:
                                    is_likely_japanese = True
                                else:
                                    # Check for non-Japanese indicators only if no Japanese studio
                                    source = anime.get('source', '').lower()
                                    is_likely_japanese = True
                                    
                                    # Check for Korean indicators
                                    korean_indicators = ['netmarble', 'kakao', 'naver', 'webtoon', 'd&c media']
                                    chinese_indicators = ['tencent', 'bilibili', 'haoliners']
                                    
                                    # Mark as non-Japanese only if clear indicators and no Japanese studio
                                    if any(indicator in producer.lower() for producer in producer_names for indicator in korean_indicators):
                                        is_likely_japanese = False
                                    elif any(indicator in producer.lower() for producer in producer_names for indicator in chinese_indicators):
                                        is_likely_japanese = False
                                
                                anime_info = {
                                    'mal_id': anime.get('mal_id', 'N/A'),
                                    'title': anime.get('title', 'Unknown Title'),
                                    'title_english': anime.get('title_english'),
                                    'image_url': anime.get('images', {}).get('jpg', {}).get('large_image_url', 
                                                anime.get('images', {}).get('jpg', {}).get('image_url', '')),
                                    'synopsis': anime.get('synopsis', 'No synopsis available.'),
                                    'episodes': anime.get('episodes'),
                                    'score': anime.get('score'),
                                    'scored_by': anime.get('scored_by'),
                                    'type': anime_type,
                                    'source': anime.get('source', 'Unknown'),
                                    'studios': [studio.get('name') for studio in anime.get('studios', [])],
                                    'producers': producer_names,
                                    'genres': genre_names,
                                    'themes': [theme.get('name') for theme in anime.get('themes', [])],
                                    'aired_from': anime.get('aired', {}).get('from'),
                                    'aired_to': anime.get('aired', {}).get('to'),
                                    'url': anime.get('url', ''),
                                    'year': anime.get('year'),
                                    'season': anime.get('season'),
                                    'is_hentai': is_hentai,
                                    'is_japanese': is_likely_japanese
                                }
                                anime_list.append(anime_info)
                            
                            # Check pagination info
                            pagination = data.get('pagination', {})
                            has_next_page = pagination.get('has_next_page', False)
                            page += 1
                            
                            # Rate limiting between pages
                            if has_next_page:
                                time.sleep(2)  # Increased to 2 seconds to avoid rate limiting
                        else:
                            has_next_page = False
                    elif response.status_code == 404:
                        print(f"  [SKIP] No data available for {year} {season} (404)")
                        has_next_page = False
                    else:
                        print(f"  [ERROR] Status {response.status_code}")
                        has_next_page = False
                
                # Save data if we got any anime
                if anime_list:
                    # Create directory structure
                    data_path = pathlib.Path(f"data/{year}")
                    data_path.mkdir(parents=True, exist_ok=True)
                    
                    # Save data to JSON file
                    file_path = data_path / f"{season}.json"
                    with open(file_path, 'w', encoding='utf-8') as f:
                        json.dump(anime_list, f, ensure_ascii=False, indent=2)
                    
                    print(f"[OK] Successfully saved {len(anime_list)} anime to {file_path}")
                    
                    # Add to manifest
                    available_seasons.append({
                        "year": year,
                        "season": season,
                        "count": len(anime_list)
                    })
                
                # Rate limiting between seasons
                time.sleep(2)  # Increased to 2 seconds to avoid rate limiting
                
            except Exception as e:
                print(f"[ERROR] Error fetching {year} {season}: {str(e)}")
                continue
    
    # Save manifest
    manifest_path = pathlib.Path("data/manifest.json")
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(available_seasons, f, indent=2)
    
    print(f"\n[OK] Manifest saved with {len(available_seasons)} seasons")
    print(f"[OK] Data fetching complete!")

if __name__ == "__main__":
    # Check for command-line arguments
    current_years_only = '--current-years-only' in sys.argv
    fetch_anime_data(current_years_only=current_years_only)

