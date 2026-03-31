const moment = require("moment");
const qs = require("qs");
const crypto = require("crypto");

const Order = require("../../models/order.model");
const Cart = require("../../models/cart.model");
const Product = require("../../models/product.model");
const Payment = require("../../models/payment.model");

// ================= HELPER =================
function sortObject(obj) {
  let sorted = {};
  let keys = Object.keys(obj).sort();

  keys.forEach((key) => {
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
  });

  return sorted;
}

// ================= HANDLE ORDER =================
module.exports.handleOrder = async (req, res) => {
  try {
    const { paymentMethod, fullName, phone, address } = req.body;

    const cart = await Cart.findById(req.cookies.cartId);

    if (!cart || cart.products.length === 0) {
      return res.send("Giỏ hàng trống");
    }

    // 🔥 LẤY GIÁ TỪ PRODUCT (KHÔNG BỊ NaN)
    const products = [];
    let totalAmount = 0;

    for (const item of cart.products) {
      const product = await Product.findById(item.product_id);
      if (!product) continue;

      const price = product.price; // ✅ KHÔNG ép Number
      const quantity = item.quantity;

      products.push({
        product_id: product._id,
        price: price,
        quantity: quantity,
        totalPrice: price * quantity,
      });

      totalAmount += price * quantity;
    }

    if (!totalAmount) {
      return res.send("Lỗi tính tiền");
    }

    // 🔥 TẠO ORDER
    const order = await Order.create({
      amount: totalAmount,
      status: paymentMethod === "cod" ? "confirmed" : "pending",
      paymentMethod: paymentMethod,
      products: products,
      cart_id: cart._id, // ✅ THÊM

      userInfo: {
        fullName: fullName,
        phone: phone,
        address: address,
      },
    });

    // 🔥 TẠO PAYMENT
    await Payment.create({
      order_id: order._id,
      amount: totalAmount,
      status: "pending",
      paymentMethod: paymentMethod,
    });

    // ===== COD =====
    if (paymentMethod === "cod") {
      cart.products = [];
      await cart.save();

      return res.redirect(`/checkout/success/${order._id}`);
    }

    // ===== VNPAY =====
    req.body.amount = totalAmount;
    req.body.orderId = order._id;

    return module.exports.createPayment(req, res);
  } catch (error) {
    console.log(error);
    res.send("Lỗi đặt hàng");
  }
};

// ================= CREATE PAYMENT =================
module.exports.createPayment = async (req, res) => {
  try {
    const createDate = moment().format("YYYYMMDDHHmmss");

    const orderId = req.body.orderId;

    let vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: process.env.VNP_TMNCODE,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId,
      vnp_OrderInfo: "Thanh toan don hang: " + orderId,
      vnp_OrderType: "other",
      vnp_Amount: req.body.amount * 100, // ✅ đúng chuẩn VNPAY
      vnp_ReturnUrl: process.env.VNP_RETURN_URL,
      vnp_IpAddr: req.ip || "127.0.0.1",
      vnp_CreateDate: createDate,
    };

    vnp_Params = sortObject(vnp_Params);

    const signData = qs.stringify(vnp_Params, { encode: false });

    const signed = crypto
      .createHmac("sha512", process.env.VNP_HASH_SECRET)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    vnp_Params["vnp_SecureHash"] = signed;

    const vnpUrl =
      process.env.VNP_URL + "?" + qs.stringify(vnp_Params, { encode: false });

    return res.redirect(vnpUrl);
  } catch (error) {
    console.log(error);
    res.send("Lỗi payment");
  }
};

// ================= IPN =================
module.exports.vnpayIpn = async (req, res) => {
  try {
    let vnp_Params = req.query;
    let secureHash = vnp_Params["vnp_SecureHash"];

    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    vnp_Params = sortObject(vnp_Params);

    const signData = qs.stringify(vnp_Params, { encode: false });

    const signed = crypto
      .createHmac("sha512", process.env.VNP_HASH_SECRET)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    if (secureHash === signed) {
      const orderId = vnp_Params["vnp_TxnRef"];
      const rspCode = vnp_Params["vnp_ResponseCode"];

      const order = await Order.findById(orderId);
      const payment = await Payment.findOne({ order_id: orderId });

      if (!order || !payment) {
        return res.json({ RspCode: "01", Message: "Not found" });
      }

      if (rspCode === "00") {
        order.status = "completed";
        payment.status = "paid";

        // 🔥 XÓA GIỎ HÀNG SAU THANH TOÁN
        const cart = await Cart.findById(order.cart_id);
        if (cart) {
          cart.products = [];
          await cart.save();
        }
      } else {
        order.status = "failed";
        payment.status = "failed";
      }

      await order.save();
      await payment.save();

      return res.json({ RspCode: "00", Message: "Success" });
    }

    return res.json({ RspCode: "97", Message: "Checksum fail" });
  } catch (error) {
    console.log(error);
    res.json({ RspCode: "99", Message: "Error" });
  }
};
// ================= RETURN =================
module.exports.vnpayReturn = (req, res) => {
  try {
    let vnp_Params = req.query;

    let secureHash = vnp_Params["vnp_SecureHash"];

    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    vnp_Params = sortObject(vnp_Params);

    const signData = qs.stringify(vnp_Params, { encode: false });

    const signed = crypto
      .createHmac("sha512", process.env.VNP_HASH_SECRET)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    let status = "fail";

    if (secureHash === signed && vnp_Params["vnp_ResponseCode"] === "00") {
      status = "success";
    }

    return res.render("client/payment/result", {
      status: status,
      data: vnp_Params,
    });
  } catch (error) {
    console.log(error);
    res.send("Lỗi return VNPAY");
  }
};
