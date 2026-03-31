const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    // 👉 liên kết
    cart_id: String,
    user_id: String, // nếu có login thì dùng

    // 👉 thông tin người nhận
    userInfo: {
      fullName: String,
      phone: String,
      address: String,
    },

    // 👉 danh sách sản phẩm
    products: [
      {
        product_id: String,
        price: Number,
        discountPercentage: Number,
        quantity: Number,
        totalPrice: Number, // 🔥 nên lưu luôn
      },
    ],

    // 👉 tổng tiền đơn hàng
    amount: {
      type: Number,
      required: true,
    },

    // 👉 trạng thái đơn hàng
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancel"],
      default: "pending",
    },

    // 👉 phương thức thanh toán
    paymentMethod: {
      type: String,
      enum: ["cod", "vnpay"],
      default: "cod",
    },

    // 👉 mã giao dịch VNPAY
    vnp_TxnRef: String,

    // 👉 mã response từ VNPAY
    vnp_ResponseCode: String,
  },
  {
    timestamps: true,
  },
);

const Order = mongoose.model("Order", orderSchema, "order");
module.exports = Order;
