// routes/admin/ocr.route.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const ocrController = require("../../controllers/admin/ocr.controller");

const upload = multer({ dest: "uploads/" });

router.post("/read", upload.single("image"), ocrController.readImage);

module.exports = router;
