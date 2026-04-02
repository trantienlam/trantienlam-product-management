const Cart = require("../../models/cart.model");
const Product = require("../../models/product.model");
const productHelper = require("../../helpers/products");
//[POST] /cart/add/:productsId
module.exports.addPost = async (req, res) => {
  if (!req.user) {
    req.flash("error", "Vui lòng đăng nhập");
    return res.redirect("/user/login");
  }

  const userId = req.user.id;
  const productId = req.params.productId;
  const quantity = parseInt(req.body.quantity);
  const next = req.body.next;

  let cart = await Cart.findOne({ user_id: userId });

  if (!cart) {
    cart = new Cart({
      user_id: userId,
      products: [],
    });
  }

  const existProduct = cart.products.find(
    (item) => item.product_id == productId,
  );

  if (existProduct) {
    existProduct.quantity += quantity;
  } else {
    cart.products.push({
      product_id: productId,
      quantity: quantity,
    });
  }
  await cart.save();
  // 🔥 QUAN TRỌNG NHẤT
  if (next === "checkout") {
    req.flash("success", "Đã thêm sản phẩm. Tiếp tục thanh toán.");
    return res.redirect("/checkout");
  }
  //console.log("USER ORDER:", req.user);

  req.flash("success", "Thêm vào giỏ hàng thành công");
  res.redirect(req.get("Referrer") || "/");
};

//[GET] /cart
module.exports.index = async (req, res) => {
  // ❌ chưa login → giỏ trống
  if (!req.user) {
    return res.render("client/pages/cart/index", {
      pageTitle: "Giỏ hàng",
      cartDetail: {
        products: [],
        totalPriceCart: 0,
        totalPriceCartFormat: "0",
      },
    });
  }

  const userId = req.user.id;
  let cart = await Cart.findOne({ user_id: userId });

  if (!cart) {
    cart = {
      products: [],
    };
  }

  if (cart.products.length > 0) {
    for (const item of cart.products) {
      const productInfo = await Product.findOne({
        _id: item.product_id,
      });

      productInfo.priceNew = productHelper.priceNewProduct(productInfo);
      item.productInfo = productInfo;
      item.totalPrice = item.quantity * productInfo.priceNew;
    }
  }

  cart.totalPriceCart = cart.products.reduce(
    (sum, item) => sum + item.totalPrice,
    0,
  );

  cart.totalPriceCartFormat = cart.totalPriceCart.toLocaleString("vi-VN");

  res.render("client/pages/cart/index", {
    pageTitle: "Giỏ hàng",
    cartDetail: cart,
  });
};

//[GET] /cart/delete/:productId
module.exports.delete = async (req, res) => {
  if (!req.user) return res.redirect("/user/login");

  const userId = req.user.id;
  const productId = req.params.productId;

  await Cart.updateOne(
    { user_id: userId },
    {
      $pull: { products: { product_id: productId } },
    },
  );

  req.flash("success", "Đã xóa sản phẩm");
  res.redirect(req.get("Referrer") || "/");
};

//[GET] /cart/údate/:productId/:quantity
module.exports.update = async (req, res) => {
  if (!req.user) return res.redirect("/user/login");

  const userId = req.user.id;
  const productId = req.params.productId;
  const quantity = parseInt(req.params.quantity);

  await Cart.updateOne(
    {
      user_id: userId,
      "products.product_id": productId,
    },
    {
      "products.$.quantity": quantity,
    },
  );

  req.flash("success", "Cập nhật thành công");
  res.redirect("back");
};
