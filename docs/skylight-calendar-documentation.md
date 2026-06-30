---
title: "Skylight Calendar - Complete Documentation"
subtitle: "A Raspberry Pi-powered digital calendar display"
author: "Skylight Calendar Project"
date: "June 2026"
geometry: margin=1in
fontsize: 11pt
toc: true
toc-depth: 3
---

\newpage

# Introduction

## What is Skylight Calendar?

Skylight Calendar is an open-source digital calendar display designed to run on a Raspberry Pi connected to a TV or monitor via HDMI. It syncs with Google Calendar and presents your schedule in a beautiful, minimal week-view interface inspired by the commercial Skylight Calendar product.

The display is designed to be always-on and glanceable — large typography, color-coded events by calendar, and a clean warm aesthetic that looks great in a kitchen, hallway, or office.

## Key Features

- **Week View Display**: Seven-day grid showing all upcoming events at a glance
- **Drag-and-Drop Rescheduling**: Move events between days within the current week by dragging with a mouse/touchpad
- **Drag-to-Resize Duration**: Extend or shorten events by dragging the handle at the bottom edge, snapping to 15-minute increments
- **Double-Click Edit Dialog**: Modify event title, date, time, and description — supports rescheduling to dates outside the visible week
- **Google Calendar Write-Back**: Changes sync back to Google Calendar in real-time
- **Create New Appointments**: Add events directly from the display and assign them to any connected calendar
- **Multi-Calendar Support**: Sync multiple Google Calendars with distinct colors per calendar (great for families)
- **Calendar Legend**: Color-coded legend at the top showing each calendar's name and color for easy identification
- **Weather Widget**: Current temperature and conditions displayed in the header
- **Auto-Refresh**: Events update every 5 minutes, weather every 30 minutes
- **WiFi Setup Screen**: On first boot without internet, prompts for WiFi credentials via an on-screen interface
- **iPazzPort Touchpad Optimized**: Visible cursor, large hit targets (44px+), keyboard navigation support
- **Kiosk Mode**: Full-screen display with no screen blanking, auto-start on boot
- **TV-Optimized**: Designed for 1080p displays with large, readable typography
- **Minimal Maintenance**: Once set up, runs unattended indefinitely

## System Requirements

| Component | Requirement |
|-----------|------------|
| Hardware | Raspberry Pi 4 or 5 (2GB+ RAM recommended) |
| OS | Raspberry Pi OS with Desktop (Bookworm or later) |
| Display | Any TV or monitor with HDMI input (1080p recommended) |
| Input | iPazzPort 2.4G Mini Wireless Keyboard with Touchpad (KP-810-19S) or similar |
| Network | WiFi or Ethernet connection |
| Software | Node.js 20+, Chromium browser |

\newpage

# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────┐
│                  Raspberry Pi                        │
│                                                     │
│  ┌──────────────┐       ┌───────────────────────┐  │
│  │  Node.js     │       │  Chromium (Kiosk)      │  │
│  │  Express     │◄─────►│  React Frontend        │  │
│  │  Server      │  API  │  (localhost:3001)       │  │
│  │  :3001       │       │                        │  │
│  └──────┬───────┘       └───────────────────────┘  │
│         │                                           │
└─────────┼───────────────────────────────────────────┘
          │ HTTPS
          ▼
┌─────────────────┐    ┌──────────────────────┐
│  Google Calendar │    │  OpenWeatherMap API   │
│  API             │    │                      │
└─────────────────┘    └──────────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | Node.js + Express | API server, OAuth handling, data caching |
| Frontend | React + Vite | Calendar UI rendering |
| Drag-and-Drop | @dnd-kit/core | Event rescheduling within the week view |
| Auth | Google OAuth 2.0 | Calendar read/write access |
| Weather | OpenWeatherMap 4.0 | Current conditions + forecast |
| Display | Chromium Kiosk | Full-screen browser on Pi |
| Process Mgmt | systemd | Server auto-start on boot |

## Directory Structure

