// ============================================================
// Admin Mini Chat - Dashboard Widget
// ============================================================

let adminSocket = null;
let activeSessions = [];
let currentMiniSessionId = null;
let currentMiniGuestAvatar = '';
let currentMiniAdminAvatar = '';

function safeAvatarUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const u = url.trim();
  if (u.startsWith('/') && !u.startsWith('//')) return u;
  if (/^https?:\/\//i.test(u)) return u;
  return '';
}

function miniMessageAvatarHtml(sender) {
  const url =
    sender === 'guest' ? currentMiniGuestAvatar : currentMiniAdminAvatar;
  if (url) {
    return `<div class="mini-chat-message-avatar mini-chat-message-avatar--img"><img src="${escapeHtml(url)}" alt=""></div>`;
  }
  const icon = sender === 'guest' ? 'fa-user' : 'fa-headset';
  return `<div class="mini-chat-message-avatar"><i class="fa-solid ${icon}"></i></div>`;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initAdminMiniSocket();
  initMiniChatInput();
});

// ============================================================
// Socket Connection
// ============================================================

function initAdminMiniSocket() {
  adminSocket = io();

  adminSocket.on('connect', () => {
    console.log('[Admin Mini Chat] Connected');
    adminSocket.emit('admin:join');
  });

  adminSocket.on('disconnect', () => {
    console.log('[Admin Mini Chat] Disconnected');
  });

  // New session notification
  adminSocket.on('admin:new-session', (data) => {
    addMiniSessionToList(data);
    showMiniChatNotification(data);
  });

  // New message notification
  adminSocket.on('admin:new-message', (data) => {
    updateMiniSessionMessage(data);
    if (currentMiniSessionId === data.sessionId) {
      addMiniChatMessage(data.message.content, 'guest', data.message.createdAt);
    }
    playNotificationSound();
  });

  // Session accepted by another admin
  adminSocket.on('admin:session-accepted', (data) => {
    markSessionAsActive(data.sessionId, data.adminName);
  });

  // Session closed
  adminSocket.on('admin:session-closed', (data) => {
    removeMiniSession(data.sessionId);
    if (currentMiniSessionId === data.sessionId) {
      closeMiniChat();
    }
  });

  // Session deleted
  adminSocket.on('admin:session-deleted', (data) => {
    removeMiniSession(data.sessionId);
    if (currentMiniSessionId === data.sessionId) {
      closeMiniChat();
    }
  });

  // Session reopened by guest
  adminSocket.on('admin:session-reopened', (data) => {
    const sessionItem = document.getElementById(`mini-session-${data.sessionId}`);
    if (!sessionItem) return;
    const dot = sessionItem.querySelector('.mini-status-dot');
    const text = sessionItem.querySelector('.mini-chat-session-status span:last-child');
    if (dot) dot.className = 'mini-status-dot waiting';
    if (text) text.textContent = 'Đang chờ';
    sessionItem.classList.remove('has-new');
  });
}

// ============================================================
// Mini Chat Panel Functions
// ============================================================

function toggleMiniChatPanel() {
  const panel = document.getElementById('miniChatPanel');
  if (!panel) return;

  const isHidden = panel.classList.contains('mini-chat-hidden');

  if (isHidden) {
    panel.classList.remove('mini-chat-hidden');
    panel.classList.add('mini-chat-visible');
    clearMiniNotifications();
  } else {
    panel.classList.remove('mini-chat-visible');
    panel.classList.add('mini-chat-hidden');
  }
}

function addMiniSessionToList(session) {
  const list = document.getElementById('miniChatSessionList');
  if (!list) return;

  // Check if already exists
  if (document.getElementById(`mini-session-${session.sessionId}`)) {
    return;
  }

  const item = document.createElement('div');
  item.className = 'mini-chat-session-item';
  item.id = `mini-session-${session.sessionId}`;
  item.onclick = () => openMiniChatSession(session.sessionId);

  const gAv = safeAvatarUrl(session.guestAvatar || '');
  const avHtml = gAv
    ? `<div class="mini-chat-session-avatar mini-chat-session-avatar--img"><img src="${escapeHtml(gAv)}" alt=""></div>`
    : `<div class="mini-chat-session-avatar"><i class="fa-solid fa-user"></i></div>`;

  item.innerHTML = `
    ${avHtml}
    <div class="mini-chat-session-info">
      <div class="mini-chat-session-name">${escapeHtml(session.guestName)}</div>
      <div class="mini-chat-session-status">
        <span class="mini-status-dot waiting"></span>
        <span>Đang chờ</span>
      </div>
    </div>
    <div class="mini-chat-session-time">${formatMiniTime(new Date(session.createdAt))}</div>
  `;

  // Add to top of list
  list.insertBefore(item, list.firstChild);
  updateMiniSessionCount();
}

