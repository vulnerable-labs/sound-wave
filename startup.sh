#!/usr/bin/env bash
# SoundWave - GCP VM Provisioning & Startup Script
# Targets: Ubuntu 22.04 LTS

set -euo pipefail

# === CONFIGURATION ===
# Replace this with your actual GitHub repository URL before deploying
REPO_URL="https://github.com/your-username/sound-wave.git"
INSTALL_DIR="/opt/sound-wave"

echo "==========================================="
echo " Starting SoundWave Lab Provisioning Script "
echo "==========================================="

# Update package lists
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# Install standard dependencies
apt-get install -y curl gnupg git build-essential

# 1. Install Node.js v20
echo "[*] Installing Node.js v20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 2. Install MongoDB 7.0
echo "[*] Installing MongoDB 7.0..."
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor --yes
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
    tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt-get update -y
apt-get install -y mongodb-org

# Enable and start MongoDB
systemctl daemon-reload
systemctl enable mongod --now
echo "[*] MongoDB service status: $(systemctl is-active mongod)"

# 3. Setup Lab Files
if [ -d "./backend" ] && [ -d "./frontend" ]; then
    echo "[*] Detected local repository. Copying local files..."
    mkdir -p "$INSTALL_DIR"
    cp -r ./* "$INSTALL_DIR/"
else
    echo "[*] Cloning repository from $REPO_URL..."
    if [ -d "$INSTALL_DIR" ]; then
        rm -rf "$INSTALL_DIR"
    fi
    git clone "$REPO_URL" "$INSTALL_DIR"
fi

# Ensure correct permissions
chmod -R 755 "$INSTALL_DIR"

# 4. Configure Express Backend
echo "[*] Configuring backend API..."
cd "$INSTALL_DIR/backend"
npm install

# Run database seeder
echo "[*] Seeding MongoDB with challenge episodes..."
npm run seed

# 5. Configure Next.js Frontend
echo "[*] Configuring Next.js frontend..."
cd "$INSTALL_DIR/frontend"
npm install
npm run build

# 6. Setup systemd Services
echo "[*] Registering systemd service files..."

# Express Backend Service
cat <<EOF > /etc/systemd/system/soundwave-backend.service
[Unit]
Description=SoundWave Express API Backend
After=network.target mongod.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/backend
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=PORT=5000 MONGO_URI=mongodb://localhost:27017/soundwave NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Next.js Frontend Service
cat <<EOF > /etc/systemd/system/soundwave-frontend.service
[Unit]
Description=SoundWave Next.js Frontend
After=network.target soundwave-backend.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/frontend
ExecStart=/usr/bin/npm run start
Restart=on-failure
Environment=PORT=3000 NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Enable & Start Services
systemctl daemon-reload
systemctl enable soundwave-backend.service --now
systemctl enable soundwave-frontend.service --now

echo "[*] Backend service status: $(systemctl is-active soundwave-backend)"
echo "[*] Frontend service status: $(systemctl is-active soundwave-frontend)"

# 7. Configure Nginx Reverse Proxy
echo "[*] Setting up Nginx Reverse Proxy..."
apt-get install -y nginx

# Overwrite the default Nginx configuration
cp "$INSTALL_DIR/nginx/soundwave.conf" /etc/nginx/sites-available/default

# Verify and reload Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

echo "[*] Nginx service status: $(systemctl is-active nginx)"

echo "==========================================="
echo " SoundWave Lab Provisioning Completed!      "
echo " Access the web app at: http://<VM_IP>      "
echo "==========================================="
