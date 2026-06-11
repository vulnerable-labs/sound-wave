# VulnOS Lab: SoundWave

**Difficulty:** Easy  
**Theme:** A specialized audio platform where independent musicians and podcasters upload raw audio for automatic AI normalization.  
**Key Concepts:** Client-side source map exposures, IDOR, and weak environment handling.

---

## 🏗️ Technical Stack & Ports
The lab is configured to run on a single Ubuntu 22.04 LTS instance with the following services:

| Port | Service | Role | Visibility |
| :--- | :--- | :--- | :--- |
| **80** | Nginx | Reverse Proxy Router | **External** |
| **3000** | Next.js | Frontend SSR (Web Player & Marketing) | Localhost (Proxied) |
| **5000** | Express | Audio Processing & Metadata API | Localhost (Proxied) |
| **27017** | MongoDB | Podcast Episodes & Tracks Data | Localhost |

---

## 💀 Creative Attack Chain

### Phase 1: Webpack Source Map Exposure (Recon)
The developer left Webpack Source Maps (`.map` files) enabled in the Next.js production build config (`productionBrowserSourceMaps: true`).
- **Action:** The student visits the web application home page on port 80.
- **Find:** The student inspects the page source or uses browser developer tools to view the unminified directory structure mapped by source files (like `_next/static/chunks/...js.map`).
- **Loot:** In the reconstructed directory under `src/config/dev-defaults.ts`, they find a hardcoded staging token:
  ```typescript
  SOUNDWAVE_DEV_BYPASS_TOKEN = "AudioM@ster2026"
  ```

### Phase 2: IDOR via Media Metadata API
The frontend queries the Express API to fetch episode details. The public trailer is loaded from `/api/v1/episodes/view?id=101`.
- **Vulnerability:** The endpoint relies on guessable sequential IDs and accepts the staging token in the `X-Bypass-Token` header, but lacks proper authorization checks.
- **Attack:** The student uses a tool like `curl` or Postman to query the private episode ID `100` while providing the bypass token header:
  ```bash
  curl -H "X-Bypass-Token: AudioM@ster2026" "http://<VM_IP>/api/v1/episodes/view?id=100"
  ```
- **Loot:** The server returns metadata for the unreleased staging audio stream. The description contains the staging environment's secret configuration:
  ```
  JWT_SECRET=soundwave_local_secret_dont_share
  ```

### Phase 3: JWT Modification & The "Flag" Dashboard
Accessing the `/admin/analytics` dashboard requires a valid JWT with the claim `"role": "editor"`.
- **Exploit:** Using the leaked `JWT_SECRET` key (`soundwave_local_secret_dont_share`), the student crafts a custom HS256-signed JWT token.
- **Payload:**
  ```json
  {
    "username": "admin",
    "role": "editor"
  }
  ```
- **Win:** The student inputs this forged token on the `/admin/analytics` dashboard (either pasting it in the interface or supplying it in the Bearer Authorization header). The backend verifies the token and unlocks the administrative dashboard, revealing the flag:
  `VulnOS{s0und_w4v3_s0urc3map_1d0r_jwt_3xpl01t}`

---

## 🚀 Deployment Instructions

### GCP VM Startup Script Deployment
To automate provisioning on a clean Ubuntu 22.04 LTS instance, configure the VM instance with a **Startup Script** containing the contents of `startup.sh`.

Alternatively, you can clone and run it manually:
1. Clone this repository on the target VM:
   ```bash
   git clone https://github.com/your-username/sound-wave.git /opt/sound-wave
   cd /opt/sound-wave
   ```
2. Make the startup script executable and run it as root:
   ```bash
   sudo chmod +x startup.sh
   sudo ./startup.sh
   ```

3. Ensure Nginx and the Node services are running:
   ```bash
   sudo systemctl status nginx
   sudo systemctl status soundwave-backend
   sudo systemctl status soundwave-frontend
   ```

---

## 🛠️ Forensic & Hardening Protocol (Before Snapshotting)
To prepare the VM image snapshot for distribution without leaving system clues (command history, Google agent overrides):

1. Make the hardening script executable and run it:
   ```bash
   sudo chmod +x harden.sh
   sudo ./harden.sh
   ```
2. The script will set the hostname to `soundwave-prod`, disable GCP guest-agent override, and shred log files.
3. Once completed, shut down the VM immediately:
   ```bash
   sudo shutdown -h now
   ```
4. Create your machine image snapshot from the VM disk.
