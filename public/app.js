// ClipSync — Client Presse-Papier Partagé (Texte, Liens & Images)

const state = {
  deviceType: 'PC',
  clips: [],
  stagedImage: null,
  serverUrl: window.location.origin
};

const dom = {
  clipInput: document.getElementById('clip-input'),
  sendBtn: document.getElementById('send-btn'),
  pasteBtn: document.getElementById('paste-btn'),
  imageInput: document.getElementById('image-input'),
  uploadImgBtn: document.getElementById('upload-img-btn'),
  imageStaging: document.getElementById('image-staging'),
  stagedImgPreview: document.getElementById('staged-img-preview'),
  removeStagedImgBtn: document.getElementById('remove-staged-img-btn'),
  latestCard: document.getElementById('latest-card'),
  latestContent: document.getElementById('latest-content'),
  latestSender: document.getElementById('latest-sender'),
  latestCopyBtn: document.getElementById('latest-copy-btn'),
  latestOpenBtn: document.getElementById('latest-open-btn'),
  historyList: document.getElementById('history-list'),
  historyCount: document.getElementById('history-count'),
  clientBadge: document.getElementById('client-badge'),
  deviceEmoticon: document.getElementById('device-emoticon'),
  qrBtn: document.getElementById('qr-btn'),
  qrModal: document.getElementById('qr-modal'),
  closeQrModal: document.getElementById('close-qr-modal'),
  qrImg: document.getElementById('qr-img'),
  serverUrlInput: document.getElementById('server-url-input'),
  copyUrlBtn: document.getElementById('copy-url-btn'),
  clearBtn: document.getElementById('clear-btn'),
  ipSelect: document.getElementById('ip-select'),
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message')
};

// Audio feedback
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playBeep() {
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(650, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch (e) {}
}

function showToast(msg, duration = 2500) {
  dom.toastMessage.textContent = msg;
  dom.toast.classList.remove('hidden');
  clearTimeout(dom.toast._timer);
  dom.toast._timer = setTimeout(() => {
    dom.toast.classList.add('hidden');
  }, duration);
}

// Copy text helper
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    playBeep();
    showToast('[OK] Copié dans le presse-papier !');
  } catch (err) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    playBeep();
    showToast('[OK] Copié !');
  }
}

// Convert image blob to PNG for universal clipboard write
function convertBlobToPng(blob) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(resolve, 'image/png');
    };
    img.src = URL.createObjectURL(blob);
  });
}

