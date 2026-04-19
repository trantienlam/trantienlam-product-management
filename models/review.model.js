const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    product_id: {
      type: String,
      required: true,
    },
    user_id: {
      type: String,
      required: true,
    },
    order_id: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: "",
    },
    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      default: "active", // active, hidden, deleted
    },
    createdBy: {
      account_id: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: {
      account_id: String,
      deletedAt: Date,
    },
    updatedBy: [
      {
        account_id: String,
        updatedAt: Date,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Review = mongoose.model("Review", reviewSchema, "reviews");

module.exports = Review;