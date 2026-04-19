const Review = require("../../models/review.model");
const Product = require("../../models/product.model");
const Order = require("../../models/order.model");
const paginationHelper = require("../../helpers/pagination");
const { getLoggedInUserId } = require("../../helpers/client-user");

/** Chỉ đánh giá gắn đơn hàng (đã mua) — hiển thị kiểu Shopee */
const verifiedPurchaseReviewMatch = {
  order_id: { $exists: true, $nin: [null, ""] },
};

async function findDeliveredOrderForProduct(userId, productId, preferredOrderId) {
  const productClause = { $in: [productId, String(productId)] };
  const base = {
    user_id: userId,
    "products.product_id": productClause,
    status: { $in: ["delivered", "completed"] },
  };
  if (preferredOrderId) {
    const byPreferred = await Order.findOne({
      _id: preferredOrderId,
      ...base,
    });
    if (byPreferred) return byPreferred;
  }
  return Order.findOne(base);
}

// [GET] /reviews/write/:productId — trang đánh giá riêng (từ nút trên chi tiết đơn)
module.exports.writePage = async (req, res) => {
  try {
    const userId = getLoggedInUserId(req);
    if (!userId) {
      req.flash("error", "Vui lòng đăng nhập để đánh giá!");
      return res.redirect("/user/login");
    }

    const productId = req.params.productId;
    const preferredOrderId = req.query.orderId || req.query.order_id;

    const product = await Product.findOne({
      _id: productId,
      deleted: false,
      status: "active",
    });
    if (!product) {
      req.flash("error", "Sản phẩm không tồn tại!");
      return res.redirect("/products");
    }

    const deliveredOrder = await findDeliveredOrderForProduct(
      userId,
      productId,
      preferredOrderId,
    );
    if (!deliveredOrder) {
      req.flash(
        "error",
        "Bạn chỉ có thể đánh giá sau khi nhận hàng thành công từ đơn hàng có sản phẩm này.",
      );
      return res.redirect("/orders");
    }

    deliveredOrder.orderCode = deliveredOrder._id.toString().slice(-8).toUpperCase();

    // Kiểm tra xem user đã đánh giá sản phẩm này từ đơn hàng cụ thể chưa
    // Nếu đã đánh giá rồi thì không cho sửa, chuyển hướng về trang đơn hàng
    const existingReviewByOrder = await Review.findOne({
      product_id: String(productId),
      user_id: userId,
      order_id: String(deliveredOrder._id),
      deleted: false,
    });

    if (existingReviewByOrder) {
      // Đã đánh giá từ đơn hàng này rồi, không cho sửa
      req.flash("warning", "Bạn đã đánh giá sản phẩm này từ đơn hàng này rồi. Không thể chỉnh sửa!");
      return res.redirect(`/orders/detail/${deliveredOrder._id}`);
    }

    // Kiểm tra xem user đã đánh giá sản phẩm này ở đơn hàng khác chưa
    const userReview = await Review.findOne({
      product_id: String(productId),
      user_id: userId,
      deleted: false,
    });

    res.render("client/pages/reviews/write", {
      pageTitle: `Đánh giá: ${product.title}`,
      product,
      order: deliveredOrder,
      userReview,
    });
  } catch (error) {
    console.error("Review writePage error:", error);
    req.flash("error", "Không thể mở trang đánh giá.");
    res.redirect("/orders");
  }
};

