const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/search.controllers");
const { route } = require("./product.route");

router.get("/", controller.index);

module.exports = router;
