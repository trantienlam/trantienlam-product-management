// ============================================================
// Chat Client - Socket.io Integration
// ============================================================

let socket = null;
let currentSessionId = null;
let guestId = null;
let guestName = '';
let isWidgetOpen = false;
let unreadCount = 0;
let guestChatAvatarUrl = '';
let adminChatAvatarUrl = '';

function safeAvatarUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const u = url.trim();
  if (u.startsWith('/') && !u.startsWith('//')) return u;
  if (/^https?:\/\//i.test(u)) return u;
  return '';
}

function guestAvatarForJoin() {
  const a = typeof window !== 'undefined' ? window.__CHAT_ACCOUNT__ : null;
  return safeAvatarUrl(a && a.avatar ? a.avatar : '');
}

function getAccountChatIdentity() {
  const a = typeof window !== 'undefined' ? window.__CHAT_ACCOUNT__ : null;
  if (!a || !a.id) return null;
  const fullName = (a.fullName || '').trim();
  const emailLocal = (a.email || '').split('@')[0].trim();
  const displayName = fullName || emailLocal || '';
  if (!displayName) return null;
  return { guestId: 'user_' + a.id, guestName: displayName };
}

function setWelcomeConnecting(show) {
  const el = document.getElementById('chatWelcomeConnecting');
  if (el) el.style.display = show ? 'block' : 'none';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  guestChatAvatarUrl = guestAvatarForJoin();
  initSocket();
  initChatInput();
});

// ============================================================
// Socket Connection
// ============================================================

function initSocket() {
  socket = io();

  socket.on('connect', () => {
    console.log('[Chat] Connected to server');
    restoreSession();
    if (isWidgetOpen) tryBeginChatAsLoggedUser();
  });

  socket.on('disconnect', () => {
    console.log('[Chat] Disconnected from server');
  });

  socket.on('session:joined', (data) => {
    currentSessionId = data.sessionId;
    guestName = data.guestName;
    if (data.guestAvatar) guestChatAvatarUrl = safeAvatarUrl(data.guestAvatar);
    if (data.adminAvatar) adminChatAvatarUrl = safeAvatarUrl(data.adminAvatar);
    setWelcomeConnecting(false);
    showChatArea();
    loadAndRenderHistory(data.sessionId, data.isRestore);
  });

  socket.on('session:accepted', (data) => {
    if (data.adminAvatar) adminChatAvatarUrl = safeAvatarUrl(data.adminAvatar);
    updateChatStatus('chatting', `Hỗ trợ viên ${data.adminName} đang trả lời`);
    addSystemMessage(`Hỗ trợ viên ${data.adminName} đã tham gia cuộc trò chuyện`);
  });

  socket.on('session:closed', () => {
    showChatClosedState();
  });

  socket.on('guest:new-message', (message) => {
    addMessage(message.content, 'admin', message.createdAt);
    if (!isWidgetOpen) {
      incrementUnread();
    }
  });

  socket.on('error', (error) => {
    console.error('[Chat] Error:', error);
    addSystemMessage('Đã xảy ra lỗi. Vui lòng thử lại.');
  });
}

// ============================================================
// Session Management
// ============================================================

