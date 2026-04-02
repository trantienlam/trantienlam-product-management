module.exports = (query) => {
  let filterStatus = [
    {
      name: "Tất cả",
      status: "",
      class: "",
    },
    {
      name: "Chờ xác nhận",
      status: "pending",
      class: "",
    },
    {
      name: "Đang xử lý",
      status: "processing",
      class: "",
    },
    {
      name: "Đang vận chuyển",
      status: "shipping",
      class: "",
    },
    {
      name: "Đã giao hàng",
      status: "delivered",
      class: "",
    },
    {
      name: "Hoàn thành",
      status: "completed",
      class: "",
    },
    {
      name: "Đã hủy",
      status: "cancelled",
      class: "",
    },
  ];

  if (query.status) {
    const index = filterStatus.findIndex((item) => item.status == query.status);
    if (index !== -1) {
      filterStatus[index].class = "active";
    }
  } else {
    const index = filterStatus.findIndex((item) => item.status == "");
    filterStatus[index].class = "active";
  }

  return filterStatus;
};
