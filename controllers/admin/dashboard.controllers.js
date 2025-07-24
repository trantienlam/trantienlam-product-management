const Product = require("../../models/product.model");

// [GET] /admin/dashboard
module.exports.dashboard = async (req, res) => {
  let find = {
    deleted: false,
  };

  const products = await Product.find(find);
  res.render("admin/pages/dashboard/index", {
    pageTitle: "Trang chủ",
    products: products,
  });
};
