#!/bin/bash
# Raspberry Pi setup script for Skylight Calendar kiosk mode
#
# Supports:
#   - Raspberry Pi OS Bookworm (Wayland/wayfire) and Bullseye (X11/LXDE)
#   - Any username (auto-detected, not hardcoded to "pi")
#   - iPazzPort KP-810-19S wireless keyboard with touchpad (cursor stays visible)
#
# Run this on your Pi after cloning the repo and creating your .env file.

set -e

echo "=== Skylight Calendar - Raspberry Pi Setup ==="
echo ""

# Detect the current user and project directory
CURRENT_USER=$(whoami)
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "User: $CURRENT_USER"
echo "Project: $PROJECT_DIR"
echo ""

# Check for .env file
if [ ! -f "$PROJECT_DIR/.env" ]; then
  echo "ERROR: .env file not found!"
  echo "Copy .env.example to .env and fill in your Google credentials first:"
  echo "  cp $PROJECT_DIR/.env.example $PROJECT_DIR/.env"
  echo "  nano $PROJECT_DIR/.env"
  exit 1
fi

# Update system
echo "Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# Install dependencies (no unclutter — we need the cursor for iPazzPort touchpad)
echo "Installing required packages..."
sudo apt-get install -y \
  chromium-browser \
  xdotool \
  nodejs \
  npm

# Install Node.js 20+ if not already present
NODE_MAJOR=$(node --version 2>/dev/null | cut -d. -f1 | tr -d 'v' || echo "0")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Install project dependencies and build the client
echo "Installing project dependencies..."
cd "$PROJECT_DIR"
npm install
cd server && npm install && cd ..
cd client && npm install && npm run build && cd ..

# Detect display server (Wayland vs X11)
# Bookworm uses wayfire (Wayland) by default, Bullseye uses LXDE (X11)
DISPLAY_SERVER="x11"
if [ -f /etc/xdg/wayfire.ini ] || [ -f "$HOME/.config/wayfire.ini" ]; then
  DISPLAY_SERVER="wayland"
fi

echo "Detected display server: $DISPLAY_SERVER"

# Create the kiosk launcher script
cat > "$PROJECT_DIR/scripts/start-kiosk.sh" << KIOSK
#!/bin/bash
# Skylight Calendar kiosk launcher
# Starts the Node.js server and opens Chromium in full-screen mode

# Wait for the desktop environment to be ready
sleep 5

# Start the server in the background
cd "$PROJECT_DIR"
node server/src/index.js &
SERVER_PID=\$!

# Wait for server to be ready (up to 10 seconds)
echo "Waiting for server to start..."
for i in {1..10}; do
  if curl -s http://localhost:3001/api/auth/status > /dev/null 2>&1; then
    echo "Server is ready."
    break
  fi
  sleep 1
done

# Launch Chromium in kiosk mode
# Cursor remains visible for iPazzPort touchpad interaction
chromium-browser \\
  --noerrdialogs \\
  --disable-infobars \\
  --kiosk \\
  --disable-session-crashed-bubble \\
  --disable-component-update \\
  --check-for-update-interval=31536000 \\
  --disable-translate \\
  --no-first-run \\
  --start-fullscreen \\
  --window-size=1920,1080 \\
  http://localhost:3001

# If Chromium exits, also stop the server
kill \$SERVER_PID 2>/dev/null
KIOSK
chmod +x "$PROJECT_DIR/scripts/start-kiosk.sh"

# Set up autostart based on display server
if [ "$DISPLAY_SERVER" = "wayland" ]; then
  # Wayfire (Bookworm default) — add to wayfire autostart
  echo "Configuring Wayfire autostart..."
  WAYFIRE_CONFIG="$HOME/.config/wayfire.ini"
  mkdir -p "$(dirname "$WAYFIRE_CONFIG")"
  touch "$WAYFIRE_CONFIG"

  # Add autostart section if not present
  if ! grep -q "\[autostart\]" "$WAYFIRE_CONFIG" 2>/dev/null; then
    echo "" >> "$WAYFIRE_CONFIG"
    echo "[autostart]" >> "$WAYFIRE_CONFIG"
  fi

  # Add skylight entry (remove old one first if present)
  sed -i '/skylight-calendar/d' "$WAYFIRE_CONFIG"
  sed -i "/\[autostart\]/a skylight-calendar = bash $PROJECT_DIR/scripts/start-kiosk.sh" "$WAYFIRE_CONFIG"

  # Disable screen blanking for Wayland
  if ! grep -q "\[idle\]" "$WAYFIRE_CONFIG" 2>/dev/null; then
    echo "" >> "$WAYFIRE_CONFIG"
    echo "[idle]" >> "$WAYFIRE_CONFIG"
  fi
  sed -i '/dpms_timeout/d' "$WAYFIRE_CONFIG"
  sed -i '/screensaver_timeout/d' "$WAYFIRE_CONFIG"
  sed -i "/\[idle\]/a dpms_timeout = 0" "$WAYFIRE_CONFIG"
  sed -i "/\[idle\]/a screensaver_timeout = 0" "$WAYFIRE_CONFIG"

else
  # LXDE (Bullseye / X11) — use lxsession autostart
  echo "Configuring LXDE autostart..."
  AUTOSTART_DIR="$HOME/.config/lxsession/LXDE-pi"
  mkdir -p "$AUTOSTART_DIR"
  cat > "$AUTOSTART_DIR/autostart" << AUTOSTART
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xset s off
@xset -dpms
@xset s noblank
@bash $PROJECT_DIR/scripts/start-kiosk.sh
AUTOSTART
fi

# Create systemd service as a reliable fallback for the Node server
# This ensures the server starts on boot even if the desktop environment is slow
sudo tee /etc/systemd/system/skylight-calendar.service > /dev/null << SERVICE
[Unit]
Description=Skylight Calendar Server
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/node server/src/index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable skylight-calendar.service

# Disable screen blanking system-wide (kernel-level, covers console and desktop)
echo "Disabling screen blanking..."
CMDLINE="/boot/firmware/cmdline.txt"
if [ ! -f "$CMDLINE" ]; then
  CMDLINE="/boot/cmdline.txt"
fi
if [ -f "$CMDLINE" ] && ! grep -q "consoleblank=0" "$CMDLINE"; then
  sudo sed -i 's/$/ consoleblank=0/' "$CMDLINE"
fi

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Reboot the Pi:  sudo reboot"
echo "  2. After reboot, the calendar will display automatically on the TV"
echo "  3. On first boot, connect Google Calendar from another device:"
echo "     http://$(hostname -I | awk '{print $1}'):3001"
echo ""
echo "Your iPazzPort wireless keyboard touchpad will work for:"
echo "  - Pointing and clicking (cursor is visible)"
echo "  - Dragging events between days"
echo "  - Double-clicking to edit events"
echo "  - Dragging the bottom edge of events to resize duration"
echo "  - Clicking '+ Add New Appointment' to create events"
echo ""
