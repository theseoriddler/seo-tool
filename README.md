# SERP Feature Analyzer

*Last updated: March 7, 2026*

A Chrome extension that analyzes Google search result pages using SerpAPI and displays a pie chart showing the distribution of SERP features by result count.

## Features Detected

- AI Overviews
- Sponsored Ads
- Shopping / Products
- Knowledge Panel
- Featured Snippet
- People Also Ask (PAA)
- Videos
- Image Pack
- Local Pack
- Top Stories
- Reddit / Forums
- Social Media
- Organic Results

## How It Works

1. Add your SerpAPI key in the extension settings
2. Go to Google and search for anything
3. Click the extension icon
4. A pie chart shows the percentage each feature represents based on result count

The extension uses SerpAPI to get structured search result data, combined with on-page heading detection for accurate classification of features like Shopping and Local Pack.

## Install (Developer Mode)

1. Clone this repo
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the project folder
5. Click the extension icon and open **Settings** to add your SerpAPI key
6. Navigate to a Google search page and click the extension icon
