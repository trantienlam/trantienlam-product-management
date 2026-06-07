// Button Status
const buttonsStatus = document.querySelectorAll("[button-status]");
if (buttonsStatus.length > 0) {
  let url = new URL(window.location.href);

  buttonsStatus.forEach((button) => {
    button.addEventListener("click", () => {
      const status = button.getAttribute("button-status");

      if (status) {
        url.searchParams.set("status", status);
      } else {
        url.searchParams.delete("status");
      }
      // console.log(url.href);
      window.location.href = url.href;
    });
  });
}
// end button status

// form search
const formSearch = document.querySelector("#form-search");
if (formSearch) {
  let url = new URL(window.location.href);
  formSearch.addEventListener("submit", (e) => {
    e.preventDefault();
    const keyword = e.target.elements.keyword.value;

    if (keyword) {
      url.searchParams.set("keyword", keyword);
    } else {
      url.searchParams.delete("keyword");
    }

    window.location.href = url.href;
  });
}
// end form search

// pagination
const buttonPagination = document.querySelectorAll("[button-pagination]");

if (buttonPagination) {
  let url = new URL(window.location.href);

  buttonPagination.forEach((button) => {
    button.addEventListener("click", () => {
      const page = button.getAttribute("button-pagination");

      url.searchParams.set("page", page);

      window.location.href = url.href;
    });
  });
}
// end pagination

//form change multi
const formChangeMulti = document.querySelector("[form-change-multi]");
if (formChangeMulti) {
  formChangeMulti.addEventListener("submit", (e) => {
    e.preventDefault();

    const checkboxMulti = document.querySelector("[checkbox-multi]");
    const inputsChecked = checkboxMulti.querySelectorAll(
      "input[name='id']:checked"
    );
    const typeChange = e.target.elements.type.value;
    if (typeChange == "delete-all") {
      const isConfirm = confirm("Bạn có chắc muốn xóa sản phẩm này");
      if (!isConfirm) {
        return;
      }
    }

    if (inputsChecked.length > 0) {
      let ids = [];
      const inputIds = formChangeMulti.querySelector("input[name='ids']");

      inputsChecked.forEach((input) => {
        const id = input.value;

        if (typeChange == "change-position") {
          const position = input
            .closest("tr")
            .querySelector("input[name='position']").value;

          ids.push(`${id}-${position}`);
        } else {
          ids.push(id);
        }
      });

      inputIds.value = ids.join(",");
      formChangeMulti.submit();
    } else {
      alert("Vui lòng chọn ít nhất một bản ghi");
    }
  });
}
// end form change multi

//show alert - xử lý TẤT CẢ alerts trên trang
const showAlerts = document.querySelectorAll("[show-alert]");
showAlerts.forEach((showAlert) => {
  const time = parseInt(showAlert.getAttribute("data-time")) || 5000;
  const closeAlert = showAlert.querySelector("[close-alert]");

  // Tự động ẩn sau `time` ms
  setTimeout(() => {
    // Thêm class để fade out
    showAlert.classList.add("alert-hidden");
    
    // Xóa hoàn toàn khỏi DOM sau khi transition xong (300ms)
    setTimeout(() => {
      if (showAlert.parentNode) {
        showAlert.parentNode.removeChild(showAlert);
      }
    }, 300);
  }, time);

  // Ẩn ngay khi click nút close
  if (closeAlert) {
    closeAlert.addEventListener("click", () => {
      showAlert.classList.add("alert-hidden");
      setTimeout(() => {
        if (showAlert.parentNode) {
          showAlert.parentNode.removeChild(showAlert);
        }
      }, 300);
    });
  }
});
// end show alert

// upload image
const uploadImage = document.querySelector("[upload-image]");
if (uploadImage) {
  const uploadImageInput = document.querySelector("[upload-image-input]");
  const uploadImagePreview = document.querySelector("[upload-image-preview]");

  uploadImageInput.addEventListener("change", (e) => {
    console.log(e);
    const file = e.target.files[0];
    if (file) {
      uploadImagePreview.src = URL.createObjectURL(file);
    }
  });
}
//end upload image

