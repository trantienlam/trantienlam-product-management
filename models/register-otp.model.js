const mongoose = require("mongoose");

const registerOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
    },
    password: {
      type: String,
    },
    phone: {
      type: String,
    },
    expireAt: {
      type: Date,
      expires: 300, // 5 minutes
    },
  },
  {
    timestamps: true,
  },
);

const RegisterOtp = mongoose.model(
  "RegisterOtp",
  registerOtpSchema,
  "register-otp",
);

module.exports = RegisterOtp;
