// Cart Page Styles
document.addEventListener('DOMContentLoaded', function() {
  // Add cart page styles
  const style = document.createElement('style');
  style.textContent = `
    .cart-page .cart-table td,
    .cart-page .cart-table th {
      vertical-align: middle;
    }
    .cart-page .cart-thumb {
      width: 72px;
      height: 72px;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid #eee;
    }
    .cart-page .cart-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .cart-page .quantity-input {
      width: 80px;
      max-width: 100%;
      text-align: center;
    }
    .cart-page .cart-line-total {
      white-space: nowrap;
    }
    .cart-page .cart-remove {
      display: inline-block;
      padding: 0.35rem;
      line-height: 1;
    }
    .cart-page .cart-remove:hover {
      color: #c82333 !important;
    }
    .cart-page #selectAllProducts,
    .cart-page .cart-item-checkbox {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }
    .cart-page #btnCheckoutSelected:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }
    @media (min-width: 992px) {
      .cart-page .cart-summary-card {
        position: sticky;
        top: 1rem;
      }
    }
  `;
  document.head.appendChild(style);
});
