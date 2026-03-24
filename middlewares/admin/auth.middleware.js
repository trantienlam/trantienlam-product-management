const systemConfig = require("../../config/system");
const Account = require("../../models/account.model");
const Role = require("../../models/role.model");
module.exports.requireAuth = async (req, res, next) => {
  if (!req.cookies.token) {
    res.redirect(`${systemConfig.prefixAdmin}/auth/login`);
  } else {
    const user = await Account.findOne({ token: req.cookies.token }).populate(
      "role_id",
      "title permission",
    );
    if (!user) {
      res.redirect(`${systemConfig.prefixAdmin}/auth/login`);
    } else {
      const role = await Role.findOne({
        _id: user.role_id,
      }).select("title permission");
      req.user = user;
      req.user.role = role;
      res.locals.user = user;
      res.locals.role = role;
      // console.log("user", user);
      // console.log("role", role);
      // console.log("middlewảe chạy");
      next();
    }
  }
};
