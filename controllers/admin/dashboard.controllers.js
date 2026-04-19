const mongoose = require("mongoose");
const Product = require("../../models/product.model");
const ProductCategory = require("../../models/product-category.model");
const Account = require("../../models/account.model");
const User = require("../../models/user.model");
const Order = require("../../models/order.model");

/** ObjectId đầu tiên tại thời điểm `date` (dùng khi Product không có createdAt ở root) */
function minObjectIdFromDate(date) {
  const secs = Math.floor(date.getTime() / 1000);
  const hexTime = secs.toString(16).padStart(8, "0");
  return new mongoose.Types.ObjectId(hexTime + "0000000000000000");
}

// [GET] /admin/dashboard
module.exports.dashboard = async (req, res) => {
  const statistic = {
    categoryProduct: {
      total: 0,
      active: 0,
      inactive: 0,
    },
    product: {
      total: 0,
      active: 0,
      inactive: 0,
    },
    account: {
      total: 0,
      active: 0,
      inactive: 0,
    },
    user: {
      total: 0,
      active: 0,
      inactive: 0,
    },
    order: {
      total: 0,
      pending: 0,
      processing: 0,
      shipping: 0,
      delivered: 0,
      completed: 0,
      cancelled: 0,
      totalRevenue: 0,
    },
    revenue: {
      total: 0,
      month: 0,
      today: 0,
      week: 0,
    },
    paymentStats: {
      paid: 0,
      unpaid: 0,
      refunded: 0,
    },
  };

  // category
  statistic.categoryProduct.total = Math.max(0, await ProductCategory.countDocuments({
    deleted: false,
  }));
  statistic.categoryProduct.active = Math.max(0, await ProductCategory.countDocuments({
    status: "active",
    deleted: false,
  }));
  statistic.categoryProduct.inactive = Math.max(0, await ProductCategory.countDocuments({
    status: "inactive",
    deleted: false,
  }));

  //product
  statistic.product.total = Math.max(0, await Product.countDocuments({
    deleted: false,
  }));

  statistic.product.active = Math.max(0, await Product.countDocuments({
    deleted: false,
    status: "active",
  }));
  statistic.product.inactive = Math.max(0, await Product.countDocuments({
    deleted: false,
    status: "inactive",
  }));

  // account
  statistic.account.total = Math.max(0, await Account.countDocuments({
    deleted: false,
  }));

  statistic.account.active = Math.max(0, await Account.countDocuments({
    deleted: false,
    status: "active",
  }));
  statistic.account.inactive = Math.max(0, await Account.countDocuments({
    deleted: false,
    status: "inactive",
  }));

  //User
  statistic.user.total = Math.max(0, await User.countDocuments({
    deleted: false,
  }));
  statistic.user.active = Math.max(0, await User.countDocuments({
    deleted: false,
    status: "active",
  }));
  statistic.user.inactive = Math.max(0, await User.countDocuments({
    deleted: false,
    status: "inactive",
  }));

  // Orders statistics - ĐẢM BẢO KHÔNG ÂM
  statistic.order.total = Math.max(0, await Order.countDocuments({}));
  statistic.order.pending = Math.max(0, await Order.countDocuments({ status: "pending" }));
  statistic.order.processing = Math.max(0, await Order.countDocuments({ status: "processing" }));
  statistic.order.shipping = Math.max(0, await Order.countDocuments({ status: "shipping" }));
  statistic.order.delivered = Math.max(0, await Order.countDocuments({ status: "delivered" }));
  statistic.order.completed = Math.max(0, await Order.countDocuments({ status: "completed" }));
  statistic.order.cancelled = Math.max(0, await Order.countDocuments({ status: "cancelled" }));

  // Payment statistics
  statistic.paymentStats.paid = await Order.countDocuments({ paymentStatus: "paid" });
  statistic.paymentStats.unpaid = await Order.countDocuments({ paymentStatus: "unpaid" });
  statistic.paymentStats.refunded = await Order.countDocuments({ paymentStatus: "refunded" });

  // Get all paid orders (not cancelled/failed)
  const paidOrders = await Order.find({ 
    paymentStatus: "paid",
    status: { $nin: ["cancelled", "failed"] }
  });

  // Calculate total revenue from paid orders
  statistic.order.totalRevenue = paidOrders.reduce((sum, order) => sum + order.amount, 0);
  statistic.revenue.total = statistic.order.totalRevenue;

  // Revenue this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthOrders = paidOrders.filter(order => order.createdAt >= startOfMonth);
  statistic.revenue.month = monthOrders.reduce((sum, order) => sum + order.amount, 0);

  // Revenue today
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayOrders = paidOrders.filter(order => order.createdAt >= startOfDay);
  statistic.revenue.today = todayOrders.reduce((sum, order) => sum + order.amount, 0);

  // Revenue this week (last 7 days)
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weekOrders = paidOrders.filter(order => order.createdAt >= sevenDaysAgo);
  statistic.revenue.week = weekOrders.reduce((sum, order) => sum + order.amount, 0);

  // ===== TÍNH % THAY ĐỔI SO VỚI TUẦN TRƯỚC =====
  // Revenue tuần trước (7-14 ngày trước)
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(lastWeekStart.getDate() - 14);
  const lastWeekEnd = new Date(now);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 8);
  
  const lastWeekOrders = paidOrders.filter(order => 
    order.createdAt >= lastWeekStart && order.createdAt < sevenDaysAgo
  );
  const lastWeekRevenue = lastWeekOrders.reduce((sum, order) => sum + order.amount, 0);
  
  // Calculate revenue change percentage (đảm bảo không âm)
  let revenueChange = 0;
  if (lastWeekRevenue > 0) {
    revenueChange = Math.max(0, ((statistic.revenue.week - lastWeekRevenue) / lastWeekRevenue * 100));
  } else if (statistic.revenue.week > 0) {
    revenueChange = 100; // Tăng từ 0
  }

  // Orders tuần này
  const thisWeekOrdersCount = await Order.countDocuments({
    createdAt: { $gte: sevenDaysAgo }
  });
  // Orders tuần trước
  const lastWeekOrdersCount = await Order.countDocuments({
    createdAt: { $gte: lastWeekStart, $lt: sevenDaysAgo }
  });
  
  // Tính % thay đổi (đảm bảo không âm)
  let ordersChange = 0;
  if (lastWeekOrdersCount > 0) {
    ordersChange = Math.max(0, ((thisWeekOrdersCount - lastWeekOrdersCount) / lastWeekOrdersCount * 100));
  } else if (thisWeekOrdersCount > 0) {
    ordersChange = 100;
  }

  // Sản phẩm tạo trong 7 ngày gần đây / tuần trước (7–14 ngày)
  // Schema Product không có timestamps → không có createdAt root; dùng createdBy.createdAt hoặc mốc _id
  const idThisWeek = minObjectIdFromDate(sevenDaysAgo);
  const idLastWeekStart = minObjectIdFromDate(lastWeekStart);
  const idLastWeekEnd = minObjectIdFromDate(sevenDaysAgo);

  const thisWeekProducts = await Product.countDocuments({
    deleted: false,
    $or: [
      { "createdBy.createdAt": { $gte: sevenDaysAgo } },
      {
        $and: [
          {
            $or: [
              { "createdBy.createdAt": { $exists: false } },
              { "createdBy.createdAt": null },
            ],
          },
          { _id: { $gte: idThisWeek } },
        ],
      },
    ],
  });
  const lastWeekProducts = await Product.countDocuments({
    deleted: false,
    $or: [
      {
        "createdBy.createdAt": {
          $gte: lastWeekStart,
          $lt: sevenDaysAgo,
        },
      },
      {
        $and: [
          {
            $or: [
              { "createdBy.createdAt": { $exists: false } },
              { "createdBy.createdAt": null },
            ],
          },
          { _id: { $gte: idLastWeekStart, $lt: idLastWeekEnd } },
        ],
      },
    ],
  });

  // Tính % thay đổi (đảm bảo không âm)
  let productsChange = 0;
  if (lastWeekProducts > 0) {
    productsChange = Math.max(0, ((thisWeekProducts - lastWeekProducts) / lastWeekProducts * 100));
  } else if (thisWeekProducts > 0) {
    productsChange = 100;
  }

  // Get daily revenue for chart (last 7 days)
  const dailyRevenue = [];
  const dailyOrdersCount = [];
  const labels = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
    
    // Count all orders for the day (not just paid)
    const dayCount = await Order.countDocuments({
      createdAt: { $gte: dayStart, $lte: dayEnd }
    });
    
    // Calculate revenue from paid orders only
    const dayPaidOrders = paidOrders.filter(order => 
      order.createdAt >= dayStart && order.createdAt <= dayEnd
    );
    const dayRevenue = dayPaidOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    
    labels.push(date.getDate() + '/' + (date.getMonth() + 1));
    dailyRevenue.push(dayRevenue);
    dailyOrdersCount.push(Math.max(0, dayCount)); // Đảm bảo không âm
  }

  // Get orders by status for pie chart
  const ordersByStatus = {
    pending: statistic.order.pending,
    processing: statistic.order.processing,
    shipping: statistic.order.shipping,
    delivered: statistic.order.delivered,
    completed: statistic.order.completed,
    cancelled: statistic.order.cancelled,
  };

  // Top selling products - lấy thông tin product đầy đủ
  const productSales = {};
  paidOrders.forEach(order => {
    if (order.products) {
      order.products.forEach(item => {
        if (!productSales[item.product_id]) {
          productSales[item.product_id] = {
            product_id: item.product_id,
            title: item.productInfo ? item.productInfo.title : 'Sản phẩm',
            thumbnail: item.productInfo ? item.productInfo.thumbnail : '',
            slug: item.productInfo ? item.productInfo.slug : '',
            totalQuantity: 0,
            totalRevenue: 0
          };
        }
        productSales[item.product_id].totalQuantity += item.quantity || 0;
        productSales[item.product_id].totalRevenue += item.totalPrice || (item.priceNew * item.quantity);
      });
    }
  });

  // Nếu không có productInfo, lấy từ Product model
  const productIds = Object.keys(productSales);
  if (productIds.length > 0) {
    const products = await Product.find({ _id: { $in: productIds } }).select('title thumbnail slug');
    products.forEach(p => {
      if (productSales[p._id.toString()]) {
        productSales[p._id.toString()].title = p.title;
        productSales[p._id.toString()].thumbnail = p.thumbnail;
        productSales[p._id.toString()].slug = p.slug;
      }
    });
  }

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 5);

  res.render("admin/pages/dashboard/index", {
    pageTitle: "Tổng quan",
    statistic: statistic,
    topProducts: topProducts,
    chartData: {
      labels: labels,
      dailyRevenue: dailyRevenue,
      dailyOrdersCount: dailyOrdersCount,
      ordersByStatus: ordersByStatus,
      paymentStats: statistic.paymentStats,
    },
    // Data thay đổi
    changes: {
      revenue: {
        value: revenueChange,
        isUp: revenueChange >= 0
      },
      orders: {
        value: ordersChange,
        isUp: ordersChange >= 0
      },
      products: {
        value: productsChange,
        isUp: productsChange >= 0
      }
    }
  });
};
