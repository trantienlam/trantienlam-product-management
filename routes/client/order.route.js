const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/order.controllers");
const authMiddleware = require("../../middlewares/clients/auth.middleware");

// Áp dụng auth middleware cho tất cả routes
router.use(authMiddleware.requireAuth);

router.get("/", controller.index);
router.get("/detail/:id", controller.detail);
router.get("/cancel/:id", controller.cancel);

module.exports = router;
