const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');

// Map: userId (string) -> socketId
const onlineUsers = new Map();

const setupSocket = (io) => {
  // ─── Middleware: Verify JWT on every socket connection ─────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error: No token'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('Authentication error: User not found'));

      socket.user = user; // Attach user to socket
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 Connected: ${socket.user.username} (${socket.id})`);

    // ─── Join: Register user as online ───────────────────────────────────────
    socket.on('join', () => {
      onlineUsers.set(userId, socket.id);

      // Broadcast updated online users list to everyone
      io.emit('online_users', Array.from(onlineUsers.keys()));
      console.log(`✅ ${socket.user.username} is online. Total online: ${onlineUsers.size}`);
    });

    // ─── Send Message ─────────────────────────────────────────────────────────
    socket.on('send_message', async (data) => {
      try {
        const { receiverId, message } = data;

        // Validate
        if (!receiverId || !message || message.trim() === '') return;
        if (receiverId === userId) return; // Can't message yourself
        if (message.length > 2000) return;

        // Save to DB
        const newMessage = await Message.create({
          sender: userId,
          receiver: receiverId,
          message: message.trim(),
        });

        const populated = await newMessage.populate([
          { path: 'sender', select: 'username' },
          { path: 'receiver', select: 'username' },
        ]);

        const payload = {
          _id: populated._id,
          sender: populated.sender,
          receiver: populated.receiver,
          message: populated.message,
          timestamp: populated.timestamp,
          seen: populated.seen,
        };

        // Send to receiver if online
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receive_message', payload);
        }

        // Send back to sender (confirmation)
        socket.emit('receive_message', payload);
      } catch (err) {
        console.error('Send message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ─── Typing indicators ────────────────────────────────────────────────────
    socket.on('typing', ({ receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing', {
          senderId: userId,
          username: socket.user.username,
        });
      }
    });

    socket.on('stop_typing', ({ receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('stop_typing', { senderId: userId });
      }
    });

    // ─── Mark messages as read ────────────────────────────────────────────────
    socket.on('mark_as_read', async ({ senderId }) => {
      try {
        await Message.updateMany(
          { sender: senderId, receiver: userId, seen: false },
          { $set: { seen: true } }
        );

        // Notify sender that their messages were read
        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('messages_read', { by: userId });
        }
      } catch (err) {
        console.error('Mark as read error:', err);
      }
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('online_users', Array.from(onlineUsers.keys()));
      console.log(`❌ Disconnected: ${socket.user.username}. Total online: ${onlineUsers.size}`);
    });
  });
};

module.exports = setupSocket;