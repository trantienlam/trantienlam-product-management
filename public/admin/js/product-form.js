// Product Form - Image Preview
document.addEventListener('DOMContentLoaded', function() {
  var imageInput = document.getElementById('images');
  var previewContainer = document.getElementById('imagePreviewContainer');

  if (imageInput && previewContainer) {
    imageInput.addEventListener('change', function() {
      previewContainer.innerHTML = '';
      var files = this.files;
      if (files.length === 0) return;

      var grid = document.createElement('div');
      grid.className = 'preview-grid';
      previewContainer.appendChild(grid);

      Array.from(files).forEach(function(file) {
        if (!file.type.startsWith('image/')) return;

        var reader = new FileReader();
        reader.onload = function(e) {
          var wrapper = document.createElement('div');
          wrapper.className = 'preview-item';

          var img = document.createElement('img');
          img.src = e.target.result;
          img.className = 'preview-img';

          wrapper.appendChild(img);
          grid.appendChild(wrapper);
        };
        reader.readAsDataURL(file);
      });
    });
  }
});
