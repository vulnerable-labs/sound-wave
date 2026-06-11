#!/usr/bin/env bash
# SoundWave - VM Forensic & Hardening Protocol Script
# To be run after the startup script succeeds and before creating the machine snapshot.

set -euo pipefail

echo "====================================================="
echo " Initiating VulnOS Forensic & Hardening Protocol     "
echo "====================================================="

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "[-] Please run as root (sudo ./harden.sh)"
  exit 1
fi

# 1. Gag the Google Guest Agent (Prevent reset of custom hostname)
echo "[*] Disabling Google Guest Agent hostname configuration..."
INSTANCE_CFG="/etc/default/instance_configs.cfg"
if [ -f "$INSTANCE_CFG" ]; then
    # Modify set_hostname to false if it exists, otherwise append
    if grep -q "set_hostname" "$INSTANCE_CFG"; then
        sed -i 's/set_hostname\s*=\s*true/set_hostname = false/g' "$INSTANCE_CFG"
        sed -i 's/set_hostname\s*=\s*yes/set_hostname = false/g' "$INSTANCE_CFG"
    else
        echo -e "\n[Metadata]\nset_hostname = false" >> "$INSTANCE_CFG"
    fi
    echo "[+] Done modifying $INSTANCE_CFG"
else
    echo "[!] $INSTANCE_CFG not found. Skipping (non-GCP or custom image)."
fi

# 2. Lock Cloud-Init Hostname
echo "[*] Locking Cloud-Init hostname..."
CLOUD_CFG="/etc/cloud/cloud.cfg"
if [ -f "$CLOUD_CFG" ]; then
    if grep -q "preserve_hostname" "$CLOUD_CFG"; then
        sed -i 's/preserve_hostname:\s*false/preserve_hostname: true/g' "$CLOUD_CFG"
    else
        echo "preserve_hostname: true" >> "$CLOUD_CFG"
    fi
    echo "[+] Done modifying $CLOUD_CFG"
else
    echo "[!] $CLOUD_CFG not found."
fi

# 3. Set Hostname
echo "[*] Setting hostname to soundwave-prod..."
hostnamectl set-hostname soundwave-prod
echo "127.0.0.1 soundwave-prod" >> /etc/hosts
echo "[+] Hostname set to: $(hostname)"

# 4. Forensic Scrub (Logs cleaning)
echo "[*] Stopping logging daemon..."
systemctl stop rsyslog || true
systemctl stop systemd-journald || true

echo "[*] Shredding/truncating active logs to remove footprints..."
# Truncate rather than delete to preserve file ownership and permissions
log_files=(
    "/var/log/auth.log"
    "/var/log/syslog"
    "/var/log/nginx/access.log"
    "/var/log/nginx/error.log"
    "/var/log/dpkg.log"
    "/var/log/alternatives.log"
    "/var/log/apt/history.log"
    "/var/log/apt/term.log"
)

for log in "${log_files[@]}"; do
    if [ -f "$log" ]; then
        truncate -s 0 "$log"
        echo "[+] Truncated $log"
    fi
done

# Clear systemd journal
journalctl --vacuum-time=1s || true

# 5. Session History Wipe
echo "[*] Disabling history recording for current session..."
unset HISTFILE
history -c

echo "====================================================="
echo " Hardening Complete! The system is clean.            "
echo " To shut down now and capture the image, run:       "
echo "   sudo shutdown -h now                              "
echo "====================================================="
