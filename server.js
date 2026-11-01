const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer, WebSocket } = require('ws');
const QRCode = require('qrcode');

let PORT = parseInt(process.argv[2] || process.env.PORT || 6060, 10);

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

// Discover local network interfaces
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    const lowerName = name.toLowerCase();
    if (
      lowerName.includes('virtual') ||
      lowerName.includes('vbox') ||
      lowerName.includes('vmware') ||
      lowerName.includes('wsl') ||
      lowerName.includes('vethernet') ||
      lowerName.includes('loopback')
    ) {
      continue;
    }

    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (iface.address.startsWith('192.168.56.')) continue;

        const isHotspot = (
          iface.address.startsWith('192.168.43.') ||
          iface.address.startsWith('172.20.10.') ||
          iface.address.startsWith('192.168.137.')
        );
        const isWiFi = lowerName.includes('wi-fi') || lowerName.includes('wireless') || lowerName.includes('wlan');

        const label = isHotspot 
          ? `Point d'accès Hotspot (${iface.address})`
          : (isWiFi ? `Wi-Fi (${iface.address})` : `Réseau local - ${name} (${iface.address})`);

        addresses.push({ name, address: iface.address, isHotspot, isWiFi, label });
      }
    }
  }

  addresses.sort((a, b) => {
    if (a.isHotspot !== b.isHotspot) return b.isHotspot ? 1 : -1;
    if (a.isWiFi !== b.isWiFi) return b.isWiFi ? 1 : -1;
    return 0;
  });

  return addresses;
}

// In-memory clipboard history (persists during server lifetime)
const clipboardHistory = [];
const MAX_HISTORY = 50;

// HTTP Server
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Network info & QR Code
  if (pathname === '/api/info') {
    const ips = getLocalIPs();
    const requestedIp = parsedUrl.searchParams.get('ip');
    const primaryIp = requestedIp || (ips[0] ? ips[0].address : '127.0.0.1');
    const serverUrl = `http://${primaryIp}:${PORT}`;

    QRCode.toDataURL(serverUrl, { margin: 1, width: 256 }, (err, qrDataUrl) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        url: serverUrl,
        selectedIp: primaryIp,
        interfaces: ips,
        qrCode: qrDataUrl,
        history: clipboardHistory
      }));
    });
    return;
  }

  // Clear history endpoint
  if (pathname === '/api/clear' && req.method === 'POST') {
    clipboardHistory.length = 0;
    broadcast({ type: 'history-cleared' });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Static files handler
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

// WebSocket Server
const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on('error', (err) => console.error('WSS Error:', err));

function broadcast(data, exceptWs = null) {
  const payload = JSON.stringify(data);
  for (const client of clients) {
    if (client !== exceptWs && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

wss.on('connection', (ws, req) => {
  clients.add(ws);
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /android|iphone|ipad|ipod/i.test(userAgent);
  const deviceType = isMobile ? 'TEL' : 'PC';

  // Send current history on connection
  ws.send(JSON.stringify({
    type: 'init',
    deviceType,
    clientCount: clients.size,
    history: clipboardHistory
  }));

  // Announce client count update
  broadcast({ type: 'client-count', count: clients.size });

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);

      if (msg.type === 'clip') {
        const item = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          content: msg.content,
          kind: msg.kind || 'text', // 'text', 'url', 'image'
          sender: msg.sender || deviceType,
          timestamp: Date.now()
        };

        // Prepend to history and trim
        clipboardHistory.unshift(item);
        if (clipboardHistory.length > MAX_HISTORY) clipboardHistory.pop();

        // Broadcast to everyone (including sender for acknowledgment)
        broadcast({
          type: 'new-clip',
          item
        });
      } else if (msg.type === 'delete-clip') {
        const idx = clipboardHistory.findIndex(i => i.id === msg.id);
        if (idx !== -1) {
          clipboardHistory.splice(idx, 1);
          broadcast({ type: 'clip-deleted', id: msg.id });
        }
      }
    } catch (e) {
      console.error('WS parse error:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    broadcast({ type: 'client-count', count: clients.size });
  });
});

// Auto-resolve port conflicts
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`\n⚠️ Port ${PORT} occupé, essai sur le port ${PORT + 1}...`);
    PORT++;
    server.listen(PORT, '0.0.0.0');
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log('\n========================================================');
  console.log('  📋 CLIPSYNC - Presse-Papier Partagé Local & Hors-Ligne 📋');
  console.log('========================================================\n');
  console.log(`  Accès PC local :  http://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log('\n  Adresses réseau disponibles :');
    ips.forEach(iface => {
      const tag = iface.isHotspot ? ' [HOTSPOT 🔥]' : '';
      console.log(`    👉 http://${iface.address}:${PORT}${tag}`);
    });
  }
  console.log('\n========================================================\n');
});
