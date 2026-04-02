const Cart = require("../../models/cart.model");
const Product = require("../../models/product.model");
const Order = require("../../models/order.model");
const productHelper = require("../../helpers/products");

//[GET] /checkout/
module.exports.index = async (req, res) => {
  if (!req.user) {
    return res.redirect("/user/login");
  }

  const userId = req.user._id;

  // 🔥 luôn có cart
  let cart = await Cart.findOne({ user_id: userId });

  if (!cart) {
    cart = await Cart.create({
      user_id: userId,
      products: [],
    });
  }

  // 🔥 lấy danh sách product 1 lần (tối ưu)
  const productIds = cart.products.map((p) => p.product_id);

  const products = await Product.find({
    _id: { $in: productIds },
  });

  const productMap = {};
  products.forEach((p) => {
    productMap[p._id.toString()] = p;
  });

  // 🔥 gán dữ liệu
  for (const item of cart.products) {
    const productInfo = productMap[item.product_id.toString()];

    if (!productInfo) continue;

    productInfo.priceNew = productHelper.priceNewProduct(productInfo);

    item.productInfo = productInfo;
    item.totalPrice = item.quantity * productInfo.priceNew;
  }

  // 🔥 tổng tiền
  cart.totalPriceCart = cart.products.reduce(
    (sum, item) => sum + (item.totalPrice || 0),
    0,
  );

  cart.totalPriceCartFormat = cart.totalPriceCart.toLocaleString("vi-VN");

  res.render("client/pages/checkout/index", {
    pageTitle: "Đặt hàng",
    cartDetail: cart,
  });
};

//[POST] /checkout/order
module.exports.order = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/user/login");
    }

    const userId = req.user._id;
    const { fullName, phone, address, paymentMethod } = req.body;

    const cart = await Cart.findOne({ user_id: userId });

    if (!cart || cart.products.length === 0) {
      req.flash("error", "Giỏ hàng trống");
      return res.redirect("/cart");
    }

    const products = [];
    let totalPrice = 0;

    for (const item of cart.products) {
      const productInfo = await Product.findOne({ _id: item.product_id });
      if (!productInfo) continue;

      const priceNew = productHelper.priceNewProduct(productInfo);

      const objectProduct = {
        product_id: item.product_id,
        price: productInfo.price,
        discountPercentage: productInfo.discountPercentage,
        quantity: item.quantity,
        totalPrice: priceNew * item.quantity,
      };

      totalPrice += objectProduct.totalPrice;

      await Product.updateOne(
        { _id: item.product_id },
        { $inc: { stock: -item.quantity } }
      );

      products.push(objectProduct);
    }

    const order = new Order({
      user_id: userId,
      userInfo: { fullName, phone, address },
      products: products,
      amount: totalPrice,
      paymentMethod: paymentMethod || "cod",
      status: "pending",
      paymentStatus: paymentMethod === "vnpay" ? "paid" : "unpaid",
    });

    await order.save();

    // COD: clear cart immediately
    if (paymentMethod === "cod") {
      await Cart.updateOne({ user_id: userId }, { products: [] });
      req.flash("success", "Đặt hàng thành công!");
      return res.redirect(`/checkout/success/${order._id}`);
    }

    // VNPAY: redirect to payment
    res.redirect(`/payment/create?orderId=${order._id}&amount=${totalPrice}`);
  } catch (error) {
    console.error("[Checkout Order] Error:", error);
    req.flash("error", "Lỗi đặt hàng");
    res.redirect("/checkout");
  }
};

//[GET] /checkout/success/:id

module.exports.success = async (req, res) => {
  //console.log(req.params.orderId);

  const order = await Order.findOne({
    _id: req.params.orderId,
  });
  //  console.log(order);
  for (const product of order.products) {
    const productInfo = await Product.findOne({
      _id: product.product_id,
    }).select("title thumbnail");

    product.productInfo = productInfo;
    product.priceNew = productHelper.priceNewProduct(product);

    product.totalPrice = product.priceNew * product.quantity;
  }

  order.totalPrice = order.products.reduce(
    (sum, item) => sum + item.totalPrice,
    0,
  );

  // console.log(order);
  res.render("client/pages/checkout/success", {
    pageTitle: "Đặt hàng thành công",
    order: order,
  });
};
