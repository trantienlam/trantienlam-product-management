const categoryMiddleware = require("../../middlewares/clients/category.middleware.js");

const cartMiddleware = require("../../middlewares/clients/cart.middleware.js");
const homeRoutes = require("./home.route");
const productRoutes = require("./product.route");
const searchRoutes = require("./search.route");
const cartRoutes = require("./cart.route");

module.exports = (app) => {
  app.use(categoryMiddleware.category);

  app.use(cartMiddleware.cartId);

  app.use("/", homeRoutes);

  app.use("/products", productRoutes);

  app.use("/search", searchRoutes);

  app.use("/cart", cartRoutes);
};
