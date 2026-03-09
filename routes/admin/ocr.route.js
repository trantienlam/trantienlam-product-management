// // routes/admin/ocr.route.js

// const express = require("express");
// const router = express.Router();
// const multer = require("multer");
// const ocrController = require("../../controllers/admin/ocr.controller");

// const upload = multer({ dest: "uploads/" });

// router.post("/read", upload.single("image"), ocrController.readImage);

// module.exports = router;

// routes/admin/ocr.route.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const ocrController = require("../../controllers/admin/ocr.controller");

// lưu file vào RAM thay vì ổ đĩa
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/read", upload.single("image"), ocrController.readImage);

module.exports = router;
