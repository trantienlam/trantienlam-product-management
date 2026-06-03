const Order = require("../../models/order.model");

function getReportFormat(reportType) {
  if (reportType === "month") return "%Y-%m";
  if (reportType === "year") return "%Y";
  return "%Y-%m-%d";
}

function formatReportLabel(reportType, key) {
  if (reportType === "year") return key;
  if (reportType === "month") {
    const [year, month] = key.split("-");
    return `${month}/${year}`;
  }
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
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

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startYear = new Date(now.getFullYear(), 0, 1);
  const endYear = new Date(now.getFullYear() + 1, 0, 1);

  const [daySummary, monthSummary, yearSummary] = await Promise.all([
    getRevenueAndSoldInRange(paidOrderMatch, startToday, endToday),
    getRevenueAndSoldInRange(paidOrderMatch, startMonth, endMonth),
    getRevenueAndSoldInRange(paidOrderMatch, startYear, endYear),
  ]);

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
  });
};
