const Tesseract = require("tesseract.js");
const { extractDataByLine } = require("../../helpers/ocr");

module.exports.readImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Không có ảnh" });
    }

    const result = await Tesseract.recognize(req.file.path, "vie");
    const text = result.data.text || "";

    const data = extractDataByLine(text);

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "OCR thất bại" });
  }
};
