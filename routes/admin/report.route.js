const express = require("express");
const router = express.Router();
const controller = require("../../controllers/admin/report.controllers");

router.get("/", controller.index);

module.exports = router;
