// ============================================================
// Admin Chat Page - Full Chat Interface
// ============================================================

let chatSocket = null;
let currentSessionId = null;
let sessions = [];
let currentGuestAvatar = '';
let currentAdminAvatar = '';

function safeAvatarUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const u = url.trim();
  if (u.startsWith('/') && !u.startsWith('//')) return u;
  if (/^https?:\/\//i.test(u)) return u;
  return '';
}

function adminMessageAvatarHtml(sender) {
  const url =
    sender === 'guest' ? currentGuestAvatar : currentAdminAvatar;
  if (url) {
    return `<div class="chat-message-avatar chat-message-avatar--img"><img src="${escapeHtml(url)}" alt=""></div>`;
  }
  const icon = sender === 'guest' ? 'fa-user' : 'fa-headset';
  return `<div class="chat-message-avatar"><i class="fa-solid ${icon}"></i></div>`;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initChatSocket();
  initChatPageInput();
  loadSessionsFromServer();
});

// ============================================================
// Socket Connection
// ============================================================

function initChatSocket() {
  chatSocket = io();

  chatSocket.on('connect', () => {
    console.log('[Admin Chat] Connected');
    chatSocket.emit('admin:join');
  });

  chatSocket.on('disconnect', () => {
    console.log('[Admin Chat] Disconnected');
  });

  // New session notification
  chatSocket.on('admin:new-session', (data) => {
    addNewSessionToList(data);
  });

  // New message notification
  chatSocket.on('admin:new-message', (data) => {
    updateSessionPreview(data);
    if (currentSessionId === data.sessionId) {
      appendMessage(data.message);
      scrollChatToBottom();
    }
  });

  // Session accepted by another admin
  chatSocket.on('admin:session-accepted', (data) => {
    updateSessionStatus(data.sessionId, 'active', data.adminName);
  });

  // Session closed
  chatSocket.on('admin:session-closed', (data) => {
    handleSessionClosed(data.sessionId);
  });

  // Session deleted
  chatSocket.on('admin:session-deleted', (data) => {
    if (currentSessionId === data.sessionId) {
      goBackToSessionList();
    }
    removeSessionFromList(data.sessionId);
  });

  // Session reopened by guest
  chatSocket.on('admin:session-reopened', (data) => {
    updateSessionStatus(data.sessionId, 'waiting', null);
    const item = document.getElementById(`session-item-${data.sessionId}`);
    if (item) {
      item.classList.remove('closed');
      item.classList.remove('has-message');
      item.classList.add('waiting');
      item.classList.remove('active');
      const statusDot = item.querySelector('.status-dot');
      const statusText = item.querySelector('.chat-session-status span:last-child');
      if (statusDot) statusDot.className = 'status-dot waiting';
      if (statusText) statusText.textContent = 'Đang chờ';
    }
  });
}

// ============================================================
// Load Sessions
// ============================================================

async function loadSessionsFromServer() {
  try {
    const response = await fetch(window.location.pathname + '/messages');
    // Sessions are already rendered in the page, just initialize
  } catch (error) {
    console.error('Error loading sessions:', error);
  }
}

// ============================================================
// Session List Management
// ============================================================

function addNewSessionToList(session) {
  const sessionList = document.getElementById('sessionList');
  if (!sessionList) return;

  // Check if already exists
  if (document.getElementById(`session-item-${session.sessionId}`)) {
    return;
  }

  const item = document.createElement('div');
  item.className = 'chat-session-item';
  item.id = `session-item-${session.sessionId}`;
  item.onclick = () => selectSession(session.sessionId);

  item.innerHTML = createSessionItemHTML(session);

  sessionList.insertBefore(item, sessionList.firstChild);
  updateSessionCount();
}

function createSessionItemHTML(session, isActive = false) {
  const statusClass = session.status === 'waiting' ? 'waiting' : (session.status === 'active' ? 'active' : 'closed');
  const statusText = session.status === 'waiting' ? 'Đang chờ' : (session.status === 'active' ? 'Đang chat' : 'Đã đóng');
  const adminText = session.adminName ? session.adminName : '';
  const time = formatChatTime(new Date(session.createdAt));
  const gAv = safeAvatarUrl(session.guestAvatar || '');
  const avatarBlock = gAv
    ? `<div class="chat-session-avatar chat-session-avatar--img"><img src="${escapeHtml(gAv)}" alt=""></div>`
    : `<div class="chat-session-avatar"><i class="fa-solid fa-user"></i></div>`;

  return `
    ${avatarBlock}
    <div class="chat-session-info">
      <div class="chat-session-header">
        <span class="chat-session-name">${escapeHtml(session.guestName)}</span>
        <span class="chat-session-time">${time}</span>
      </div>
      <div class="chat-session-preview">
        <span class="chat-session-status">
          <span class="status-dot ${statusClass}"></span>
          <span>${statusText}${adminText ? ' - ' + adminText : ''}</span>
        </span>
      </div>
    </div>
  `;
}

