const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    amount: Number,
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      default: "vnpay",
    },
    transactionNo: String,
    bankCode: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", paymentSchema);
