const md5 = require("md5");
const User = require("../../models/user.model");
const ForgotPassword = require("../../models/forgot-password.model");
const RegisterOtp = require("../../models/register-otp.model");
const generaHelper = require("../../helpers/generate");
const sendMailHelper = require("../../helpers/sendMail");
const Cart = require("../../models/cart.model");
//[GET] /user/register
module.exports.register = async (req, res) => {
  res.render("client/pages/user/register", {
    pageTitle: "Đăng Ký tài khoản",
  });
};

// [POST] /user/regiter
module.exports.registerPost = async (req, res) => {
  const exitsEmail = await User.findOne({
    email: req.body.email,
    deleted: false,
  });
  if (exitsEmail) {
    req.flash("error", `Email đã tồn tại`);
    res.redirect("back");
    return;
  }

  const otp = generaHelper.generateRandomNumber(6);
  const registerOtp = new RegisterOtp({
    email: req.body.email,
    otp: otp,
    fullName: req.body.fullName,
    password: md5(req.body.password),
    phone: req.body.phone,
  });
  await registerOtp.save();

  const subject = "Mã OTP xác minh đăng ký tài khoản";
  const html = `
    Mã OTP xác minh đăng ký của bạn là: <b>${otp}</b>.<br/>
    Thời hạn sử dụng là 5 phút. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
  `;
  sendMailHelper.sendMail(req.body.email, subject, html);

  req.flash("success", "Đã gửi mã OTP về email của bạn");
  res.redirect(`/user/register/otp?email=${encodeURIComponent(req.body.email)}`);
};

//[GET] /user/register/otp
module.exports.registerOtp = async (req, res) => {
  const email = req.query.email || "";
  res.render("client/pages/user/register-otp", {
    pageTitle: "Xác minh OTP đăng ký",
    email,
  });
};

//[POST] /user/register/otp
module.exports.registerOtpPost = async (req, res) => {
  const { email, otp } = req.body;
  const registerOtp = await RegisterOtp.findOne({ email, otp });

  if (!registerOtp) {
    req.flash("error", "Mã OTP không hợp lệ");
    res.redirect("back");
    return;
  }

  const exitsEmail = await User.findOne({
    email: registerOtp.email,
    deleted: false,
  });
  if (exitsEmail) {
    req.flash("error", "Email đã tồn tại");
    res.redirect("/user/register");
    return;
  }

  const user = new User({
    fullName: registerOtp.fullName,
    email: registerOtp.email,
    password: registerOtp.password,
    phone: registerOtp.phone,
  });
  await user.save();

  await RegisterOtp.deleteOne({ _id: registerOtp._id });

  req.flash("success", "Đăng ký tài khoản thành công, vui lòng đăng nhập");
  res.redirect("/user/login");
};

//[GET] /user/login
module.exports.login = async (req, res) => {
  res.render("client/pages/user/login", {
    pageTitle: "Đăng nhập tài khoản",
  });
};

//[POST] /user/login
module.exports.loginPost = async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const user = await User.findOne({
    email: email,
    deleted: false,
  });

  if (!user) {
    req.flash("error", `Email không tồn tại`);
    res.redirect("back");
    return;
  }
  if (md5(password) != user.password) {
    req.flash("error", `Sai mật khẩu`);
    res.redirect("back");
    return;
  }
  if (user.status == "inactive") {
    req.flash("error", `Tài khoản đang bị khóa`);
    res.redirect("back");
    return;
  }
  res.cookie("tokenUser", user.tokenUser);

  // lưu user id vào cart
  await Cart.updateOne(
    {
      _id: req.cookies.cartId,
    },
    {
      user_id: user.id,
    },
  );
  res.redirect("/");
};

//[GET] /user/logout
module.exports.logout = async (req, res) => {
  res.clearCookie("tokenUser");
  res.redirect("/");
};

//[GET] /user/password/forgot
module.exports.forgotPassword = async (req, res) => {
  res.render("client/pages/user/forgot-password", {
    pageTitle: "lấy lại mật khẩu",
  });
};

//[POST]/user/password/forgot
module.exports.forgotPasswordPost = async (req, res) => {
  const email = req.body.email;

  const user = await User.findOne({
    email: email,
    deleted: false,
  });

  if (!user) {
    req.flash("error", `Email không tồn tại`);
    res.redirect("back");
    return;
  }

  // tạo OTP và lưu OTP, email vào collection forgot-password
  const otp = generaHelper.generateRandomNumber(8);
  const objectForgotPassword = {
    email: email,
    otp: otp,
    expireAt: Date.now(),
  };
  const forgotPassword = new ForgotPassword(objectForgotPassword);
  await forgotPassword.save();

  //b2 gửi mã otp về email
  const subject = "Mã OTP xác minh của bạn ";
  const html = `
  Mã OTP xác minh của bạn là: <b>${otp}</b>. Thời hạn sửa dụng là 3 phút. Lưu ý không để lộ mã OTP  
  `;
  sendMailHelper.sendMail(email, subject, html);

  res.redirect(`/user/password/otp?email=${email}`);
};

//[GET] /user /password/otp
module.exports.otpPassword = async (req, res) => {
  const email = req.query.email;

  res.render("client/pages/user/otp-password", {
    pageTitle: "Nhập mã OTP",
    email: email,
  });
};

//[GET] /user /password/otp
module.exports.otpPasswordPost = async (req, res) => {
  const email = req.body.email;
  const otp = req.body.otp;
  const result = await ForgotPassword.findOne({
    email: email,
    otp: otp,
  });

  if (!result) {
    req.flash("error", `OTP không hợp lệ`);
    res.redirect("back");
    return;
  }

  const user = await User.findOne({
    email: email,
  });

  res.cookie("tokenUser", user.tokenUser);

  res.redirect("/user/password/reset");
};

//[Get] /user /password/reset
module.exports.resetPassword = async (req, res) => {
  res.render("client/pages/user/reset-password", {
    pageTitle: "Đổi mật khẩu",
  });
};

//[POST] /user /password/reset
module.exports.resetPasswordPost = async (req, res) => {
  const password = req.body.password;
  const tokenUser = req.cookies.tokenUser;

  // console.log(password);
  // console.log(tokenUser);

  await User.updateOne(
    {
      tokenUser: tokenUser,
    },
    {
      password: md5(password),
    },
  );
  req.flash("success", "Đổi mật khẩu thành công");
  res.redirect("/user/login");
};

//[GET] /user/info
module.exports.info = async (req, res) => {
  res.render("client/pages/user/info", {
    pageTitle: "Thông tin cá nhân",
  });
};

//[POST]/user/infoPost
module.exports.infoPatch = async (req, res) => {
  try {
    const userId = req.user.id;

    const updateData = {
      fullName: req.body.fullName,
      phone: req.body.phone,
    };

    // 👉 avatar đã có sẵn trong req.body nếu upload
    if (req.body.avatar) {
      updateData.avatar = req.body.avatar;
    }

    // password
    if (req.body.password && req.body.password.trim() !== "") {
      updateData.password = md5(req.body.password);
    }

    await User.updateOne({ _id: userId, deleted: false }, updateData);

    res.redirect("/user/info");
  } catch (error) {
    console.log("Lỗi update user:", error);
    res.redirect("/user/info");
  }
};