// Copy Image directly to OS clipboard
async function copyImageToClipboard(dataUrl) {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const pngBlob = blob.type === 'image/png' ? blob : await convertBlobToPng(blob);

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob })
    ]);
    playBeep();
    showToast('[OK] Image copiée dans le presse-papier !');
  } catch (err) {
    console.warn('Erreur écriture image clipboard:', err);
    // Fallback: download the image
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `clipsync_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    playBeep();
    showToast('[OK] Image enregistrée');
  }
}

// Detect if string is a URL
function isUrl(str) {
  return /^https?:\/\/[^\s]+$/i.test(str.trim());
}

function formatTime(timestamp) {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 5) return "à l'instant";
  if (diffSec < 60) return `il y a ${diffSec}s`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `il y a ${mins}m`;
  const hours = Math.floor(mins / 60);
  return `il y a ${hours}h`;
}

// WebSocket connection
let ws;
function initWebSocket() {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('// Connecté à ClipSync');
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    switch (msg.type) {
      case 'init':
        state.deviceType = msg.deviceType;
        const isMobile = state.deviceType === 'TEL';
        dom.deviceEmoticon.textContent = isMobile ? '(^.^) [TEL]' : '(-_-) [PC]';
        dom.clientBadge.textContent = `[${msg.clientCount} connecté${msg.clientCount > 1 ? 's' : ''}]`;
        state.clips = msg.history || [];
        renderClips();
        break;

      case 'client-count':
        dom.clientBadge.textContent = `[${msg.count} connecté${msg.count > 1 ? 's' : ''}]`;
        break;

      case 'new-clip':
        state.clips.unshift(msg.item);
        if (state.clips.length > 50) state.clips.pop();
        renderClips();
        playBeep();
        showToast(`[+] Reçu de ${msg.item.sender}`);
        break;

      case 'clip-deleted':
        state.clips = state.clips.filter(c => c.id !== msg.id);
        renderClips();
        break;

      case 'history-cleared':
        state.clips = [];
        renderClips();
        showToast('Historique vidé');
        break;
    }
  };

  ws.onclose = () => {
    setTimeout(initWebSocket, 1500);
  };
}

// Render active latest clip and list
function renderClips() {
  dom.historyCount.textContent = `${state.clips.length} élément${state.clips.length > 1 ? 's' : ''}`;

  if (state.clips.length === 0) {
    dom.latestCard.classList.add('hidden');
    dom.historyList.innerHTML = '<p class="empty-state">Le presse-papier est vide. Copiez un texte ou une image !</p>';
    return;
  }

  // Update latest banner
  const latest = state.clips[0];
  dom.latestCard.classList.remove('hidden');
  dom.latestSender.textContent = `[${latest.sender}] • ${formatTime(latest.timestamp)}`;

  if (latest.kind === 'image') {
    dom.latestContent.innerHTML = `<img src="${latest.content}" class="clip-image-preview" alt="Image">`;
    dom.latestCopyBtn.textContent = "Copier l'image";
    dom.latestCopyBtn.onclick = () => copyImageToClipboard(latest.content);
    dom.latestOpenBtn.classList.add('hidden');
  } else {
    dom.latestContent.textContent = latest.content;
    dom.latestCopyBtn.textContent = 'Copier dans le presse-papier';
    dom.latestCopyBtn.onclick = () => copyToClipboard(latest.content);

    if (isUrl(latest.content)) {
      dom.latestOpenBtn.href = latest.content.trim();
      dom.latestOpenBtn.classList.remove('hidden');
    } else {
      dom.latestOpenBtn.classList.add('hidden');
    }
  }

  // Render history list
  dom.historyList.innerHTML = state.clips.map((clip) => {
    const isImg = clip.kind === 'image';
    const hasUrl = !isImg && isUrl(clip.content);

    let contentHtml = '';
    if (isImg) {
      contentHtml = `<img src="${clip.content}" class="clip-image-preview" alt="Image reçue">`;
    } else {
      contentHtml = escapeHtml(clip.content);
    }

    return `
      <div class="history-item" data-id="${clip.id}">
        <div class="history-item-top">
          <span>[${clip.sender}] ${isImg ? '• [IMAGE]' : ''}</span>
          <span>${formatTime(clip.timestamp)}</span>
        </div>
        <div class="history-item-body">${contentHtml}</div>
        <div class="history-item-actions">
          ${hasUrl ? `<a href="${encodeURI(clip.content.trim())}" target="_blank" rel="noopener" class="item-action-btn">Ouvrir ↗</a>` : ''}
          ${isImg 
            ? `<button class="item-action-btn copy-img-btn" data-id="${clip.id}">Copier l'image</button>
               <a href="${clip.content}" download="image_${clip.id}.png" class="item-action-btn">Télécharger</a>`
            : `<button class="item-action-btn copy-text-btn" data-text="${encodeURIComponent(clip.content)}">Copier</button>`
          }
          <button class="item-action-btn item-delete-btn" data-id="${clip.id}">Supprimer</button>
        </div>
      </div>
    `;
  }).join('');

  // Attach event listeners to items
  dom.historyList.querySelectorAll('.copy-text-btn').forEach(btn => {
    btn.onclick = () => copyToClipboard(decodeURIComponent(btn.dataset.text));
  });

  dom.historyList.querySelectorAll('.copy-img-btn').forEach(btn => {
    btn.onclick = () => {
      const clip = state.clips.find(c => c.id === btn.dataset.id);
      if (clip) copyImageToClipboard(clip.content);
    };
  });

  dom.historyList.querySelectorAll('.item-delete-btn').forEach(btn => {
    btn.onclick = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'delete-clip', id: btn.dataset.id }));
      }
    };
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Stage an image in composer
function stageImage(dataUrl) {
  state.stagedImage = dataUrl;
  dom.stagedImgPreview.src = dataUrl;
  dom.imageStaging.classList.remove('hidden');
}

function clearStagedImage() {
  state.stagedImage = null;
  dom.stagedImgPreview.src = '';
  dom.imageStaging.classList.add('hidden');
  dom.imageInput.value = '';
}

dom.removeStagedImgBtn.onclick = clearStagedImage;

// Image file upload
dom.uploadImgBtn.onclick = () => dom.imageInput.click();

dom.imageInput.onchange = (e) => {
  const file = e.target.files[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (ev) => stageImage(ev.target.result);
    reader.readAsDataURL(file);
  }
};

// Global Paste Event (Captures screenshots, images or text anywhere)
window.addEventListener('paste', (e) => {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      const reader = new FileReader();
      reader.onload = (ev) => {
        stageImage(ev.target.result);
        showToast('[+] Image capturée depuis le presse-papier');
      };
      reader.readAsDataURL(file);
      e.preventDefault();
      return;
    }
  }
});

// Send current text or staged image
function sendCurrentClip() {
  if (state.stagedImage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'clip',
        content: state.stagedImage,
        sender: state.deviceType,
        kind: 'image'
      }));
      clearStagedImage();
      showToast('[OK] Image envoyée');
    }
    return;
  }

  const content = dom.clipInput.value.trim();
  if (!content) return;

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'clip',
      content,
      sender: state.deviceType,
      kind: isUrl(content) ? 'url' : 'text'
    }));
    dom.clipInput.value = '';
    showToast('[OK] Envoyé');
  } else {
    showToast('[ERR] Non connecté au serveur');
  }
}

dom.sendBtn.onclick = sendCurrentClip;

dom.clipInput.onkeydown = (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    sendCurrentClip();
  }
};

// Paste from clipboard button
dom.pasteBtn.onclick = async () => {
  try {
    // Try reading items (images first)
    if (navigator.clipboard.read) {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = (ev) => stageImage(ev.target.result);
          reader.readAsDataURL(blob);
          showToast('[+] Image collée');
          return;
        }
      }
    }

    // Otherwise read text
    const text = await navigator.clipboard.readText();
    if (text) {
      dom.clipInput.value = text;
      sendCurrentClip();
    } else {
      showToast('Le presse-papier est vide');
    }
  } catch (e) {
    dom.clipInput.focus();
    showToast('Appuyez sur Ctrl+V pour coller');
  }
};

// Clear all history
dom.clearBtn.onclick = async () => {
  if (confirm('Voulez-vous vraiment vider tout l\'historique du presse-papier ?')) {
    await fetch('/api/clear', { method: 'POST' });
  }
};

// QR Code modal
dom.qrBtn.onclick = () => dom.qrModal.classList.remove('hidden');
dom.closeQrModal.onclick = () => dom.qrModal.classList.add('hidden');
dom.qrModal.querySelector('.modal-backdrop').onclick = () => dom.qrModal.classList.add('hidden');

dom.copyUrlBtn.onclick = () => {
  copyToClipboard(dom.serverUrlInput.value);
};

// Network info with dynamic IP selector
async function initNetworkInfo(targetIp = null) {
  try {
    const url = targetIp ? `/api/info?ip=${encodeURIComponent(targetIp)}` : '/api/info';
    const res = await fetch(url);
    const data = await res.json();
    state.serverUrl = data.url;
    dom.serverUrlInput.value = data.url;
    dom.qrImg.src = data.qrCode;

    if (dom.ipSelect && dom.ipSelect.options.length === 0 && data.interfaces) {
      data.interfaces.forEach(iface => {
        const opt = document.createElement('option');
        opt.value = iface.address;
        opt.textContent = iface.label || `${iface.name} (${iface.address})`;
        if (iface.address === (data.selectedIp || data.primaryIp)) opt.selected = true;
        dom.ipSelect.appendChild(opt);
      });

      const customOpt = document.createElement('option');
      customOpt.value = 'custom';
      customOpt.textContent = 'Saisir une adresse IP manuellement...';
      dom.ipSelect.appendChild(customOpt);

      dom.ipSelect.onchange = (e) => {
        if (e.target.value === 'custom') {
          const customIp = prompt("Entrez l'adresse IP de votre PC (ex: 192.168.1.30 ou 192.168.137.1) :");
          if (customIp && customIp.trim()) {
            initNetworkInfo(customIp.trim());
          }
        } else {
          initNetworkInfo(e.target.value);
        }
      };
    }
  } catch (err) {
    console.warn('Erreur info réseau:', err);
  }
}

if (dom.serverUrlInput) {
  dom.serverUrlInput.onchange = () => {
    try {
      const u = new URL(dom.serverUrlInput.value);
      initNetworkInfo(u.hostname);
    } catch (e) {}
  };
}

window.addEventListener('DOMContentLoaded', () => {
  initNetworkInfo();
  initWebSocket();
});
