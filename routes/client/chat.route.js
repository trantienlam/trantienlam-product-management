const express = require("express");
const router = express.Router();
const controller = require("../../controllers/client/chat.controllers");

router.get("/history/:sessionId", controller.getHistory);

router.get("/session/:guestId", controller.getSession);

module.exports = router;
