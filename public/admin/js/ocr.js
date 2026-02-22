// document.addEventListener("DOMContentLoaded", () => {
//   const btnOCR = document.getElementById("btn-ocr");
//   const ocrInput = document.getElementById("ocrImage");

//   if (!btnOCR || !ocrInput) return;

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
//       console.log(data); // 👈 DEBUG

//       if (data.title) document.getElementById("title").value = data.title;

//       if (data.price !== undefined)
//         document.getElementById("price").value = data.price;

//       if (data.stock !== undefined)
//         document.getElementById("stock").value = data.stock;

//       if (data.discount !== undefined)
//         document.getElementById("discount").value = data.discount;

//       if (data.description) {
//         if (tinymce.get("desc")) {
//           tinymce.get("desc").setContent(data.description);
//         }
//       }

//       alert("OCR thành công!");
//     } catch (err) {
//       console.error(err);
//       alert("OCR thất bại!");
//     }
//   });
// });

// OCR
const btnOCR = document.getElementById("btn-ocr");
const ocrInput = document.getElementById("ocrImage");

if (btnOCR && ocrInput) {
  btnOCR.addEventListener("click", () => {
    ocrInput.click();
  });

  ocrInput.addEventListener("change", async () => {
    const file = ocrInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/admin/ocr/read", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      // Đổ dữ liệu vào form
      if (data.title) document.getElementById("title").value = data.title;
      if (data.price) document.getElementById("price").value = data.price;
      if (data.stock) document.getElementById("stock").value = data.stock;
      if (data.discount)
        document.getElementById("discount").value = data.discount;

      if (data.description && tinymce.get("desc")) {
        tinymce.get("desc").setContent(data.description.replace(/\n/g, "<br>"));
      }

      alert("OCR thành công!");
    } catch (err) {
      console.error(err);
      alert("OCR thất bại!");
    }
  });
}
// End OCR