function openMiniChatSession(sessionId) {
  currentMiniSessionId = sessionId;

  // Highlight selected session
  document.querySelectorAll('.mini-chat-session-item').forEach(item => {
    item.classList.remove('active');
  });
  const selectedItem = document.getElementById(`mini-session-${sessionId}`);
  if (selectedItem) {
    selectedItem.classList.add('active');
    selectedItem.classList.remove('has-new');
  }

  // Show chat area
  const sessionList = document.getElementById('miniChatSessionList');
  const chatArea = document.getElementById('miniChatArea');

  if (sessionList && chatArea) {
    sessionList.style.display = 'none';
    chatArea.style.display = 'flex';
  }

  // Update header
  const session = activeSessions.find(s => s.sessionId === sessionId);
  updateMiniChatHeader(session ? session.guestName : 'Khách');

  const chatBody = document.getElementById('miniChatBody');
  if (chatBody) chatBody.innerHTML = '';

  loadMiniChatSessionMessages(sessionId).then(() => {
    loadMiniChatInterface(sessionId);
  });
}

async function loadMiniChatSessionMessages(sessionId) {
  const chatBody = document.getElementById('miniChatBody');
  if (!chatBody) return;

  try {
    const res = await fetch(`/admin/chat/messages?sessionId=${sessionId}`);
    const data = await res.json();
    if (!data.success) return;

    currentMiniGuestAvatar = safeAvatarUrl(data.guestAvatar || '');
    currentMiniAdminAvatar =
      safeAvatarUrl(data.adminAvatar || '') ||
      safeAvatarUrl(document.body.dataset.adminAvatar || '');

    chatBody.innerHTML = '';
    if (data.messages && data.messages.length > 0) {
      data.messages.forEach((m) => {
        addMiniChatMessage(m.content, m.sender, m.createdAt);
      });
    }
  } catch (e) {
    console.error('[Mini Chat] load messages', e);
  }
}

function loadMiniChatInterface(sessionId) {
  const sessionItem = document.getElementById(`mini-session-${sessionId}`);
  if (!sessionItem) return;

  const adminName = document.body.dataset.adminName || 'Admin';
  const adminAvatar = document.body.dataset.adminAvatar || '';
  adminSocket.emit('admin:accept', {
    sessionId: sessionId,
    adminName: adminName,
    adminAvatar: adminAvatar
  });

  const selfAv = safeAvatarUrl(adminAvatar);
  if (selfAv) currentMiniAdminAvatar = selfAv;

  if (sessionItem) {
    sessionItem.classList.add('active');
  }
}

function closeMiniChat() {
  currentMiniSessionId = null;
  currentMiniGuestAvatar = '';
  currentMiniAdminAvatar = '';

  const sessionList = document.getElementById('miniChatSessionList');
  const chatArea = document.getElementById('miniChatArea');

  if (sessionList && chatArea) {
    chatArea.style.display = 'none';
    sessionList.style.display = 'block';
  }

  // Reset header
  updateMiniChatHeader(null);
  updateMiniSessionCount();
}

function updateMiniChatHeader(guestName) {
  const headerTitle = document.getElementById('miniChatHeaderTitle');
  if (headerTitle) {
    headerTitle.textContent = guestName ? `Chat với ${guestName}` : 'Phiên chat mới';
  }
}

// ============================================================
// Messages
// ============================================================

function addMiniChatMessage(content, sender, createdAt) {
  const chatBody = document.getElementById('miniChatBody');
  if (!chatBody) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `mini-chat-message ${sender}`;

  if (sender === 'system') {
    messageDiv.innerHTML = `<div class="mini-chat-message-system">${escapeHtml(content)}</div>`;
  } else {
    const time = formatMiniTime(createdAt ? new Date(createdAt) : new Date());
    const avatarHtml = miniMessageAvatarHtml(sender);

    const isImage =
      content.startsWith('[image]') ||
      /\.(jpeg|jpg|jpe|png|gif|webp)(\?|$)/i.test(content);
    const rawUrl = content.replace(/^\[image\]/, '');
    const messageBody = isImage
      ? `<a href="${escapeHtml(rawUrl)}" target="_blank"><img class="mini-chat-message-image" src="${escapeHtml(rawUrl)}" alt="Hình ảnh" loading="lazy"></a>`
      : `<div class="mini-chat-message-text">${escapeHtml(content)}</div>`;

    messageDiv.innerHTML = `
      ${avatarHtml}
      <div class="mini-chat-message-content">
        ${messageBody}
        <div class="mini-chat-message-time">${time}</div>
      </div>
    `;
  }

  chatBody.appendChild(messageDiv);
  chatBody.scrollTop = chatBody.scrollHeight;
}

