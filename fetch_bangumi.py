import requests
import json
import pathlib
import time
import sys
import re
from bs4 import BeautifulSoup

def get_subject_ids(year, month):
    """
    Scrapes the Bangumi airtime page to get a list of subject IDs for a specific year and month.
    Month mapping: 1=Winter, 4=Spring, 7=Summer, 10=Fall
    Now with pagination support to get all anime, not just first 24
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    all_subject_ids = []
    page = 1
    
    while True:
        # URL pattern: https://bgm.tv/anime/browser/日本/airtime/{year}-{month}?page={page}
        # This filters for:
        # - Tag: Japan (日本)
        # - Airtime: Specific Year-Month
        # Note: We removed 'tv/' to include Movies/OVAs/etc. if they have the Japan tag.
        url = f"https://bgm.tv/anime/browser/%E6%97%A5%E6%9C%AC/tv/airtime/{year}-{month}?page={page}"
        print(f"Scanning {url}...")
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code != 200:
                print(f"  [ERROR] Failed to fetch page {page}: {response.status_code}")
                break
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all items in the browser list
            # Items usually have id="item_123456"
            items = soup.find_all('li', id=re.compile(r'item_\d+'))
            
            if not items:
                # No more items found, we've reached the end
                break
            
            for item in items:
                item_id = item.get('id')
                if item_id:
                    subject_id = item_id.replace('item_', '')
                    all_subject_ids.append(subject_id)
            
            print(f"Page {page}: Found {len(items)} subjects")
            page += 1
            time.sleep(0.5)  # Be nice to the server
            
        except Exception as e:
            print(f"  [ERROR] Error scraping page {page}: {e}")
            break
    
    print(f"Total found: {len(all_subject_ids)} subjects")
    return all_subject_ids

def fetch_subject_details(subject_id):
    """
    Fetches detailed information for a subject from the Bangumi API.
    """
    url = f"https://api.bgm.tv/v0/subjects/{subject_id}"
    headers = {
        "User-Agent": "Ate329/anime-stats-tracker (https://github.com/Ate329/anime-stats-tracker)"
    }
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 404:
            print(f"  [WARN] Subject {subject_id} not found (404)")
            return None
        else:
            print(f"  [ERROR] API error for {subject_id}: {response.status_code}")
            return None
    except Exception as e:
        print(f"  [ERROR] Exception fetching {subject_id}: {e}")
        return None

def process_bangumi_data(bangumi_data):
    """
    Maps Bangumi API data to the project's internal schema.
    """
    if not bangumi_data:
        return None
        
    # Extract basic info
    name = bangumi_data.get('name', '')
    name_cn = bangumi_data.get('name_cn', '')
    
    # Title logic: Prefer Chinese name, fallback to original name
    title = name_cn if name_cn else name
    title_japanese = name
    
    # Images
    images = bangumi_data.get('images', {})
    image_url = images.get('large') or images.get('common') or images.get('medium') or ''
    
    # Rating
    rating = bangumi_data.get('rating', {})
    score = rating.get('score', 0)
    rank = rating.get('rank', 0)
    scored_by = rating.get('total', 0)
    
    # Summary
    synopsis = bangumi_data.get('summary', '')
    
    # Date
    date = bangumi_data.get('date', '')
    year = None
    if date and len(date) >= 4:
        try:
            year = int(date[:4])
        except:
            pass
            
    # Tags as genres
    tags = bangumi_data.get('tags', [])
    
    # Genre Mapping and Normalization
    GENRE_MAP = {
        # Sci-Fi
        "SF": "科幻", "Science Fiction": "科幻", "科幻": "科幻",
        
        # Action
        "战斗": "动作", "Action": "动作", "动作": "动作", "格斗": "动作",
        
        # Romance
        "恋爱": "爱情", "Romance": "爱情", "爱情": "爱情", "纯爱": "爱情",
        
        # Comedy
        "搞笑": "喜剧", "Comedy": "喜剧", "喜剧": "喜剧",
        
        # Slice of Life
        "日常": "日常", "Slice of Life": "日常",
        
        # School
        "校园": "校园", "School": "校园", "学园": "校园",
        
        # Fantasy
        "奇幻": "奇幻", "Fantasy": "奇幻", "异世界": "奇幻", "魔法": "奇幻", "穿越": "奇幻",
        
        # Adventure
        "冒险": "冒险", "Adventure": "冒险",
        
        # Mystery/Thriller/Horror
        "悬疑": "悬疑", "Mystery": "悬疑", "推理": "悬疑",
        "惊悚": "惊悚", "Thriller": "惊悚",
        "恐怖": "恐怖", "Horror": "恐怖",
        
        # Sports
        "运动": "运动", "Sports": "运动", "竞技": "运动",
        
        # Mecha
        "机战": "机战", "Mecha": "机战", "萝卜": "机战",
        
        # Music
        "音乐": "音乐", "Music": "音乐", "歌舞": "音乐", "偶像": "音乐",
        
        # Healing/Depressing
        "治愈": "治愈", "治愈系": "治愈",
        "致郁": "致郁", "致郁系": "致郁",
        
        # Relationships
        "百合": "百合", "GL": "百合",
        "耽美": "耽美", "BL": "耽美",
        "后宫": "后宫",
        "逆后宫": "逆后宫",
        
        # Other
        "励志": "励志",
        "历史": "历史",
        "战争": "战争",
        "犯罪": "犯罪",
        "职场": "职场",
        "萌": "萌系", "萌系": "萌系"
    }
    
    VALID_GENRES = set(GENRE_MAP.values())

    # Filter out non-genre tags
    # Common non-genre tags in Bangumi: years, months, formats, countries, generic terms
    excluded_tags = {
        # Broadcast types/formats - NOT genres
        'TV', 'OVA', 'OAD', 'WEB', 'TVA', 'TV动画',
        '剧场版', '电影', 'Movie', 'Special', '特别篇',
        
        # Countries/regions - NOT genres
        '日本', '中国', '美国', '国产', '日本动画', '欧美', '韩国',
        '日本动画', '国产动画', '欧美动画',
        
        # Years (add common ones)
        '2006', '2007', '2008', '2009', '2010',
        '2011', '2012', '2013', '2014', '2015',
        '2016', '2017', '2018', '2019', '2020',
        '2021', '2022', '2023', '2024', '2025', '2026', '2027',
        
        # Year ranges
        '2020-2029', '2010-2019', '2000-2009',
        
        # Months
        '1月', '2月', '3月', '4月', '5月', '6月',
        '7月', '8月', '9月', '10月', '11月', '12月',
        '1月新番', '4月新番', '7月新番', '10月新番',
        
        # Seasons
        '2024年', '2023年', '2024冬', '2024春', '2024夏', '2024秋',
        
        # Source material types - NOT genres
        '原创', '漫改', '小说改', '游戏改', '轻小说改', '漫画改',
        '改编', '原作', 'Manga', 'Light Novel',
        
        # Generic/meta tags - NOT genres
        '续作', '补番', '童年', '怀旧', '新番', '完结',
        '长篇', '短篇', '泡面番', '连载中'
    }
    
    # Also exclude tags that look like years (4 digits) or year ranges
    def is_valid_genre(tag_name):
        if tag_name in excluded_tags:
            return False
        # Exclude pure numbers that look like years (4 digits)
        if tag_name.isdigit() and len(tag_name) == 4:
            return False
        # Exclude year ranges like "2020-2029"
        if '-' in tag_name:
            parts = tag_name.split('-')
            if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
                return False
        # Exclude months (contains 月 and digits)
        if '月' in tag_name and any(c.isdigit() for c in tag_name):
            return False
        # Exclude year labels (ends with 年)
        if tag_name.endswith('年') and any(c.isdigit() for c in tag_name):
            return False
        return True

    # Process genres: Map -> Filter -> Deduplicate
    raw_genres = [tag['name'] for tag in tags if tag.get('count', 0) > 0 and is_valid_genre(tag['name'])]
    
    mapped_genres = set()
    for g in raw_genres:
        if g in GENRE_MAP:
            mapped_genres.add(GENRE_MAP[g])
            
    # Convert back to list and sort
    genres = sorted(list(mapped_genres))
    
    # Construct object matching app.js expectations
    return {
        'mal_id': bangumi_data.get('id'), # Use Bangumi ID as ID
        'title': title,
        'title_japanese': title_japanese,
        'image_url': image_url,
        'synopsis': synopsis,
        'score': score,
        'scored_by': scored_by,
        'rank': rank,
        'popularity': 0, # Bangumi doesn't have exact popularity rank in same way, use 0 or calculate later
        'members': collection_count(bangumi_data), # Use collection count as proxy for members
        'genres': genres,
        'studios': get_infobox_value(bangumi_data, ['动画制作', '制作']),
        'source': get_infobox_value(bangumi_data, ['原作']),
        'aired_from': date,
        'year': year,
        'is_hentai': bangumi_data.get('nsfw', False),
        # Extra fields for compatibility
        'title_english': '', # Bangumi rarely has this explicitly in top level
        'themes': [],
        'demographics': [],
        'url': f"https://bgm.tv/subject/{bangumi_data.get('id')}"
    }

def collection_count(data):
    collection = data.get('collection', {})
    return sum(collection.values()) if collection else 0

def get_infobox_value(data, keys):
    infobox = data.get('infobox', [])
    if not infobox:
        return []
    
    values = []
    for item in infobox:
        if item.get('key') in keys:
            val = item.get('value')
            if isinstance(val, list):
                values.extend([v.get('v') for v in val])
            else:
                values.append(val)
    return values

def fetch_season(year, season):
    """
    Fetches all anime for a specific season.
    Fetches data for all 3 months of the season.
    """
    season_start_months = {
        "winter": 1,
        "spring": 4,
        "summer": 7,
        "fall": 10
    }
    
    start_month = season_start_months.get(season.lower())
    if not start_month:
        print(f"[ERROR] Invalid season: {season}")
        return []
        
    # Fetch for all 3 months of the season
    all_ids = set()
    
    for i in range(3):
        month = start_month + i
        print(f"Fetching IDs for {year}-{month}...")
        ids = get_subject_ids(year, month)
        all_ids.update(ids)
        
    if not all_ids:
        print(f"No subjects found for {year} {season}")
        return []
        
    # Convert back to list
    ids = list(all_ids)
        
    anime_list = []
    print(f"Fetching details for {len(ids)} subjects...")
    
    for i, subject_id in enumerate(ids):
        print(f"  [{i+1}/{len(ids)}] Fetching {subject_id}...", end='\r')
        details = fetch_subject_details(subject_id)
        if details:
            processed = process_bangumi_data(details)
            if processed:
                anime_list.append(processed)
        time.sleep(0.5) # Be nice to API
        
    print(f"\nProcessed {len(anime_list)} anime.")
    return anime_list

def validate_and_deduplicate(anime_list, year, season):
    """
    Validates and removes duplicate anime from a list based on mal_id (which is Bangumi ID here).
    Returns the deduplicated list and reports any duplicates found.
    
    Args:
        anime_list: List of anime dictionaries
        year: Year for logging purposes
        season: Season for logging purposes
    
    Returns:
        Deduplicated list of anime
    """
    if not anime_list:
        return anime_list
    
    seen_ids = {}
    unique_anime = []
    duplicates_found = []
    
    for anime in anime_list:
        # In fetch_bangumi.py, we map Bangumi ID to 'mal_id' field
        bgm_id = anime.get('mal_id')
        if bgm_id is None:
            print(f"  [WARNING] Anime without ID found: {anime.get('title', 'Unknown')}")
            continue
        
        if bgm_id in seen_ids:
            duplicates_found.append({
                'id': bgm_id,
                'title': anime.get('title', 'Unknown')
            })
        else:
            seen_ids[bgm_id] = True
            unique_anime.append(anime)
    
    if duplicates_found:
        print(f"  [VALIDATION] Found and removed {len(duplicates_found)} duplicate(s) for {year} {season}:")
        for dup in duplicates_found[:5]:  # Show first 5 duplicates
            print(f"    - {dup['title']} (ID: {dup['id']})")
        if len(duplicates_found) > 5:
            print(f"    ... and {len(duplicates_found) - 5} more")
    else:
        print(f"  [VALIDATION] No duplicates found for {year} {season} - {len(unique_anime)} unique anime")
    
    return unique_anime

def clean_existing_data():
    """
    Scans all existing data files and removes duplicates.
    """
    print("\n" + "="*60)
    print("CLEANING EXISTING DATA FILES (BANGUMI)")
    print("="*60)
    
    data_dir = pathlib.Path("data_cn")
    if not data_dir.exists():
        print("[INFO] No data_cn directory found, nothing to clean")
        return
    
    seasons = ["winter", "spring", "summer", "fall"]
    total_duplicates = 0
    files_cleaned = 0
    
    # Find all year directories
    year_dirs = [d for d in data_dir.iterdir() if d.is_dir() and d.name.isdigit()]
    
    for year_dir in sorted(year_dirs):
        year = year_dir.name
        
        for season in seasons:
            file_path = year_dir / f"{season}.json"
            
            if not file_path.exists():
                continue
            
            try:
                # Read existing data
                with open(file_path, 'r', encoding='utf-8') as f:
                    anime_list = json.load(f)
                
                original_count = len(anime_list)
                
                # Validate and deduplicate
                cleaned_list = validate_and_deduplicate(anime_list, year, season)
                
                duplicates = original_count - len(cleaned_list)
                
                # Only save if we found duplicates
                if duplicates > 0:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        json.dump(cleaned_list, f, ensure_ascii=False, indent=2)
                    
                    print(f"  [CLEANED] {file_path}: Removed {duplicates} duplicate(s)")
                    total_duplicates += duplicates
                    files_cleaned += 1
                    
                    # Also update manifest count if needed
                    update_manifest(int(year), season, len(cleaned_list))
                
            except Exception as e:
                print(f"  [ERROR] Failed to clean {file_path}: {e}")
    
    print(f"\n[SUMMARY] Cleaned {files_cleaned} file(s), removed {total_duplicates} total duplicate(s)")
    print("="*60)

def save_data(anime_list, year, season):
    if not anime_list:
        return
        
    # Deduplicate before saving
    anime_list = validate_and_deduplicate(anime_list, year, season)
        
    # Ensure directory exists
    # We use data_cn for Chinese data
    data_dir = pathlib.Path(f"data_cn/{year}")
    data_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = data_dir / f"{season}.json"
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(anime_list, f, ensure_ascii=False, indent=2)
        
    print(f"Saved to {file_path}")

def update_manifest(year, season, count):
    manifest_path = pathlib.Path("data_cn/manifest.json")
    manifest = []
    
    if manifest_path.exists():
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
        except:
            pass
            
    # Remove existing entry for this season if exists
    manifest = [m for m in manifest if not (str(m['year']) == str(year) and m['season'] == season)]
    
    # Add new entry
    manifest.append({
        "year": int(year),
        "season": season,
        "count": count
    })
    
    # Sort
    seasons_order = {"winter": 0, "spring": 1, "summer": 2, "fall": 3}
    manifest.sort(key=lambda x: (x['year'], seasons_order.get(x['season'], 99)), reverse=True)
    
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
        
    print("Updated manifest.json")

if __name__ == "__main__":
    # Default to current/recent seasons if no args
    # For testing, let's just do one specific season or accept args
    
    import argparse
    parser = argparse.ArgumentParser(description='Fetch anime data from Bangumi')
    parser.add_argument('--year', type=int, help='Year to fetch')
    parser.add_argument('--season', type=str, help='Season to fetch (winter, spring, summer, fall)')
    parser.add_argument('--all-current', action='store_true', help='Fetch current year seasons')
    parser.add_argument('--all-history', action='store_true', help='Fetch all historical data (2006-present)')
    parser.add_argument('--clean', action='store_true', help='Clean duplicates from existing data files')
    
    args = parser.parse_args()
    
    if args.clean:
        clean_existing_data()
        # If only cleaning is requested, we can exit. 
        # But if other flags are present, we might want to continue.
        # For now, let's assume if --clean is passed with others, we clean first then fetch.
    
    if args.year and args.season:
        anime_list = fetch_season(args.year, args.season)
        save_data(anime_list, args.year, args.season)
        update_manifest(args.year, args.season, len(anime_list))
    elif args.all_current:
        # Fetch current year
        import datetime
        current_year = datetime.date.today().year
        seasons = ["winter", "spring", "summer", "fall"]
        for season in seasons:
            anime_list = fetch_season(current_year, season)
            save_data(anime_list, current_year, season)
            update_manifest(current_year, season, len(anime_list))
    elif args.all_history:
        import datetime
        current_year = datetime.date.today().year
        start_year = 2006
        seasons = ["winter", "spring", "summer", "fall"]
        
        for year in range(start_year, current_year + 2):
            for season in seasons:
                print(f"Processing {year} {season}...")
                anime_list = fetch_season(year, season)
                save_data(anime_list, year, season)
                update_manifest(year, season, len(anime_list))
    elif not args.clean:
        print("Please provide --year and --season, --all-current, --all-history, or --clean")
