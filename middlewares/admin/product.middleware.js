const productHelper = require("../../helpers/products");

module.exports = (req, res, next) => {
  res.locals.productHelper = productHelper;
  next();
};
