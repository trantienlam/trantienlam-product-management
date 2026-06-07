const express = require("express");
const router = express.Router();
const controller = require("../../controllers/admin/report.controllers");

// Trang chính - Báo cáo doanh thu
router.get("/", controller.index);

// Báo cáo sản phẩm
router.get("/products", controller.productReport);

// Báo cáo khách hàng
router.get("/customers", controller.customerReport);

// Báo cáo tồn kho
router.get("/inventory", controller.inventoryReport);

// Xuất dữ liệu (JSON/CSV)
router.get("/export", controller.exportReport);

// Xuất file Excel
router.get("/export/excel", controller.exportExcel);

module.exports = router;
