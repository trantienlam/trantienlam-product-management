const express = require("express");
const router = express.Router();
const voucherController = require("../../controllers/admin/voucher.controllers");

router.get("/", voucherController.index);
router.get("/create", voucherController.create);
router.post("/create", voucherController.createPost);
router.get("/edit/:id", voucherController.edit);
router.post("/edit/:id", voucherController.editPatch);
router.post("/delete", voucherController.delete);
router.post("/toggle-status", voucherController.toggleStatus);

module.exports = router;
