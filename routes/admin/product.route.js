const express = require("express");

const multer = require("multer");

const router = express.Router();

const controller = require("../../controllers/admin/product.controllers");

const valiDate = require("../../validates/admin/product.validate");
const upload = multer();
const uploadCloud = require("../../middlewares/admin/uploadCloud.middleware");

router.get("/", controller.index);
router.patch("/change-status/:status/:id", controller.changeStatus);

router.patch("/change-multi", controller.changeMulti);
router.delete("/delete/:id", controller.deleteItem);

router.get("/create", controller.create);
router.post(
  "/create",
  upload.array("images", 10),
  uploadCloud.upload,
  valiDate.createPost,
  controller.createPost
);

router.get("/edit/:id", controller.edit);
router.patch(
  "/edit/:id",
  upload.array("images", 10),
  uploadCloud.upload,
  valiDate.createPost,
  controller.editPatch
);

router.get("/detail/:id", controller.detail);

module.exports = router;
