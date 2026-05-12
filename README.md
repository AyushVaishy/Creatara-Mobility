# Global City Insights Dashboard

A premium, real-time intelligence dashboard displaying live weather, AQI, currency exchange rates, and historical analytics for 10 global cities using an interactive Carto Dark world map.

This application is built with a **Highly Resilient Architecture** that guarantees UI stability by gracefully degrading to an in-memory live fallback system and local cache files whenever the primary MongoDB database is unreachable.

## 🌟 Key Features

- **Interactive World Map**: Real-time Leaflet map with animated, color-coded AQI markers for 10 global cities.
- **Live Intelligence Engine**: Aggregates live data concurrently from **OpenWeather**, **OpenAQ v3**, and **CurrencyAPI**.
- **Historical Analytics**: 7-day trend visualizations for Temperature, Humidity, and AQI using Recharts.
- **Failover Resiliency**: If MongoDB connection fails (e.g., due to IP whitelisting or network drops), the application automatically bypasses the DB, spins up a live in-memory cache fetching real-time API data, and serves local JSON data for historical charts. The UI never breaks.
- **Symmetrical UI Layout**: A perfectly balanced CSS Grid layout where the world map dynamically stretches or shrinks to mathematically match the height of the contextual sidebar.
- **Auto-Polling**: The metrics table auto-refreshes data every 30 seconds seamlessly without blocking the UI.

---

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Maps**: React Leaflet + Carto Base Maps
- **Charts**: Recharts
- **Animations**: Framer Motion
- **State & Caching**: TanStack React Query + Axios
- **Database**: MongoDB Atlas + Mongoose
- **APIs**: OpenWeather, OpenAQ, CurrencyAPI

---

## 🚀 Getting Started

Follow these instructions to run the project locally on your machine.

### 1. Prerequisites
- **Node.js** (v20 or higher recommended)
- **MongoDB Atlas** account (or a local MongoDB instance)
- API Keys for OpenWeather, OpenAQ, and CurrencyAPI.

### 2. Clone and Install
Clone the repository and install the required dependencies:
```bash
git clone <repository-url>
cd global-city-insights-dashboard
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory. You can copy the contents from `.env.example` if available, or use the structure below.

```env
# MongoDB Connection
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority"

# OpenWeather API (Weather Data)
OPENWEATHER_API_KEY="your_openweather_key"
OPENWEATHER_BASE_URL="https://api.openweathermap.org/data/2.5"

# OpenAQ API (Air Quality Data)
OPENAQ_API_KEY="your_openaq_key"
OPENAQ_BASE_URL="https://api.openaq.org/v3"

# CurrencyAPI (Exchange Rates)
CURRENCY_API_KEY="your_currencyapi_key"
CURRENCY_BASE_URL="https://api.currencyapi.com/v3"

# Application Settings
NEXT_PUBLIC_APP_NAME="Global City Insights Dashboard"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 4. Seed Fallback Historical Data (Important!)
Because the application uses a failover mechanism for historical data when the database is empty or disconnected, you should generate the local JSON seed file first.
Run the following script to fetch the last 7 days of real historical data from Open-Meteo:
```bash
node scripts/seed-history.js
```
*(This will generate a `data/historical_weather.json` file).*

### 5. Start the Development Server
Run the Next.js development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app will automatically redirect to the `/dashboard` route.

---

## 🏗️ Architecture & Failover System

This dashboard is designed to never show blank or broken states, even if external services fail.

1. **Database Layer (`mongoose.ts`)**: Tries to connect to MongoDB. If it fails (e.g., timeout), it logs a warning but allows the server to boot up.
2. **Aggregator (`cityAggregator.ts`)**: Uses `Promise.allSettled` to fetch Weather, AQI, and Currency concurrently. If one fails, the others succeed, and warnings are passed to the frontend.
3. **Live Failover Cache (`analyticsService.ts`)**: If the DB is unreachable, the system triggers a **Live Fallback Promise Cache**. It performs a single batch fetch to the external APIs, caches the result in memory for 5 minutes (to prevent rate-limit exhaustion), and serves this live data to the UI table.
4. **Historical Failover (`localHistoryFallback.ts`)**: If the DB cannot serve the 7-day trend arrays, the system intercepts the error and reads from `data/historical_weather.json`, dynamically mapping it to match the exact TypeScript interfaces expected by Recharts.

---

## 📂 Project Structure

```text
src/
├── app/              # Next.js App Router (pages, layouts, API routes)
├── components/       # Reusable React components
│   ├── cards/        # UI Cards (CityOverviewCard, AllCitiesTable)
│   ├── charts/       # Recharts historical visualizers
│   ├── layout/       # Main layout and Drawer (AnalyticsSheet)
│   ├── map/          # React Leaflet wrappers (WorldMap)
│   └── ui/           # shadcn/ui components
├── hooks/            # TanStack Query custom hooks (useCityData)
├── lib/              # Database repositories, config, and utils
├── services/         # External API integrations & Fallback engines
└── types/            # Global TypeScript definitions
scripts/              # Node.js utility scripts (seed-history.js)
data/                 # Local JSON fallback databases
```
