# Skylight Calendar

A Skylight-inspired digital calendar display for Raspberry Pi. Syncs with Google Calendar and shows a clean week view on any TV or monitor via HDMI.

## Features

- Weekly agenda view with color-coded events per calendar
- Multiple Google Calendar support (family members, work, etc.)
- Weather widget (current conditions + temperature)
- Auto-refreshing display (5 min for events, 30 min for weather)
- Kiosk mode (full-screen, no cursor, no screen blanking)
- TV-optimized typography at 1080p

## Quick Start (Development)

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the **Google Calendar API**
4. Go to **Credentials** → Create **OAuth 2.0 Client ID**
   - Application type: Web application
   - Authorized redirect URI: `http://localhost:3001/api/auth/callback`
5. Copy the Client ID and Secret

### 2. Weather API Setup

1. Sign up at [OpenWeatherMap](https://openweathermap.org/api)
2. Get a free API key (One Call API 3.0 — requires credit card but has 1000 free calls/day)
3. Find your latitude/longitude (Google Maps → right-click any location)

### 3. Configure & Run

```bash
cp .env.example .env
# Edit .env with your credentials

# Install dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Run in development mode
npm run dev
```

Open `http://localhost:5173` and click "Connect Google Calendar" to authenticate.

## Raspberry Pi Deployment

### Prerequisites

- Raspberry Pi 4 or 5 with Raspberry Pi OS (Desktop version)
- Monitor/TV connected via HDMI
- Network connection (WiFi or Ethernet)

### Setup

```bash
# Clone to the Pi
git clone <your-repo-url> ~/skylight-calendar
cd ~/skylight-calendar

# Copy and configure environment
cp .env.example .env
nano .env  # Fill in your credentials

# Run the setup script
bash scripts/setup-pi.sh

# Reboot to start in kiosk mode
sudo reboot
```

### First-Time Authentication

After the Pi boots:
1. From another computer on the same network, navigate to `http://<pi-ip>:3001`
2. Click "Connect Google Calendar"
3. Complete the Google OAuth flow
4. The calendar display will start showing events automatically

### Finding your Pi's IP

```bash
hostname -I
```

## Architecture

```
skylight-calendar/
├── server/          # Express.js backend
│   └── src/
│       ├── index.js          # Server entry point
│       └── routes/
│           ├── auth.js       # Google OAuth flow + token management
│           ├── calendar.js   # Calendar list + events API
│           └── weather.js    # OpenWeatherMap proxy
├── client/          # React frontend (Vite)
│   └── src/
│       ├── App.jsx           # Main app with auth check
│       ├── components/
│       │   ├── Header.jsx    # Date/time + weather
│       │   ├── WeekView.jsx  # 7-day grid layout
│       │   ├── DayColumn.jsx # Single day column
│       │   ├── EventCard.jsx # Individual event
│       │   ├── WeatherWidget.jsx
│       │   └── SetupScreen.jsx
│       └── hooks/
│           ├── useCalendarData.js
│           └── useWeatherData.js
└── scripts/
    └── setup-pi.sh   # Pi kiosk mode setup
```

## Customization

### Change the week start day

Edit `startOfWeek()` in `server/src/routes/calendar.js` and `client/src/hooks/useCalendarData.js`. Change `d.getDay()` offset to start on Monday (1) instead of Sunday (0).

### Adjust colors

Edit `--bg-primary`, `--today-highlight`, etc. in `client/src/styles/global.css`.

### Screen orientation

For portrait-mode displays, the CSS grid will need adjustment from `repeat(7, 1fr)` columns to a stacked layout.
