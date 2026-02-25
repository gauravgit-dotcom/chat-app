// ─── Guard: Redirect to login if not authenticated ───────────────────────────
const token = localStorage.getItem('token');
const userRaw = localStorage.getItem('user');

if (!token || !userRaw) {
  window.location.href = '/';
}

const ME = JSON.parse(userRaw);

// ─── State ────────────────────────────────────────────────────────────────────
let socket = null;
let allUsers = [];
let onlineUserIds = new Set();
let activeChat = null; // { id, username }
let typingTimer = null;
let isTyping = false;

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ─── Logout ───────────────────────────────────────────────────────────────────
function logout() {
  if (socket) socket.disconnect();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

// ─── Format time helper ───────────────────────────────────────────────────────
function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Get avatar letter from username ─────────────────────────────────────────
function avatarLetter(username) {
  return username ? username[0].toUpperCase() : '?';
}

// ─── Unique avatar color per user ─────────────────────────────────────────────
function avatarColor(username) {
  const colors = ['#6c63ff','#f59e0b','#22c55e','#ef4444','#3b82f6','#ec4899','#14b8a6','#8b5cf6'];
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ─── Connect to Socket.io ─────────────────────────────────────────────────────
function connectSocket() {
  socket = io({
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    socket.emit('join');
  });

  socket.on('connect_error', (err) => {
    console.error('Socket error:', err.message);
    if (err.message.includes('Authentication')) {
      showToast('Session expired. Please login again.', 'error');
      setTimeout(logout, 2000);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
    showToast('Connection lost. Reconnecting...', 'error');
  });

  socket.on('reconnect', () => {
    showToast('Reconnected!', 'success');
    socket.emit('join');
  });

  // ── Receive updated online users list ──────────────────────────────────────
  socket.on('online_users', (userIds) => {
    onlineUserIds = new Set(userIds);
    updateOnlineCount();
    renderUserList();
    updateChatStatus();
  });

  // ── Receive a message ──────────────────────────────────────────────────────
  socket.on('receive_message', (msg) => {
    const senderId = msg.sender._id || msg.sender;
    const receiverId = msg.receiver._id || msg.receiver;

    // Is this message part of the current open conversation?
    const isActive =
      (senderId === activeChat?.id && receiverId === ME.id) ||
      (senderId === ME.id && receiverId === activeChat?.id);

    if (isActive) {
      appendMessage(msg);
      scrollToBottom();

      // If message is from them, mark as read
      if (senderId !== ME.id) {
        socket.emit('mark_as_read', { senderId });
      }
    } else if (senderId !== ME.id) {
      // Notification for messages in other conversations
      const senderUser = allUsers.find(u => u._id === senderId);
      showToast(`New message from ${senderUser?.username || 'someone'}`, 'info');
    }
  });

  // ── Typing events ──────────────────────────────────────────────────────────
  socket.on('typing', ({ senderId }) => {
    if (activeChat && senderId === activeChat.id) {
      document.getElementById('typingIndicator').classList.remove('hidden');
      document.getElementById('typingUsername').textContent = activeChat.username;
    }
  });

  socket.on('stop_typing', ({ senderId }) => {
    if (activeChat && senderId === activeChat.id) {
      document.getElementById('typingIndicator').classList.add('hidden');
    }
  });

  // ── Read receipts ──────────────────────────────────────────────────────────
  socket.on('messages_read', ({ by }) => {
    if (activeChat && by === activeChat.id) {
      // Update all "Sent" indicators to "Seen"
      document.querySelectorAll('.read-receipt').forEach(el => {
        el.textContent = '✓✓ Seen';
        el.style.color = '#6c63ff';
      });
    }
  });

  socket.on('error', ({ message }) => {
    showToast(message, 'error');
  });
}

// ─── Load all users ───────────────────────────────────────────────────────────
async function loadUsers() {
  try {
    const res = await fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) { logout(); return; }

    allUsers = await res.json();
    renderUserList();
  } catch (err) {
    console.error('Load users error:', err);
    showToast('Failed to load users', 'error');
  }
}

// ─── Render user list ─────────────────────────────────────────────────────────
function renderUserList(filter = '') {
  const ul = document.getElementById('userList');
  const filtered = allUsers.filter(u =>
    u.username.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) {
    ul.innerHTML = `<li class="loading-users">${filter ? 'No users found' : 'No other users yet'}</li>`;
    return;
  }

  ul.innerHTML = filtered.map(user => {
    const isOnline = onlineUserIds.has(user._id);
    const isActive = activeChat?.id === user._id;
    const color = avatarColor(user.username);

    return `
      <li class="user-item ${isActive ? 'active' : ''}" onclick="openChat('${user._id}', '${user.username}')">
        <div class="user-avatar-wrap">
          <div class="avatar sm" style="background:${color}">${avatarLetter(user.username)}</div>
          <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
        </div>
        <div class="user-item-info">
          <div class="user-item-name">${user.username}</div>
          <div class="user-item-status ${isOnline ? 'online' : 'offline'}">
            ${isOnline ? '● Online' : '○ Offline'}
          </div>
        </div>
      </li>
    `;
  }).join('');
}

function filterUsers() {
  renderUserList(document.getElementById('searchInput').value);
}

function updateOnlineCount() {
  const count = onlineUserIds.size;
  document.getElementById('onlineCount').textContent =
    `${count} user${count !== 1 ? 's' : ''} online`;
}

// ─── Open a chat conversation ─────────────────────────────────────────────────
async function openChat(userId, username) {
  activeChat = { id: userId, username };

  // Show chat window
  document.getElementById('chatEmpty').classList.add('hidden');
  document.getElementById('chatWindow').classList.remove('hidden');
  document.getElementById('typingIndicator').classList.add('hidden');

  // Update header
  const color = avatarColor(username);
  document.getElementById('chatAvatar').textContent = avatarLetter(username);
  document.getElementById('chatAvatar').style.background = color;
  document.getElementById('chatUsername').textContent = username;
  updateChatStatus();

  // Re-render sidebar to show active state
  renderUserList(document.getElementById('searchInput').value);

  // Load messages
  await loadMessages(userId);
  document.getElementById('messageInput').focus();
}

function updateChatStatus() {
  if (!activeChat) return;
  const el = document.getElementById('chatStatus');
  const isOnline = onlineUserIds.has(activeChat.id);
  el.textContent = isOnline ? '● Online' : '○ Offline';
  el.className = `chat-status ${isOnline ? 'online' : ''}`;
}

// ─── Load message history ─────────────────────────────────────────────────────
async function loadMessages(userId) {
  const area = document.getElementById('messagesArea');
  area.innerHTML = '<div class="messages-loading">Loading messages...</div>';

  try {
    const res = await fetch(`/api/messages/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('Failed to fetch');
    const messages = await res.json();

    area.innerHTML = '';

    if (messages.length === 0) {
      area.innerHTML = '<div class="messages-loading">No messages yet. Say hello! 👋</div>';
      return;
    }

    // Group messages by date and render
    let lastDate = null;
    messages.forEach(msg => {
      const msgDate = formatDate(msg.timestamp);
      if (msgDate !== lastDate) {
        const divider = document.createElement('div');
        divider.className = 'date-divider';
        divider.textContent = msgDate;
        area.appendChild(divider);
        lastDate = msgDate;
      }
      area.appendChild(createBubble(msg));
    });

    scrollToBottom();

    // Mark messages as read
    socket.emit('mark_as_read', { senderId: userId });
  } catch (err) {
    area.innerHTML = '<div class="messages-loading">Failed to load messages.</div>';
  }
}

// ─── Create a message bubble element ─────────────────────────────────────────
function createBubble(msg) {
  const senderId = msg.sender?._id || msg.sender;
  const isMe = senderId === ME.id;

  const row = document.createElement('div');
  row.className = `msg-row ${isMe ? 'me' : 'them'}`;

  const time = formatTime(msg.timestamp);
  const readStatus = isMe
    ? `<span class="read-receipt">${msg.seen ? '✓✓ Seen' : '✓ Sent'}</span>`
    : '';

  row.innerHTML = `
    <div class="bubble">
      ${escapeHtml(msg.message)}
      <div class="bubble-meta">
        <span>${time}</span>
        ${readStatus}
      </div>
    </div>
  `;

  return row;
}

// ─── Append a single message (real-time) ─────────────────────────────────────
function appendMessage(msg) {
  const area = document.getElementById('messagesArea');

  // Remove "no messages" placeholder
  const placeholder = area.querySelector('.messages-loading');
  if (placeholder) placeholder.remove();

  // Check if we need a new date divider
  const lastDivider = area.querySelector('.date-divider:last-of-type');
  const msgDate = formatDate(msg.timestamp);
  if (!lastDivider || lastDivider.textContent !== msgDate) {
    const divider = document.createElement('div');
    divider.className = 'date-divider';
    divider.textContent = msgDate;
    area.appendChild(divider);
  }

  area.appendChild(createBubble(msg));
}

// ─── Send a message ───────────────────────────────────────────────────────────
function sendMessage() {
  if (!activeChat || !socket) return;

  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  if (!message) return;

  socket.emit('send_message', {
    receiverId: activeChat.id,
    message,
  });

  input.value = '';
  input.style.height = 'auto';

  // Stop typing
  clearTimeout(typingTimer);
  isTyping = false;
  socket.emit('stop_typing', { receiverId: activeChat.id });
}

// ─── Scroll chat to bottom ────────────────────────────────────────────────────
function scrollToBottom() {
  const area = document.getElementById('messagesArea');
  area.scrollTop = area.scrollHeight;
}

// ─── Escape HTML to prevent XSS ──────────────────────────────────────────────
function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// ─── Message input events ─────────────────────────────────────────────────────
document.getElementById('messageInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

document.getElementById('messageInput').addEventListener('input', (e) => {
  // Auto-resize textarea
  const input = e.target;
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';

  // Typing indicator
  if (!activeChat || !socket) return;
  if (!isTyping) {
    isTyping = true;
    socket.emit('typing', { receiverId: activeChat.id });
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    isTyping = false;
    socket.emit('stop_typing', { receiverId: activeChat.id });
  }, 1500);
});

// ─── Init ─────────────────────────────────────────────────────────────────────
(function init() {
  // Set my name in sidebar
  document.getElementById('myUsername').textContent = ME.username;
  document.getElementById('myAvatar').textContent = avatarLetter(ME.username);
  document.getElementById('myAvatar').style.background = avatarColor(ME.username);

  connectSocket();
  loadUsers();
})();