```
skylight-calendar/
├── .env.example          # Environment variable template
├── .env                  # Your configuration (not in git)
├── .tokens.json          # Google OAuth tokens (not in git)
├── package.json          # Root package with orchestration scripts
├── server/
│   ├── package.json
│   ├── src/
│   │   ├── index.js      # Express server entry point
│   │   └── routes/
│   │       ├── auth.js    # Google OAuth flow
│   │       ├── calendar.js # Calendar list + events
│   │       └── weather.js  # Weather data proxy
│   └── tests/             # Server unit tests
├── client/
│   ├── package.json
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx       # React entry point
│   │   ├── App.jsx        # Root component
│   │   ├── styles/
│   │   │   └── global.css # CSS variables and base styles
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── CalendarLegend.jsx   # Max 4-wide grid of calendar colors
│   │   │   ├── WeekView.jsx         # DnD context wrapper + resize preview
│   │   │   ├── DayColumn.jsx        # Droppable zone + resize handles
│   │   │   ├── DraggableEvent.jsx   # Drag wrapper for events
│   │   │   ├── ResizeHandle.jsx     # Bottom-edge handle for duration resize
│   │   │   ├── EventCard.jsx
│   │   │   ├── EditEventDialog.jsx  # Modal for editing events
│   │   │   ├── AddEventDialog.jsx   # Modal for creating new appointments
│   │   │   ├── WeatherWidget.jsx
│   │   │   ├── WifiSetupScreen.jsx  # WiFi network selection and connection
│   │   │   └── SetupScreen.jsx
│   │   └── hooks/
│   │       ├── useCalendarData.js
│   │       └── useWeatherData.js
│   └── src/__tests__/     # Client unit tests
├── scripts/
│   ├── setup-pi.sh        # Automated Pi configuration
│   └── start-kiosk.sh     # Generated kiosk launcher
└── docs/
    └── skylight-calendar-documentation.md
```

\newpage

# Setup Guide

## Step 1: Google Cloud Configuration

### Create a Google Cloud Project

1. Navigate to the Google Cloud Console: `https://console.cloud.google.com/`
2. Click **Select a project** → **New Project**
3. Name it (e.g., "Skylight Calendar") and click **Create**
4. Select the newly created project

### Enable the Calendar API

1. Go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click on it and press **Enable**

### Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted, configure the consent screen:
   - User Type: **External**
   - App name: "Skylight Calendar"
   - Add your email as a test user
4. Application type: **Web application**
5. Name: "Skylight Calendar"
6. Under **Authorized redirect URIs**, add:
   - `http://localhost:3001/api/auth/callback` (for development)
   - `http://<your-pi-ip>:3001/api/auth/callback` (for production)
7. Click **Create** and note the **Client ID** and **Client Secret**

### Important Note on Consent Screen

If your app is in "Testing" mode, only users you explicitly add as test users can authenticate. You can add up to 100 test users without going through Google's verification process.

### OAuth Scopes

The application requests the following OAuth scopes:

| Scope | Purpose |
|-------|---------|
| `calendar.readonly` | Read calendar list and event data |
| `calendar.calendarlist.readonly` | List available calendars |
| `calendar.events` | Update events (drag-and-drop, edit dialog) |

**If upgrading from a previous version** that only had read-only scopes, users must re-authenticate by visiting `/api/auth/login` to grant the new write permission. Delete `.tokens.json` first if the existing token doesn't include write access.

## Step 2: OpenWeatherMap Setup

1. Create an account at `https://openweathermap.org/`
2. Go to **API keys** in your account dashboard
3. Subscribe to **One Call API 4.0** (requires payment method but includes 1,000 free calls/day — more than enough for this use case)
4. Copy your API key
5. Find your location coordinates:
   - Open Google Maps
   - Right-click on your location
   - The first line shows latitude, longitude (e.g., 40.7128, -74.0060)

## Step 3: Configure Environment

```bash
cd skylight-calendar
cp .env.example .env
```

Edit `.env` with your values:

```bash
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/callback
OPENWEATHER_API_KEY=abcdef1234567890
WEATHER_LAT=40.7128
WEATHER_LON=-74.0060
PORT=3001
```

## Step 4: Install and Run (Development)

```bash
# Install all dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Start in development mode (both server and client with hot-reload)
npm run dev
```

Open `http://localhost:5173` in your browser. You'll see the setup screen prompting you to connect Google Calendar.

## Step 5: Deploy to Raspberry Pi

### Hardware Setup: HDMI Connection

