const Voucher = require("../../models/voucher.model");

const moment = require("moment");
require("moment/locale/vi");
moment.locale("vi");

// [GET] /admin/vouchers
module.exports.index = async (req, res) => {
  try {
    const filter = {};
    const query = { deleted: false };

    // Search by code or name
    if (req.query.search) {
      query.$or = [
        { code: { $regex: req.query.search, $options: "i" } },
        { name: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // Filter by status
    if (req.query.status === "active") {
      const now = new Date();
      query.isActive = true;
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
      query.quantity = { $gt: "$usedCount" };
    } else if (req.query.status === "expired") {
      query.$or = [
        { endDate: { $lt: new Date() } },
        { isActive: false },
        { quantity: { $lte: "$usedCount" } },
      ];
    }

    const vouchers = await Voucher.find(query).sort({ createdAt: -1 });

    vouchers.forEach((v) => {
      v._doc.isExpired = new Date() > v.endDate;
      v._doc.isValid =
        v.isActive &&
        new Date() >= v.startDate &&
        new Date() <= v.endDate &&
        v.usedCount < v.quantity;
    });

    res.render("admin/pages/vouchers/index", {
      pageTitle: "Quản lý Voucher",
      vouchers,
      filter: req.query,
    });
  } catch (error) {
    console.error("Admin voucher index error:", error);
    req.flash("error", "Lỗi tải danh sách voucher");
    res.redirect("/admin/vouchers");
  }
};

// [GET] /admin/vouchers/create
module.exports.create = async (req, res) => {
  res.render("admin/pages/vouchers/create", {
    pageTitle: "Tạo Voucher mới",
  });
};

// [POST] /admin/vouchers/create
module.exports.createPost = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      type,
      value,
      maxDiscount,
      minOrderValue,
      quantity,
      perUserLimit,
      startDate,
      endDate,
      isActive,
    } = req.body;

    // Check if code already exists
    const existingVoucher = await Voucher.findOne({
      code: code.toUpperCase(),
    });

    if (existingVoucher) {
      req.flash("error", "Mã voucher đã tồn tại");
      return res.redirect("/admin/vouchers/create");
    }

    const voucher = new Voucher({
      code: code.toUpperCase(),
      name,
      description: description || "",
      type,
      value: parseFloat(value),
      maxDiscount: parseFloat(maxDiscount) || 0,
      minOrderValue: parseFloat(minOrderValue) || 0,
      quantity: parseInt(quantity) || 100,
      perUserLimit: parseInt(perUserLimit) || 1,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: isActive === "true",
    });

    await voucher.save();
    req.flash("success", "Tạo voucher thành công");
    res.redirect("/admin/vouchers");
  } catch (error) {
    console.error("Create voucher error:", error);
    req.flash("error", "Lỗi tạo voucher");
    res.redirect("/admin/vouchers/create");
  }
};

// [GET] /admin/vouchers/edit/:id
module.exports.edit = async (req, res) => {
  try {
    const voucher = await Voucher.findOne({
      _id: req.params.id,
      deleted: false,
    });

    if (!voucher) {
      req.flash("error", "Voucher không tồn tại");
      return res.redirect("/admin/vouchers");
    }

    res.render("admin/pages/vouchers/edit", {
      pageTitle: "Chỉnh sửa Voucher",
      voucher,
    });
  } catch (error) {
    console.error("Edit voucher error:", error);
    req.flash("error", "Lỗi tải voucher");
    res.redirect("/admin/vouchers");
  }
};

// [POST] /admin/vouchers/edit/:id
module.exports.editPatch = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      value,
      maxDiscount,
      minOrderValue,
      quantity,
      perUserLimit,
      startDate,
      endDate,
      isActive,
    } = req.body;

    const voucher = await Voucher.findOne({
      _id: req.params.id,
      deleted: false,
    });

    if (!voucher) {
      req.flash("error", "Voucher không tồn tại");
      return res.redirect("/admin/vouchers");
    }

    voucher.name = name;
    voucher.description = description || "";
    voucher.type = type;
    voucher.value = parseFloat(value);
    voucher.maxDiscount = parseFloat(maxDiscount) || 0;
    voucher.minOrderValue = parseFloat(minOrderValue) || 0;
    voucher.quantity = parseInt(quantity) || 100;
    voucher.perUserLimit = parseInt(perUserLimit) || 1;
    voucher.startDate = new Date(startDate);
    voucher.endDate = new Date(endDate);
    voucher.isActive = isActive === "true";

    await voucher.save();
    req.flash("success", "Cập nhật voucher thành công");
    res.redirect("/admin/vouchers");
  } catch (error) {
    console.error("Edit voucher error:", error);
    req.flash("error", "Lỗi cập nhật voucher");
    res.redirect(`/admin/vouchers/edit/${req.params.id}`);
  }
};

// [POST] /admin/vouchers/delete
module.exports.delete = async (req, res) => {
  try {
    const { id } = req.body;

    await Voucher.updateOne({ _id: id }, { deleted: true });

    req.flash("success", "Xóa voucher thành công");
    res.json({ success: true });
  } catch (error) {
    console.error("Delete voucher error:", error);
    res.json({ success: false, message: "Lỗi xóa voucher" });
  }
};

// [POST] /admin/vouchers/toggle-status
module.exports.toggleStatus = async (req, res) => {
  try {
    const { id } = req.body;

    const voucher = await Voucher.findOne({ _id: id, deleted: false });
    if (!voucher) {
      return res.json({ success: false, message: "Voucher không tồn tại" });
    }

    voucher.isActive = !voucher.isActive;
    await voucher.save();

    res.json({ success: true, isActive: voucher.isActive });
  } catch (error) {
    console.error("Toggle voucher status error:", error);
    res.json({ success: false, message: "Lỗi cập nhật trạng thái" });
  }
};
