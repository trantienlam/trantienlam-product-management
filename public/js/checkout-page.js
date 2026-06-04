// Checkout Page - Payment and Voucher functionality
(function() {
  // Payment option selection
  document.querySelectorAll('.payment-option').forEach(option => {
    option.addEventListener('click', function() {
      document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('active'));
      this.classList.add('active');
      this.querySelector('input[type="radio"]').checked = true;
    });
  });

  // Voucher functionality - cartTotal is set by Pug template
  const applyBtn = document.getElementById('applyVoucherBtn');
  const removeBtn = document.getElementById('removeVoucherBtn');
  const voucherInput = document.getElementById('voucherCode');
  const voucherError = document.querySelector('.voucher-error');
  const voucherSuccess = document.querySelector('.voucher-success');
  const appliedVoucherArea = document.getElementById('appliedVoucherArea');
  const appliedVoucherName = document.getElementById('appliedVoucherName');
  const voucherDiscountInput = document.getElementById('voucherDiscount');
  const voucherCodeHidden = document.getElementById('voucherCodeHidden');
  const voucherDiscountRow = document.getElementById('voucherDiscountRow');
  const finalTotalRow = document.getElementById('finalTotalRow');
  const discountAmountSpan = voucherDiscountRow ? voucherDiscountRow.querySelector('span:last-child') : null;
  const finalAmountSpan = finalTotalRow ? finalTotalRow.querySelector('span:last-child') : null;
  const originalTotalSpan = document.querySelector('.cart-summary-row.total span:last-child');

  const cartTotal = window.checkoutCartTotal || 0;
