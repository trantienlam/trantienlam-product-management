const Order = require("../../models/order.model");
const Product = require("../../models/product.model");
const systemConfig = require("../../config/system");
const paginationHelper = require("../../helpers/pagination");

const filterStatusHelper = require("../../helpers/filterOrderStatus");
const searchHelper = require("../../helpers/search");

// [GET] /admin/orders
module.exports.index = async (req, res) => {
  const filterStatus = filterStatusHelper(req.query);

  let find = {};

  if (req.query.status) {
    find.status = req.query.status;
  }

  const objectSearch = searchHelper(req.query);
  if (objectSearch.regex) {
    find.$or = [
      { "userInfo.fullName": objectSearch.regex },
      { "userInfo.phone": objectSearch.regex },
    ];
  }

  if (req.query.paymentStatus) {
    find.paymentStatus = req.query.paymentStatus;
  }

  if (req.query.paymentMethod) {
    find.paymentMethod = req.query.paymentMethod;
  }

  const countOrders = await Order.countDocuments(find);
  let objectPagination = paginationHelper(
    {
      currentPage: 1,
      limitItems: 10,
    },
    req.query,
    countOrders,
  );

  let sort = {};
  if (req.query.sortKey && req.query.sortValue) {
    sort[req.query.sortKey] = req.query.sortValue;
  } else {
    sort.createdAt = "desc";
  }

  const orders = await Order.find(find)
    .sort(sort)
    .limit(objectPagination.limitItems)
    .skip(objectPagination.skip);

  for (const order of orders) {
    if (order.products && order.products.length > 0) {
      for (const item of order.products) {
        const product = await Product.findOne({ _id: item.product_id }).select("title thumbnail");
        if (product) {
          item.productInfo = product;
        }
      }
    }
  }

  res.render("admin/pages/orders/index", {
    pageTitle: "Quản lý đơn hàng",
    orders: orders,
    filterStatus: filterStatus,
    keyword: objectSearch.keyword,
    pagination: objectPagination,
    paymentMethod: req.query.paymentMethod || "",
    paymentStatus: req.query.paymentStatus || "",
    reqQuery: req.query,
  });
};

// [PATCH] /admin/orders/change-status/:status/:id
module.exports.changeStatus = async (req, res) => {
  const status = req.params.status;
  const id = req.params.id;

  const updatedBy = {
    account_id: res.locals.user.id,
    updatedAt: new Date(),
  };

  const order = await Order.findOne({ _id: id });

  const updateData = {
    status: status,
    updatedBy: updatedBy,
  };

  // Nếu đơn hàng COD được chuyển sang trạng thái hoàn thành -> cập nhật paymentStatus = paid
  if (order && order.paymentMethod === "cod" && status === "completed" && order.paymentStatus === "unpaid") {
    updateData.paymentStatus = "paid";
  }

  await Order.updateOne(
    { _id: id },
    updateData,
  );

  req.flash("success", "Cập nhật trạng thái thành công!");
  res.redirect("back");
};

// [PATCH] /admin/orders/change-multi
module.exports.changeMulti = async (req, res) => {
  const type = req.body.type;
  const ids = req.body.ids.split(",");

  const updatedBy = {
    account_id: res.locals.user.id,
    updatedAt: new Date(),
  };

  switch (type) {
    case "processing":
      await Order.updateMany(
        { _id: { $in: ids } },
        { status: "processing", updatedBy: updatedBy },
      );
      req.flash("success", `Cập nhật ${ids.length} đơn hàng thành "Đang xử lý"!`);
      break;
    case "shipping":
      await Order.updateMany(
        { _id: { $in: ids } },
        { status: "shipping", updatedBy: updatedBy },
      );
      req.flash("success", `Cập nhật ${ids.length} đơn hàng thành "Đang vận chuyển"!`);
      break;
    case "delivered":
      await Order.updateMany(
        { _id: { $in: ids } },
        { status: "delivered", updatedBy: updatedBy },
      );
      req.flash("success", `Cập nhật ${ids.length} đơn hàng thành "Đã giao"!`);
      break;
    case "completed":
      // Cập nhật trạng thái hoàn thành và paymentStatus = paid cho đơn COD chưa thanh toán
      await Order.updateMany(
        { _id: { $in: ids }, paymentMethod: "cod", paymentStatus: "unpaid" },
        { status: "completed", paymentStatus: "paid", updatedBy: updatedBy },
      );
      // Cập nhật trạng thái hoàn thành cho các đơn khác (đã thanh toán hoặc VNPAY)
      await Order.updateMany(
        { _id: { $in: ids }, paymentStatus: { $ne: "unpaid" } },
        { status: "completed", updatedBy: updatedBy },
      );
      req.flash("success", `Cập nhật ${ids.length} đơn hàng thành "Hoàn thành"!`);
      break;
    case "cancelled":
      await Order.updateMany(
        { _id: { $in: ids } },
        { status: "cancelled", updatedBy: updatedBy },
      );
      req.flash("success", `Đã hủy ${ids.length} đơn hàng!`);
      break;
    default:
      break;
  }

  res.redirect("back");
};

// [GET] /admin/orders/detail/:id
module.exports.detail = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id });

    if (!order) {
      req.flash("error", "Đơn hàng không tồn tại!");
      return res.redirect(`${systemConfig.prefixAdmin}/orders`);
    }

    if (order.products && order.products.length > 0) {
      for (const item of order.products) {
        const product = await Product.findOne({ _id: item.product_id }).select("title thumbnail");
        if (product) {
          item.productInfo = product;
        }
      }
    }

    res.render("admin/pages/orders/detail", {
      pageTitle: `Chi tiết đơn hàng #${order._id.toString().slice(-6).toUpperCase()}`,
      order: order,
    });
  } catch (error) {
    req.flash("error", "Có lỗi xảy ra!");
    res.redirect(`${systemConfig.prefixAdmin}/orders`);
  }
};

// [DELETE] /admin/orders/delete/:id
module.exports.deleteItem = async (req, res) => {
  const id = req.params.id;

  await Order.deleteOne({ _id: id });

  req.flash("success", "Đã xóa đơn hàng!");
  res.redirect("back");
};

// [GET] /admin/orders/change-payment-status/:status/:id
module.exports.changePaymentStatus = async (req, res) => {
  const status = req.params.status;
  const id = req.params.id;

  const updatedBy = {
    account_id: res.locals.user.id,
    updatedAt: new Date(),
  };

  await Order.updateOne(
    { _id: id },
    {
      paymentStatus: status,
      updatedBy: updatedBy,
    },
  );

  req.flash("success", "Cập nhật trạng thái thanh toán thành công!");
  res.redirect("back");
};
