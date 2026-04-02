const Cart = require("../../models/cart.model");

module.exports.cartUser = async (req, res, next) => {
  if (!req.user) {
    res.locals.miniCart = {
      totalQuantity: 0,
    };
    return next();
  }

  const cart = await Cart.findOne({
    user_id: req.user.id,
  });

  if (!cart) {
    res.locals.miniCart = {
      totalQuantity: 0,
    };
  } else {
    cart.totalQuantity = cart.products.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    res.locals.miniCart = cart;
  }

  next();
};
