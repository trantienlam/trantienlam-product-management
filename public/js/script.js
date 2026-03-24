//show alert
const showAlert = document.querySelector("[show-alert]");
if (showAlert) {
  const time = showAlert.getAttribute("data-time");
  const closeAlert = showAlert.querySelector("[close-alert]");

  setTimeout(() => {
    showAlert.classList.add("alert-hidden");
  }, time);

  closeAlert.addEventListener("click", () => {
    showAlert.classList.add("alert-hidden");
  });
}

// end show alert

// số lượng còn lại

const stockElement = document.getElementById("stock");
const quantityInput = document.getElementById("quantity");

if (!stockElement || !quantityInput) {
  // Trang không có form số lượng (vd: trang chủ)
} else {
let stock = parseInt(stockElement.innerText, 10);

quantityInput.addEventListener("change", function () {
  let quantity = parseInt(this.value);

  if (quantity > stock) {
    alert("Không đủ sản phẩm");
    this.value = stock;
    quantity = stock;
  }

  stockElement.innerText = stock - quantity;
});
}

//end