// [POST] /reviews/create
module.exports.create = async (req, res) => {
  try {
    const { product_id, rating, comment, return_order_id } = req.body;
    const userId = getLoggedInUserId(req);

    // Kiểm tra đăng nhập (req.user từ cookie tokenUser)
    if (!userId) {
      if (req.xhr || req.headers.accept.includes('application/json')) {
        return res.status(401).json({ success: false, message: "Vui lòng đăng nhập để đánh giá!" });
      }
      req.flash("error", "Vui lòng đăng nhập để đánh giá!");
      return res.redirect("/user/login");
    }

    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findOne({ _id: product_id, deleted: false });
    if (!product) {
      req.flash("error", "Sản phẩm không tồn tại!");
      return res.redirect("back");
    }

    // Kiểm tra rating hợp lệ
    const ratingNum = parseInt(rating);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      req.flash("error", "Vui lòng chọn số sao từ 1 đến 5!");
      return res.redirect("back");
    }

    const deliveredOrder = await findDeliveredOrderForProduct(
      userId,
      product_id,
      return_order_id,
    );
    if (!deliveredOrder) {
      if (req.xhr || req.headers.accept.includes('application/json')) {
        return res.status(403).json({ success: false, message: "Bạn cần mua sản phẩm này và nhận hàng thành công trước khi đánh giá!" });
      }
      req.flash("error", "Bạn cần mua sản phẩm này và nhận hàng thành công trước khi đánh giá!");
      return res.redirect("back");
    }

    // Kiểm tra đã đánh giá chưa từ ĐƠN HÀNG CỤ THỂ này
    // Nếu đã đánh giá từ đơn hàng này rồi thì không cho phép tạo mới hoặc cập nhật
    const existingReviewByOrder = await Review.findOne({
      product_id: product_id,
      user_id: userId,
      order_id: String(deliveredOrder._id),
      deleted: false,
    });

    if (existingReviewByOrder) {
      // Đã đánh giá từ đơn hàng này rồi, không cho sửa
      if (req.xhr || req.headers.accept.includes('application/json')) {
        return res.status(403).json({ success: false, message: "Bạn đã đánh giá sản phẩm này từ đơn hàng này rồi!" });
      }
      req.flash("warning", "Bạn đã đánh giá sản phẩm này từ đơn hàng này rồi. Không thể chỉnh sửa!");
      return res.redirect(`/orders/detail/${return_order_id}`);
    }

    const newImageUrls = (req.files || []).map((f) => `/uploads/reviews/${f.filename}`);

    // Tạo đánh giá mới (không kiểm tra existingReview nữa vì đã kiểm tra ở trên)
    const newReview = new Review({
      product_id,
      user_id: userId,
      order_id: deliveredOrder ? deliveredOrder._id.toString() : "",
      rating: ratingNum,
      comment: comment || "",
      images: newImageUrls.slice(0, 5),
      createdBy: {
        account_id: userId,
        createdAt: new Date(),
      },
    });
    await newReview.save();
    req.flash("success", "Cảm ơn bạn đã đánh giá sản phẩm!");

    // Cập nhật rating trung bình cho sản phẩm
    await updateProductRating(product_id);

    if (req.xhr || req.headers.accept.includes('application/json')) {
      return res.json({ success: true, message: "Đánh giá thành công!" });
    }

    if (return_order_id) {
      const backOrder = await Order.findOne({
        _id: return_order_id,
        user_id: userId,
      });
      if (backOrder) {
        return res.redirect(`/orders/detail/${return_order_id}`);
      }
    }
    res.redirect(`/products/detail/${product.slug}`);
  } catch (error) {
    console.error("Review error:", error);
    req.flash("error", "Có lỗi xảy ra, vui lòng thử lại!");
    res.redirect("back");
  }
};

// [GET] /reviews/:productId - Lấy danh sách đánh giá (API)
module.exports.getReviews = async (req, res) => {
  try {
    const productId = req.params.productId;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    const countReviews = await Review.countDocuments({
      product_id: productId,
      deleted: false,
      status: "active",
      ...verifiedPurchaseReviewMatch,
    });

    const pagination = paginationHelper({ currentPage: page, limitItems: limit }, req.query, countReviews);

    const reviews = await Review.find({
      product_id: productId,
      deleted: false,
      status: "active",
      ...verifiedPurchaseReviewMatch,
    })
      .sort({ createdAt: -1 })
      .limit(pagination.limitItems)
      .skip(pagination.skip);

    // Lấy thông tin user cho từng review
    const User = require("../../models/user.model");
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

    res.json({
      success: true,
      reviews: reviewsWithUser,
      pagination: pagination,
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

// Hàm cập nhật rating trung bình cho sản phẩm
async function updateProductRating(productId) {
  try {
    const stats = await Review.aggregate([
      {
        $match: {
          product_id: productId,
          deleted: false,
          status: "active",
          ...verifiedPurchaseReviewMatch,
        },
      },
      {
        $group: {
          _id: "$product_id",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      await Product.updateOne(
        { _id: productId },
        {
          ratingAverage: Math.round(stats[0].averageRating * 10) / 10,
          ratingCount: stats[0].totalReviews,
        }
      );
    } else {
      await Product.updateOne(
        { _id: productId },
        {
          ratingAverage: 0,
          ratingCount: 0,
        }
      );
    }
  } catch (error) {
    console.error("Update product rating error:", error);
  }
}

module.exports.updateProductRating = updateProductRating;