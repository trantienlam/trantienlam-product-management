const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: "",
      maxlength: 500,
    },
    type: {
      type: String,
      enum: ["percent", "fixed"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      default: 0,
    },
    minOrderValue: {
      type: Number,
      default: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 100,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    perUserLimit: {
      type: Number,
      default: 1,
      min: 1,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual fields
voucherSchema.virtual("isExpired").get(function () {
  return new Date() > this.endDate;
});

voucherSchema.virtual("isValid").get(function () {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate && this.usedCount < this.quantity;
});

// Tính giảm giá
voucherSchema.methods.calculateDiscount = function (cartTotal) {
  let discount = 0;

  if (this.type === "percent") {
    discount = (cartTotal * this.value) / 100;
    if (this.maxDiscount > 0 && discount > this.maxDiscount) {
      discount = this.maxDiscount;
    }
  } else {
    discount = this.value;
  }

  if (discount > cartTotal) {
    discount = cartTotal;
  }

  return Math.round(discount);
};

const Voucher = mongoose.model("Voucher", voucherSchema, "vouchers");
module.exports = Voucher;
