
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const PrivateMessage = require("../models/PrivateMessage");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const upload = multer({ storage: multer.memoryStorage() });

router.get("/:friendId", auth, async (req, res) => {
  const userId = req.user.id;
  const { friendId } = req.params;

  const messages = await PrivateMessage.find({
    $or: [
      { sender: userId, receiver: friendId },
      { sender: friendId, receiver: userId },
    ],
  }).sort({ createdAt: 1 });

  res.json(messages);
});

router.post("/send", auth, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, message } = req.body;

    if (!receiverId || !message) {
      return res.status(400).json({ success: false, message: "Invalid data" });
    }

    const msg = await PrivateMessage.create({
      sender: senderId,
      receiver: receiverId,
      message,
    });

    res.json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});


router.post(
  "/send-image",
  upload.single("image"), 
  auth,                  
  async (req, res) => {
    try {
      const senderId = req.user.id;
      const { receiverId } = req.body;

      console.log("📸 send-image | sender:", senderId, "| receiver:", receiverId);
      console.log("📁 file:", req.file ? req.file.originalname : "MISSING");

      if (!receiverId) {
        return res.status(400).json({ success: false, message: "receiverId is required" });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No image file" });
      }

      const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "private-chat-images" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });


      const msg = await PrivateMessage.create({
        sender: senderId,
        receiver: receiverId,
        image: uploaded.secure_url,
        type: "image",
      });

      return res.json({
        success: true,
        message: {
          _id: msg._id.toString(),
          sender: senderId,
          receiver: receiverId,
          image: uploaded.secure_url,
          type: "image",
          createdAt: msg.createdAt,
        },
      });
    } catch (err) {
      console.error("❌ Image upload error:", err);
      return res.status(500).json({ success: false, error: "Upload failed" });
    }
  }
);

module.exports = router;