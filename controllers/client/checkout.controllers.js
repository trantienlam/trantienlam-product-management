const Cart = require("../../models/cart.model");
const Product = require("../../models/product.model");
const Order = require("../../models/order.model");
const productHelper = require("../../helpers/products");

//[GET] /checkout/
module.exports.index = async (req, res) => {
  const cartId = req.cookies.cartId;
  const cart = await Cart.findOne({
    _id: cartId,
  });

  if (cart.products.length > 0) {
    for (const item of cart.products) {
      const productId = item.product_id;
      const productInfo = await Product.findOne({
        _id: productId,
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
  res.render("client/pages/checkout/index", {
    pageTitle: "Đặt hàng",
    cartDetail: cart,
  });
};

//[POST] /checkout/order
module.exports.order = async (req, res) => {
  const cartId = req.cookies.cartId;
  const userInfo = req.body;

  const cart = await Cart.findOne({ _id: cartId });

  let products = [];
  let totalPrice = 0; // 🔥 thêm

  for (const product of cart.products) {
    const productInfo = await Product.findOne({
      _id: product.product_id,
    });

    const priceNew = productHelper.priceNewProduct(productInfo);

    const objectProduct = {
      product_id: product.product_id,
      price: productInfo.price,
      discountPercentage: productInfo.discountPercentage,
      quantity: product.quantity,
      totalPrice: priceNew * product.quantity, // 🔥 thêm
    };

    // 🔥 cộng tổng tiền
    totalPrice += objectProduct.totalPrice;

    await Product.updateOne(
      { _id: product.product_id },
      {
        $inc: { stock: -product.quantity },
      },
    );

    products.push(objectProduct);
  }

  // 🔥 FIX CHÍNH Ở ĐÂY
  const objectOrder = {
    cart_id: cartId,
    userInfo: userInfo,
    products: products,
    amount: totalPrice, // ✅ THÊM DÒNG NÀY
    paymentMethod: userInfo.paymentMethod || "cod", // thêm luôn
    status: "pending",
  };

  const order = new Order(objectOrder);
  await order.save();

  await Cart.updateOne({ _id: cartId }, { products: [] });

  // 🔥 nếu dùng VNPAY
  if (userInfo.paymentMethod === "vnpay") {
    return res.redirect(`/payment/create?orderId=${order._id}`);
  }

  res.redirect(`/checkout/success/${order.id}`);
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
