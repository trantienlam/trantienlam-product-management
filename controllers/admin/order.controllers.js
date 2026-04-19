const Order = require("../../models/order.model");
const Product = require("../../models/product.model");
const Review = require("../../models/review.model");
const User = require("../../models/user.model");
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
  const permissions = res.locals.role ? res.locals.role.permission : [];
  if (!permissions.includes("orders_status")) {
    req.flash("error", "Bạn không có quyền thay đổi trạng thái đơn hàng!");
    return res.redirect("back");
  }

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
  const permissions = res.locals.role ? res.locals.role.permission : [];
  if (!permissions.includes("orders_status")) {
    req.flash("error", "Bạn không có quyền thay đổi trạng thái đơn hàng!");
    return res.redirect("back");
  }

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
    const permissions = res.locals.role ? res.locals.role.permission : [];
    if (!permissions.includes("orders_detail")) {
      req.flash("error", "Bạn không có quyền xem chi tiết đơn hàng!");
      return res.redirect(`${systemConfig.prefixAdmin}/orders`);
    }

    const order = await Order.findOne({ _id: req.params.id });

    if (!order) {
      req.flash("error", "Đơn hàng không tồn tại!");
      return res.redirect(`${systemConfig.prefixAdmin}/orders`);
    }

    if (order.products && order.products.length > 0) {
      for (const item of order.products) {
        const product = await Product.findOne({ _id: item.product_id }).select(
          "title thumbnail slug",
        );
        if (product) {
          item.productInfo = product;
        }
      }

      for (const item of order.products) {
        if (!item.productInfo) continue;
        const reviews = await Review.find({
          product_id: item.product_id.toString(),
          order_id: String(order._id),
          deleted: false,
        })
          .sort({ createdAt: -1 })
          .lean();

        const reviewsWithUser = await Promise.all(
          reviews.map(async (review) => {
            const u = await User.findById(review.user_id).select("fullName");
            return {
              ...review,
              userName: u ? u.fullName : "Khách hàng",
            };
          }),
        );
        item.reviews = reviewsWithUser;
      }
    }

    let orderHasReviews = false;
    if (order.products) {
      for (const it of order.products) {
        if (it.reviews && it.reviews.length > 0) {
          orderHasReviews = true;
          break;
        }
      }
    }

    res.render("admin/pages/orders/detail", {
      pageTitle: `Chi tiết đơn hàng #${order._id.toString().slice(-6).toUpperCase()}`,
      order: order,
      orderHasReviews: orderHasReviews,
    });
  } catch (error) {
    req.flash("error", "Có lỗi xảy ra!");
    res.redirect(`${systemConfig.prefixAdmin}/orders`);
  }
};

// [DELETE/POST] /admin/orders/delete/:id
module.exports.deleteItem = async (req, res) => {
  try {
    console.log('=== DELETE ORDER DEBUG ===');
    console.log('Method:', req.method);
    console.log('Params ID:', req.params.id);
    console.log('User:', res.locals.user ? res.locals.user.email : 'Unknown');
    console.log('Role permissions:', res.locals.role ? res.locals.role.permission : 'No role');
    
    const permissions = res.locals.role ? res.locals.role.permission : [];
    if (!permissions.includes("orders_delete")) {
      console.log('PERMISSION DENIED: Missing orders_delete');
      req.flash("error", "Bạn không có quyền xóa đơn hàng!");
      return res.redirect("back");
    }

    const id = req.params.id;
    console.log('Looking for order with ID:', id);

    // Kiểm tra đơn hàng tồn tại
    const order = await Order.findById(id);
    if (!order) {
      console.log('ORDER NOT FOUND');
      req.flash("error", "Đơn hàng không tồn tại!");
      return res.redirect("back");
    }

    console.log('Order found:', {
      _id: order._id,
      status: order.status,
      amount: order.amount,
      createdAt: order.createdAt
    });

    // Xóa đơn hàng
    const result = await Order.deleteOne({ _id: id });

    console.log('Delete result:', result);
    
    if (result.deletedCount === 0) {
      console.log('DELETE FAILED: deletedCount = 0');
      req.flash("error", "Xóa đơn hàng thất bại!");
    } else {
      console.log('DELETE SUCCESS');
      req.flash("success", `Đã xóa đơn hàng #${id.slice(-8).toUpperCase()} thành công!`);
    }

    res.redirect("back");
  } catch (error) {
    console.error("Delete order ERROR:", error);
    req.flash("error", "Có lỗi xảy ra khi xóa đơn hàng: " + error.message);
    res.redirect("back");
  }
};

// [GET] /admin/orders/change-payment-status/:status/:id
module.exports.changePaymentStatus = async (req, res) => {
  const permissions = res.locals.role ? res.locals.role.permission : [];
  if (!permissions.includes("orders_status")) {
    req.flash("error", "Bạn không có quyền thay đổi trạng thái thanh toán!");
    return res.redirect("back");
  }

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
