const express = require("express");
const router = express.Router();
const voucherController = require("../../controllers/client/voucher.controllers");

router.post("/apply", voucherController.apply);
router.post("/remove", voucherController.remove);
router.get("/", voucherController.index);

module.exports = router;
