const express = require('express');
const User = require('../models/User');
const Message = require('../models/Message');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/users — Get all users except the logged-in user
router.get('/users', protect, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('-password')
      .sort({ username: 1 });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/messages/:userId — Get conversation history between two users
router.get('/messages/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;

    // Validate userId
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Fetch messages in both directions
    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: userId },
        { sender: userId, receiver: myId },
      ],
    })
      .sort({ timestamp: 1 })
      .populate('sender', 'username')
      .populate('receiver', 'username');

    // Mark messages from the other user as seen
    await Message.updateMany(
      { sender: userId, receiver: myId, seen: false },
      { $set: { seen: true } }
    );

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;