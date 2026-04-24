const Voucher = require("../../models/voucher.model");
const Order = require("../../models/order.model");

// [POST] /vouchers/apply - Áp dụng voucher
module.exports.apply = async (req, res) => {
  try {
    const { code, cartTotal } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập mã voucher",
      });
    }

    if (!cartTotal || cartTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống",
      });
    }

    const voucher = await Voucher.findOne({
      code: code.toUpperCase(),
      isActive: true,
      deleted: false,
    });

    if (!voucher) {
      return res.status(400).json({
        success: false,
        message: "Mã voucher không tồn tại",
      });
    }

    const now = new Date();

    if (voucher.startDate > now) {
      return res.status(400).json({
        success: false,
        message: "Voucher chưa có hiệu lực",
      });
    }

    if (voucher.endDate < now) {
      return res.status(400).json({
        success: false,
        message: "Voucher đã hết hạn",
      });
    }

    if (voucher.usedCount >= voucher.quantity) {
      return res.status(400).json({
        success: false,
        message: "Voucher đã hết lượt sử dụng",
      });
    }

    if (cartTotal < voucher.minOrderValue) {
      return res.status(400).json({
        success: false,
        message: `Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString("vi-VN")}đ để sử dụng voucher này`,
      });
    }

    // Kiểm tra giới hạn sử dụng của user
    if (req.user) {
      const userUsedCount = await Order.countDocuments({
        "voucher.code": voucher.code,
        user_id: req.user._id,
      });

      if (userUsedCount >= voucher.perUserLimit) {
        return res.status(400).json({
          success: false,
          message: "Bạn đã sử dụng voucher này rồi",
        });
      }
    }

    const discount = voucher.calculateDiscount(cartTotal);
    const newTotal = cartTotal - discount;

    res.json({
      success: true,
      message: "Áp dụng voucher thành công",
      data: {
        code: voucher.code,
        name: voucher.name,
        type: voucher.type,
        value: voucher.value,
        discount: discount,
        originalTotal: cartTotal,
        newTotal: newTotal,
      },
    });
  } catch (error) {
    console.error("Apply voucher error:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi áp dụng voucher",
    });
  }
};

// [POST] /vouchers/remove - Xóa voucher đã áp dụng
module.exports.remove = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Đã xóa voucher",
    });
  } catch (error) {
    console.error("Remove voucher error:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi",
    });
  }
};

// [GET] /vouchers - Danh sách voucher của user
module.exports.index = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/user/login");
    }

    const userId = req.user._id;

    // Lấy các mã voucher đã sử dụng
    const orders = await Order.find({
      user_id: userId,
      "voucher.code": { $exists: true, $ne: "" },
    });

    const usedCodes = orders.map((o) => o.voucher?.code).filter(Boolean);

    // Lấy voucher còn hiệu lực
    const now = new Date();
    const vouchers = await Voucher.find({
      isActive: true,
      deleted: false,
      endDate: { $gte: now },
    }).sort({ endDate: 1 });

    // Đánh dấu voucher nào đã dùng
    vouchers.forEach((v) => {
      const usedCount = usedCodes.filter((c) => c === v.code).length;
      v._doc.isUsed = usedCount >= v.perUserLimit;
      v._doc.canUse = !v._doc.isUsed;
    });

    res.render("client/pages/vouchers/index", {
      pageTitle: "Kho Voucher",
      vouchers,
    });
  } catch (error) {
    console.error("My vouchers error:", error);
    req.flash("error", "Lỗi tải voucher");
    res.redirect("/");
  }
};
