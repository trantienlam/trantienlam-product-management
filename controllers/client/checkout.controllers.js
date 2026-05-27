const Cart = require("../../models/cart.model");
const Product = require("../../models/product.model");
const Order = require("../../models/order.model");
const Voucher = require("../../models/voucher.model");
const productHelper = require("../../helpers/products");

//[GET] /checkout/
module.exports.index = async (req, res) => {
  if (!req.user) {
    return res.redirect("/user/login");
  }

  const userId = req.user._id;

  // Không có ?buyNow=1 → bỏ session "mua ngay" cũ, hiển thị giỏ bình thường
  if (req.query.buyNow !== "1" && req.session.checkoutBuyNow) {
    delete req.session.checkoutBuyNow;
  }

  // Mua ngay: chỉ 1 dòng, không lấy giỏ DB
  if (
    req.query.buyNow === "1" &&
    req.session.checkoutBuyNow &&
    req.session.checkoutBuyNow.product_id
  ) {
    const { product_id, quantity } = req.session.checkoutBuyNow;
    const productInfo = await Product.findOne({
      _id: product_id,
      deleted: false,
      status: "active",
    });
    if (!productInfo) {
      delete req.session.checkoutBuyNow;
      req.flash("error", "Sản phẩm không còn bán.");
      return res.redirect("/products");
    }
    let qty = Math.max(1, parseInt(quantity, 10) || 1);
    if (qty > productInfo.stock) {
      qty = productInfo.stock;
    }
    if (qty < 1) {
      delete req.session.checkoutBuyNow;
      req.flash("error", "Sản phẩm hết hàng.");
      return res.redirect(req.get("Referrer") || "/products");
    }
    req.session.checkoutBuyNow.quantity = qty;

    productInfo.priceNew = productHelper.priceNewProduct(productInfo);
    const lineTotal = qty * productInfo.priceNew;
    const cart = {
      user_id: userId,
      products: [
        {
          product_id: productInfo._id,
          quantity: qty,
          productInfo,
          totalPrice: lineTotal,
        },
      ],
      totalPriceCart: lineTotal,
      totalPriceCartFormat: lineTotal.toLocaleString("vi-VN"),
    };

    return res.render("client/pages/checkout/index", {
      pageTitle: "Đặt hàng",
      cartDetail: cart,
      isBuyNow: true,
    });
  }

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
    isBuyNow: false,
  });
};

