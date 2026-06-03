const systemConfig = require("../../config/system");

const authMiddleware = require("../../middlewares/admin/auth.middleware");

const dashboardRoutes = require("./dashboard.route");
const productRoutes = require("./product.route");
const productCategoryRoutes = require("./product-category.route");
const roleRoutes = require("./role.route");
const accountRoutes = require("./account.route");
const authRoutes = require("./auth.route");
const myAccountRoute = require("./my-account.route");

const ocrRoute = require("./ocr.route");

const settingRoute = require("./setting.route");
const chatRoute = require("./chat.route");
const chatUploadRoute = require("./chat-upload.route");
const orderRoutes = require("./order.route");
const reviewRoutes = require("./review.route");
const voucherRoutes = require("./voucher.route");
const reportRoutes = require("./report.route");

module.exports = (app) => {
  const PATH_ADMIN = systemConfig.prefixAdmin;

  app.use(
    PATH_ADMIN + "/dashboard",
    authMiddleware.requireAuth,
    dashboardRoutes,
  );

  app.use(PATH_ADMIN + "/products", authMiddleware.requireAuth, productRoutes);

  app.use(
    PATH_ADMIN + "/products-category",
    authMiddleware.requireAuth,
    productCategoryRoutes,
  );

  app.use(PATH_ADMIN + "/roles", authMiddleware.requireAuth, roleRoutes);

  app.use(PATH_ADMIN + "/accounts", authMiddleware.requireAuth, accountRoutes);

  app.use(PATH_ADMIN + "/auth", authRoutes);

  app.use(
    PATH_ADMIN + "/my-account",
    authMiddleware.requireAuth,
    myAccountRoute,
  );

  app.use(PATH_ADMIN + "/ocr", ocrRoute);

  app.use(PATH_ADMIN + "/settings", authMiddleware.requireAuth, settingRoute);

  app.use(PATH_ADMIN + "/chat", authMiddleware.requireAuth, chatRoute);
  app.use(PATH_ADMIN + "/chat", authMiddleware.requireAuth, chatUploadRoute);

  app.use(PATH_ADMIN + "/orders", authMiddleware.requireAuth, orderRoutes);
  app.use(PATH_ADMIN + "/reports", authMiddleware.requireAuth, reportRoutes);
  app.use(PATH_ADMIN + "/reviews", authMiddleware.requireAuth, reviewRoutes);
  app.use(PATH_ADMIN + "/vouchers", authMiddleware.requireAuth, voucherRoutes);
};
