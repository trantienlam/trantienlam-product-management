const md5 = require("md5");
const User = require("../../models/user.model");
//[GET] /user/register
module.exports.register = async (req, res) => {
  res.render("client/pages/user/register", {
    pageTitle: "Đăng Ký tài khoản",
  });
};

// [POST] /user/regiter
module.exports.registerPost = async (req, res) => {
  console.log(req.body);
  const exitsEmail = await User.findOne({
    email: req.body.email,
    deleted: false,
  });
  if (exitsEmail) {
    req.flash("error", `Email đã tồn tại`);
    res.redirect("back");
    return;
  }
  req.body.password = md5(req.body.password);

  const user = new User(req.body);
  await user.save();

  console.log(user);
  // res.cookie("tokenUser", user.tokenUser);
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
    req.flash("error", `Email đã tồn tại`);
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
