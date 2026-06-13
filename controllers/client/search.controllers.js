const Product = require("../../models/product.model");
const productsHelper = require("../../helpers/products");

// Escape special regex characters to prevent invalid regex errors
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// [GET] /search
module.exports.index = async (req, res) => {
  const keyword = (req.query.keyword || "").trim();

  let newProducts = [];

  if (keyword) {
    // Tách từ khóa thành các từ riêng (theo khoảng trắng / dấu)
    // Loại bỏ khoảng trắng thừa, chuyển về chữ thường
    const words = keyword
      .toLowerCase()
      .split(/[\s\-–—_,.+*\/\\]+/)
      .filter((w) => w.length > 0);

    if (words.length > 0) {
      // Tạo regex AND: mỗi từ phải xuất hiện trong title
      // Ví dụ: "đá mài CNC" → /đá/i + /mài/i + /cnc/i
      // Escape special regex characters in each word to prevent invalid regex errors
      const regexParts = words.map((w) => new RegExp(escapeRegex(w), "i"));

      const products = await Product.find({
        $and: regexParts.map((r) => ({ title: r })),
        status: "active",
        deleted: false,
      });

      newProducts = productsHelper.priceNewProducts(products);
    }
  }

  res.render("client/pages/search/index", {
    pageTitle: "Kết quả tìm kiếm",
    keyword: keyword,
    products: newProducts,
  });
};
