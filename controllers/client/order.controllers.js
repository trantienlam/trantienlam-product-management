const Order = require("../../models/order.model");
const Product = require("../../models/product.model");
const Review = require("../../models/review.model");
const paginationHelper = require("../../helpers/pagination");
const filterOrderStatusHelper = require("../../helpers/filterOrderStatus");
const productHelper = require("../../helpers/products");

//[GET] /orders
module.exports.index = async (req, res) => {
  if (!req.user) {
    return res.redirect("/user/login");
  }

  const userId = req.user._id;

  // Filter options
  const filterStatus = filterOrderStatusHelper(req.query);
  let find = { user_id: userId };

  if (req.query.status) {
    find.status = req.query.status;
  }

  // Count total orders
  const countOrders = await Order.countDocuments(find);

  // Pagination
  const pagination = {
    limitItems: 10,
    currentPage: 1,
  };
  const paginationInfo = paginationHelper(pagination, req.query, countOrders);

  // Fetch orders
  const orders = await Order.find(find)
    .sort({ createdAt: -1 })
    .skip(paginationInfo.skip)
    .limit(paginationInfo.limitItems);

  // Format orders for display
  for (const order of orders) {
    // Get product info for first 3 products
    const productIds = order.products.slice(0, 3).map((p) => p.product_id);
    const products = await Product.find({
      _id: { $in: productIds },
    }).select("title thumbnail");

    order.productsPreview = products;
    order.orderCode = order._id.toString().slice(-8).toUpperCase();
  }

  res.render("client/pages/orders/index", {
    pageTitle: "Đơn hàng của tôi",
    orders: orders,
    filterStatus: filterStatus,
    pagination: paginationInfo,
  });
};

//[GET] /orders/detail/:id
module.exports.detail = async (req, res) => {
  if (!req.user) {
    return res.redirect("/user/login");
  }

  const userId = req.user._id;
  const orderId = req.params.id;

  const order = await Order.findOne({
    _id: orderId,
    user_id: userId,
  });

  if (!order) {
    req.flash("error", "Không tìm thấy đơn hàng");
    return res.redirect("/orders");
  }

  // Get product details
  const productIds = order.products.map((p) => p.product_id);
  const products = await Product.find({
    _id: { $in: productIds },
  }).select("title thumbnail slug");

  const productMap = {};
  products.forEach((p) => {
    productMap[p._id.toString()] = p;
  });

  // Enrich order products with full info
  for (const item of order.products) {
    const productInfo = productMap[item.product_id.toString()];
    if (productInfo) {
      item.productInfo = productInfo;
      item.priceNew = item.price * (1 - (item.discountPercentage || 0) / 100);
      if (item.discountPercentage > 0) {
        item.originalPrice = item.price;
      }
      item.totalPrice = item.priceNew * item.quantity;
    }
  }

  order.orderCode = order._id.toString().slice(-8).toUpperCase();

  // Lấy reviews của từng sản phẩm trong đơn hàng (chỉ hiện review của những khách đã mua)
  const User = require("../../models/user.model");
  for (const item of order.products) {
    if (item.productInfo) {
      const reviews = await Review.find({
        product_id: item.product_id.toString(),
        order_id: String(order._id),
        deleted: false,
        status: "active",
      })
        .sort({ createdAt: -1 })
        .limit(10);

      const reviewsWithUser = await Promise.all(
        reviews.map(async (review) => {
          const user = await User.findOne({ _id: review.user_id }).select("fullName avatar");
          return {
            ...review.toObject(),
            userName: user ? user.fullName : "Khách hàng",
            userAvatar: user ? user.avatar : null,
          };
        })
      );
      item.reviews = reviewsWithUser;

      // Kiểm tra xem user hiện tại đã đánh giá sản phẩm này từ đơn hàng này chưa
      const userReview = reviews.find((r) => r.user_id.toString() === userId.toString());
      item.hasUserReviewed = !!userReview;
    }
  }

  res.render("client/pages/orders/detail", {
    pageTitle: `Chi tiết đơn hàng #${order.orderCode}`,
    order: order,
  });
};

//[GET] /orders/cancel/:id
module.exports.cancel = async (req, res) => {
  if (!req.user) {
    return res.redirect("/user/login");
  }

  const userId = req.user._id;
  const orderId = req.params.id;

  const order = await Order.findOne({
    _id: orderId,
    user_id: userId,
  });

  if (!order) {
    req.flash("error", "Không tìm thấy đơn hàng");
    return res.redirect("/orders");
  }

  // Only allow cancel pending orders
  if (order.status !== "pending" && order.status !== "processing") {
    req.flash("error", "Không thể hủy đơn hàng ở trạng thái này");
    return res.redirect(`/orders/detail/${orderId}`);
  }

  // Restore stock and soldCount
  for (const item of order.products) {
    await Product.updateOne(
      { _id: item.product_id },
      {
        $inc: {
          stock: item.quantity,
          soldCount: -item.quantity,
        },
      },
    );
  }

  // Update order status
  order.status = "cancelled";
  order.cancelledAt = new Date();
  order.cancelledBy = userId;
  await order.save();

  req.flash("success", "Đơn hàng đã được hủy thành công");
  res.redirect("/orders");
};
