// Confirm delete voucher
function confirmDelete(id, code) {
  if (confirm('Bạn có chắc muốn xóa voucher "' + code + '"?')) {
    fetch('/admin/vouchers/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    }).then(res => {
      if (res.redirected) {
        window.location.href = res.url;
      } else {
        window.location.reload();
      }
    });
  }
}
