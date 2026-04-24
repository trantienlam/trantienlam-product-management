// Auto-set today's date as start date
const today = new Date().toISOString().split('T')[0];
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');

if (startDateInput) {
  startDateInput.value = today;
  startDateInput.min = today;
}

// Auto-set end date to 30 days from now
if (endDateInput) {
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);
  endDateInput.value = nextMonth.toISOString().split('T')[0];
}

// Update suffix when type changes
const typeSelect = document.querySelector('[name="type"]');
const valueSuffix = document.getElementById('valueSuffix');
const valueInput = document.querySelector('[name="value"]');

if (typeSelect && valueSuffix && valueInput) {
  typeSelect.addEventListener('change', function() {
    if (this.value === 'percent') {
      valueSuffix.textContent = '%';
      valueInput.max = '100';
    } else {
      valueSuffix.textContent = 'đ';
      valueInput.max = '';
    }
  });
}
