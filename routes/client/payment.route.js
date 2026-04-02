const express = require("express");
const router = express.Router();
const controller = require("../../controllers/client/payment.controllers");
const checkoutController = require("../../controllers/client/checkout.controllers");

router.get("/", (req, res) => {
  res.render("client/payment/index");
});

router.get("/create", controller.createPayment);
router.get("/return", controller.vnpayReturn);
router.get("/ipn", controller.vnpayIpn);

router.post("/checkout/order", checkoutController.order);

module.exports = router;