1. **Connect the Pi to your TV/monitor** using an HDMI cable:
   - **Raspberry Pi 4**: Has two micro-HDMI ports. Use the port labeled **HDMI0** (closest to the USB-C power port). You'll need a **micro-HDMI to HDMI** cable or adapter.
   - **Raspberry Pi 5**: Has two micro-HDMI ports. Use **HDMI0** (same position). Same cable type as Pi 4.
   - Connect the other end to any available HDMI input on your TV.

2. **Set the TV input** to the HDMI port you connected (e.g., HDMI 1, HDMI 2).

3. **Power the Pi** via USB-C. The Pi should boot and display the Raspberry Pi OS desktop on the TV.

#### HDMI Tips

| Issue | Solution |
|-------|----------|
| No signal on TV | Try the other HDMI port on the Pi, or a different HDMI input on the TV |
| Resolution looks wrong | The Pi auto-detects resolution via EDID. If it's not 1080p, edit `/boot/firmware/config.txt` and add `hdmi_group=1` and `hdmi_mode=16` to force 1080p |
| TV shows black borders | Add `disable_overscan=1` to `/boot/firmware/config.txt` |
| Display is rotated | Add `display_hdmi_rotate=1` (90°), `=2` (180°), or `=3` (270°) to `/boot/firmware/config.txt` |
| Want the TV to turn on/off with the Pi | HDMI-CEC is enabled by default. Most modern TVs support CEC — the TV will power on when the Pi boots and enter standby when the Pi shuts down. You can control this with `cec-client` (install via `sudo apt-get install cec-utils`) |

#### HDMI-CEC: Auto Power Control

HDMI-CEC allows the Pi to turn your TV on and off automatically. This is useful for:
- Turning the display on in the morning and off at night
- Waking the TV when the Pi boots

```bash
# Install CEC utilities
sudo apt-get install cec-utils

# Turn TV on
echo "on 0" | cec-client -s -d 1

# Turn TV off (standby)
echo "standby 0" | cec-client -s -d 1
```

To schedule the TV on/off automatically, add cron jobs:

```bash
crontab -e
```

Add these lines (example: on at 7 AM, off at 10 PM):

```
0 7 * * * echo "on 0" | cec-client -s -d 1
0 22 * * * echo "standby 0" | cec-client -s -d 1
```

#### Recommended Cables

- **Micro-HDMI to HDMI cable** (Pi 4/5): Any certified cable works. For runs over 3m/10ft, use a High Speed HDMI cable rated for 4K to avoid signal issues at 1080p.
- **Mount the Pi**: Use a VESA mount bracket or double-sided tape to attach the Pi to the back of the TV for a clean installation.

### Transfer the project

```bash
# From your development machine
scp -r skylight-calendar/ pi@<pi-ip>:~/skylight-calendar/
```

Or clone from a git repository:

```bash
ssh pi@<pi-ip>
git clone <your-repo-url> ~/skylight-calendar
```

### Run the setup script

```bash
cd ~/skylight-calendar
cp .env.example .env
nano .env  # Fill in your credentials
bash scripts/setup-pi.sh
sudo reboot
```

### First-time authentication

After the Pi reboots:

1. The TV should show Chromium in full-screen with the Skylight Calendar setup screen
   - **Note:** If the Pi has no Ethernet connection and no saved WiFi credentials, a WiFi setup screen will appear first. Use the iPazzPort keyboard to select your network and enter the password. Once connected, the calendar setup screen will load automatically.
2. From any device on the same network, open a browser to `http://<pi-ip>:3001`
3. Click "Connect Google Calendar"
4. Complete the Google sign-in flow
5. The TV display will automatically start showing your calendar

### Verifying the deployment

Once authenticated, the TV should display the week view with your events. To verify everything is running:

```bash
# Check the server is running
sudo systemctl status skylight-calendar

# Check the Pi's IP address (to access from other devices)
hostname -I

# View server logs
journalctl -u skylight-calendar -f
```

\newpage

# Usage Examples

## Example 1: Family Calendar

A family of four, each with their own Google Calendar, wants a shared display in the kitchen.

**Setup:**

1. Create one Google account to act as the "display" account
2. Have each family member share their calendar with this account:
   - In Google Calendar → Settings → Share with specific people
   - Add the display account email with "See all event details" permission
