// change status

const buttonChangeStatus = document.querySelectorAll("[button-change-status]");
if (buttonChangeStatus.length > 0) {
  const formChangeStatus = document.querySelector("#form-change-status");
  const path = formChangeStatus.getAttribute("data-path");

  buttonChangeStatus.forEach((button) => {
    button.addEventListener("click", () => {
      const statusCurrent = button.getAttribute("data-status");
      const id = button.getAttribute("data-id");

      let statusChange = statusCurrent == "active" ? "inactive" : "active";

      // console.log(statusCurrent);
      // console.log(id);
      // console.log(statusChange);

      const action = path + `/${statusChange}/${id}?_method=PATCH`;
      formChangeStatus.action = action;

      formChangeStatus.submit();
    });
  });
}
// end change status

//checkbox multi
const checkboxMulti = document.querySelector("[checkbox-multi]");
if (checkboxMulti) {
  const inputCheckAll = checkboxMulti.querySelector("input[name='checkall']");
  const inputsId = checkboxMulti.querySelectorAll("input[name='ids']");

  inputCheckAll.addEventListener("click", () => {
    if (inputCheckAll.checked) {
      inputsId.forEach((input) => {
        input.checked = true;
      });
    } else {
      inputsId.forEach((input) => {
        input.checked = false;
      });
    }
  });

  inputsId.forEach((input) => {
    input.addEventListener("click", () => {
      const countChecked = checkboxMulti.querySelectorAll(
        "input[name='id']:checked",
      ).length;

      if (countChecked == inputsId.length) {
        inputCheckAll.checked = true;
      } else {
        inputCheckAll.checked = false;
      }
    });
  });
}

//end checkbox multi

// delete item
const buttonsDelete = document.querySelectorAll("[button-delete]");
if (buttonsDelete.length > 0) {
  const formDeleteItem = document.querySelector("#form-delete-item");
  const path = formDeleteItem.getAttribute("data-path");

  buttonsDelete.forEach((button) => {
    button.addEventListener("click", () => {
      const isConfirm = confirm("bạn có chắ muoobs xóa sản phẩm này");
      if (isConfirm) {
        const id = button.getAttribute("data-id");

        const action = `${path}/${id}?_method=DELETE`;
        console.log(action);
        formDeleteItem.action = action;
        formDeleteItem.submit();
      }
    });
  });
}
// end delete item

// // OCR
// const btnOCR = document.getElementById("btn-ocr");
// const ocrInput = document.getElementById("ocrImage");

// if (btnOCR && ocrInput) {
//   btnOCR.addEventListener("click", () => {
//     ocrInput.click();
//   });

//   ocrInput.addEventListener("change", async () => {
//     const file = ocrInput.files[0];
//     if (!file) return;

//     const formData = new FormData();
//     formData.append("image", file);

//     try {
//       const res = await fetch("/admin/ocr/read", {
//         method: "POST",
//         body: formData,
//       });

//       const data = await res.json();

//       // Đổ dữ liệu vào form
//       if (data.title) document.getElementById("title").value = data.title;
//       if (data.price) document.getElementById("price").value = data.price;
//       if (data.stock) document.getElementById("stock").value = data.stock;
//       if (data.discount)
//         document.getElementById("discount").value = data.discount;
//       if (data.description) {
//         document.getElementById("desc").value = data.description;
//       }

//       alert("OCR thành công!");
//     } catch (err) {
//       alert("OCR thất bại!");
//     }
//   });
// }

// //End OCR
