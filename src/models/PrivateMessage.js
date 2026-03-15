
const mongoose = require("mongoose");

const privateMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      default: null,
    },
    image: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      enum: ["text", "image", "voice"],
      default: "text",
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrivateMessage",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PrivateMessage", privateMessageSchema);