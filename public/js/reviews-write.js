// Reviews Write Page - Star rating functionality
document.addEventListener('DOMContentLoaded', function() {
  // Star rating functionality
  document.querySelectorAll('.star-rating-input__stars').forEach(function(container) {
    var labels = container.querySelectorAll('label');
    var inputs = container.querySelectorAll('input[type="radio"]');
    labels.forEach(function(label, index) {
      label.addEventListener('mouseenter', function() {
        labels.forEach(function(l, i) {
          l.style.color = i <= index ? '#f5a623' : '#ddd';
        });
      });
      label.addEventListener('mouseleave', function() {
        var checked = container.querySelector('input:checked');
        if (checked) {
          var checkedIndex = Array.prototype.indexOf.call(inputs, checked);
          labels.forEach(function(l, i) {
            l.style.color = i <= checkedIndex ? '#f5a623' : '#ddd';
          });
        } else {
          labels.forEach(function(l) { l.style.color = '#ddd'; });
        }
      });
    });
  });

  var form = document.getElementById('reviewForm');
  if (form) {
    form.addEventListener('submit', function(e) {
      var rating = form.querySelector('input[name="rating"]:checked');
      if (!rating) {
        e.preventDefault();
        alert('Vui lòng chọn số sao đánh giá!');
        return false;
      }
    });
  }
});