async function handleMiniChatImageSelect(input) {
  const file = input.files[0];
  if (!file || !currentMiniSessionId) return;

  const formData = new FormData();
  formData.append('image', file);

  const btn = input.nextElementSibling;
  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/admin/chat/upload-image', {
      method: 'POST',
      body: formData
    });
    const json = await res.json();
    if (!json.success || !json.url) throw new Error(json.message || 'Upload failed');

    adminSocket.emit('admin:send-image', {
      content: json.url,
      sessionId: currentMiniSessionId
    });

    addMiniChatMessage(json.url, 'admin');
    if (btn) btn.disabled = false;
  } catch (err) {
    console.error('[Admin Mini Chat] Image upload error:', err);
    if (btn) btn.disabled = false;
  }

  input.value = '';
}

function sendMiniChatMessage() {
  const input = document.getElementById('miniChatInput');
  if (!input || !currentMiniSessionId) return;

  const content = input.value.trim();
  if (!content) return;

  adminSocket.emit('admin:message', {
    content: content,
    sessionId: currentMiniSessionId
  });

  addMiniChatMessage(content, 'admin');
  input.value = '';
}

function closeMiniChatSession() {
  if (!currentMiniSessionId) return;

  adminSocket.emit('admin:close', {
    sessionId: currentMiniSessionId
  });

  closeMiniChat();
}

function deleteMiniChatSession() {
  if (!currentMiniSessionId) return;
  if (!confirm('Bạn có chắc muốn xóa đoạn chat này? Hành động này không thể hoàn tác.')) return;

  adminSocket.emit('admin:delete-session', {
    sessionId: currentMiniSessionId
  });

  closeMiniChat();
}

// ============================================================
// UI Updates
// ============================================================

function updateMiniSessionMessage(data) {
  const sessionItem = document.getElementById(`mini-session-${data.sessionId}`);
  if (!sessionItem) return;

  // Update message preview
  const msgPreview = sessionItem.querySelector('.mini-chat-session-status span:last-child');
  if (msgPreview) {
    const isImage =
      data.message.content.startsWith('[image]') ||
      /\.(jpeg|jpg|jpe|png|gif|webp)(\?|$)/i.test(data.message.content);
    msgPreview.textContent = isImage ? '[Hình ảnh]' : truncateText(data.message.content, 30);
  }

  // Mark as having new message if not selected
  if (currentMiniSessionId !== data.sessionId) {
    sessionItem.classList.add('has-new');
  }

  // Update status
  const statusDot = sessionItem.querySelector('.mini-status-dot');
  const statusText = sessionItem.querySelector('.mini-chat-session-status span:last-child');
  if (statusDot) statusDot.className = 'mini-status-dot active';
  if (statusText && !statusText.textContent.includes('Đang chat')) {
    // Keep the message preview
  }
}

function markSessionAsActive(sessionId, adminName) {
  const sessionItem = document.getElementById(`mini-session-${sessionId}`);
  if (!sessionItem) return;

  const statusSpan = sessionItem.querySelector('.mini-chat-session-status span:last-child');
  if (statusSpan) {
    statusSpan.textContent = `Admin ${adminName}`;
  }
}

function removeMiniSession(sessionId) {
  const sessionItem = document.getElementById(`mini-session-${sessionId}`);
  if (sessionItem) {
    sessionItem.remove();
  }
  updateMiniSessionCount();
}

function updateMiniSessionCount() {
  const countBadge = document.getElementById('miniChatCountBadge');
  const sessionList = document.getElementById('miniChatSessionList');
  if (!countBadge || !sessionList) return;

  const count = sessionList.children.length;
  if (count > 0) {
    countBadge.textContent = count > 9 ? '9+' : count;
    countBadge.style.display = 'flex';
  } else {
    countBadge.style.display = 'none';
  }
}

function showMiniChatNotification(session) {
  const notif = document.getElementById('miniChatNotification');
  if (!notif) return;

  const nameEl = notif.querySelector('.notification-guest-name');
  if (nameEl) nameEl.textContent = session.guestName;

  notif.classList.add('show');

  setTimeout(() => {
    notif.classList.remove('show');
  }, 5000);
}

function clearMiniNotifications() {
  const notif = document.getElementById('miniChatNotification');
  if (notif) notif.classList.remove('show');
}

function playNotificationSound() {
  try {
    const audio = new Audio('/audio/notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch (e) {}
}

// ============================================================
// Input Handling
// ============================================================

function initMiniChatInput() {
  const input = document.getElementById('miniChatInput');
  if (!input) return;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMiniChatMessage();
    }
  });
}

// ============================================================
// Utilities
// ============================================================

function formatMiniTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
