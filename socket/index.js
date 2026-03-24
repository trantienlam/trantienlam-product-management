const ChatSession = require("../models/chat-session.model");
const { syncGuestAvatarOnSession } = require("../helpers/chat-guest-avatar");

async function appendSessionMessage(sessionId, sender, content) {
  const session = await ChatSession.findById(sessionId);
  if (!session) return null;
  session.messages.push({ sender, content });
  await session.save();
  return session.messages[session.messages.length - 1];
}

async function reopenSessionIfClosed(sessionId) {
  const session = await ChatSession.findById(sessionId);
  if (!session) return null;
  if (session.status !== "closed") return session;
  session.status = "waiting";
  session.adminName = null;
  session.adminAvatar = "";
  await session.save();
  return session;
}

module.exports = function(io) {
  io.on("connection", (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Guest joins chat
    socket.on("guest:join", async (data) => {
      const { guestName, guestId, sessionId, guestAvatar } = data;

      // Priority 1: client passes its existing sessionId (reload / restore)
      if (sessionId) {
        const existing = await ChatSession.findById(sessionId);
        if (existing && existing.guestId === guestId) {
          // Nếu đã đóng, cho phép mở lại cùng session
          if (existing.status === "closed") {
            existing.status = "waiting";
            existing.adminName = null;
            existing.adminAvatar = "";
            await existing.save();
            io.to("admin-room").emit("admin:session-reopened", {
              sessionId: existing._id,
              guestName: existing.guestName,
              guestAvatar: existing.guestAvatar || "",
              createdAt: existing.createdAt
            });
          }
          await syncGuestAvatarOnSession(existing, guestAvatar);
          socket.join(`session:${existing._id}`);
          socket.sessionId = existing._id.toString();
          return socket.emit("session:joined", {
            sessionId: existing._id,
            guestName: existing.guestName,
            isRestore: true,
            guestAvatar: existing.guestAvatar || "",
            adminAvatar: existing.adminAvatar || ""
          });
        }
      }

      // Priority 2: find an open session for this guest
      let session = await ChatSession.findOne({
        guestId,
        status: { $in: ["waiting", "active"] }
      });
      if (!session) {
        session = new ChatSession({
          guestId,
          guestName: guestName || `Khách ${Date.now() % 10000}`,
          status: "waiting",
          guestAvatar: guestAvatar || ""
        });
        await session.save();
      }

      await syncGuestAvatarOnSession(session, guestAvatar);

      socket.join(`session:${session._id}`);
      socket.sessionId = session._id.toString();

      // Notify admins only for new sessions
      io.to("admin-room").emit("admin:new-session", {
        sessionId: session._id,
        guestName: session.guestName,
        createdAt: session.createdAt,
        guestAvatar: session.guestAvatar || "",
        status: session.status
      });

      // Send session info back to guest
      socket.emit("session:joined", {
        sessionId: session._id,
        guestName: session.guestName,
        isRestore: false,
        guestAvatar: session.guestAvatar || "",
        adminAvatar: session.adminAvatar || ""
      });
    });

    // Guest sends message
    socket.on("guest:message", async (data) => {
      const { content, sessionId } = data;

      // Nếu phiên đã đóng mà khách nhắn lại -> mở lại phiên cũ
      const reopened = await reopenSessionIfClosed(sessionId);
      if (reopened && reopened.status === "waiting") {
        io.to("admin-room").emit("admin:session-reopened", {
          sessionId: reopened._id,
          guestName: reopened.guestName,
          guestAvatar: reopened.guestAvatar || "",
          createdAt: reopened.createdAt
        });
      }

      const message = await appendSessionMessage(sessionId, "guest", content);
      if (!message) return;

      // Notify admins
      io.to("admin-room").emit("admin:new-message", {
        sessionId,
        message: {
          _id: message._id,
          content: message.content,
          sender: "guest",
          createdAt: message.createdAt
        }
      });
    });

    // Admin joins
    socket.on("admin:join", () => {
      socket.join("admin-room");
      console.log(`[Socket.io] Admin joined: ${socket.id}`);
    });

    // Admin accepts chat session
    socket.on("admin:accept", async (data) => {
      const { sessionId, adminName, adminAvatar } = data;

      const updated = await ChatSession.findByIdAndUpdate(
        sessionId,
        {
          status: "active",
          adminName: adminName || "Admin",
          adminAvatar: adminAvatar || ""
        },
        { new: true }
      );

      const avatar = updated?.adminAvatar || adminAvatar || "";

      // Notify guest
      io.to(`session:${sessionId}`).emit("session:accepted", {
        adminName: adminName || "Admin",
        adminAvatar: avatar
      });

      // Notify all admins
      io.to("admin-room").emit("admin:session-accepted", {
        sessionId,
        adminName,
        adminAvatar: avatar
      });
    });

    // Admin sends message
    socket.on("admin:message", async (data) => {
      const { content, sessionId } = data;

      const message = await appendSessionMessage(sessionId, "admin", content);
      if (!message) return;

      // Send to guest
      io.to(`session:${sessionId}`).emit("guest:new-message", {
        _id: message._id,
        content: message.content,
        sender: "admin",
        createdAt: message.createdAt
      });

      // Notify other admins
      socket.broadcast.to("admin-room").emit("admin:new-message", {
        sessionId,
        message: {
          _id: message._id,
          content: message.content,
          sender: "admin",
          createdAt: message.createdAt
        }
      });
    });

    // Admin closes chat
    socket.on("admin:close", async (data) => {
      const { sessionId } = data;
      
      await ChatSession.findByIdAndUpdate(sessionId, { status: "closed" });

      // Notify guest
      io.to(`session:${sessionId}`).emit("session:closed");
      
      // Notify admins
      io.to("admin-room").emit("admin:session-closed", { sessionId });

      socket.leave(`session:${sessionId}`);
    });

    // Admin deletes chat session
    socket.on("admin:delete-session", async (data) => {
      const { sessionId } = data;
      if (!sessionId) return;

      await ChatSession.findByIdAndDelete(sessionId);

      // Notify all admins to remove from their UI
      io.to("admin-room").emit("admin:session-deleted", { sessionId });

      // Notify guest
      io.to(`session:${sessionId}`).emit("session:deleted");
      io.of("/").in(`session:${sessionId}`).disconnectSockets(true);
    });

    // Guest closes chat
    socket.on("guest:close", async () => {
      if (socket.sessionId) {
        await ChatSession.findByIdAndUpdate(socket.sessionId, { status: "closed" });
        io.to("admin-room").emit("admin:session-closed", { sessionId: socket.sessionId });
      }
    });

    // Guest sends image
    socket.on("guest:send-image", async (data) => {
      const { content, sessionId } = data;
      if (!content || !sessionId) return;

      const reopened = await reopenSessionIfClosed(sessionId);
      if (reopened && reopened.status === "waiting") {
        io.to("admin-room").emit("admin:session-reopened", {
          sessionId: reopened._id,
          guestName: reopened.guestName,
          guestAvatar: reopened.guestAvatar || "",
          createdAt: reopened.createdAt
        });
      }

      const message = await appendSessionMessage(sessionId, "guest", content);
      if (!message) return;

      io.to("admin-room").emit("admin:new-message", {
        sessionId,
        message: {
          _id: message._id,
          content: message.content,
          sender: "guest",
          createdAt: message.createdAt
        }
      });
    });

    // Admin sends image
    socket.on("admin:send-image", async (data) => {
      const { content, sessionId } = data;
      if (!content || !sessionId) return;

      const message = await appendSessionMessage(sessionId, "admin", content);
      if (!message) return;

      io.to(`session:${sessionId}`).emit("guest:new-message", {
        _id: message._id,
        content: message.content,
        sender: "admin",
        createdAt: message.createdAt
      });

      socket.broadcast.to("admin-room").emit("admin:new-message", {
        sessionId,
        message: {
          _id: message._id,
          content: message.content,
          sender: "admin",
          createdAt: message.createdAt
        }
      });
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
};
