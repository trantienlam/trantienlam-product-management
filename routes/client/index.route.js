const categoryMiddleware = require("../../middlewares/clients/category.middleware.js");

const cartMiddleware = require("../../middlewares/clients/cart.middleware.js");
const userMiddleware = require("../../middlewares/clients/user.middleware.js");

const settingMiddleware = require("../../middlewares/clients/setting.middleware.js");

const homeRoutes = require("./home.route");
const productRoutes = require("./product.route");
const searchRoutes = require("./search.route");
const cartRoutes = require("./cart.route");
const checkoutRoutes = require("./checkout.route");
const userRoutes = require("./user.route");
const chatRoutes = require("./chat.route");
const chatUploadRoutes = require("./chat-upload.route");

const paymentRoutes = require("./payment.route.js");
const orderRoutes = require("./order.route.js");
const reviewRoutes = require("./review.route.js");

module.exports = (app) => {
  app.use(categoryMiddleware.category);

  app.use(userMiddleware.infoUser);

  app.use(cartMiddleware.cartUser);

  app.use(settingMiddleware.settingGeneral);

  app.use("/", homeRoutes);

  app.use("/products", productRoutes);

  app.use("/search", searchRoutes);

  app.use("/cart", cartRoutes);

  app.use("/checkout", checkoutRoutes);

  app.use("/user", userRoutes);

  app.use("/chat", chatRoutes);

  app.use("/chat", chatUploadRoutes);

  app.use("/payment", paymentRoutes);

  app.use("/orders", orderRoutes);

  app.use("/reviews", reviewRoutes);
};
