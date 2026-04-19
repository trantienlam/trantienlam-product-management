const express = require("express");
const router = express.Router();
const controller = require("../../controllers/admin/review.controllers");

router.get("/", controller.index);
router.patch("/status/:id", controller.patchStatus);
router.delete("/delete/:id", controller.deleteItem);

module.exports = router;