3. Connect the display account to Skylight Calendar
4. All shared calendars appear automatically with distinct colors

**Result:** The kitchen TV shows everyone's schedule — work meetings, school events, soccer practice, and date nights — each color-coded by family member.

## Example 2: Office Conference Room Display

Mount a TV outside a conference room to show the room's availability.

**Setup:**

1. Connect the room's resource calendar (your Google Workspace admin can share it)
2. Configure only that one calendar in the system
3. The display shows when the room is free vs. booked

## Example 3: Personal Dashboard

Use as a personal scheduling dashboard in a home office.

**Setup:**

1. Connect your primary Google account
2. Enable your work calendar, personal calendar, and any subscribed calendars (holidays, sports)
3. Add weather for your location
4. Mount a small monitor on your desk or wall

\newpage

# Interacting with Events

## Input Device

The Skylight Calendar is designed to be operated with an **iPazzPort 2.4G Mini Wireless Keyboard with Touchpad Mouse Combo (KP-810-19S)**. This compact wireless keyboard provides:

- A built-in touchpad for cursor/pointer control
- Full QWERTY keyboard for text input in the edit dialog
- Tab key for navigating between form fields
- Escape key for closing dialogs

The UI has been optimized for this device:

- **Visible cursor** (not hidden as in a pure kiosk display)
- **44px minimum button/input height** for comfortable touchpad targeting
- **5px drag activation distance** to prevent accidental drags from tap-clicks
- **Focus rings** on all interactive elements for Tab navigation

## Drag-and-Drop (Within Current Week)

To move an event to a different day within the current week:

1. Position the cursor over the event card using the touchpad
2. Click and hold (press down), then move the touchpad in the direction of the target day
3. The event follows the cursor, and the target day column highlights in blue
4. Release the click to drop the event on the highlighted day

**Behavior:**
- The event's start and end times are preserved (only the date changes)
- The event's duration stays the same
- Changes sync to Google Calendar immediately
- If the sync fails, the event snaps back to its original position

## Resizing Events (Drag Handle)

To make an event longer or shorter without opening the edit dialog:

1. Hover over the bottom edge of an event card — a small horizontal bar appears
2. **Click and drag** the handle downward to extend the event, or upward to shorten it
3. The duration snaps to **15-minute increments** as you drag
4. Release to confirm — the new end time syncs to Google Calendar

