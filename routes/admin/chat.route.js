const express = require("express");
const router = express.Router();

const chatController = require("../../controllers/admin/chat.controllers");

router.get("/", chatController.index);
router.get("/messages", chatController.getMessages);
router.delete("/delete/:sessionId", chatController.deleteSession);

module.exports = router;
