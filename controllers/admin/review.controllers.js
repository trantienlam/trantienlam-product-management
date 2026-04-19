const Review = require("../../models/review.model");
const Product = require("../../models/product.model");
const User = require("../../models/user.model");
const systemConfig = require("../../config/system");
const paginationHelper = require("../../helpers/pagination");
const { updateProductRating } = require("../client/review.controllers");

// [GET] /admin/reviews
module.exports.index = async (req, res) => {
  try {
    const permissions = res.locals.role ? res.locals.role.permission : [];
    if (!permissions.includes("reviews_view")) {
      req.flash("error", "Bạn không có quyền xem đánh giá!");
      return res.redirect(`${systemConfig.prefixAdmin}/dashboard`);
    }

    const find = { deleted: false };
    if (req.query.status === "active" || req.query.status === "hidden") {
      find.status = req.query.status;
    }

    const countReviews = await Review.countDocuments(find);
    const objectPagination = paginationHelper(
      { currentPage: 1, limitItems: 15 },
      req.query,
      countReviews,
    );

    const raw = await Review.find(find)
      .sort({ createdAt: -1 })
      .skip(objectPagination.skip)
      .limit(objectPagination.limitItems);

    const reviews = [];
    for (const r of raw) {
      const obj = r.toObject();
      const product = await Product.findById(r.product_id).select("title thumbnail");
      const user = await User.findById(r.user_id).select("fullName");
      reviews.push({
        ...obj,
        productTitle: product ? product.title : "—",
        productThumb: product ? product.thumbnail : null,
        userName: user ? user.fullName : "—",
      });
    }

    const filterQuery =
      req.query.status === "active" || req.query.status === "hidden"
        ? `&status=${encodeURIComponent(req.query.status)}`
        : "";

    res.render("admin/pages/reviews/index", {
      pageTitle: "Quản lý đánh giá sản phẩm",
      reviews,
      pagination: objectPagination,
      filterStatus: req.query.status || "",
      filterQuery,
    });
  } catch (error) {
    console.error("admin reviews index:", error);
    req.flash("error", "Có lỗi khi tải danh sách đánh giá!");
    res.redirect(`${systemConfig.prefixAdmin}/dashboard`);
  }
};

// [PATCH] /admin/reviews/status/:id
module.exports.patchStatus = async (req, res) => {
  const permissions = res.locals.role ? res.locals.role.permission : [];
  if (!permissions.includes("reviews_edit")) {
    req.flash("error", "Bạn không có quyền chỉnh sửa đánh giá!");
    return res.redirect("back");
  }

  const { status } = req.body;
  const id = req.params.id;
  if (!["active", "hidden"].includes(status)) {
    req.flash("error", "Trạng thái không hợp lệ!");
    return res.redirect("back");
  }

  const review = await Review.findOne({ _id: id, deleted: false });
  if (!review) {
    req.flash("error", "Không tìm thấy đánh giá!");
    return res.redirect("back");
  }

  await Review.updateOne({ _id: id }, { status });
  await updateProductRating(review.product_id);

  req.flash("success", "Đã cập nhật trạng thái đánh giá!");
  res.redirect("back");
};

// [DELETE] /admin/reviews/delete/:id
module.exports.deleteItem = async (req, res) => {
  const permissions = res.locals.role ? res.locals.role.permission : [];
  if (!permissions.includes("reviews_edit")) {
    req.flash("error", "Bạn không có quyền xóa đánh giá!");
    return res.redirect("back");
  }

  const id = req.params.id;
  const review = await Review.findOne({ _id: id, deleted: false });
  if (!review) {
    req.flash("error", "Không tìm thấy đánh giá!");
    return res.redirect("back");
  }

  const accountId = res.locals.user && res.locals.user._id
    ? String(res.locals.user._id)
    : "";

  await Review.updateOne(
    { _id: id },
    {
      deleted: true,
      deletedBy: {
        account_id: accountId,
        deletedAt: new Date(),
      },
    },
  );
  await updateProductRating(review.product_id);

  req.flash("success", "Đã xóa đánh giá!");
  res.redirect("back");
};
