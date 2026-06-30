---
title: "Skylight Calendar — Quick Start Guide"
subtitle: "Get your Raspberry Pi calendar display up and running in 15 minutes"
author: "Skylight Calendar Project"
date: "June 2026"
geometry: margin=1in
fontsize: 11pt
toc: false
header-includes:
  - \usepackage{xcolor}
  - \usepackage{fancyhdr}
  - \pagestyle{fancy}
  - \fancyhead[L]{Skylight Calendar}
  - \fancyhead[R]{Quick Start Guide}
  - \fancyfoot[C]{\thepage}
---

# What You Need

| Item | Details |
|------|---------|
| Raspberry Pi | Model 4 or 5 (2GB+ RAM) |
| TV or Monitor | Any HDMI display (1080p recommended) |
| Micro-HDMI cable | Connects Pi to TV |
| iPazzPort Keyboard | KP-810-19S (2.4G wireless with touchpad) |
| Network | WiFi or Ethernet |
| Google Account | For calendar sync |

\vspace{12pt}

# Step 1: Set Up Google Cloud (5 minutes)

1. Go to **console.cloud.google.com** and create a project
2. Enable the **Google Calendar API** (search in Library)
3. Create **OAuth 2.0 credentials** (Credentials → Create → OAuth client ID)
   - Type: Web application
   - Redirect URI: `http://localhost:3001/api/auth/callback`
4. Copy your **Client ID** and **Client Secret**

\vspace{12pt}

# Step 2: Install on the Pi (5 minutes)

```bash
# Clone the repository
git clone https://github.com/cnbp173/skylight-calendar.git ~/skylight-calendar
cd ~/skylight-calendar

# Create your config file
cp .env.example .env
nano .env
```

Fill in your `.env` file:

```
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://YOUR_PI_IP:3001/api/auth/callback
```

Then install and run the setup:

```bash
npm install && cd server && npm install && cd ../client && npm install && cd ..
bash scripts/setup-pi.sh
sudo reboot
```

\vspace{12pt}

# Step 3: Connect Google Calendar (2 minutes)

After reboot:

1. Find your Pi's IP: run `hostname -I` on the Pi
2. From any device on the same network, open: `http://PI_IP:3001`
3. Click **"Connect Google Calendar"**
4. Sign in with Google and grant permissions
5. The calendar appears on your TV automatically

\newpage

# Using the Calendar

## Viewing Events

The calendar shows a 7-day week view. Use the **navigation arrows** at the top to move between weeks. Events are color-coded by calendar.

## Moving Events (Drag-and-Drop)

Move an event to another day **within the current week**:

1. Point the iPazzPort touchpad at an event
2. **Click and hold**, then slide to the target day
3. The target column highlights blue
4. **Release** to drop — the event moves and syncs to Google Calendar

## Editing Events (Double-Click)

Change title, date, time, or description:

1. **Double-click** any event to open the edit dialog
2. Modify the fields you want to change
3. Click **"Save Changes"** (or press Enter)
4. Click **"Cancel"** (or press Escape) to discard

**Tip:** Use the edit dialog to move events to a date outside the current week — the date picker allows any date.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Tab | Navigate between elements |
| Escape | Close edit dialog |
| Enter | Submit edit form |
| Double-click | Open event editor |
| Click + drag | Move event to another day |

\vspace{12pt}

# Troubleshooting

| Problem | Solution |
|---------|----------|
| "Not authenticated" | Visit `http://PI_IP:3001/api/auth/login` to re-connect |
| Events won't move | Re-authenticate to grant write permissions |
| Can't see cursor | Ensure global.css has `cursor: default` (not `none`) |
| Drag feels too sensitive | Adjust the 5px distance in WeekView.jsx PointerSensor |
| Edit dialog won't open | Ensure you're double-clicking (not single-click) |
| Changes don't sync | Check `journalctl -u skylight-calendar -f` for errors |

\vspace{12pt}

# Weather (Optional)

To show weather on the display:

1. Sign up at **openweathermap.org**
2. Get a free API key (One Call API 3.0)
3. Add to your `.env`:

```
OPENWEATHER_API_KEY=your-key
WEATHER_LAT=40.7128
WEATHER_LON=-74.0060
```

4. Restart: `sudo systemctl restart skylight-calendar`

\vspace{12pt}

# Need Help?

- Full documentation: `docs/skylight-calendar-documentation.md`
- Check server status: `sudo systemctl status skylight-calendar`
- View logs: `journalctl -u skylight-calendar -f`
- Find Pi IP: `hostname -I`
