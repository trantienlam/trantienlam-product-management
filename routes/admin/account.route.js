const express = require("express");
const multer = require("multer");
const router = express.Router();
const valiDate = require("../../validates/admin/account.validate");
const upload = multer();
const controller = require("../../controllers/admin/account.controllers");
const uploadCloud = require("../../middlewares/admin/uploadCloud.middleware");
router.get("/", controller.index);
router.get("/create", controller.create);

router.post(
  "/create",
  upload.single("avata"),
  uploadCloud.upload,
  valiDate.createPost,
  controller.createPost
);
module.exports = router;
