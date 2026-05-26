const Product = require("../../models/product.model");
const Review = require("../../models/review.model");
const ProductCategory = require("../../models/product-category.model");
const productsHelper = require("../../helpers/products");
const productsCategoryHelper = require("../../helpers/products-category");
const { htmlToPlainExcerpt } = require("../../helpers/html-plain");
// [GET] products
module.exports.index = async (req, res) => {
  const products = await Product.find({
    status: "active",
    deleted: "false",
  }).sort({ position: "desc" });

  const newProducts = productsHelper.priceNewProducts(products);

  res.render("client/pages/products/index", {
    pageTitle: "Tất cả sản phẩm",
    products: newProducts,
    pageType: "all",
  });
};

// [GET] products/:slugProdcut
module.exports.detail = async (req, res) => {
  try {
    const find = {
      deleted: false,
      slug: req.params.slugProduct,
      status: "active",
    };

    const product = await Product.findOne(find);

    if (!product) {
      return res.redirect("/products");
    }

    if (product.product_category_id) {
      const category = await ProductCategory.findOne({
        _id: product.product_category_id,
        status: "active",
        deleted: false,
      });
      product.category = category;
    }

    product.priceNew = productsHelper.priceNewProduct(product);

    let saveAmount = 0;
    if (
      product.discountPercentage > 0 &&
      product.price != null &&
      product.priceNew != null
    ) {
      saveAmount = Math.max(
        0,
        Number(product.price) - Number(product.priceNew),
      );
    }

    const descriptionExcerpt = htmlToPlainExcerpt(product.description, 200);

    // Chỉ hiển thị đánh giá từ người đã mua (có order_id) — kiểu Shopee
    const verifiedReviewQuery = {
      product_id: product._id.toString(),
      deleted: false,
      status: "active",
      order_id: { $exists: true, $nin: [null, ""] },
    };

    const [reviewStats] = await Review.aggregate([
      { $match: verifiedReviewQuery },
      {
        $group: {
          _id: "$product_id",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);
    const verifiedReviewAverage = reviewStats
      ? Math.round(reviewStats.averageRating * 10) / 10
      : 0;
    const verifiedReviewCount = reviewStats ? reviewStats.totalReviews : 0;

    const reviews = await Review.find(verifiedReviewQuery)
      .sort({ createdAt: -1 })
      .limit(3);

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

    // Sản phẩm liên quan: cùng danh mục (trừ sản phẩm hiện tại)
    let relatedProducts = [];
    if (product.product_category_id) {
      const related = await Product.find({
        deleted: false,
        status: "active",
        product_category_id: product.product_category_id,
        _id: { $ne: product._id },
      })
        .sort({ position: "desc" })
        .limit(12);
      relatedProducts = productsHelper.priceNewProducts(related);
    }

    res.render("client/pages/products/detail", {
      pageTitle: product.title,
      product: product,
      relatedProducts: relatedProducts,
      saveAmount,
      descriptionExcerpt,
      reviews: reviewsWithUser,
      verifiedReviewAverage,
      verifiedReviewCount,
    });
  } catch (error) {
    console.error("Product detail error:", error);
    res.redirect("/products");
  }
};

// [GET] products/:slugCategory
module.exports.category = async (req, res) => {
  const category = await ProductCategory.findOne({
    slug: req.params.slugCategory,
    status: "active",
    deleted: false,
  });
  if (!category) {
    return res.status(404).render("client/pages/errors/404", {
      pageTitle: "Danh mục không tồn tại",
    });
  }
  const listSubCategory = await productsCategoryHelper.getSubCategory(
    category.id,
  );

  const listSubCategoryId = listSubCategory.map((item) => item.id);

  const products = await Product.find({
    product_category_id: { $in: [category.id, ...listSubCategoryId] },
    deleted: false,
    status: "active",
  }).sort({ position: "desc" });
  const newProducts = productsHelper.priceNewProducts(products);
  const categoryDescriptionExcerpt = htmlToPlainExcerpt(
    category.description,
    220,
  );
  res.render("client/pages/products/index", {
    pageTitle: category.title,
    products: newProducts,
    category,
    categoryDescriptionExcerpt,
    pageType: "category",
  });
};
