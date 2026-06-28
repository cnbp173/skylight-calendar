#!/bin/bash
# Raspberry Pi setup script for Skylight Calendar kiosk mode
# Run this on your Pi after cloning the repo

set -e

echo "=== Skylight Calendar - Raspberry Pi Setup ==="

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install dependencies
sudo apt-get install -y \
  chromium-browser \
  unclutter \
  xdotool \
  nodejs \
  npm

# Install Node.js 20 if not already present
if ! node --version | grep -q "v20\|v21\|v22"; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Install project dependencies
echo "Installing project dependencies..."
cd "$(dirname "$0")/.."
npm install
cd server && npm install && cd ..
cd client && npm install && npm run build && cd ..

# Disable screen blanking
echo "Disabling screen blanking..."
mkdir -p ~/.config/lxsession/LXDE-pi
cat > ~/.config/lxsession/LXDE-pi/autostart << 'EOF'
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xset s off
@xset -dpms
@xset s noblank
@unclutter -idle 0.1 -root
@bash /home/pi/skylight-calendar/scripts/start-kiosk.sh
EOF

# Create kiosk launcher
cat > scripts/start-kiosk.sh << 'EOF'
#!/bin/bash
# Wait for the desktop to be ready
sleep 5

# Start the server
cd /home/pi/skylight-calendar
node server/src/index.js &

# Wait for server to be ready
sleep 3

# Launch Chromium in kiosk mode
chromium-browser \
  --noerrdialogs \
  --disable-infobars \
  --kiosk \
  --disable-session-crashed-bubble \
  --disable-component-update \
  --check-for-update-interval=31536000 \
  --disable-translate \
  --no-first-run \
  --start-fullscreen \
  --window-size=1920,1080 \
  http://localhost:3001
EOF
chmod +x scripts/start-kiosk.sh

# Create systemd service for the Node server (alternative to autostart)
sudo tee /etc/systemd/system/skylight-calendar.service << EOF
[Unit]
Description=Skylight Calendar Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/skylight-calendar
ExecStart=/usr/bin/node server/src/index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable skylight-calendar.service

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and fill in your credentials"
echo "2. Reboot the Pi: sudo reboot"
echo "3. On first boot, navigate to http://<pi-ip>:3001 to connect Google Calendar"
echo ""
