// Chat Admin Page - formatTime utility
document.body.dataset.adminName = "#{user ? user.fullName : 'Admin'}";
document.body.dataset.adminAvatar = !{JSON.stringify((user && user.avatar) ? user.avatar : '')};

function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday ? hours + ':' + minutes : day + '/' + month + ' ' + hours + ':' + minutes;
}
