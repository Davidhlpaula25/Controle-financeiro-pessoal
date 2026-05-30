import { categories } from './constants.js';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR');

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    return map[character] || character;
  });
}

export function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0);
}

export function formatDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateValue) {
  if (!dateValue) return '';

  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return dateFormatter.format(parsed);
}

export function setVisible(element, visible, displayType = 'block') {
  if (!element) return;
  element.style.display = visible ? displayType : 'none';
}

export function populateCategorySelector(type, selectorElement, selectedCategory = null) {
  const availableCategories = categories[type] || categories.expense;
  selectorElement.innerHTML = availableCategories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join('');

  if (selectedCategory && availableCategories.includes(selectedCategory)) {
    selectorElement.value = selectedCategory;
  } else if (availableCategories.length > 0) {
    selectorElement.selectedIndex = 0;
  }
}
