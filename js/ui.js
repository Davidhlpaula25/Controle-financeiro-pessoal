import { dom } from './dom.js';
import { state } from './state.js';
import { months } from './constants.js';
import { formatCurrency, formatDateInputValue, setVisible, populateCategorySelector } from './utils.js';

export function openModal(modalElement) {
  setVisible(modalElement, true, 'flex');
}

export function closeModal(modalElement) {
  setVisible(modalElement, false);
}

export function hideAllModals() {
  [
    dom.editModal,
    dom.deleteConfirmModal,
    dom.templatesModal,
    dom.deleteTemplateConfirmModal
  ].forEach(closeModal);
}

export function resetTransactionDate() {
  dom.addDate.value = formatDateInputValue();
}

export function populateDateSelectors() {
  dom.monthSelect.innerHTML = months
    .map((month, index) => `<option value="${index}">${month}</option>`)
    .join('');

  dom.monthSelect.value = String(state.currentMonth);
  dom.yearInput.value = String(state.currentYear);

  if (!dom.addDate.value) {
    resetTransactionDate();
  }
}

export function toggleAddTransactionForm(visible) {
  setVisible(dom.transactionFormContainer, visible, 'block');
  dom.showAddFormBtn.innerHTML = visible
    ? '<i class="fas fa-times"></i> Fechar'
    : '<i class="fas fa-plus"></i> Adicionar Transação';

  if (visible) {
    if (!dom.addDate.value) {
      resetTransactionDate();
    }
    dom.addDescription?.focus?.();
  }
}

export function resetTransactionForm() {
  const selectedType = dom.typeSelect.value;
  dom.addTransactionForm.reset();
  dom.typeSelect.value = selectedType;
  dom.recurringCheckbox.checked = true;
  populateCategorySelector(selectedType, dom.categorySelect);
  resetTransactionDate();
}

export function resetTemplateForm() {
  const selectedType = dom.templateType.value;
  dom.addTemplateForm.reset();
  dom.templateType.value = selectedType;
  populateCategorySelector(selectedType, dom.templateCategory);
}

export function clearTransactionsView() {
  state.visibleTransactions = [];
  dom.pendingContainer.style.display = 'none';
  dom.pendingList.innerHTML = '';
  dom.completedList.innerHTML = '';
  dom.totalIncomeEl.textContent = formatCurrency(0);
  dom.totalExpenseEl.textContent = formatCurrency(0);
  dom.balanceEl.textContent = formatCurrency(0);
  setBalanceCardState(0);
}

export function setBalanceCardState(balance) {
  const balanceCard = dom.balanceEl.closest('.card');
  if (!balanceCard) return;

  balanceCard.classList.remove('income', 'expense', 'balance');
  balanceCard.classList.add(balance < 0 ? 'expense' : 'balance');
}

export function showAuthView() {
  hideAllModals();
  clearTransactionsView();
  setVisible(dom.appContainer, false);
  setVisible(dom.authContainer, true, 'flex');
  dom.userEmailSpan.textContent = '';
  dom.showAddFormBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Transação';
  setVisible(dom.transactionFormContainer, false);
  state.transactionIdToDelete = null;
  state.templateIdToDelete = null;
  state.monthMirrorInProgressFor = null;
  dom.addTransactionForm.reset();
  dom.editForm.reset();
  dom.addTemplateForm.reset();
  dom.recurringCheckbox.checked = true;
  populateCategorySelector('expense', dom.categorySelect);
  populateCategorySelector('expense', dom.templateCategory);
  resetTransactionDate();
}

export function showAppView(user) {
  setVisible(dom.authContainer, false);
  setVisible(dom.appContainer, true, 'block');
  dom.userEmailSpan.textContent = user.displayName || user.email || 'Usuário';
}
