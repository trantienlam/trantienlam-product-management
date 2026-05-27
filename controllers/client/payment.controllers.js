const moment = require("moment");
const qs = require("qs");
const crypto = require("crypto");

const Order = require("../../models/order.model");
const Cart = require("../../models/cart.model");
const Product = require("../../models/product.model");
const Payment = require("../../models/payment.model");
const productHelper = require("../../helpers/products");
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
    if (!req.user) {
      return res.redirect("/user/login");
    }

    const userId = req.user._id;
    const { paymentMethod, fullName, phone, address } = req.body;

    const cart = await Cart.findOne({ user_id: userId });

    if (!cart || cart.products.length === 0) {
      req.flash("error", "Giỏ hàng trống");
      return res.redirect("/cart");
    }

    const products = [];
    let totalAmount = 0;

    for (const item of cart.products) {
      const product = await Product.findById(item.product_id);
      if (!product) continue;

      const priceNew = productHelper.priceNewProduct(product);
      const quantity = item.quantity;

      products.push({
        product_id: product._id,
        price: product.price,
        discountPercentage: product.discountPercentage,
        priceNew: priceNew,
        quantity: quantity,
        totalPrice: priceNew * quantity,
      });

      totalAmount += priceNew * quantity;

      // Trừ stock ngay khi đặt hàng
      await Product.updateOne(
        { _id: product._id },
        { $inc: { stock: -quantity } }
      );
    }

    if (!totalAmount) {
      req.flash("error", "Lỗi tính tiền");
      return res.redirect("/cart");
    }

    const order = await Order.create({
      user_id: userId,
      amount: totalAmount,
      status: "pending",
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === "vnpay" ? "paid" : "unpaid",
      products: products,
      userInfo: {
        fullName,
        phone,
        address,
      },
    });

    await Payment.create({
      order_id: order._id,
      amount: totalAmount,
      status: "pending",
      paymentMethod: paymentMethod,
    });

    // ===== COD =====
    if (paymentMethod === "cod") {
      await Cart.updateOne({ user_id: userId }, { products: [] });
      req.flash("success", "Đặt hàng thành công!");
      return res.redirect(`/checkout/success/${order._id}`);
    }

    // ===== VNPAY =====
    req.body.amount = totalAmount;
    req.body.orderId = order._id;

    return module.exports.createPayment(req, res);
  } catch (error) {
    console.log(error);
    req.flash("error", "Lỗi đặt hàng");
    res.redirect("/checkout");
  }
};
// ================= CREATE PAYMENT =================
module.exports.createPayment = async (req, res) => {
  try {
    const createDate = moment().format("YYYYMMDDHHmmss");

    const orderId = req.query.orderId || req.body.orderId;
    const amount = req.query.amount || req.body.amount;

    if (!orderId || !amount) {
      req.flash("error", "Thông tin thanh toán không hợp lệ");
      return res.redirect("/checkout");
    }

    const order = await Order.findById(orderId);
    if (!order) {
      req.flash("error", "Đơn hàng không tồn tại");
      return res.redirect("/checkout");
    }

    let vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: process.env.VNP_TMNCODE,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId,
      vnp_OrderInfo: "Thanh toan don hang: " + orderId,
      vnp_OrderType: "other",
      vnp_Amount: amount * 100,
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
    console.error("[Create Payment] Error:", error);
    req.flash("error", "Lỗi tạo thanh toán");
    res.redirect("/checkout");
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
        return res.json({ RspCode: "01", Message: "Order not found" });
      }

      if (order.status === "completed" && payment.status === "paid") {
        return res.json({ RspCode: "00", Message: "Already confirmed" });
      }

      if (rspCode === "00") {
        order.status = "processing";
        payment.status = "paid";
        payment.transactionNo = vnp_Params["vnp_TransactionNo"];
        payment.bankCode = vnp_Params["vnp_BankCode"];
      } else {
        order.status = "failed";
        payment.status = "failed";

        // Hoàn lại stock nếu thanh toán thất bại
        for (const item of order.products) {
          await Product.updateOne(
            { _id: item.product_id },
            { $inc: { stock: item.quantity } }
          );
        }
      }

      await order.save();
      await payment.save();

      return res.json({ RspCode: "00", Message: "Confirm Success" });
    }

    return res.json({ RspCode: "97", Message: "Checksum failed" });
  } catch (error) {
    console.error("[VNPAY IPN] Error:", error);
    res.json({ RspCode: "99", Message: "Unknown error" });
  }
};
// ================= RETURN =================
module.exports.vnpayReturn = async (req, res) => {
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

    let orderId = vnp_Params["vnp_TxnRef"];

    if (secureHash === signed && vnp_Params["vnp_ResponseCode"] === "00") {
      const order = await Order.findById(orderId);
      if (order) {
        order.status = "processing";
        order.paymentStatus = "paid";
        await order.save();

        const payment = await Payment.findOne({ order_id: orderId });
        if (payment) {
          payment.status = "paid";
          payment.transactionNo = vnp_Params["vnp_TransactionNo"];
          payment.bankCode = vnp_Params["vnp_BankCode"];
          await payment.save();
        }

        if (!order.buyNow) {
          await Cart.updateOne({ user_id: order.user_id }, { products: [] });
        }

        order.vnpTransactionNo = vnp_Params["vnp_TransactionNo"] || order.vnpTransactionNo;
        order.vnpBankCode = vnp_Params["vnp_BankCode"] || order.vnpBankCode;
        await order.save();

        return res.redirect(`/checkout/success/${orderId}`);
      }
    } else if (vnp_Params["vnp_ResponseCode"] && vnp_Params["vnp_ResponseCode"] !== "00") {
      const order = await Order.findById(orderId);
      if (order && order.status !== "completed") {
        order.paymentStatus = "failed";
        order.status = "failed";
        await order.save();

        const payment = await Payment.findOne({ order_id: orderId });
        if (payment) {
          payment.status = "failed";
          await payment.save();
        }
      }
    }

    return res.render("client/payment/result", {
      pageTitle: "Thanh toán thất bại",
      status: "fail",
      data: vnp_Params,
    });
  } catch (error) {
    console.error("[VNPAY Return] Error:", error);
    res.send("Lỗi xử lý kết quả thanh toán");
  }
};
