const mongoose = require("mongoose");
const User = require("../models/user.model");

/**
 * Ưu tiên: avatar client gửi → avatar đã lưu trên phiên → avatar User nếu guestId = user_<ObjectId>
 */
async function resolveGuestAvatar(guestId, clientAvatar, storedAvatar) {
  const fromClient = (clientAvatar || "").trim();
  if (fromClient) return fromClient;
  const fromStored = (storedAvatar || "").trim();
  if (fromStored) return fromStored;
  if (!guestId || typeof guestId !== "string") return "";
  const m = guestId.match(/^user_([a-fA-F0-9]{24})$/);
  if (!m || !mongoose.Types.ObjectId.isValid(m[1])) return "";
  const user = await User.findOne({
    _id: m[1],
    deleted: false
  })
    .select("avatar")
    .lean();
  if (!user || !user.avatar) return "";
  return String(user.avatar).trim();
}

/** Mongoose document: cập nhật guestAvatar nếu resolve được URL mới */
async function syncGuestAvatarOnSession(sessionDoc, clientAvatar) {
  if (!sessionDoc || !sessionDoc.guestId) return (sessionDoc && sessionDoc.guestAvatar) || "";
  const resolved = await resolveGuestAvatar(
    sessionDoc.guestId,
    clientAvatar,
    sessionDoc.guestAvatar
  );
  if (resolved !== (sessionDoc.guestAvatar || "")) {
    sessionDoc.guestAvatar = resolved;
    await sessionDoc.save();
  }
  return resolved;
}

module.exports = { resolveGuestAvatar, syncGuestAvatarOnSession };
