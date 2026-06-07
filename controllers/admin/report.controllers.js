const Order = require("../../models/order.model");
const Product = require("../../models/product.model");
const User = require("../../models/user.model");

// ==================== HELPER FUNCTIONS ====================

function getReportFormat(reportType) {
  if (reportType === "month") return "%Y-%m";
  if (reportType === "year") return "%Y";
  return "%Y-%m-%d";
}

function formatReportLabel(reportType, key) {
  if (reportType === "year") return key;
  if (reportType === "month") {
    const [year, month] = key.split("-");
    return `Tháng ${month}/${year}`;
  }
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
}

function formatDateForChart(dateString, reportType) {
  if (reportType === "year") return dateString;
  if (reportType === "month") {
    const [year, month] = dateString.split("-");
    return `${month}/${year}`;
  }
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}`;
}

async function getRevenueAndSoldInRange(baseMatch, start, end) {
  const rows = await Order.aggregate([
    {
      $match: {
        ...baseMatch,
        createdAt: { $gte: start, $lt: end },
      },
    },
    { $unwind: "$products" },
    {
      $group: {
        _id: null,
        revenue: {
          $sum: {
            $ifNull: ["$products.totalPrice", 0],
          },
        },
        soldQuantity: {
          $sum: {
            $ifNull: ["$products.quantity", 0],
          },
        },
      },
    },
  ]);

  if (!rows.length) {
    return { revenue: 0, soldQuantity: 0 };
  }
  return {
    revenue: rows[0].revenue || 0,
    soldQuantity: rows[0].soldQuantity || 0,
  };
}

async function getOrderStatsInRange(baseMatch, start, end) {
  const stats = await Order.aggregate([
    {
      $match: {
        ...baseMatch,
        createdAt: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        pendingOrders: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },
        confirmedOrders: {
          $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
        },
        shippedOrders: {
          $sum: { $cond: [{ $eq: ["$status", "shipped"] }, 1, 0] },
        },
        deliveredOrders: {
          $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
        },
      },
    },
  ]);

  if (!stats.length) {
    return {
      totalOrders: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
    };
  }
  return stats[0];
}

// ==================== GET DATE RANGE ====================

function getDateRanges() {
  const now = new Date();
  return {
    today: {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    },
    month: {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    },
    year: {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear() + 1, 0, 1),
    },
    last7Days: {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    },
    last30Days: {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    },
  };
}

// ==================== INDEX PAGE ====================

// [GET] /admin/reports
module.exports.index = async (req, res) => {
  const reportTypeRaw = String(req.query.reportType || "day");
  const reportType = ["day", "month", "year"].includes(reportTypeRaw)
    ? reportTypeRaw
    : "day";

  const paidOrderMatch = {
    paymentStatus: "paid",
    status: { $nin: ["cancelled", "failed"] },
  };

  // Revenue Report Rows
  const reportRowsRaw = await Order.aggregate([
    { $match: paidOrderMatch },
    { $unwind: "$products" },
    {
      $group: {
        _id: {
          $dateToString: {
            format: getReportFormat(reportType),
            date: "$createdAt",
            timezone: "Asia/Ho_Chi_Minh",
          },
        },
        soldQuantity: { $sum: { $ifNull: ["$products.quantity", 0] } },
        revenue: { $sum: { $ifNull: ["$products.totalPrice", 0] } },
      },
    },
    { $sort: { _id: -1 } },
    { $limit: 30 },
  ]);

  const reportRows = reportRowsRaw.map((item) => ({
    key: item._id,
    label: formatReportLabel(reportType, item._id),
    soldQuantity: item.soldQuantity || 0,
    revenue: item.revenue || 0,
  }));

  // Chart data for the last 30 days (for line chart)
  const chartData = await getChartData();

  // Date ranges
  const dateRanges = getDateRanges();

  // Summary stats
  const [daySummary, monthSummary, yearSummary] = await Promise.all([
    getRevenueAndSoldInRange(paidOrderMatch, dateRanges.today.start, dateRanges.today.end),
    getRevenueAndSoldInRange(paidOrderMatch, dateRanges.month.start, dateRanges.month.end),
    getRevenueAndSoldInRange(paidOrderMatch, dateRanges.year.start, dateRanges.year.end),
  ]);

  // Order stats for the month
  const monthOrderStats = await getOrderStatsInRange(
    {},
    dateRanges.month.start,
    dateRanges.month.end
  );

  res.render("admin/pages/reports/index", {
    pageTitle: "Báo cáo doanh thu",
    salesReport: {
      reportType,
      rows: reportRows,
      summary: {
        day: daySummary,
        month: monthSummary,
        year: yearSummary,
      },
    },
    chartData,
    orderStats: monthOrderStats,
  });
};

// ==================== CHART DATA ====================

async function getChartData() {
  const dateRanges = getDateRanges();

  // Last 30 days revenue data
  const dailyRevenue = await Order.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        status: { $nin: ["cancelled", "failed"] },
        createdAt: { $gte: dateRanges.last30Days.start, $lt: dateRanges.last30Days.end },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
            timezone: "Asia/Ho_Chi_Minh",
          },
        },
        revenue: { $sum: "$amount" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill in missing days with 0
  const labels = [];
  const revenues = [];
  const orders = [];

  const startDate = new Date(dateRanges.last30Days.start);
  const endDate = new Date(dateRanges.last30Days.end);

  for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const dayData = dailyRevenue.find((r) => r._id === dateStr);

    labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
    revenues.push(dayData ? dayData.revenue : 0);
    orders.push(dayData ? dayData.orders : 0);
  }

  return { labels, revenues, orders };
}

// ==================== PRODUCT REPORT ====================

// [GET] /admin/reports/products
module.exports.productReport = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const sortBy = req.query.sortBy || "revenue"; // revenue | quantity | orders

  // Tính cả đơn hàng đã thanh toán (VNPAY) và đơn hàng COD đã giao
  const paidOrderMatch = {
    $or: [
      { paymentStatus: "paid" },
      { status: { $in: ["delivered", "completed"] } }
    ],
    $nor: [
      { status: "cancelled" },
      { status: "failed" }
    ]
  };

  // Top selling products - use $lookup to get product info
  const topProducts = await Order.aggregate([
    { $match: paidOrderMatch },
    { $unwind: "$products" },
    {
      $group: {
        _id: "$products.product_id",
        totalQuantity: { $sum: { $ifNull: ["$products.quantity", 0] } },
        totalRevenue: { $sum: { $ifNull: ["$products.totalPrice", 0] } },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: sortBy === "quantity" ? { totalQuantity: -1 } : { totalRevenue: -1 } },
    { $limit: limit },
  ]);

  // Get product details from products collection
  const productIds = topProducts.map(p => p._id).filter(Boolean);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = {};
  products.forEach(p => { productMap[p._id.toString()] = p; });

  const enrichedProducts = topProducts.map(p => ({
    ...p,
    productName: productMap[p._id?.toString()]?.title || "Sản phẩm không xác định",
    productThumbnail: productMap[p._id?.toString()]?.thumbnail || null,
  }));

  // Low stock products
  const lowStockProducts = await Product.find({
    deleted: false,
    status: "active",
    stock: { $gt: 0, $lte: 10 },
  })
    .sort({ stock: 1 })
    .limit(10);

  // Out of stock products
  const outOfStockProducts = await Product.countDocuments({
    deleted: false,
    status: "active",
    stock: 0,
  });

  res.render("admin/pages/reports/product-report", {
    pageTitle: "Báo cáo sản phẩm",
    topProducts: enrichedProducts,
    lowStockProducts,
    outOfStockProducts,
    sortBy,
    limit,
  });
};

// ==================== CUSTOMER REPORT ====================

// [GET] /admin/reports/customers
module.exports.customerReport = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const paidOrderMatch = {
    paymentStatus: "paid",
    status: { $nin: ["cancelled", "failed"] },
    user_id: { $nin: [null, ""] },
  };

  // Top customers by spending
  const topCustomers = await Order.aggregate([
    { $match: paidOrderMatch },
    {
      $group: {
        _id: "$user_id",
        totalSpent: { $sum: { $ifNull: ["$amount", 0] } },
        orderCount: { $sum: 1 },
        lastOrderDate: { $max: "$createdAt" },
      },
    },
    { $sort: { totalSpent: -1 } },
    { $limit: limit },
  ]);

  // Get customer details
  const customerIds = topCustomers.map((c) => c._id).filter(Boolean);
  const customers = await User.find({ _id: { $in: customerIds } });
  const customerMap = {};
  customers.forEach((c) => {
    customerMap[c._id.toString()] = c;
  });

  const enrichedCustomers = topCustomers.map((c) => ({
    ...c,
    customer: customerMap[c._id?.toString()] || {
      fullName: "Khách hàng đã xóa",
      email: null,
    },
  }));

  // Customer statistics
  const customerStatsRows = await Order.aggregate([
    { $match: paidOrderMatch },
    {
      $group: {
        _id: "$user_id",
        totalSpent: { $sum: { $ifNull: ["$amount", 0] } },
      },
    },
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        avgSpent: { $avg: "$totalSpent" },
        totalRevenue: { $sum: "$totalSpent" },
      },
    },
  ]);

  const stats = customerStatsRows[0] || {
    totalCustomers: 0,
    avgSpent: 0,
    totalRevenue: 0,
  };

  res.render("admin/pages/reports/customer-report", {
    pageTitle: "Báo cáo khách hàng",
    topCustomers: enrichedCustomers,
    customerStats: stats,
    limit,
  });
};

// ==================== INVENTORY REPORT ====================

// [GET] /admin/reports/inventory
module.exports.inventoryReport = async (req, res) => {
  // Get inventory stats
  const inventoryStats = await Product.aggregate([
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalStock: { $sum: "$stock" },
        avgStock: { $avg: "$stock" },
        outOfStock: {
          $sum: { $cond: [{ $eq: ["$stock", 0] }, 1, 0] },
        },
        lowStock: {
          $sum: { $cond: [{ $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", 10] }] }, 1, 0] },
        },
        normalStock: {
          $sum: { $cond: [{ $gt: ["$stock", 10] }, 1, 0] },
        },
      },
    },
  ]);

  const stats = inventoryStats[0] || {
    totalProducts: 0,
    totalStock: 0,
    avgStock: 0,
    outOfStock: 0,
    lowStock: 0,
    normalStock: 0,
  };

  // Low stock products (1-10)
  const lowStockProducts = await Product.find({
    deleted: false,
    status: "active",
    stock: { $gt: 0, $lte: 10 },
  })
    .sort({ stock: 1 })
    .limit(20);

  // Out of stock products
  const outOfStockProducts = await Product.find({
    deleted: false,
    status: "active",
    stock: 0,
  })
    .sort({ updatedAt: -1 })
    .limit(20);

  // High stock products
  const highStockProducts = await Product.find({
    deleted: false,
    status: "active",
    stock: { $gt: 100 },
  })
    .sort({ stock: -1 })
    .limit(10);

  res.render("admin/pages/reports/inventory-report", {
    pageTitle: "Báo cáo tồn kho",
    inventoryStats: stats,
    lowStockProducts,
    outOfStockProducts,
    highStockProducts,
  });
};

// ==================== EXPORT DATA ====================

// [GET] /admin/reports/export
module.exports.exportReport = async (req, res) => {
  const reportType = req.query.type || "revenue";
  const format = req.query.format || "json"; // json | csv

  const paidOrderMatch = {
    paymentStatus: "paid",
    status: { $nin: ["cancelled", "failed"] },
  };

  let data = [];
  let filename = "";

  switch (reportType) {
    case "revenue":
      data = await Order.aggregate([
        { $match: paidOrderMatch },
        { $unwind: "$products" },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "Asia/Ho_Chi_Minh",
              },
            },
            revenue: { $sum: { $ifNull: ["$products.totalPrice", 0] } },
            soldQuantity: { $sum: { $ifNull: ["$products.quantity", 0] } },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 365 },
      ]);
      data = data.map((d) => ({
        Ngày: d._id,
        "Doanh thu (VNĐ)": d.revenue,
        "Số sản phẩm": d.soldQuantity,
      }));
      filename = `bao-cao-doanh-thu-${new Date().toISOString().split("T")[0]}`;
      break;

    case "products":
      data = await Order.aggregate([
        { $match: paidOrderMatch },
        { $unwind: "$products" },
        {
          $group: {
            _id: "$products.product_id",
            "Tên sản phẩm": { $first: "$products.productInfo.title" },
            "Số lượng bán": { $sum: { $ifNull: ["$products.quantity", 0] } },
            "Doanh thu": { $sum: { $ifNull: ["$products.totalPrice", 0] } },
          },
        },
        { $sort: { "Doanh thu": -1 } },
        { $limit: 100 },
      ]);
      filename = `bao-cao-san-pham-${new Date().toISOString().split("T")[0]}`;
      break;

    case "orders":
      const orders = await Order.find(paidOrderMatch)
        .sort({ createdAt: -1 })
        .limit(500)
        .populate("user_id", "fullName email phone");

      data = orders.map((o) => ({
        "Mã đơn": o._id.toString().slice(-8).toUpperCase(),
        "Khách hàng": o.user_id?.fullName || "N/A",
        "SĐT": o.userInfo?.phone || "N/A",
        "Địa chỉ": o.userInfo?.address || "N/A",
        "Tổng tiền (VNĐ)": o.amount,
        "Phương thức": o.paymentMethod,
        "Trạng thái": o.status,
        "Ngày đặt": o.createdAt.toISOString().split("T")[0],
      }));
      filename = `bao-cao-don-hang-${new Date().toISOString().split("T")[0]}`;
      break;

    default:
      return res.status(400).json({ error: "Invalid report type" });
  }

  if (format === "csv") {
    // Generate CSV
    if (data.length === 0) {
      return res.status(404).send("No data");
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(",")];

    data.forEach((row) => {
      const values = headers.map((h) => {
        const val = row[h];
        if (typeof val === "string" && (val.includes(",") || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvRows.push(values.join(","));
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
    return res.send(csvRows.join("\n"));
  }

  // Default: JSON
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.json"`);
  res.json({ success: true, count: data.length, data });
};

