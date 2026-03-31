const express = require("express");
const router = express.Router();
const controller = require("../../controllers/client/payment.controllers");

router.get("/", (req, res) => {
  res.render("client/payment/index");
});

router.post("/create", controller.createPayment);
router.get("/return", controller.vnpayReturn);
router.get("/ipn", controller.vnpayIpn);
router.post(
  "/checkout/order",
  require("../../controllers/client/payment.controllers").handleOrder,
);

module.exports = router;
