// routes/admin/ocr.route.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const ocrController = require("../../controllers/admin/ocr.controller");

// Dùng memoryStorage để tương thích với Vercel (read-only filesystem)
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/read", upload.single("image"), ocrController.readImage);

module.exports = router;
