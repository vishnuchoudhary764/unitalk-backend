const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authMiddleware = require("../middlewares/auth"); 


router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("friendRequestsReceived", "name gender profilePic");

    res.json({
      success: true,
      requests: user.friendRequestsReceived
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});


router.post("/accept", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { senderId } = req.body;

    const user = await User.findById(userId);
    const sender = await User.findById(senderId);

    if (!user || !sender) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.friends.includes(senderId)) {
      return res.json({
        success: true,
        message: "Already friends",
      });
    }

    user.friendRequestsReceived.pull(senderId);
    sender.friendRequestsSent.pull(userId);

    user.friends.addToSet(senderId);  
    sender.friends.addToSet(userId); 

    await user.save();
    await sender.save();

    res.json({
      success: true,
      message: "Friend request accepted",
    });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/reject", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { senderId } = req.body;

    const user = await User.findById(userId);
    const sender = await User.findById(senderId);

    if (!user || !sender) {
      return res.status(404).json({ message: "User not found" });
    }

    user.friendRequestsReceived.pull(senderId);
    sender.friendRequestsSent.pull(userId);

    await user.save();
    await sender.save();

    res.json({
      success: true,
      message: "Friend request denied"
    });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});
router.get("/friends", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate("friends", "name profilePic");

  res.json(user.friends);
});

module.exports = router;