// upload multiple images
const uploadImageMultiple = document.querySelector("[upload-image-multiple]");
if (uploadImageMultiple) {
  const uploadImageInputMultiple = document.querySelector("[upload-image-input-multiple]");
  const uploadImagePreviewMultiple = document.querySelector("[upload-image-preview-multiple]");

  if (uploadImageInputMultiple && uploadImagePreviewMultiple) {
    uploadImageInputMultiple.addEventListener("change", (e) => {
      const files = e.target.files;
      uploadImagePreviewMultiple.innerHTML = "";

      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith("image/")) {
            const imgWrapper = document.createElement("div");
            imgWrapper.style.cssText = "position:relative;display:inline-block;margin:4px;";

            const img = document.createElement("img");
            img.src = URL.createObjectURL(file);
            img.style.cssText = "width:80px;height:80px;object-fit:cover;border-radius:8px;border:2px solid #dee2e6;";
            img.onload = () => URL.revokeObjectURL(img.src);

            imgWrapper.appendChild(img);
            uploadImagePreviewMultiple.appendChild(imgWrapper);
          }
        }
      }
    });
  }
}
//end upload multiple images

//sỏt
const sort = document.querySelector("[sort]");
if (sort) {
  let url = new URL(window.location.href);
  const sortSelect = sort.querySelector("[sort-select]");
  const sortClear = sort.querySelector("[sort-clear]");

  // sắp xếp
  sortSelect.addEventListener("change", (e) => {
    const value = e.target.value;
    const [sortKey, sortValue] = value.split("-");

    url.searchParams.set("sortKey", sortKey);
    url.searchParams.set("sortValue", sortValue);

    window.location.href = url.href;
  });

  //xóa sắp xếp
  sortClear.addEventListener("click", () => {
    url.searchParams.delete("sortKey");
    url.searchParams.delete("sortValue");
    window.location.href = url.href;
  });

  //them selected cho option
  const sortKey = url.searchParams.get("sortKey");
  const sortValue = url.searchParams.get("sortValue");
  if (sortKey && sortValue) {
    const stringSort = `${sortKey}-${sortValue}`;
    const optionSelected = sortSelect.querySelector(
      `option[value='${stringSort}']`
    );

    optionSelected.selected = true;
  }
}
//end sort

// Admin mobile sidebar toggle
const adminMobileMenuBtn = document.getElementById('adminMobileMenuBtn');
const adminSidebarOverlay = document.getElementById('adminSidebarOverlay');
const adminSidebar = document.querySelector('.admin-sidebar');

if (adminMobileMenuBtn && adminSidebar) {
  adminMobileMenuBtn.addEventListener('click', () => {
    adminSidebar.classList.toggle('show');
    if (adminSidebarOverlay) {
      adminSidebarOverlay.classList.toggle('show');
    }
  });
}

if (adminSidebarOverlay) {
  adminSidebarOverlay.addEventListener('click', () => {
    adminSidebar.classList.remove('show');
    adminSidebarOverlay.classList.remove('show');
  });
}

// Sidebar dropdown menu
const sidebarDropdowns = document.querySelectorAll('.sidebar-dropdown');
if (sidebarDropdowns.length > 0) {
  sidebarDropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector('.sidebar-link');
    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        dropdown.classList.toggle('open');
      });
    }
  });

  // Auto-open dropdown if current path matches
  const currentPath = window.location.pathname;
  sidebarDropdowns.forEach(dropdown => {
    const items = dropdown.querySelectorAll('.sidebar-dropdown-item');
    items.forEach(item => {
      if (item.getAttribute('href') === currentPath) {
        dropdown.classList.add('open');
        item.classList.add('active');
      }
    });
  });
}
