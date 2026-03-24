const ChatSession = require("../../models/chat-session.model");
const { resolveGuestAvatar } = require("../../helpers/chat-guest-avatar");

module.exports.getHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await ChatSession.findById(sessionId).lean();
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Phiên chat không tồn tại"
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
        { _id: session._id },
        { $set: { guestAvatar } }
      );
    }

    res.json({
      success: true,
      data: {
        session: {
          _id: session._id,
          guestName: session.guestName,
          status: session.status,
          adminName: session.adminName,
          createdAt: session.createdAt,
          guestAvatar: guestAvatar || "",
          adminAvatar: session.adminAvatar || ""
        },
        messages: messages.map((msg) => ({
          _id: msg._id,
          content: msg.content,
          sender: msg.sender,
          createdAt: msg.createdAt
        }))
      }
    });
  } catch (error) {
    console.error("[Chat API] Error getting history:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy lịch sử chat"
    });
  }
};

module.exports.getSession = async (req, res) => {
  try {
    const { guestId } = req.params;

    const session = await ChatSession.findOne({
      guestId,
      status: { $in: ["waiting", "active"] }
    }).sort({ createdAt: -1 });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiên chat đang hoạt động"
      });
    }

    res.json({
      success: true,
      data: {
        _id: session._id,
        guestId: session.guestId,
        guestName: session.guestName,
        status: session.status,
        adminName: session.adminName,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    });
  } catch (error) {
    console.error("[Chat API] Error getting session:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy thông tin phiên chat"
    });
  }
};
