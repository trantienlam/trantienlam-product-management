// Checkout Page - Payment and Voucher functionality
(function () {
  // Payment option selection
  document.querySelectorAll('.payment-option').forEach((option) => {
    option.addEventListener('click', function () {
      document.querySelectorAll('.payment-option').forEach((o) => o.classList.remove('active'));
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
  const discountAmountSpan = voucherDiscountRow
    ? voucherDiscountRow.querySelector('span:last-child')
    : null;
  const finalAmountSpan = finalTotalRow
    ? finalTotalRow.querySelector('span:last-child')
    : null;

  const cartTotal = window.checkoutCartTotal || 0;

  function formatCurrency(value) {
    return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
  }

  function showMessage(element, message) {
    if (!element) return;
    element.textContent = message;
    element.style.display = 'block';
  }

  function hideMessage(element) {
    if (!element) return;
    element.textContent = '';
    element.style.display = 'none';
  }

  function resetVoucherState() {
    if (voucherDiscountInput) voucherDiscountInput.value = '0';
    if (voucherCodeHidden) voucherCodeHidden.value = '';
    if (voucherInput) voucherInput.disabled = false;
    if (applyBtn) {
      applyBtn.disabled = false;
      applyBtn.classList.remove('is-loading');
    }
    if (appliedVoucherArea) appliedVoucherArea.style.display = 'none';
    if (voucherDiscountRow) voucherDiscountRow.style.display = 'none';
    if (finalTotalRow) finalTotalRow.style.display = 'none';
    hideMessage(voucherError);
    hideMessage(voucherSuccess);
  }

  function applyVoucherUI(data) {
    if (appliedVoucherName) {
      appliedVoucherName.textContent = `${data.name} (${data.code})`;
    }
    if (voucherDiscountInput) voucherDiscountInput.value = String(data.discount || 0);
    if (voucherCodeHidden) voucherCodeHidden.value = data.code || '';
    if (voucherInput) voucherInput.disabled = true;
    if (voucherDiscountRow && discountAmountSpan) {
      voucherDiscountRow.style.display = 'flex';
      discountAmountSpan.textContent = `-${formatCurrency(data.discount)}`;
    }
    if (finalTotalRow && finalAmountSpan) {
      finalTotalRow.style.display = 'flex';
      finalAmountSpan.textContent = formatCurrency(data.newTotal);
    }
    if (appliedVoucherArea) appliedVoucherArea.style.display = 'block';
    hideMessage(voucherError);
    showMessage(voucherSuccess, 'Áp dụng voucher thành công');
  }

  async function handleApplyVoucher() {
    if (!applyBtn || !voucherInput) return;

    const code = voucherInput.value.trim();
    hideMessage(voucherError);
    hideMessage(voucherSuccess);

    if (!code) {
      showMessage(voucherError, 'Vui lòng nhập mã voucher');
      voucherInput.focus();
      return;
    }

    if (cartTotal <= 0) {
      showMessage(voucherError, 'Giỏ hàng trống');
      return;
    }

    applyBtn.disabled = true;
    applyBtn.classList.add('is-loading');

    try {
      const response = await fetch('/vouchers/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          code,
          cartTotal,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Không thể áp dụng voucher');
      }

      applyVoucherUI(result.data || {});
    } catch (error) {
      resetVoucherState();
      showMessage(voucherError, error.message || 'Đã xảy ra lỗi khi áp dụng voucher');
    } finally {
      if (applyBtn && !voucherCodeHidden?.value) {
        applyBtn.disabled = false;
      }
      if (applyBtn) {
        applyBtn.classList.remove('is-loading');
      }
    }
  }

  async function handleRemoveVoucher() {
    try {
      await fetch('/vouchers/remove', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
      });
    } catch (_) {
      // ignore remove errors in UI reset flow
    } finally {
      if (voucherInput) {
        voucherInput.value = '';
      }
      resetVoucherState();
    }
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', handleApplyVoucher);
  }

  if (voucherInput) {
    voucherInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleApplyVoucher();
      }
    });

    voucherInput.addEventListener('input', function () {
      if (!voucherCodeHidden?.value) {
        hideMessage(voucherError);
        hideMessage(voucherSuccess);
      }
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', handleRemoveVoucher);
  }
})();
