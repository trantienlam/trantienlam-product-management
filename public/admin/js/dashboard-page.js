// Dashboard Page - Chart.js initialization
(function() {
  // Hiển thị ngày hiện tại
  function initDashboardDate() {
    var el = document.getElementById('dashboard-date');
    if (!el) return;
    var now = new Date();
    var days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    var dayName = days[now.getDay()];
    var dd = String(now.getDate()).padStart(2, '0');
    var mm = String(now.getMonth() + 1).padStart(2, '0');
    var yyyy = now.getFullYear();
    el.textContent = dayName + ', ' + dd + '/' + mm + '/' + yyyy;
  }
  initDashboardDate();

  // Chart data from window globals (set by Pug template)
  const chartLabels = window.chartData ? chartData.labels : [];
  const dailyRevenue = window.chartData ? chartData.dailyRevenue : [];
  const dailyOrdersCount = window.chartData ? chartData.dailyOrdersCount : [];
  const ordersByStatus = window.chartData ? chartData.ordersByStatus : {};
  const paymentStats = window.chartData ? chartData.paymentStats : {};

  // Format currency
  function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
  }

  // Revenue Chart - 2 LINES (DOANH THU + SO ĐƠN)
  const revenueCanvas = document.getElementById('revenueChart');
  if (revenueCanvas) {
    const revenueCtx = revenueCanvas.getContext('2d');
    new Chart(revenueCtx, {
      type: 'line',
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: 'Doanh thu (VNĐ)',
            data: dailyRevenue,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            fill: true,
            tension: 0.4,
            pointRadius: 8,
            pointHoverRadius: 10,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#fff',
            pointBorderWidth: 3,
            pointStyle: 'circle',
            yAxisID: 'y',
            order: 2,
          },
          {
            label: 'Số đơn hàng',
            data: dailyOrdersCount,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.2)',
            fill: true,
            tension: 0.4,
            pointRadius: 8,
            pointHoverRadius: 10,
            pointBackgroundColor: '#f59e0b',
            pointBorderColor: '#fff',
            pointBorderWidth: 3,
            pointStyle: 'rectRot',
            yAxisID: 'y1',
            borderDash: [5, 5],
            order: 1,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: { size: 13, weight: '500' }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                if (context.datasetIndex === 0) {
                  return 'Doanh thu: ' + formatCurrency(context.raw);
                }
                return 'Số đơn: ' + context.raw + ' đơn';
              }
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Doanh thu (VNĐ)',
              font: { weight: 'bold', size: 12 }
            },
            ticks: {
              callback: function(value) {
                if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
                return value;
              }
            },
            grid: {
              drawBorder: false,
              color: '#f0f0f0'
            },
            border: {
              display: false
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Số đơn hàng',
              font: { weight: 'bold', size: 12 }
            },
            grid: {
              drawOnChartArea: false,
            },
            min: 0,
            max: Math.max(...dailyOrdersCount, 1) + Math.max(...dailyOrdersCount, 1) * 0.3,
            ticks: {
              stepSize: 1,
              precision: 0
            },
            border: {
              display: false
            }
          },
          x: {
            grid: {
              drawBorder: false,
              color: '#f0f0f0'
            },
            border: {
              display: false
            }
          }
        }
      }
    });
  }

  // Orders Status Pie Chart
  const ordersStatusCanvas = document.getElementById('ordersStatusChart');
  if (ordersStatusCanvas) {
    const ordersStatusCtx = ordersStatusCanvas.getContext('2d');
    new Chart(ordersStatusCtx, {
      type: 'doughnut',
      data: {
        labels: ['Chờ xử lý', 'Đang xử lý', 'Đang giao', 'Đã giao', 'Hoàn thành', 'Đã hủy'],
        datasets: [{
          data: [
            ordersByStatus.pending || 0,
            ordersByStatus.processing || 0,
            ordersByStatus.shipping || 0,
            ordersByStatus.delivered || 0,
            ordersByStatus.completed || 0,
            ordersByStatus.cancelled || 0
          ],
          backgroundColor: [
            '#f59e0b',
            '#3b82f6',
            '#6366f1',
            '#06b6d4',
            '#10b981',
            '#ef4444',
          ],
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              usePointStyle: true,
              padding: 12,
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                return context.label + ': ' + context.raw + ' (' + percentage + '%)';
              }
            }
          }
        },
        cutout: '60%'
      }
    });
  }

  // Payment Status Chart
  const paymentCanvas = document.getElementById('paymentChart');
  if (paymentCanvas) {
    const paymentCtx = paymentCanvas.getContext('2d');
    new Chart(paymentCtx, {
      type: 'bar',
      data: {
        labels: ['Đã thanh toán', 'Chưa thanh toán', 'Hoàn tiền'],
        datasets: [{
          label: 'Số đơn hàng',
          data: [
            paymentStats.paid || 0,
            paymentStats.unpaid || 0,
            paymentStats.refunded || 0
          ],
          backgroundColor: [
            '#10b981',
            '#f59e0b',
            '#3b82f6',
          ],
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.raw + ' đơn hàng';
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            },
            grid: {
              drawBorder: false,
              color: '#f0f0f0'
            }
          },
          x: {
            grid: {
              drawBorder: false,
              color: '#f0f0f0'
            }
          }
        }
      }
    });
  }
})();
