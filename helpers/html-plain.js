const he = require("he");

/**
 * Bỏ thẻ HTML, giải mã entity → chuỗi thuần (dùng đoạn mô tả ngắn, an toàn khi in ra text).
 */
function htmlToPlainExcerpt(html, maxLen = 200) {
  if (!html || typeof html !== "string") return "";
  const stripped = html.replace(/<[^>]+>/g, " ");
  const decoded = he.decode(stripped);
  const cleaned = decoded.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen) + "…";
}

module.exports = { htmlToPlainExcerpt };
