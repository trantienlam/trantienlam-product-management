// Auth Pages - Toggle Password Visibility
document.addEventListener('DOMContentLoaded', function() {
  var toggleBtn = document.querySelector('.toggle-password');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      var passwordInput = document.getElementById('password');
      var icon = this.querySelector('i');
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  }
});
