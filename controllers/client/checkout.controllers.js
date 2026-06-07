const Cart = require("../../models/cart.model");
const Product = require("../../models/product.model");
const Order = require("../../models/order.model");
const Voucher = require("../../models/voucher.model");
const productHelper = require("../../helpers/products");

function normalizeSelectedProducts(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(String).map((v) => v.trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

// Helper function để xây dựng cart data cho checkout page
async function buildCheckoutCartData(userId, req, selectedProductsFromBody, isValidationError) {
  const buyNowPayload = req.session.checkoutBuyNow;

  // Mua ngay: chỉ 1 dòng, không lấy giỏ DB
  if (buyNowPayload && buyNowPayload.product_id) {
    const { product_id, quantity } = buyNowPayload;
    const productInfo = await Product.findOne({
      _id: product_id,
      deleted: false,
      status: "active",
    });
    if (!productInfo) {
      delete req.session.checkoutBuyNow;
      return null;
    }
    let qty = Math.max(1, parseInt(quantity, 10) || 1);
    if (qty > productInfo.stock) qty = productInfo.stock;
    if (qty < 1) {
      delete req.session.checkoutBuyNow;
      return null;
    }
    req.session.checkoutBuyNow.quantity = qty;

    productInfo.priceNew = productHelper.priceNewProduct(productInfo);
    const lineTotal = qty * productInfo.priceNew;
    return {
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
      isBuyNow: true,
    };
  }

  // Lấy cart từ DB
  let cart = await Cart.findOne({ user_id: userId });
  if (!cart) {
    cart = await Cart.create({
      user_id: userId,
      products: [],
    });
  }

  // Lấy danh sách product
  const productIds = cart.products.map((p) => p.product_id);
  const products = await Product.find({
    _id: { $in: productIds },
    deleted: false,
    status: "active",
  });

  const productMap = {};
  products.forEach((p) => {
    productMap[p._id.toString()] = p;
  });

  // Gán dữ liệu
  for (const item of cart.products) {
    const productInfo = productMap[item.product_id.toString()];
    if (!productInfo) continue;
    productInfo.priceNew = productHelper.priceNewProduct(productInfo);
    item.productInfo = productInfo;
    item.totalPrice = item.quantity * productInfo.priceNew;
  }

  // Khi validate thất bại hoặc không có selectedProducts, giữ nguyên giỏ hàng
  const selectedProductIds = selectedProductsFromBody || [];
  
  if (selectedProductIds.length > 0 && !isValidationError) {
    // Chỉ filter khi đến từ query param (chọn sản phẩm từ giỏ hàng)
    cart.products = cart.products.filter((item) =>
      selectedProductIds.includes(String(item.product_id)),
    );
    if (cart.products.length === 0) {
      return { error: "Vui lòng chọn ít nhất 1 sản phẩm để thanh toán.", redirectTo: "/cart" };
    }
  }

  cart.totalPriceCart = cart.products.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  cart.totalPriceCartFormat = cart.totalPriceCart.toLocaleString("vi-VN");

  return {
    user_id: userId,
    products: cart.products,
    totalPriceCart: cart.totalPriceCart,
    totalPriceCartFormat: cart.totalPriceCartFormat,
    isBuyNow: false,
    selectedProducts: selectedProductIds,
  };
}

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
  const selectedProductIds = normalizeSelectedProducts(req.query.selectedProducts);
  const fromCartSelection = req.query.fromCartSelection === "1";
  if (fromCartSelection && selectedProductIds.length === 0) {
    req.flash("error", "Vui lòng chọn ít nhất 1 sản phẩm để thanh toán.");
    return res.redirect("/cart");
  }
  if (selectedProductIds.length > 0) {
    cart.products = cart.products.filter((item) =>
      selectedProductIds.includes(String(item.product_id)),
    );
    if (cart.products.length === 0) {
      req.flash("error", "Vui lòng chọn ít nhất 1 sản phẩm để thanh toán.");
      return res.redirect("/cart");
    }
  }

  cart.totalPriceCart = cart.products.reduce(
    (sum, item) => sum + (item.totalPrice || 0),
    0,
  );

  cart.totalPriceCartFormat = cart.totalPriceCart.toLocaleString("vi-VN");

  res.render("client/pages/checkout/index", {
    pageTitle: "Đặt hàng",
    cartDetail: cart,
    isBuyNow: false,
    selectedProducts: selectedProductIds,
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
    const selectedProductIds = normalizeSelectedProducts(req.body.selectedProducts);

    // Build formData to preserve on errors
    const formData = { fullName, phone, address, paymentMethod };

    // Validate phone number (must be exactly 10 digits, starting with 0)
    const phoneRegex = /^0\d{9}$/;
    if (!phone || !phoneRegex.test(phone.trim())) {
      req.flash("error", "Số điện thoại phải gồm 10 số và bắt đầu bằng số 0.");
      const cartData = await buildCheckoutCartData(userId, req, selectedProductIds, true);
      if (cartData && cartData.error) {
        return res.redirect(cartData.redirectTo);
      }
      return res.render("client/pages/checkout/index", {
        pageTitle: "Đặt hàng",
        cartDetail: cartData,
        isBuyNow: cartData.isBuyNow,
        selectedProducts: cartData.selectedProducts || [],
        formData,
      });
    }

    // Validate required fields
    if (!fullName || fullName.trim().length < 2) {
      req.flash("error", "Vui lòng nhập họ tên hợp lệ (ít nhất 2 ký tự).");
      const cartData = await buildCheckoutCartData(userId, req, selectedProductIds, true);
      if (cartData && cartData.error) {
        return res.redirect(cartData.redirectTo);
      }
      return res.render("client/pages/checkout/index", {
        pageTitle: "Đặt hàng",
        cartDetail: cartData,
        isBuyNow: cartData.isBuyNow,
        selectedProducts: cartData.selectedProducts || [],
        formData,
      });
    }

    if (!address || address.trim().length < 10) {
      req.flash("error", "Vui lòng nhập địa chỉ đầy đủ (ít nhất 10 ký tự).");
      const cartData = await buildCheckoutCartData(userId, req, selectedProductIds, true);
      if (cartData && cartData.error) {
        return res.redirect(cartData.redirectTo);
      }
      return res.render("client/pages/checkout/index", {
        pageTitle: "Đặt hàng",
        cartDetail: cartData,
        isBuyNow: cartData.isBuyNow,
        selectedProducts: cartData.selectedProducts || [],
        formData,
      });
    }

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
      if (
        selectedProductIds.length > 0 &&
        !selectedProductIds.includes(String(item.product_id))
      ) {
        continue;
      }

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

    if (products.length === 0) {
      req.flash("error", "Vui lòng chọn ít nhất 1 sản phẩm để thanh toán.");
      return res.redirect("/cart");
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
      await Cart.updateOne(
        { user_id: userId },
        {
          $pull: {
            products: {
              product_id: { $in: products.map((item) => String(item.product_id)) },
            },
          },
        },
      );
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
