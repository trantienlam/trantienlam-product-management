// My Account Edit Page - Avatar Preview
document.addEventListener('DOMContentLoaded', function() {
  var avatarInput = document.getElementById('avatar');
  if (avatarInput) {
    avatarInput.addEventListener('change', function() {
      var preview = document.getElementById('avatarPreview');
      var wrapper = document.querySelector('.edit-avatar-wrapper');
      if (this.files && this.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
          preview.src = e.target.result;
          preview.style.display = 'block';
          if (wrapper) {
            var oldImg = wrapper.querySelector('img');
            var oldIcon = wrapper.querySelector('i');
            if (oldImg) oldImg.remove();
            if (oldIcon) oldIcon.remove();
            var img = document.createElement('img');
            img.src = e.target.result;
            img.alt = 'Avatar';
            wrapper.appendChild(img);
          }
        };
        reader.readAsDataURL(this.files[0]);
      }
    });
  }
});
