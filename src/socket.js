const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const PrivateMessage = require("./models/PrivateMessage");

const waitingQueue = [];
const activeConnections = new Map();

const initializeSocket = (server) => {
  const { ChatRoom, Message } = require("./models/Chat");

  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
  });

  
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password");
      if (!user) return next(new Error("User not found"));
      socket.userId = user._id.toString();
      socket.userName = user.name;
      socket.userGender = user.gender;
      next();
    } catch (err) {
      console.log("❌ Socket Auth Failed");
      next(new Error("Authentication failed"));
    }
  });

 
  io.on("connection", (socket) => {
    activeConnections.set(socket.userId, socket.id);
    socket.broadcast.emit("user-online", { userId: socket.userId });

  
    socket.on("find-match", async () => {
      try {
        const me = await User.findById(socket.userId).select("friends friendRequestsSent friendRequestsReceived");
        const myFriendIds = (me.friends || []).map((id) => id.toString());

        let matchedUser = null;
        let matchIndex  = -1;

        const preferredGender = socket.userGender === "Male" ? "Female" : "Male";

        for (let i = 0; i < waitingQueue.length; i++) {
          if (
            waitingQueue[i].gender === preferredGender &&
            waitingQueue[i].userId !== socket.userId
          ) {
            matchedUser = waitingQueue[i];
            matchIndex  = i;
            break;
          }
        }

        if (!matchedUser) {
          for (let i = 0; i < waitingQueue.length; i++) {
            if (waitingQueue[i].userId !== socket.userId) {
              matchedUser = waitingQueue[i];
              matchIndex  = i;
              break;
            }
          }
        }

        if (matchedUser) {
          waitingQueue.splice(matchIndex, 1);

          const isAlreadyFriends = myFriendIds.includes(matchedUser.userId);

          if (isAlreadyFriends) {
            const mySocketId    = socket.id;
            const otherSocketId = activeConnections.get(matchedUser.userId);

            io.to(mySocketId).emit("already-friends", { friendId: matchedUser.userId });

            if (otherSocketId) {
              io.to(otherSocketId).emit("already-friends", { friendId: socket.userId });
            }
            return;
          }

          const chatRoom = await ChatRoom.create({
            user1: socket.userId,
            user2: matchedUser.userId,
            isActive: true,
          });

          const roomId = chatRoom._id.toString();
          socket.join(roomId);

          const otherSocket = io.sockets.sockets.get(matchedUser.socketId);
          if (otherSocket) otherSocket.join(roomId);

          socket.currentRoomId      = roomId;
          socket.currentPartnerId   = matchedUser.userId;
          if (otherSocket) {
            otherSocket.currentRoomId    = roomId;
            otherSocket.currentPartnerId = socket.userId;
          }

          const messages = await Message.find({ chatRoom: roomId }).sort({ sentAt: 1 });
          io.to(roomId).emit("match-found", { roomId, messages });

        } else {
          waitingQueue.push({
            userId:   socket.userId,
            socketId: socket.id,
            gender:   socket.userGender,
          });
          socket.emit("waiting");
        }
      } catch (err) {
        console.error("❌ Match Error", err);
      }
    });

   
    socket.on("cancel-search", () => {
      const index = waitingQueue.findIndex((u) => u.userId === socket.userId);
      if (index !== -1) waitingQueue.splice(index, 1);
      socket.emit("search-cancelled");
    });

  
    socket.on("send-message", async ({ message }) => {
      try {
        if (!message || !message.trim()) return;

        const chatRoom = await ChatRoom.findOne({
          isActive: true,
          $or: [{ user1: socket.userId }, { user2: socket.userId }],
        }).sort({ createdAt: -1 });

        if (!chatRoom) return;

        const roomId = chatRoom._id.toString();

        const saved = await Message.create({
          chatRoom: roomId,
          sender:   socket.userId,
          message:  message.trim(),
        });

        socket.to(roomId).emit("new-message", {
          message:   saved.message,
          sender:    socket.userId,
          timestamp: saved.sentAt,
        });
      } catch (err) {
        console.error("❌ Message Error", err);
      }
    });

    socket.on("send-friend-request", async () => {
      try {
        const chatRoom = await ChatRoom.findOne({
          isActive: true,
          $or: [{ user1: socket.userId }, { user2: socket.userId }],
        }).sort({ createdAt: -1 });

        if (!chatRoom) {
          socket.emit("error", { message: "No active chat found" });
          return;
        }

        const receiverId =
          chatRoom.user1.toString() === socket.userId
            ? chatRoom.user2.toString()
            : chatRoom.user1.toString();

        const sender   = await User.findById(socket.userId);
        const receiver = await User.findById(receiverId);

        if (!sender || !receiver) return;

        const alreadyFriends =
          sender.friends?.map((id) => id.toString()).includes(receiverId) ||
          receiver.friends?.map((id) => id.toString()).includes(socket.userId);

        if (alreadyFriends) {
          socket.emit("already-friends", { friendId: receiverId });
          return;
        }

        const alreadySent =
          sender.friendRequestsSent?.map((id) => id.toString()).includes(receiverId);

        if (alreadySent) {
          socket.emit("friend-request-already-sent");
          return;
        }

        sender.friendRequestsSent   = sender.friendRequestsSent   || [];
        receiver.friendRequestsReceived = receiver.friendRequestsReceived || [];

        sender.friendRequestsSent.push(receiverId);
        receiver.friendRequestsReceived.push(socket.userId);

        await sender.save();
        await receiver.save();

        const receiverSocketId = activeConnections.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("friend-request-received", {
            from:     socket.userId,
            fromName: socket.userName,
          });
        }

        socket.emit("friend-request-sent");

      } catch (err) {
        console.error("❌ Friend Request Error", err);
      }
    });

  
    socket.on("accept-friend-request", async ({ fromId }) => {
      try {
        const me     = await User.findById(socket.userId);
        const sender = await User.findById(fromId);

        if (!me || !sender) return;

        me.friends     = me.friends     || [];
        sender.friends = sender.friends || [];

        me.friends.push(fromId);
        sender.friends.push(socket.userId);

        me.friendRequestsReceived     = (me.friendRequestsReceived     || []).filter((id) => id.toString() !== fromId);
        sender.friendRequestsSent     = (sender.friendRequestsSent     || []).filter((id) => id.toString() !== socket.userId);

        await me.save();
        await sender.save();

        const senderSocketId = activeConnections.get(fromId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("friend-request-accepted", { friendId: socket.userId });
        }

        socket.emit("friend-request-accepted", { friendId: fromId });

      } catch (err) {
        console.error("❌ Accept Friend Request Error", err);
      }
    });

 
    socket.on("join-private-chat", async ({ friendId }) => {
      const room = [socket.userId, friendId].sort().join("_");
      socket.join(room);

      const messages = await PrivateMessage.find({
        $or: [
          { sender: socket.userId, receiver: friendId },
          { sender: friendId,      receiver: socket.userId },
        ],
      }).sort({ createdAt: 1 });

      socket.emit("private-chat-history", messages);
    });

    
    socket.on("send-private-message", async ({ friendId, message, replyTo }) => {
      try {
        const room = [socket.userId, friendId].sort().join("_");
        const receiverOnline = activeConnections.has(friendId);

        const saved = await PrivateMessage.create({
          sender:   socket.userId,
          receiver: friendId,
          message,
          type:     "text",
          status:   receiverOnline ? "delivered" : "sent",
          ...(replyTo && { replyTo }),
        });

        const payload = {
          _id:       saved._id,
          sender:    socket.userId,
          receiver:  friendId,
          message:   saved.message,
          type:      "text",
          status:    saved.status,
          replyTo:   saved.replyTo || null,
          createdAt: saved.createdAt,
        };

        io.to(room).emit("new-private-message", payload);
      } catch (err) {
        console.error("❌ Private Message Error", err);
      }
    });

    socket.on("send-private-image", ({ friendId, savedMessage }) => {
      try {
        const room = [socket.userId, friendId].sort().join("_");
        socket.to(room).emit("new-private-message", {
          _id:       savedMessage._id,
          sender:    socket.userId,
          receiver:  friendId,
          image:     savedMessage.image,
          type:      "image",
          createdAt: savedMessage.createdAt,
        });
      } catch (err) {
        console.error("❌ Private Image Socket Error", err);
      }
    });

    
    socket.on("message-seen", async ({ friendId }) => {
      try {
        await PrivateMessage.updateMany(
          { sender: friendId, receiver: socket.userId, status: { $ne: "read" } },
          { $set: { status: "read" } }
        );
        const senderSocketId = activeConnections.get(friendId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("messages-read", { by: socket.userId });
        }
      } catch (err) {
        console.error("❌ Message Seen Error", err);
      }
    });

  
    socket.on("typing", ({ friendId }) => {
      const room = [socket.userId, friendId].sort().join("_");
      socket.to(room).emit("user-typing", { userId: socket.userId });
    });

    socket.on("call-offer", ({ friendId, callType }) => {
      const receiverSocketId = activeConnections.get(friendId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("incoming-call", { from: socket.userId, callType });
      }
    });

    socket.on("call-accepted", ({ friendId }) => {
      const callerSocketId = activeConnections.get(friendId);
      if (callerSocketId) io.to(callerSocketId).emit("call-accepted");
    });

    socket.on("call-rejected", ({ friendId }) => {
      const callerSocketId = activeConnections.get(friendId);
      if (callerSocketId) io.to(callerSocketId).emit("call-rejected");
    });

    socket.on("end-call", ({ friendId }) => {
      const otherSocketId = activeConnections.get(friendId);
      if (otherSocketId) io.to(otherSocketId).emit("call-ended");
    });

    socket.on("webrtc-offer", ({ friendId, sdp }) => {
      const receiverSocketId = activeConnections.get(friendId);
      if (receiverSocketId) io.to(receiverSocketId).emit("webrtc-offer", { sdp });
    });

    socket.on("webrtc-answer", ({ friendId, sdp }) => {
      const callerSocketId = activeConnections.get(friendId);
      if (callerSocketId) io.to(callerSocketId).emit("webrtc-answer", { sdp });
    });

    socket.on("webrtc-ice-candidate", ({ friendId, candidate }) => {
      const otherSocketId = activeConnections.get(friendId);
      if (otherSocketId) io.to(otherSocketId).emit("webrtc-ice-candidate", { candidate });
    });

  
    socket.on("disconnect", () => {
      console.log(`❌ ${socket.userId} Disconnected`);
      const index = waitingQueue.findIndex((u) => u.userId === socket.userId);
      if (index !== -1) waitingQueue.splice(index, 1);
      activeConnections.delete(socket.userId);
      socket.broadcast.emit("user-offline", { userId: socket.userId });
    });
  });

  return io;
};

module.exports = initializeSocket;