// Cập nhật số lượng sản phẩm trong giỏ hàng
document.addEventListener('DOMContentLoaded', function() {
  const selectAllProducts = document.getElementById("selectAllProducts");
  const itemCheckboxes = document.querySelectorAll(".cart-item-checkbox");
  const checkoutForm = document.getElementById("cartCheckoutForm");
  const checkoutButton = document.getElementById("btnCheckoutSelected");

  function updateCheckoutButtonState() {
    if (!checkoutButton) return;
    const hasSelected = Array.from(itemCheckboxes).some((cb) => cb.checked);
    checkoutButton.disabled = !hasSelected;
  }

  if (selectAllProducts && itemCheckboxes.length > 0) {
    selectAllProducts.addEventListener("change", function () {
      itemCheckboxes.forEach((cb) => {
        cb.checked = this.checked;
      });
      updateCheckoutButtonState();
    });

    itemCheckboxes.forEach((cb) => {
      cb.addEventListener("change", function () {
        const allChecked = Array.from(itemCheckboxes).every((item) => item.checked);
        selectAllProducts.checked = allChecked;
        updateCheckoutButtonState();
      });
    });
  }

  if (checkoutForm) {
    checkoutForm.addEventListener("submit", function (e) {
      const hasSelected = Array.from(itemCheckboxes).some((cb) => cb.checked);
      if (!hasSelected) {
        e.preventDefault();
        alert("Vui lòng chọn ít nhất 1 sản phẩm để thanh toán.");
      }
    });
  }

  updateCheckoutButtonState();

  // Xử lý nút trừ
  const btnMinus = document.querySelectorAll('.btn-minus');
  btnMinus.forEach((btn) => {
    btn.addEventListener('click', () => {
      const productId = btn.getAttribute('data-product-id');
      const input = btn.parentElement.querySelector('input');
      let quantity = parseInt(input.value);
      if (quantity > 1) {
        quantity--;
        input.value = quantity;
        window.location.href = `/cart/update/${productId}/${quantity}`;
      }
    });
  });

  // Xử lý nút cộng
  const btnPlus = document.querySelectorAll('.btn-plus');
  btnPlus.forEach((btn) => {
    btn.addEventListener('click', () => {
      const productId = btn.getAttribute('data-product-id');
      const input = btn.parentElement.querySelector('input');
      let quantity = parseInt(input.value);
      quantity++;
      input.value = quantity;
      window.location.href = `/cart/update/${productId}/${quantity}`;
    });
  });

  // Xử lý input trực tiếp
  const inputsQuantity = document.querySelectorAll(".quantity-input");
  if (inputsQuantity.length > 0) {
    inputsQuantity.forEach((input) => {
      input.addEventListener("change", (e) => {
        const productId = input.getAttribute("data-product-id");
        const quantity = parseInt(input.value);
        if (quantity > 0) {
          window.location.href = `/cart/update/${productId}/${quantity}`;
        } else {
          input.value = 1;
          window.location.href = `/cart/update/${productId}/1`;
        }
      });
    });
  }
});
// End cập nhật số lượng sản phẩm trong giỏ hàng