// ==================== EXPORT EXCEL (XLSX) ====================

// [GET] /admin/reports/export/excel
module.exports.exportExcel = async (req, res) => {
  try {
    const reportType = req.query.type || "revenue";

    // Import xlsx library dynamically
    const XLSX = require("xlsx");

    const paidOrderMatch = {
      paymentStatus: "paid",
      status: { $nin: ["cancelled", "failed"] },
    };

    let data = [];
    let sheetName = "Báo cáo";

    switch (reportType) {
      case "revenue":
        data = await Order.aggregate([
          { $match: paidOrderMatch },
          { $unwind: "$products" },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                  timezone: "Asia/Ho_Chi_Minh",
                },
              },
              revenue: { $sum: { $ifNull: ["$products.totalPrice", 0] } },
              soldQuantity: { $sum: { $ifNull: ["$products.quantity", 0] } },
            },
          },
          { $sort: { _id: -1 } },
          { $limit: 365 },
        ]);
        data = data.map((d) => ({
          "Ngày": d._id,
          "Doanh thu (VNĐ)": d.revenue,
          "Số sản phẩm": d.soldQuantity,
        }));
        sheetName = "Doanh thu";
        break;

      case "products":
        data = await Order.aggregate([
          { $match: paidOrderMatch },
          { $unwind: "$products" },
          {
            $group: {
              _id: "$products.product_id",
              "Tên sản phẩm": { $first: "$products.productInfo.title" },
              "Số lượng bán": { $sum: { $ifNull: ["$products.quantity", 0] } },
              "Doanh thu (VNĐ)": { $sum: { $ifNull: ["$products.totalPrice", 0] } },
            },
          },
          { $sort: { "Doanh thu (VNĐ)": -1 } },
          { $limit: 100 },
        ]);
        sheetName = "Sản phẩm";
        break;

      case "orders":
        const orders = await Order.find(paidOrderMatch)
          .sort({ createdAt: -1 })
          .limit(500)
          .populate("user_id", "fullName email phone");

        data = orders.map((o) => ({
          "Mã đơn": o._id.toString().slice(-8).toUpperCase(),
          "Khách hàng": o.user_id?.fullName || "N/A",
          "SĐT": o.userInfo?.phone || "N/A",
          "Địa chỉ": o.userInfo?.address || "N/A",
          "Tổng tiền (VNĐ)": o.amount,
          "Phương thức": o.paymentMethod,
          "Trạng thái": o.status,
          "Ngày đặt": o.createdAt.toISOString().split("T")[0],
        }));
        sheetName = "Đơn hàng";
        break;

      default:
        return res.status(400).json({ error: "Invalid report type" });
    }

    if (data.length === 0) {
      req.flash("error", "Không có dữ liệu để xuất");
      return res.redirect(`${process.env.PREFIX_ADMIN || "/admin"}/reports`);
    }

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    // Send file
    const filename = `bao-cao-${reportType}-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(excelBuffer);
  } catch (error) {
    console.error("Export Excel error:", error);
    req.flash("error", "Lỗi khi xuất file Excel");
    return res.redirect(`${process.env.PREFIX_ADMIN || "/admin"}/reports`);
  }
};
