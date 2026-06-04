// Orders Page Styles
document.addEventListener('DOMContentLoaded', function() {
  const style = document.createElement('style');
  style.textContent = `
    :root {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      min-height: 100vh;
    }

    .page-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      border-radius: 16px;
      margin-bottom: 2rem !important;
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.25rem !important;
    }

    .page-subtitle {
      opacity: 0.9;
      margin-bottom: 0 !important;
    }

    .page-header .btn-outline-primary {
      color: white;
      border-color: white;
    }

    .page-header .btn-outline-primary:hover {
      background: white;
      color: #667eea;
    }

    /* Filter Tabs */
    .filter-tabs {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      background: white;
      padding: 0.75rem;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }

    .filter-tab {
      padding: 0.5rem 1.25rem;
      border-radius: 8px;
      color: #6c757d;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .filter-tab:hover {
      background: #f8f9fa;
      color: #667eea;
    }

    .filter-tab.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    /* Order Card */
    .order-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .order-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    }

    .order-card-header {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #eee;
    }

    .order-id .label,
    .order-date .label,
    .order-status .label {
      display: block;
      font-size: 0.75rem;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.25rem;
    }

    .order-id .value {
      font-weight: 700;
      color: #212529;
      font-size: 1.1rem;
    }

    .order-date .value {
      color: #495057;
    }

    /* Status Badges */
    .badge-pending {
      background: #ffc107;
      color: #000;
    }

    .badge-processing {
      background: #0dcaf0;
      color: #000;
    }

    .badge-shipping {
      background: #0d6efd;
      color: #fff;
    }

    .badge-delivered {
      background: #6610f2;
      color: #fff;
    }

    .badge-completed {
      background: #198754;
      color: #fff;
    }

    .badge-failed {
      background: #dc3545;
      color: #fff;
    }

    .badge-cancelled {
      background: #6c757d;
      color: #fff;
    }

    .order-card-body {
      padding: 1.5rem;
    }

    .products-preview {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .product-thumb {
      width: 70px;
      height: 70px;
      object-fit: cover;
      border-radius: 10px;
      border: 2px solid #f1f1f1;
    }

    .more-products-badge {
      width: 70px;
      height: 70px;
      border-radius: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .products-count {
      color: #6c757d;
      font-size: 0.9rem;
      margin-bottom: 0.5rem !important;
    }

    .order-summary {
      padding-left: 1rem;
      border-left: 1px solid #eee;
    }

    .order-summary .payment-method {
      color: #6c757d;
      font-size: 0.9rem;
    }

    .order-summary .total-amount .label {
      color: #6c757d;
      margin-right: 0.5rem;
    }

    .order-summary .total-amount .value {
      font-size: 1.25rem;
      font-weight: 700;
      color: #dc3545;
    }

    /* Empty State */
    .empty-state {
      background: white;
      border-radius: 16px;
      padding: 4rem 2rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .empty-icon {
      font-size: 5rem;
      color: #dee2e6;
    }

    .empty-title {
      font-weight: 600;
      color: #495057;
      margin-bottom: 0.5rem !important;
    }

    .empty-desc {
      color: #6c757d;
      margin-bottom: 1.5rem !important;
    }

    /* Pagination */
    .pagination-wrapper {
      margin-top: 2rem !important;
    }

    .pagination .page-link {
      color: #667eea;
      border-radius: 8px;
      margin: 0 0.25rem;
      border: 1px solid #e9ecef;
    }

    .pagination .page-item.active .page-link {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-color: transparent;
    }

    .pagination .page-link:hover {
      background: #f8f9fa;
    }

    @media (max-width: 768px) {
      .order-summary {
        padding-left: 0;
        border-left: none;
        border-top: 1px solid #eee;
        margin-top: 1rem;
        padding-top: 1rem;
        text-align: start !important;
      }
    }
  `;
  document.head.appendChild(style);
});