function updateSessionStatus(sessionId, status, adminName) {
  const item = document.getElementById(`session-item-${sessionId}`);
  if (!item) return;

  const statusDot = item.querySelector('.status-dot');
  const statusText = item.querySelector('.chat-session-status span:last-child');

  if (statusDot) {
    statusDot.className = `status-dot ${status}`;
  }

  if (statusText) {
    statusText.textContent = `Đang chat${adminName ? ' - ' + adminName : ''}`;
  }
}

function updateSessionPreview(data) {
  const item = document.getElementById(`session-item-${data.sessionId}`);
  if (!item) return;

  const preview = item.querySelector('.chat-session-preview span:last-child');
  if (preview) {
    const isImage =
      data.message.content.startsWith('[image]') ||
      /\.(jpeg|jpg|jpe|png|gif|webp)(\?|$)/i.test(data.message.content);
    preview.textContent = isImage ? '[Hình ảnh]' : truncateText(data.message.content, 40);
  }

  // Highlight if not selected
  if (currentSessionId !== data.sessionId) {
    item.classList.add('has-message');
  }
}

function handleSessionClosed(sessionId) {
  const item = document.getElementById(`session-item-${sessionId}`);
  if (!item) return;

  const statusDot = item.querySelector('.status-dot');
  const statusText = item.querySelector('.chat-session-status span:last-child');

  if (statusDot) statusDot.className = 'status-dot closed';
  if (statusText) statusText.textContent = 'Đã đóng';

  item.classList.add('closed');

  if (currentSessionId === sessionId) {
    showChatClosedOverlay();
  }
}

function removeSessionFromList(sessionId) {
  const item = document.getElementById(`session-item-${sessionId}`);
  if (item) {
    item.remove();
  }
  updateSessionCount();
}

function updateSessionCount() {
  const countEl = document.getElementById('sessionCount');
  const sessionList = document.getElementById('sessionList');
  if (!countEl || !sessionList) return;

  const count = sessionList.children.length;
  countEl.textContent = count;
}

// ============================================================
// Chat Selection
// ============================================================

function selectSession(sessionId) {
  currentSessionId = sessionId;

  // Update UI - highlight selected
  document.querySelectorAll('.chat-session-item').forEach(item => {
    item.classList.remove('selected');
  });
  const selectedItem = document.getElementById(`session-item-${sessionId}`);
  if (selectedItem) {
    selectedItem.classList.add('selected');
    selectedItem.classList.remove('has-message');
  }

  // Show chat area (layout uses #chatEmptyState + #chatContainer, no sessionListContainer)
  const emptyState = document.getElementById('chatEmptyState');
  const chatContainer = document.getElementById('chatContainer');
  if (emptyState) emptyState.style.display = 'none';
  if (chatContainer) chatContainer.style.display = 'flex';

  // Update header (sessions[] may be empty on first paint; read name from list row)
  const session = sessions.find(
    (s) => String(s._id) === String(sessionId)
  );
  const nameFromDom = selectedItem
    ? selectedItem.querySelector('.chat-session-name')?.textContent?.trim()
    : '';
  updateChatHeader(session ? session.guestName : nameFromDom || 'Khách');

  // Load messages
  loadChatMessages(sessionId);

  // Accept session if waiting
  acceptSession(sessionId);
}

function acceptSession(sessionId) {
  const adminName = document.body.dataset.adminName || 'Admin';
  const adminAvatar = document.body.dataset.adminAvatar || '';
  chatSocket.emit('admin:accept', {
    sessionId: sessionId,
    adminName: adminName,
    adminAvatar: adminAvatar
  });
  const selfAv = safeAvatarUrl(adminAvatar);
  if (selfAv) currentAdminAvatar = selfAv;
}

function closeCurrentSession() {
  if (!currentSessionId) return;

  chatSocket.emit('admin:close', {
    sessionId: currentSessionId
  });

  goBackToSessionList();
}

function deleteCurrentSession() {
  if (!currentSessionId) return;
  if (!confirm('Bạn có chắc muốn xóa đoạn chat này? Hành động này không thể hoàn tác.')) return;

  chatSocket.emit('admin:delete-session', {
    sessionId: currentSessionId
  });

  if (currentSessionId) {
    goBackToSessionList();
  }
}

