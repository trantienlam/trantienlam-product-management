const categoryMiddleware = require("../../middlewares/clients/category.middleware.js");

const homeRoutes = require("./home.route");
const productRoutes = require("./product.route");

module.exports = (app) => {
  app.use(categoryMiddleware.category);
  app.use("/", homeRoutes);

  app.use("/products", productRoutes);
};
