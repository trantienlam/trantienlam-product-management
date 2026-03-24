const mongoose = require("mongoose");

const chatMessageSubSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["guest", "admin"],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const chatSessionSchema = new mongoose.Schema({
  guestId: {
    type: String,
    required: true
  },
  guestName: {
    type: String,
    default: "Khách"
  },
  guestAvatar: {
    type: String,
    default: ""
  },
  adminAvatar: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ["waiting", "active", "closed"],
    default: "waiting"
  },
  adminName: {
    type: String,
    default: null
  },
  messages: {
    type: [chatMessageSubSchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

chatSessionSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("ChatSession", chatSessionSchema);
