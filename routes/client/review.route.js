const express = require("express");
const path = require("path");
const multer = require("multer");
const router = express.Router();
const controller = require("../../controllers/client/review.controllers");
const uploadCloud = require("../../middlewares/admin/uploadCloud.middleware");

// Dùng memoryStorage để tương thích với Vercel (read-only filesystem)
const storage = multer.memoryStorage();

const allowedExts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const extOk = allowedExts.includes(ext);
  const m = (file.mimetype || "").toLowerCase();
  // Chuẩn image/* — nhiều trình duyệt/mobile gửi đúng MIME
  const mimeStandard =
    /^image\/(jpeg|jpg|pjpeg|png|gif|webp|x-png)$/i.test(m) || m === "image/jpg";
  // Một số máy (đặc biệt Android/gallery) gửi application/octet-stream dù file là ảnh
  const mimeBinaryOk =
    (m === "application/octet-stream" || m === "binary/octet-stream") && extOk;

  if (extOk && (mimeStandard || mimeBinaryOk)) {
    return cb(null, true);
  }
  if (!extOk) {
    return cb(new Error("Chỉ chấp nhận file .jpg, .jpeg, .png, .gif, .webp"));
  }
  return cb(
    new Error(
      "Định dạng ảnh không được nhận diện. Vui lòng chọn ảnh JPG, PNG, GIF hoặc WebP.",
    ),
  );
};

const uploadReviewImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

function handleReviewUpload(req, res, next) {
  uploadReviewImages.array("review_images", 5)(req, res, (err) => {
    if (err) {
      let msg = err.message || "Lỗi tải ảnh đánh giá";
      if (err.code === "LIMIT_FILE_SIZE") {
        msg = "Mỗi ảnh không được vượt quá 5MB.";
      } else if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
        msg = "Chỉ được gửi tối đa 5 ảnh.";
      }
      req.flash("error", msg);
      return res.redirect("back");
    }
    next();
  });
}

// [POST] /reviews/create - Tạo/Cập nhật đánh giá (kèm ảnh, tối đa 5)
router.post("/create", handleReviewUpload, uploadCloud.upload, controller.create);

// [GET] /reviews/write/:productId — trang đánh giá riêng (phải đặt trước /:productId)
router.get("/write/:productId", controller.writePage);

// [GET] /reviews/:productId - Lấy danh sách đánh giá (API)
router.get("/:productId", controller.getReviews);

module.exports = router;