// Product Detail Page - Gallery and Tabs
(function() {
  // Product gallery state
  var currentIndex = 0;
  var images = [];

  function getAllImages() {
    return Array.from(document.querySelectorAll('.product-gallery__thumb')).map(t => ({
      src: t.dataset.img,
      index: parseInt(t.dataset.index) || 0
    }));
  }

  function updateMainImage(index) {
    if (!images.length) return;
    currentIndex = index;
    if (currentIndex < 0) currentIndex = images.length - 1;
    if (currentIndex >= images.length) currentIndex = 0;
    document.getElementById('mainImage').src = images[currentIndex].src;
    document.querySelectorAll('.product-gallery__thumb').forEach((t, i) => {
      t.classList.toggle('is-active', i === currentIndex);
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    images = getAllImages();
    // Set initial active
    var activeThumb = document.querySelector('.product-gallery__thumb.is-active');
    if (activeThumb) {
      var idx = parseInt(activeThumb.dataset.index) || 0;
      currentIndex = idx;
    }

    // Thumbnail click
    document.querySelectorAll('.product-gallery__thumb').forEach((thumb, i) => {
      thumb.addEventListener('click', () => updateMainImage(i));
    });

    // Prev/Next buttons
    document.getElementById('galleryPrev') && document.getElementById('galleryPrev').addEventListener('click', () => updateMainImage(currentIndex - 1));
    document.getElementById('galleryNext') && document.getElementById('galleryNext').addEventListener('click', () => updateMainImage(currentIndex + 1));

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!document.getElementById('mainImage')) return;
      if (e.key === 'ArrowLeft') updateMainImage(currentIndex - 1);
      if (e.key === 'ArrowRight') updateMainImage(currentIndex + 1);
    });
  });

  // Product tabs
  function activateProductTab(tabName) {
    document.querySelectorAll('.product-tab-btn').forEach(b => b.classList.remove('is-active'));
    document.querySelectorAll('.product-tab-panel').forEach(p => p.classList.remove('is-active'));
    var btn = document.querySelector('.product-tab-btn[data-tab="' + tabName + '"]');
    var panel = document.getElementById('tab-' + tabName);
    if (btn) btn.classList.add('is-active');
    if (panel) panel.classList.add('is-active');
  }
  
  document.querySelectorAll('.product-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => activateProductTab(btn.dataset.tab));
  });
  
  if (location.hash === '#reviews') {
    activateProductTab('reviews');
    setTimeout(function() {
      var el = document.getElementById('reviews');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
})();
