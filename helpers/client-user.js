/**
 * User đăng nhập qua cookie tokenUser → req.user (middleware infoUser).
 * Một số luồng cũ có thể dùng req.session.user — hỗ trợ cả hai.
 */
function getLoggedInUser(req) {
  if (req.user && (req.user._id || req.user.id)) {
    return req.user;
  }
  if (req.session && req.session.user) {
    return req.session.user;
  }
  return null;
}

function getLoggedInUserId(req) {
  const u = getLoggedInUser(req);
  if (!u) return null;
  return String(u._id || u.id);
}

module.exports = { getLoggedInUser, getLoggedInUserId };
