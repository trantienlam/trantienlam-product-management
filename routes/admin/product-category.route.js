const express = require("express");
const multer = require("multer");
const router = express.Router();
const upload = multer();
const controller = require("../../controllers/admin/product-category.controllers");
const valiDate = require("../../validates/admin/product-category.validate");

const uploadCloud = require("../../middlewares/admin/uploadCloud.middleware");
router.get("/", controller.index);
router.get("/create", controller.create);

router.post(
  "/create",
  upload.single("thumbnail"),
  uploadCloud.upload,
  valiDate.createPost,
  controller.createPost
);
module.exports = router;
