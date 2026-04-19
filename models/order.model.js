const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user_id: String,
    userInfo: {
      fullName: String,
      phone: String,
      address: String,
    },
    products: [
      {
        product_id: String,
        price: Number,
        discountPercentage: Number,
        priceNew: Number,
        quantity: Number,
        totalPrice: Number,
      },
    ],
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "shipping", "delivered", "completed", "failed", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "vnpay"],
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "failed"],
      default: "unpaid",
    },
    vnpTransactionNo: String,
    vnpBankCode: String,
    /** Đặt từ "Mua ngay" — không gộp giỏ; dùng để không xóa giỏ sau VNPAY */
    buyNow: {
      type: Boolean,
      default: false,
    },
    updatedBy: {
      account_id: String,
      updatedAt: Date,
    },
  },
  {
    timestamps: true,
  },
);

const Order = mongoose.model("Order", orderSchema, "order");
module.exports = Order;
