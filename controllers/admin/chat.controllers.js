const ChatSession = require("../../models/chat-session.model");
const { resolveGuestAvatar } = require("../../helpers/chat-guest-avatar");

module.exports.index = async (req, res) => {
  try {
    const sessions = await ChatSession.find({
      status: { $in: ["waiting", "active"] }
    })
      .select("-messages")
      .sort({ createdAt: -1 })
      .lean();

    for (const s of sessions) {
      const prev = s.guestAvatar || "";
      const resolved = await resolveGuestAvatar(s.guestId, "", prev);
      if (resolved && resolved !== prev) {
        await ChatSession.updateOne({ _id: s._id }, { $set: { guestAvatar: resolved } });
      }
      s.guestAvatar = resolved || prev;
    }

    res.render("admin/pages/chat/index", {
      pageTitle: "Chat Hỗ trợ",
      sessions: sessions,
      user: req.user,
      role: req.user.role
    });
  } catch (error) {
    console.error("Error loading chat page:", error);
    res.redirect("back");
  }
};

module.exports.getMessages = async (req, res) => {
  try {
    const sessionId = req.query.sessionId;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu sessionId"
      });
    }

    const session = await ChatSession.findById(sessionId)
      .select("messages guestAvatar adminAvatar")
      .lean();

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiên chat"
      });
    }

    const messages = (session.messages || []).slice().sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return ta - tb;
    });

    let guestAvatar = await resolveGuestAvatar(
      session.guestId,
      "",
      session.guestAvatar || ""
    );
    if (guestAvatar && guestAvatar !== (session.guestAvatar || "")) {
      await ChatSession.updateOne(
        { _id: sessionId },
        { $set: { guestAvatar } }
      );
    }

    res.json({
      success: true,
      messages,
      guestAvatar: guestAvatar || "",
      adminAvatar: session.adminAvatar || ""
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải tin nhắn"
    });
  }
};

module.exports.deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu sessionId"
      });
    }

    const session = await ChatSession.findByIdAndDelete(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiên chat"
      });
    }

    res.json({
      success: true,
      message: "Đã xóa phiên chat"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa phiên chat"
    });
  }
};