function goBackToSessionList() {
  currentSessionId = null;
  currentGuestAvatar = '';
  currentAdminAvatar = '';

  const emptyState = document.getElementById('chatEmptyState');
  const chatContainer = document.getElementById('chatContainer');
  if (emptyState) emptyState.style.display = 'flex';
  if (chatContainer) chatContainer.style.display = 'none';

  const messages = document.getElementById('chatMessages');
  if (messages) messages.innerHTML = '';

  document.querySelectorAll('.chat-session-item').forEach((item) => {
    item.classList.remove('selected');
  });
}

function updateChatHeader(guestName) {
  const headerTitle = document.getElementById('chatHeaderTitle');
  if (headerTitle) {
    headerTitle.textContent = `Chat với ${guestName}`;
  }
}

// ============================================================
// Messages
// ============================================================

async function loadChatMessages(sessionId) {
  const messagesContainer = document.getElementById('chatMessages');
  if (!messagesContainer) return;

  messagesContainer.innerHTML = '<div class="chat-loading"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải tin nhắn...</div>';

  try {
    const response = await fetch(`${window.location.pathname}/messages?sessionId=${sessionId}`);
    const data = await response.json();

    currentGuestAvatar = safeAvatarUrl(data.guestAvatar || '');
    currentAdminAvatar =
      safeAvatarUrl(data.adminAvatar || '') ||
      safeAvatarUrl(document.body.dataset.adminAvatar || '');

    messagesContainer.innerHTML = '';

    if (data.messages && data.messages.length > 0) {
      data.messages.forEach(message => {
        appendMessage(message);
      });
    } else {
      messagesContainer.innerHTML = '<div class="chat-empty">Chưa có tin nhắn nào</div>';
    }

    scrollChatToBottom();
  } catch (error) {
    messagesContainer.innerHTML = '<div class="chat-error">Không thể tải tin nhắn</div>';
  }
}

function appendMessage(message) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${message.sender}`;

  if (message.sender === 'system') {
    messageDiv.innerHTML = `<div class="chat-message-system">${escapeHtml(message.content)}</div>`;
  } else {
    const time = formatChatTime(new Date(message.createdAt));
    const avatarHtml = adminMessageAvatarHtml(message.sender);

    const isImage =
      message.content.startsWith('[image]') ||
      /\.(jpeg|jpg|jpe|png|gif|webp)(\?|$)/i.test(message.content);
    const rawUrl = message.content.replace(/^\[image\]/, '');
    const messageBody = isImage
      ? `<a href="${escapeHtml(rawUrl)}" target="_blank"><img class="chat-message-image" src="${escapeHtml(rawUrl)}" alt="Hình ảnh" loading="lazy"></a>`
      : `<div class="chat-message-text">${escapeHtml(message.content)}</div>`;

    messageDiv.innerHTML = `
      ${avatarHtml}
      <div class="chat-message-content">
        ${messageBody}
        <div class="chat-message-time">${time}</div>
      </div>
    `;
  }

  container.appendChild(messageDiv);
}

async function handleAdminChatImageSelect(input) {
  const file = input.files[0];
  if (!file || !currentSessionId) return;

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

    chatSocket.emit('admin:send-image', {
      content: json.url,
      sessionId: currentSessionId
    });

    appendMessage({
      sender: 'admin',
      content: json.url,
      createdAt: new Date()
    });

    if (btn) btn.disabled = false;
  } catch (err) {
    console.error('[Admin Chat] Image upload error:', err);
    if (btn) btn.disabled = false;
  }

  input.value = '';
}

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  if (!input || !currentSessionId) return;

  const content = input.value.trim();
  if (!content) return;

  chatSocket.emit('admin:message', {
    content: content,
    sessionId: currentSessionId
  });

  // Add message to UI immediately
  appendMessage({
    sender: 'admin',
    content: content,
    createdAt: new Date()
  });

  input.value = '';
  scrollChatToBottom();
}

function scrollChatToBottom() {
  const container = document.getElementById('chatMessages');
  if (container) {
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 50);
  }
}

function showChatClosedOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'chat-session-closed';
  overlay.innerHTML = `
    <i class="fa-solid fa-check-circle"></i>
    <p>Phiên chat đã kết thúc</p>
    <button onclick="goBackToSessionList()">Quay lại danh sách</button>
  `;

  const container = document.getElementById('chatMessages');
  if (container) {
    container.innerHTML = '';
    container.appendChild(overlay);
  }
}

// ============================================================
// Input Handling
// ============================================================

function initChatPageInput() {
  const input = document.getElementById('chatInput');
  if (!input) return;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  // Auto-resize
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
}

// ============================================================
// Utilities
// ============================================================

function formatChatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return `${hours}:${minutes}`;
  }
  return `${day}/${month} ${hours}:${minutes}`;
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
