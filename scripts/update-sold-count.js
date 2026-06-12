/**
 * Script: update-sold-count.js
 * Tính và cập nhật soldCount cho tất cả sản phẩm dựa trên đơn hàng đã hoàn thành.
 * Chạy: node scripts/update-sold-count.js
 */
const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("../models/product.model");
const Order = require("../models/order.model");

async function updateSoldCounts() {
  // Kết nối database trước
  await mongoose.connect(process.env.MONGO_URL);
  console.log("Kết nối database thành công!");
  console.log("Bắt đầu cập nhật số lượng đã bán...");

  // Chỉ tính với đơn hàng đã hoàn thành (completed hoặc delivered)
  const completedOrders = await Order.find({
    status: { $in: ["completed", "delivered"] },
  });

  // Tổng hợp số lượng bán theo product_id
  const soldMap = {};

  for (const order of completedOrders) {
    for (const item of order.products || []) {
      const pid = item.product_id;
      if (!pid) continue;
      soldMap[pid] = (soldMap[pid] || 0) + (item.quantity || 0);
    }
  }

  console.log(`Tìm thấy ${Object.keys(soldMap).length} sản phẩm có đơn hàng.`);

  // Cập nhật soldCount cho từng sản phẩm
  let updated = 0;
  for (const [productId, soldCount] of Object.entries(soldMap)) {
    await Product.updateOne(
      { _id: productId },
      { $set: { soldCount } }
    );
    updated++;
  }

  console.log(`Đã cập nhật soldCount cho ${updated} sản phẩm.`);
  console.log("Xong!");
  await mongoose.disconnect();
  process.exit(0);
}

updateSoldCounts().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
