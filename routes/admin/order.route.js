const express = require("express");
const router = express.Router();
const controller = require("../../controllers/admin/order.controllers");

router.get("/", controller.index);
router.get("/change-status/:status/:id", controller.changeStatus);
router.get("/change-payment-status/:status/:id", controller.changePaymentStatus);
router.patch("/change-multi", controller.changeMulti);
router.get("/detail/:id", controller.detail);

// DELETE và POST đều được hỗ trợ để xóa đơn hàng
router.delete("/delete/:id", controller.deleteItem);
router.post("/delete/:id", controller.deleteItem);

module.exports = router;
