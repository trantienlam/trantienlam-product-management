function normalizeLines(text) {
  return text
    .replace(/\|/g, "\n")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function extractDataByLine(text) {
  const lines = normalizeLines(text);

  return {
    title: lines[0] || "",
    description: lines[1] || "",
    price: Number(lines[2]) || 0,
    stock: Number(lines[3]) || 0,
    discount: Number(lines[4]?.replace("%", "")) || 0,
  };
}

module.exports = {
  extractDataByLine,
};