//[POST] /checkout/order
module.exports.order = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/user/login");
    }

    const userId = req.user._id;
    const { fullName, phone, address, paymentMethod, voucherCodeHidden, voucherDiscount } = req.body;

    // Parse voucher info
    const voucherDiscountAmount = parseInt(voucherDiscount) || 0;
    const voucherCode = voucherCodeHidden || "";

    const buyNowPayload = req.session.checkoutBuyNow;

    // ============ MUA NGAY ============
    if (buyNowPayload && buyNowPayload.product_id) {
      const { product_id, quantity } = buyNowPayload;
      const productInfo = await Product.findOne({
        _id: product_id,
        deleted: false,
        status: "active",
      });
      if (!productInfo) {
        delete req.session.checkoutBuyNow;
        req.flash("error", "Sản phẩm không tồn tại.");
        return res.redirect("/checkout");
      }
      const priceNew = productHelper.priceNewProduct(productInfo);
      const qty = parseInt(quantity, 10);
      if (qty < 1 || qty > productInfo.stock) {
        req.flash("error", "Số lượng không hợp lệ.");
        return res.redirect("/checkout?buyNow=1");
      }

      const lineTotal = priceNew * qty;
      let finalAmount = lineTotal - voucherDiscountAmount;
      if (finalAmount < 0) finalAmount = 0;

      const products = [
        {
          product_id: productInfo._id,
          price: productInfo.price,
          discountPercentage: productInfo.discountPercentage,
          quantity: qty,
          totalPrice: lineTotal,
        },
      ];

      await Product.updateOne(
        { _id: product_id },
        { $inc: { stock: -qty } },
      );

      const orderData = {
        user_id: userId,
        userInfo: { fullName, phone, address },
        products,
        amount: finalAmount,
        paymentMethod: paymentMethod || "cod",
        status: "pending",
        paymentStatus: paymentMethod === "vnpay" ? "paid" : "unpaid",
        buyNow: true,
      };

      // Xử lý voucher
      if (voucherCode && voucherDiscountAmount > 0) {
        orderData.voucher = { code: voucherCode };
        orderData.discountAmount = voucherDiscountAmount;

        const voucherInfo = await Voucher.findOne({ code: voucherCode });
        if (voucherInfo) {
          orderData.voucher.name = voucherInfo.name;
          orderData.voucher.type = voucherInfo.type;
          orderData.voucher.value = voucherInfo.value;
          orderData.voucher.discount = voucherDiscountAmount;
        }

        await Voucher.updateOne(
          { code: voucherCode },
          { $inc: { usedCount: 1 } }
        );
      }

      const order = new Order(orderData);
      await order.save();
      delete req.session.checkoutBuyNow;

      if (paymentMethod === "cod") {
        req.flash("success", "Đặt hàng thành công!");
        return res.redirect(`/checkout/success/${order._id}`);
      }

      res.redirect(`/payment/create?orderId=${order._id}&amount=${finalAmount}`);
      return;
    }

    // ============ ĐẶT TỪ GIỎ HÀNG ============
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

    let finalAmount = totalPrice - voucherDiscountAmount;
    if (finalAmount < 0) finalAmount = 0;

    const orderData = {
      user_id: userId,
      userInfo: { fullName, phone, address },
      products: products,
      amount: finalAmount,
      paymentMethod: paymentMethod || "cod",
      status: "pending",
      paymentStatus: paymentMethod === "vnpay" ? "paid" : "unpaid",
      buyNow: false,
    };

    // Xử lý voucher
    if (voucherCode && voucherDiscountAmount > 0) {
      orderData.voucher = { code: voucherCode };
      orderData.discountAmount = voucherDiscountAmount;

      const voucherInfo = await Voucher.findOne({ code: voucherCode });
      if (voucherInfo) {
        orderData.voucher.name = voucherInfo.name;
        orderData.voucher.type = voucherInfo.type;
        orderData.voucher.value = voucherInfo.value;
        orderData.voucher.discount = voucherDiscountAmount;
      }

      await Voucher.updateOne(
        { code: voucherCode },
        { $inc: { usedCount: 1 } }
      );
    }

    const order = new Order(orderData);
    await order.save();

    // COD: clear cart immediately
    if (paymentMethod === "cod") {
      await Cart.updateOne({ user_id: userId }, { products: [] });
      req.flash("success", "Đặt hàng thành công!");
      return res.redirect(`/checkout/success/${order._id}`);
    }

    // VNPAY: redirect to payment với số tiền đã giảm
    res.redirect(`/payment/create?orderId=${order._id}&amount=${finalAmount}`);
  } catch (error) {
    console.error("[Checkout Order] Error:", error);
    req.flash("error", "Lỗi đặt hàng");
    res.redirect("/checkout");
  }
};

//[GET] /checkout/success/:id

module.exports.success = async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.orderId,
  });

  if (!order) {
    req.flash("error", "Không tìm thấy đơn hàng");
    return res.redirect("/");
  }

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

  const finalAmount =
    (order.amount || 0) - (order.discountAmount || 0);

  const isVnpay = order.paymentMethod === "vnpay";
  const isCod = order.paymentMethod === "cod";

  res.render("client/pages/checkout/success", {
    pageTitle: isVnpay ? "Thanh toán thành công" : "Đặt hàng thành công",
    order,
    finalAmount,
    isVnpay,
    isCod,
  });
};