function generateGuestId() {
  return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function restoreSession() {
  const acct = getAccountChatIdentity();
  const savedGuestId = localStorage.getItem('chat_guest_id');
  const savedGuestName = localStorage.getItem('chat_guest_name');
  const savedSessionId = localStorage.getItem('chat_session_id');

  if (acct) {
    guestId = acct.guestId;
    guestName = acct.guestName;
    if (savedGuestId === acct.guestId && savedSessionId && socket && socket.connected) {
      currentSessionId = savedSessionId;
      socket.emit('guest:join', {
        guestId: guestId,
        guestName: guestName,
        sessionId: currentSessionId,
        guestAvatar: guestAvatarForJoin()
      });
    }
    return;
  }

  if (savedGuestId && savedSessionId) {
    guestId = savedGuestId;
    guestName = savedGuestName || '';
    currentSessionId = savedSessionId;

    if (socket && socket.connected) {
      socket.emit('guest:join', {
        guestId: guestId,
        guestName: guestName,
        sessionId: currentSessionId,
        guestAvatar: guestAvatarForJoin()
      });
    }
  }
}

function performGuestJoin(id, name) {
  guestId = id;
  guestName = name;
  if (!socket || !socket.connected) return;
  socket.emit('guest:join', {
    guestId: guestId,
    guestName: guestName,
    guestAvatar: guestAvatarForJoin()
  });
  saveSession();
}

async function loadAndRenderHistory(sessionId, isRestore) {
  try {
    const res = await fetch(`/chat/history/${sessionId}`);
    const json = await res.json();
    if (!json.success || !json.data) return;

    const { session, messages } = json.data;

    const ga = safeAvatarUrl(session.guestAvatar);
    const aa = safeAvatarUrl(session.adminAvatar);
    if (ga) guestChatAvatarUrl = ga;
    else if (guestAvatarForJoin()) guestChatAvatarUrl = guestAvatarForJoin();
    if (aa) adminChatAvatarUrl = aa;

    // Clear old messages in DOM
    const chatBody = document.getElementById('chatBody');
    if (chatBody) chatBody.innerHTML = '';

    if (isRestore) {
      if (session.status === 'closed') {
        addSystemMessage('Phiên chat trước đã kết thúc.');
        showChatClosedState();
        return;
      }
      addSystemMessage('Đã khôi phục cuộc trò chuyện trước đó.');
    } else {
      addSystemMessage(`Chào mừng ${guestName}! Bạn đang được kết nối với hỗ trợ viên.`);
    }

    // Render past messages
    for (const msg of messages) {
      addMessage(msg.content, msg.sender, msg.createdAt);
    }

    // Restore status
    if (session.status === 'active' && session.adminName) {
      updateChatStatus('chatting', `Hỗ trợ viên ${session.adminName} đang trả lời`);
    } else {
      updateChatStatus('waiting', 'Đang chờ hỗ trợ viên...');
    }
  } catch (err) {
    console.error('[Chat] Load history error:', err);
    addSystemMessage(`Chào mừng ${guestName}! Bạn đang được kết nối với hỗ trợ viên.`);
    updateChatStatus('waiting', 'Đang chờ hỗ trợ viên...');
  }
}

/** Logged-in user: join automatically when opening the widget (no name form). */
function tryBeginChatAsLoggedUser() {
  const acct = getAccountChatIdentity();
  if (!acct || currentSessionId) return;
  const chatArea = document.getElementById('chatArea');
  if (chatArea && chatArea.style.display === 'flex') return;
  if (!socket || !socket.connected) return;
  setWelcomeConnecting(true);
  performGuestJoin(acct.guestId, acct.guestName);
}

function saveSession() {
  if (guestId) localStorage.setItem('chat_guest_id', guestId);
  if (guestName) localStorage.setItem('chat_guest_name', guestName);
  if (currentSessionId) localStorage.setItem('chat_session_id', currentSessionId);
}

function clearSession() {
  localStorage.removeItem('chat_guest_id');
  localStorage.removeItem('chat_guest_name');
  localStorage.removeItem('chat_session_id');
  currentSessionId = null;
  guestName = '';
}

function joinChat() {
  const acct = getAccountChatIdentity();
  if (acct) {
    setWelcomeConnecting(true);
    performGuestJoin(acct.guestId, acct.guestName);
    return;
  }

  const nameInput = document.getElementById('guestNameInput');
  if (!nameInput) return;
  const name = nameInput.value.trim();

  if (!name) {
    nameInput.style.borderColor = '#e74c3c';
    nameInput.placeholder = 'Vui lòng nhập tên!';
    setTimeout(() => {
      nameInput.style.borderColor = '#e8f0fe';
      nameInput.placeholder = 'Nhập tên của bạn...';
    }, 2000);
    return;
  }

  guestName = name;
  guestId = generateGuestId();

  socket.emit('guest:join', {
    guestId: guestId,
    guestName: guestName,
    guestAvatar: guestAvatarForJoin()
  });

  saveSession();
}

function restartChat() {
  // Tiếp tục lại cùng session (không tạo session mới)
  if (socket && socket.connected && currentSessionId && guestId) {
    document.getElementById('chatClosedState').style.display = 'none';
    document.getElementById('chatWelcome').style.display = 'none';
    document.getElementById('chatArea').style.display = 'flex';
    document.getElementById('chatInputArea').style.display = 'block';
    setWelcomeConnecting(true);
    socket.emit('guest:join', {
      guestId,
      guestName,
      sessionId: currentSessionId,
      guestAvatar: guestAvatarForJoin()
    });
    return;
  }

  // Fallback: hành vi cũ nếu không còn đủ thông tin
  clearSession();
  document.getElementById('chatArea').style.display = 'none';
  document.getElementById('chatClosedState').style.display = 'none';
  document.getElementById('chatWelcome').style.display = 'flex';
  setWelcomeConnecting(false);
  const nameInput = document.getElementById('guestNameInput');
  if (nameInput) nameInput.value = '';
  document.getElementById('chatBody').innerHTML = '';
}

// ============================================================
// UI Functions
// ============================================================

function toggleChatWidget() {
  const widget = document.getElementById('chatWidget');
  isWidgetOpen = !isWidgetOpen;

  if (isWidgetOpen) {
    widget.classList.add('active');
    resetUnread();
    tryBeginChatAsLoggedUser();
    scrollToBottom();
    document.getElementById('chatInput')?.focus();
  } else {
    widget.classList.remove('active');
  }
}

function showChatArea() {
  document.getElementById('chatWelcome').style.display = 'none';
  document.getElementById('chatArea').style.display = 'flex';
  document.getElementById('chatClosedState').style.display = 'none';
  document.getElementById('chatInputArea').style.display = 'block';
}

function showChatClosedState() {
  document.getElementById('chatArea').style.display = 'none';
  document.getElementById('chatClosedState').style.display = 'flex';
  document.getElementById('chatInputArea').style.display = 'none';
  // Giữ sessionId để khách nhắn lại vẫn vào đúng cuộc trò chuyện cũ.
}

function updateChatStatus(status, text) {
  const statusDot = document.querySelector('.chat-header .status-dot');
  const statusText = document.getElementById('chatStatusText');

  statusDot.className = 'status-dot ' + status;
  if (statusText) statusText.textContent = text;
}

function buildClientMessageAvatarHtml(sender) {
  const url =
    sender === 'guest' ? guestChatAvatarUrl : adminChatAvatarUrl;
  if (url) {
    return `<div class="message-avatar message-avatar--img"><img src="${escapeHtml(url)}" alt=""></div>`;
  }
  const icon = sender === 'guest' ? 'fa-user' : 'fa-headset';
  return `<div class="message-avatar"><i class="fa-solid ${icon}"></i></div>`;
}

function addMessage(content, sender, time) {
  const chatBody = document.getElementById("chatBody");
  if (!chatBody) return;

  const messageDiv = document.createElement("div");
  messageDiv.className = `chat-message ${sender}`;

  const timeStr = time ? formatTime(new Date(time)) : formatTime(new Date());
  const avatarHtml = buildClientMessageAvatarHtml(sender);

  const isImage = content.startsWith("[image]") || /\.(jpeg|jpg|jpe|png|gif|webp)(\?|$)/i.test(content);
  const rawUrl = content.replace(/^\[image\]/, "");
  const messageBody = isImage
    ? `<a href="${escapeHtml(rawUrl)}" target="_blank"><img class="message-image" src="${escapeHtml(rawUrl)}" alt="Hình ảnh" loading="lazy"></a>`
    : `<div class="message-text">${escapeHtml(content)}</div>`;

  messageDiv.innerHTML = `
    ${avatarHtml}
    <div class="message-content">
      ${messageBody}
      <div class="message-time">${timeStr}</div>
    </div>
  `;

  chatBody.appendChild(messageDiv);
  scrollToBottom();
}

function addSystemMessage(content) {
  const chatBody = document.getElementById('chatBody');
  if (!chatBody) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message system';

  messageDiv.innerHTML = `
    <div class="message-content">
      <div class="message-text">${escapeHtml(content)}</div>
    </div>
  `;

  chatBody.appendChild(messageDiv);
  scrollToBottom();
}

function scrollToBottom() {
  const chatBody = document.getElementById('chatBody');
  if (chatBody) {
    setTimeout(() => {
      chatBody.scrollTop = chatBody.scrollHeight;
    }, 50);
  }
}

// ============================================================
// Image Message Sending
// ============================================================

async function handleChatImageSelect(input) {
  const file = input.files[0];
  if (!file || !currentSessionId) return;

  const formData = new FormData();
  formData.append("image", file);

  const btn = document.getElementById("chatImageBtn");
  if (btn) btn.disabled = true;

  try {
    const res = await fetch("/chat/upload-image", {
      method: "POST",
      body: formData
    });
    const json = await res.json();
    if (!json.success || !json.url) throw new Error(json.message || "Upload failed");

    socket.emit("guest:send-image", {
      content: json.url,
      sessionId: currentSessionId
    });

    addMessage(`[image]${json.url}`, "guest");
    if (btn) btn.disabled = false;
  } catch (err) {
    console.error("[Chat] Image upload error:", err);
    if (btn) btn.disabled = false;
  }

  input.value = "";
}

// ============================================================
// Message Sending
// ============================================================

function sendMessage() {
  const input = document.getElementById('chatInput');
  const content = input.value.trim();

  if (!content || !currentSessionId) return;

  socket.emit('guest:message', {
    content: content,
    sessionId: currentSessionId
  });

  addMessage(content, 'guest');
  input.value = '';
  autoResizeTextarea(input);
}

function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
}

// ============================================================
// Input Handling
// ============================================================

function initChatInput() {
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');

  if (!input || !sendBtn) return;

  input.addEventListener('input', () => {
    sendBtn.disabled = !input.value.trim();
    autoResizeTextarea(input);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
    }
  });
}

// ============================================================
// Unread Notifications
// ============================================================

function incrementUnread() {
  unreadCount++;
  updateUnreadBadge();
}

function resetUnread() {
  unreadCount = 0;
  updateUnreadBadge();
}

function updateUnreadBadge() {
  const badge = document.getElementById('chatNotificationDot');
  const btn = document.getElementById('chatFloatingBtn');

  if (badge && btn) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      badge.style.display = 'flex';
      btn.classList.add('has-unread');
    } else {
      badge.style.display = 'none';
      btn.classList.remove('has-unread');
    }
  }
}

// ============================================================
// Utilities
// ============================================================

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
