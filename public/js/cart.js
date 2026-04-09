// Cập nhật số lượng sản phẩm trong giỏ hàng
document.addEventListener('DOMContentLoaded', function() {
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