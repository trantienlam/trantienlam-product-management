const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// Dùng memoryStorage để tương thích với Vercel (read-only filesystem)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file ảnh (jpg, png, gif, webp)"), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/upload-image", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Không có file ảnh" });
  }
  
  try {
    // Upload lên Cloudinary để tương thích với Vercel
    const { uploadToCloudinary } = require("../../middlewares/admin/uploadCloud.middleware");
    const imageUrl = await uploadToCloudinary(req.file.buffer);
    res.json({ success: true, url: imageUrl });
  } catch (err) {
    console.error("[Chat Upload] Cloudinary error:", err);
    res.status(500).json({ success: false, message: "Lỗi upload ảnh" });
  }
});

module.exports = router;
