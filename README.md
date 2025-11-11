# 🎬 Anime Season Tracker

**Discover TV anime organized by year and season**

A beautiful, free anime tracker that helps you explore seasonal anime from 2010 onwards. Automatically updated weekly with the latest releases!

![Stack: 100% Free](https://img.shields.io/badge/Stack-Free%20100%25-brightgreen) ![Auto Updates](https://img.shields.io/badge/Updates-Automated-blue) ![Data Source](https://img.shields.io/badge/Data-MyAnimeList-2E51A2)

---

## ✨ Features

- 📅 **Browse by Season** - Explore anime from 2010 onwards
- 🎯 **Smart Filtering** - Genre filters with OR/AND logic
- 📊 **Rich Information** - Studios, ratings, synopses, themes, and more
- 💫 **Modern Design** - Smooth animations and responsive layout
- 🔄 **Auto-Updated** - Weekly updates powered by GitHub Actions
- 🆓 **100% Free** - No ads, no tracking, no payments

---

## 🚀 How to Use

### Browse Anime
1. Visit the homepage
2. Scroll through available years (2010-2026)
3. Click on any season to view anime

### Filter Results
- **Adult Content Filter** - Toggle mature content visibility
- **Hide Not Rated** - Filter out unrated anime
- **Japanese Anime Only** - Show only Japanese productions
- **Genre Filters** - Select multiple genres with OR/AND logic

### Genre Filtering
- **OR Mode** (Default): Shows anime with *any* selected genre
- **AND Mode**: Shows anime with *all* selected genres

---

## 📂 Project Structure

```
anime-season-tracker/
├── index.html              # Main website
├── app.js                  # Frontend logic
├── fetch_anime.py          # Data fetching script
├── requirements.txt        # Python dependencies
├── README.md              # This file
├── data/                  # Anime data (JSON)
│   ├── manifest.json      # Index of all seasons
│   ├── 2010/
│   │   ├── winter.json
│   │   ├── spring.json
│   │   ├── summer.json
│   │   └── fall.json
│   ├── 2011/ ... 2026/    # More years
│   └── ...
└── .github/
    └── workflows/         # GitHub Actions
        ├── update-current-years.yml  # Weekly updates
        └── update-all-years.yml      # Quarterly updates
```

---

## 📊 Data Coverage

- **Years**: 2010 - now
- **Total Seasons**: 67+ seasons
- **Total Anime**: 4,000+ TV series
- **Updates**: 
  - Weekly: Current & next year
  - Quarterly: All historical data

---

## 🎯 What's Included

Each anime entry includes:
- Official titles (Japanese & English)
- Cover images
- Synopsis (with read more/less)
- MyAnimeList ratings and rating counts
- Production studios
- Source material (manga, light novel, etc.)
- Genres and themes
- Air dates
- Episode count
- Direct link to MyAnimeList

---

## 🔍 Data Source

All data comes from [MyAnimeList](https://myanimelist.net/) via the [Jikan API](https://jikan.moe/) - a free, unofficial MyAnimeList API.

**Note**: This tracker focuses exclusively on **TV series** (no movies, OVAs, or specials).

---

## ⚠️ Disclaimer

This project is not affiliated with or endorsed by MyAnimeList. All anime data, images, and information are property of their respective owners. This is a fan-made tool created for educational purposes.

---

## 🙏 Credits

- **Data**: [MyAnimeList](https://myanimelist.net/)
- **API**: [Jikan](https://jikan.moe/)
- **Design**: [Tailwind CSS](https://tailwindcss.com/)
- **Created by**: [@Ate329](https://github.com/Ate329)

---

## 📄 License

MIT License - Free to use and modify

---

**Enjoy discovering your next favorite anime!** 🎬✨
