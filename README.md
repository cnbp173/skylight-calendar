# Skylight Calendar

A Skylight-inspired digital calendar display for Raspberry Pi. Syncs with Google Calendar, allows drag-and-drop rescheduling, and shows a clean week view on any TV or monitor via HDMI.

Designed for use with an iPazzPort 2.4G Mini Wireless Keyboard with Touchpad Mouse Combo (KP-810-19S) for touchpad navigation and keyboard input.

## Features

- **Weekly agenda view** with color-coded events per calendar
- **Drag-and-drop rescheduling** — move events between days within the current week
- **Double-click to edit** — modify title, date, time, and description via a modal dialog
- **Google Calendar sync** — changes made on the display push back to Google Calendar in real-time
- **Calendar legend** showing each person's name and color
- **Multiple Google Calendar support** (family members, work, etc.)
- **Weather widget** (current conditions + 7-day forecast)
- **Auto-refreshing display** (5 min for events, 30 min for weather)
- **iPazzPort touchpad optimized** — visible cursor, large hit targets (44px+), keyboard navigation
- **Kiosk mode** (full-screen, no screen blanking, auto-start on boot)
- **TV-optimized typography** at 1080p

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
2. Get a free API key (One Call API 4.0 — requires credit card but has 1000 free calls/day)
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

## Using the Calendar

### Rescheduling Events (Drag-and-Drop)

1. Point the iPazzPort touchpad at an event on the calendar
2. Click and hold, then drag the event to another day column
3. Release to drop — the event moves to that day (keeping its original time)
4. The change syncs to Google Calendar automatically

### Editing Events (Double-Click)

1. Double-click (or double-tap) any event to open the edit dialog
2. Modify the title, date, start/end time, or description
3. Click "Save Changes" to push the update to Google Calendar
4. Click "Cancel" or press Escape to discard changes

### Keyboard Navigation

- **Tab / Shift+Tab**: Navigate between events and buttons
- **Arrow keys**: Scroll the iPazzPort touchpad
- **Escape**: Close the edit dialog
- **Enter**: Submit the edit form

## Raspberry Pi Deployment

### Prerequisites

- Raspberry Pi 4 or 5 with Raspberry Pi OS (Desktop version)
- Monitor/TV connected via HDMI
- iPazzPort KP-810-19S wireless keyboard (or similar wireless keyboard/touchpad combo)
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

**Note:** If the Pi is not connected via Ethernet and has no saved WiFi credentials, a WiFi setup screen will appear on the display before the Google auth prompt. Use the iPazzPort keyboard to select your network and enter the password. Once connected, the setup flow will continue automatically.

1. From another computer on the same network, navigate to `http://<pi-ip>:3001`
2. Click "Connect Google Calendar"
3. Complete the Google OAuth flow (grants both read AND write access)
4. The calendar display will start showing events automatically

### Re-Authentication (Required After Upgrade)

If upgrading from a read-only version, you must re-authenticate to grant the new write permissions:
1. Visit `http://<pi-ip>:3001/api/auth/login`
2. Complete the Google consent screen (you'll see a new "Edit events" permission)
3. The calendar will resume with full drag-and-drop + edit capability

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
│           ├── calendar.js   # Calendar list + events + event updates
│           └── weather.js    # OpenWeatherMap proxy
├── client/          # React frontend (Vite)
│   └── src/
│       ├── App.jsx           # Main app with auth check + edit dialog
│       ├── components/
│       │   ├── Header.jsx         # Date/time + weather
│       │   ├── CalendarLegend.jsx # Color legend per calendar
│       │   ├── WeekView.jsx       # 7-day DnD-enabled grid layout
│       │   ├── DayColumn.jsx      # Single day (droppable zone)
│       │   ├── DraggableEvent.jsx # Drag wrapper for events
│       │   ├── EventCard.jsx      # Individual event card
│       │   ├── EditEventDialog.jsx # Modal for editing events
│       │   ├── WeatherWidget.jsx
│       │   └── SetupScreen.jsx
│       └── hooks/
│           ├── useCalendarData.js # Fetch + optimistic update logic
│           └── useWeatherData.js
├── scripts/
│   └── setup-pi.sh   # Pi kiosk mode setup
└── docs/
    ├── skylight-calendar-documentation.md
    └── skylight-calendar-quick-start.md
```

## Running Tests

```bash
# All tests (server + client)
npm test

# Server only
cd server && npm test

# Client only
cd client && npm test

# Watch mode (during development)
cd client && npm run test:watch
```

## Customization

### Change the week start day

Edit `startOfWeek()` in `server/src/routes/calendar.js` and `client/src/hooks/useCalendarData.js`. Change `d.getDay()` offset to start on Monday (1) instead of Sunday (0).

### Adjust colors

Edit `--bg-primary`, `--today-highlight`, etc. in `client/src/styles/global.css`.

### Screen orientation

For portrait-mode displays, the CSS grid will need adjustment from `repeat(7, 1fr)` columns to a stacked layout.

### Disable drag-and-drop

Remove the `DndContext` wrapper in `WeekView.jsx` and replace `DraggableEvent` with a plain `<div>` to revert to read-only mode.

## Security Notes

- OAuth tokens are stored in `.tokens.json` — never commit this file
- The server binds to all interfaces (`0.0.0.0`) — do not expose port 3001 to the public internet
- If the Pi is compromised, revoke access at https://myaccount.google.com/permissions
- The app now has write access to your calendar — events can be modified from the display