**Constraints:**
- Minimum duration is 15 minutes (you can't resize shorter than that)
- Events cannot extend past 10 PM (the end of the visible grid)
- The resize handle only appears on events tall enough to accommodate it

## Edit Dialog (Any Date/Time)

For more comprehensive edits, or to reschedule to a date outside the visible week:

1. Double-click (or double-tap) an event card
2. The edit dialog opens with all fields pre-populated:
   - **Title**: The event's name/summary
   - **Date**: Can be changed to any date (not limited to the current week)
   - **Start Time**: Event start time
   - **End Time**: Event end time
   - **Description**: Event notes/details
3. Modify any fields as needed
4. Click "Save Changes" to push the update to Google Calendar
5. Click "Cancel" or press Escape to close without saving

**Time validation:**
- When you change the start time, the end time automatically adjusts to 30 minutes later
- You cannot set an end time earlier than the start time — it snaps to start + 30 minutes

**Keyboard shortcuts in the dialog:**
- **Tab**: Move between fields
- **Escape**: Close without saving
- **Enter** (in any field): Submit the form

## Adding New Appointments

To create a new appointment from the calendar display:

1. Click the **"+ Add New Appointment"** button (located to the right of the calendar legend)
2. The add dialog opens with these fields:
   - **Title**: The appointment name (required)
   - **Calendar**: Select which calendar to add the event to (dropdown shows all connected calendars)
   - **Date**: Defaults to today
   - **Start Time**: Defaults to the next full hour
   - **End Time**: Defaults to one hour after start
   - **Description**: Optional notes
3. Click **"Create Appointment"** to save
4. The event is immediately created on Google Calendar and appears on the display

\newpage

# API Reference

## Network Endpoints (WiFi Setup)

### GET /api/network/status
Checks internet connectivity and current WiFi network.

**Response:**
```json
{ "connected": true, "ssid": "MyNetwork" }
```

### GET /api/network/scan
Scans for available WiFi networks.

**Response:**
```json
[
  { "ssid": "HomeNetwork", "signal": 85, "secured": true },
  { "ssid": "CoffeeShop", "signal": 42, "secured": false }
]
```

### POST /api/network/connect
Connects to a WiFi network.

**Request Body:**
```json
{ "ssid": "HomeNetwork", "password": "mypassword123" }
```

**Response:** `{ "success": true }`

**Error Responses:**

| Status | Cause |
|--------|-------|
| 400 | Missing ssid |
| 500 | Connection failed (wrong password, out of range, etc.) |

## Authentication Endpoints

### GET /api/auth/status

Returns the current authentication state.

**Response:**
```json
{ "authenticated": true }
```

### GET /api/auth/login

Redirects the user to Google's OAuth consent screen.

### GET /api/auth/callback

OAuth callback handler. Google redirects here after the user grants permission. Stores tokens and shows a success message.

### POST /api/auth/logout

Removes stored authentication tokens.

**Response:**
```json
{ "success": true }
```

## Calendar Endpoints

### GET /api/calendar/list

Returns all calendars accessible to the authenticated user.

**Response:**
```json
[
  {
    "id": "primary",
    "summary": "John's Calendar",
    "color": "#4285f4",
    "primary": true
  },
  {
    "id": "family@group.calendar.google.com",
    "summary": "Family",
    "color": "#33b679",
    "primary": false
  }
]
```

### GET /api/calendar/events

Returns events for the specified calendars and time range.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| calendars | string | Comma-separated calendar IDs |
| timeMin | ISO string | Start of time range (defaults to start of current week) |
| timeMax | ISO string | End of time range (defaults to end of current week) |

**Response:**
```json
[
  {
    "id": "abc123",
    "calendarId": "primary",
    "title": "Team Standup",
    "start": "2026-06-28T09:00:00-04:00",
    "end": "2026-06-28T09:30:00-04:00",
    "allDay": false,
    "location": "Conference Room B",
    "description": "Daily sync meeting"
  }
]
```

### PATCH /api/calendar/events/:id

Updates an existing event on Google Calendar. Called when the user drags an event to a new day or submits the edit dialog.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | The Google Calendar event ID |

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| calendarId | string | Yes | Which calendar the event belongs to |
| title | string | No | New event title/summary |
| start | ISO string | No | New start date-time |
| end | ISO string | No | New end date-time |
| description | string | No | New event description |

**Example Request:**
```json
{
  "calendarId": "primary",
  "title": "Rescheduled Meeting",
  "start": "2026-06-30T14:00:00Z",
  "end": "2026-06-30T15:00:00Z"
}
```

**Response:**
```json
{
  "id": "abc123",
  "calendarId": "primary",
  "title": "Rescheduled Meeting",
  "start": "2026-06-30T14:00:00Z",
  "end": "2026-06-30T15:00:00Z",
  "allDay": false,
  "location": null,
  "description": null
}
```

**Error Responses:**

| Status | Cause |
|--------|-------|
| 400 | Missing calendarId in request body |
| 401 | Not authenticated |
| 500 | Google Calendar API error |

**Note:** Demo events (IDs starting with "demo-") are handled locally and don't call the Google API.

### POST /api/calendar/events

Creates a new event on Google Calendar.

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| calendarId | string | Yes | Which calendar to create the event on |
| title | string | Yes | Event title/summary |
| start | ISO string | Yes | Start date-time |
| end | ISO string | Yes | End date-time |
| description | string | No | Event description |

**Example Request:**
```json
{
  "calendarId": "primary",
  "title": "Doctor Appointment",
  "start": "2026-07-01T14:00:00Z",
  "end": "2026-07-01T15:00:00Z",
  "description": "Annual checkup"
}
```

**Response (201 Created):**
```json
{
  "id": "newevt123",
  "calendarId": "primary",
  "title": "Doctor Appointment",
  "start": "2026-07-01T14:00:00Z",
  "end": "2026-07-01T15:00:00Z",
  "allDay": false,
  "location": null,
  "description": "Annual checkup"
}
```

**Error Responses:**

| Status | Cause |
|--------|-------|
| 400 | Missing calendarId, title, or start/end |
| 401 | Not authenticated |
| 500 | Google Calendar API error |

## Weather Endpoint

### GET /api/weather/current

Returns current weather and 7-day forecast.

**Response:**
```json
{
  "current": {
    "temp": 72,
    "condition": "Clear",
    "icon": "01d",
    "description": "clear sky"
  },
  "daily": [
    {
      "date": "2026-06-28T00:00:00.000Z",
      "high": 85,
      "low": 68,
      "condition": "Clear",
      "icon": "01d"
    }
  ]
}
```

\newpage

# Running Tests

## Server Tests

```bash
cd server
npm test          # Run all tests once
npm run test:watch  # Run in watch mode during development
```

Server tests cover:

- **Authentication routes**: OAuth flow, token persistence, login/logout
- **Calendar routes**: Calendar listing, event fetching, multi-calendar merging, event updates (PATCH), demo event handling, error handling
- **Weather routes**: API integration, data transformation, error states, demo fallback

## Client Tests

```bash
cd client
npm test          # Run all tests once
npm run test:watch  # Run in watch mode during development
```

Client tests cover:

- **EventCard**: Rendering, time formatting, all-day events, color application, drag overlay styles
- **DayColumn**: Day header, event listing, today highlighting, drop target, double-click edit trigger
- **DraggableEvent**: Drag affordance, accessibility attributes, double-click handler, positioning
- **EditEventDialog**: Form population, auto-focus, Escape close, backdrop close, save/cancel, error display, disabled state
- **WeekView**: 7-day grid, event distribution, loading state, time gutter
- **useCalendarData**: Fetch on mount, optimistic update, rollback on failure, network error handling
- **WeatherWidget**: Condition icons, temperature display, null handling
- **SetupScreen**: Connect button, instructional text

## Running All Tests

From the project root:

```bash
cd server && npm test && cd ../client && npm test
```

\newpage

# Customization

## Changing the Color Scheme

Edit `client/src/styles/global.css`:

```css
:root {
  --bg-primary: #faf8f5;      /* Page background */
  --bg-secondary: #ffffff;    /* Card background */
  --text-primary: #1a1a2e;    /* Main text */
  --text-secondary: #4a5568;  /* Secondary text */
  --text-muted: #a0aec0;      /* Muted/hint text */
  --border: #e8e4df;           /* Borders */
  --today-highlight: #fff9e6;  /* Today column background */
}
```

## Dark Mode

Replace the CSS variables with dark-mode values:

```css
:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #2d2d44;
  --text-primary: #e2e8f0;
  --text-secondary: #a0aec0;
  --text-muted: #718096;
  --border: #4a5568;
  --today-highlight: #2d3748;
}
```

## Changing the Week Start Day

To start the week on Monday instead of Sunday, modify the `startOfWeek` function in both:

- `server/src/routes/calendar.js`
- `client/src/hooks/useCalendarData.js`

Change:
```javascript
d.setDate(d.getDate() - d.getDay());
```

To:
```javascript
const day = d.getDay();
d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
```

## Adjusting Refresh Intervals

In `client/src/hooks/useCalendarData.js`:
```javascript
const interval = setInterval(load, 5 * 60 * 1000); // Change 5 to desired minutes
```

In `client/src/hooks/useWeatherData.js`:
```javascript
const interval = setInterval(fetchWeather, 30 * 60 * 1000); // Change 30 to desired minutes
```

## Portrait Mode Display

For a vertically-mounted monitor, change the grid in `client/src/components/WeekView.jsx`:

```javascript
grid: {
  display: 'grid',
  gridTemplateColumns: '1fr',  // Stack days vertically
  gridTemplateRows: 'repeat(7, 1fr)',
  gap: '8px',
  flex: 1,
}
```

\newpage

# Frequently Asked Questions

## General

**Q: Does this require a constant internet connection?**

A: Yes, for syncing calendar events and fetching weather data. However, if the connection drops temporarily, the last-fetched data remains displayed. The app will resume syncing when connectivity returns.

**Q: Can I use this without a Raspberry Pi?**

A: Yes. Any computer that can run Node.js and Chromium will work. The kiosk setup script is Pi-specific, but the app itself is platform-agnostic. You could run it on an old laptop connected to a TV.

**Q: How much does this cost to run?**

A: Hardware cost is a Raspberry Pi ($35-80) plus any monitor/TV you already have. Operating costs are essentially zero — Google Calendar API and OpenWeatherMap free tier are sufficient for a single display.

**Q: Can multiple TVs share the same backend?**

A: Yes. Run one server instance and point multiple browser displays at `http://<server-ip>:3001`. All will show the same calendar data.

## Calendar

**Q: How do I add or remove calendars from the display?**

A: The system displays all calendars shared with the connected Google account. To control visibility:

- **Add a calendar**: Share it with the account connected to Skylight Calendar
- **Remove a calendar**: Unshare it, or hide it in Google Calendar settings for that account

**Q: Can I show calendars from different Google accounts?**

A: The simplest approach is to share calendars from other accounts to the one connected to Skylight Calendar. Direct multi-account OAuth is not currently supported.

**Q: Why don't I see my events?**

A: Check these common causes:

1. The calendar might not be shared with the connected account
2. The OAuth token might have expired — visit `http://<pi-ip>:3001/api/auth/status` to check
3. Events might be outside the current week's time range

**Q: Does it support recurring events?**

A: Yes. The Google Calendar API expands recurring events into individual instances via the `singleEvents: true` parameter. Each occurrence appears as its own event on the correct day.

## Weather

**Q: Can I use Celsius instead of Fahrenheit?**

A: Change `units=imperial` to `units=metric` in `server/src/routes/weather.js`:

```javascript
const url = `...&units=metric&...`;
```

**Q: The weather widget shows nothing. What's wrong?**

A: Verify your OpenWeatherMap API key is active and that you've subscribed to the One Call API 4.0. New API keys can take a few minutes to activate.

## Raspberry Pi

**Q: What if my Pi has no internet on first boot?**

A: The calendar will show a WiFi setup screen. Use the iPazzPort keyboard to select your network and enter the password. The credentials are saved and persist across reboots.

**Q: Can I use a Pi Zero 2 W?**

A: It's possible but not recommended. The Pi Zero 2 W has limited RAM (512MB) which makes running Chromium unreliable. Consider using a lightweight static page approach instead of a full React app if you must use a Zero.

**Q: My Pi screen goes black after a while. How do I fix this?**

A: The setup script disables screen blanking, but if it's still happening:

```bash
# Disable screen blanking manually
xset s off
xset -dpms
xset s noblank
```

Add these to `/etc/xdg/lxsession/LXDE-pi/autostart` to persist across reboots.

**Q: How do I update the app after making changes?**

A: SSH into the Pi and:

```bash
cd ~/skylight-calendar
git pull  # if using git
cd client && npm run build && cd ..
sudo systemctl restart skylight-calendar
```

\newpage

# Troubleshooting

## Authentication Issues

### "Not authenticated" after connecting Google Calendar

**Cause:** OAuth tokens have expired and cannot be refreshed.

**Fix:**
```bash
# Remove stale tokens
rm .tokens.json

# Re-authenticate by visiting the setup screen
# Navigate to http://<pi-ip>:3001 from another device
```

### Google OAuth shows "Access Blocked" or "App not verified"

**Cause:** Your Google Cloud project is in testing mode and the user is not added as a test user.

**Fix:**
1. Go to Google Cloud Console → APIs & Services → OAuth consent screen
2. Under "Test users", add the Google account you're trying to connect
3. Try the login flow again

### Redirect URI mismatch error

**Cause:** The redirect URI in your `.env` doesn't match what's configured in Google Cloud Console.

**Fix:** Ensure `GOOGLE_REDIRECT_URI` in `.env` exactly matches one of the "Authorized redirect URIs" in your OAuth client configuration. Common mistakes:
- Trailing slash mismatch (`/callback` vs `/callback/`)
- `localhost` vs actual IP address
- Wrong port number

## Display Issues

### Calendar shows "Loading calendar..." indefinitely

**Cause:** The server cannot reach Google's API, or the frontend cannot reach the backend.

**Fix:**
1. Check server logs: `journalctl -u skylight-calendar -f`
2. Test the API directly: `curl http://localhost:3001/api/auth/status`
3. Verify network connectivity: `ping google.com`

### Events appear on the wrong day

**Cause:** Timezone mismatch between the Pi and your Google Calendar.

**Fix:**
```bash
# Set the correct timezone on the Pi
sudo raspi-config
# Navigate to: Localisation Options → Timezone
```

### Text is too small on the TV

**Cause:** The Pi might be outputting at a non-native resolution.

**Fix:**
```bash
# Check current resolution
xrandr

# Force 1080p output (edit /boot/config.txt)
hdmi_group=1
hdmi_mode=16
```

Alternatively, adjust font sizes in `client/src/styles/global.css` and component style objects.

### White screen / blank page on the TV

**Cause:** The client build is missing or the server can't serve static files.

**Fix:**
```bash
cd ~/skylight-calendar/client
npm run build
# Verify dist/ directory exists and contains index.html
ls dist/
```

## Weather Issues

### Weather widget not appearing

**Cause:** Missing or invalid OpenWeatherMap configuration.

**Fix:**
1. Verify `.env` has all three weather values set:
   - `OPENWEATHER_API_KEY`
   - `WEATHER_LAT`
   - `WEATHER_LON`
2. Test the endpoint: `curl http://localhost:3001/api/weather/current`
3. Check if your API key is active at `https://home.openweathermap.org/api_keys`

### Weather shows wrong temperature

**Cause:** Incorrect coordinates or units.

**Fix:** Verify your latitude/longitude values are correct. Positive latitude = North, negative = South. Positive longitude = East, negative = West. For the US, longitude should be negative (e.g., -74.006 for New York).

## Server Issues

### Server won't start: "EADDRINUSE"

**Cause:** Another instance is already running on port 3001.

**Fix:**
```bash
# Find and kill the existing process
lsof -i :3001
kill <PID>

# Or change the port in .env
PORT=3002
```

### Server crashes with "ENOMEM"

**Cause:** Raspberry Pi running out of memory.

**Fix:**
```bash
# Add swap space
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile  # Set CONF_SWAPSIZE=512
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### systemd service not starting on boot

**Fix:**
```bash
# Check service status
sudo systemctl status skylight-calendar

# View recent logs
journalctl -u skylight-calendar --since "5 min ago"

# Re-enable the service
sudo systemctl enable skylight-calendar
sudo systemctl start skylight-calendar
```

## Network Issues

### Cannot access Pi from another device

**Cause:** Firewall or network isolation.

**Fix:**
```bash
# Check if the server is listening
ss -tlnp | grep 3001

# Verify the Pi's IP address
hostname -I

# Ensure devices are on the same network/subnet
```

### Calendar stops updating

**Cause:** Google OAuth refresh token expired (rare, but happens if the app is unused for 6+ months or the account password changes).

**Fix:** Re-authenticate by visiting the setup screen. The app will obtain a new refresh token.

\newpage

# Maintenance

## Updating the Application

```bash
ssh pi@<pi-ip>
cd ~/skylight-calendar
git pull origin main
cd client && npm run build && cd ..
sudo systemctl restart skylight-calendar
```

## Backing Up Configuration

The only files you need to back up are:
- `.env` (your API credentials)
- `.tokens.json` (Google OAuth tokens)

```bash
cp .env .env.backup
cp .tokens.json .tokens.json.backup
```

## Monitoring

Check the server status:
```bash
sudo systemctl status skylight-calendar
```

View live logs:
```bash
journalctl -u skylight-calendar -f
```

## Automatic Restarts

The systemd service is configured to restart on failure:
```ini
Restart=on-failure
RestartSec=5
```

If the server crashes, it will automatically restart within 5 seconds.

\newpage

# Security Considerations

- **OAuth tokens** are stored locally in `.tokens.json`. Keep this file secure and never commit it to version control.
- **API keys** are stored in `.env`. Same guidance applies.
- The server binds to `0.0.0.0` (all interfaces) so it's accessible from your local network. Do **not** expose port 3001 to the public internet.
- If you must access the calendar remotely, use a VPN or SSH tunnel rather than opening the port in your router.
- **Write access**: The app now has write access to your Google Calendar events (via the `calendar.events` scope). Anyone with network access to the Pi can modify your events through the UI. Ensure your local network is trusted.
- Google OAuth tokens include a refresh token that grants ongoing read AND write access to your calendar data. If the Pi is compromised, revoke access immediately at `https://myaccount.google.com/permissions`.
- The PATCH endpoint only allows modifying existing events — it cannot create or delete events.
