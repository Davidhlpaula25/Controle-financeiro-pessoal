import { db, firebase } from './firebase.js';
import { dom } from './dom.js';
import { state } from './state.js';
import { categoryIcons } from './constants.js';
import {
  escapeHtml,
  formatCurrency,
  formatDisplayDate,
  populateCategorySelector
} from './utils.js';
import {
  toggleAddTransactionForm,
  resetTransactionForm,
  openModal,
  closeModal,
  populateDateSelectors,
  setBalanceCardState
} from './ui.js';

export function bindTransactionListeners() {
  if (state.transactionListenersBound) return;
  state.transactionListenersBound = true;

  dom.monthSelect.addEventListener('change', handleDateChange);
  dom.yearInput.addEventListener('change', handleDateChange);
  dom.prevMonthBtn.addEventListener('click', goToPrevMonth);
  dom.nextMonthBtn.addEventListener('click', goToNextMonth);
  dom.typeSelect.addEventListener('change', () => {
    const selectedCategory = dom.categorySelect.value;
    populateCategorySelector(dom.typeSelect.value, dom.categorySelect, selectedCategory);
  });
  dom.showAddFormBtn.addEventListener('click', () => {
    const visible = dom.transactionFormContainer.style.display === 'block';
    toggleAddTransactionForm(!visible);
  });
  dom.addTransactionForm.addEventListener('submit', handleAddTransaction);
  dom.editForm.addEventListener('submit', handleEditFormSubmit);
  dom.cancelEditBtn.addEventListener('click', () => closeModal(dom.editModal));
  dom.confirmDeleteBtn.addEventListener('click', handleDeleteConfirmation);
  dom.cancelDeleteBtn.addEventListener('click', () => closeModal(dom.deleteConfirmModal));
  dom.pendingList.addEventListener('click', handleTransactionListClick);
  dom.completedList.addEventListener('click', handleTransactionListClick);
}

export function handleDateChange() {
  const month = Number.parseInt(dom.monthSelect.value, 10);
  const year = Number.parseInt(dom.yearInput.value, 10);

  if (!Number.isNaN(month)) {
    state.currentMonth = month;
  }

  if (!Number.isNaN(year)) {
    state.currentYear = year;
  }

  refreshTransactions();
}

export function goToPrevMonth() {
  if (state.currentMonth === 0) {
    state.currentMonth = 11;
    state.currentYear -= 1;
  } else {
    state.currentMonth -= 1;
  }

  populateDateSelectors();
  refreshTransactions();
}

export function goToNextMonth() {
  if (state.currentMonth === 11) {
    state.currentMonth = 0;
    state.currentYear += 1;
  } else {
    state.currentMonth += 1;
  }

  populateDateSelectors();
  refreshTransactions();
}

function isTransactionInSelectedMonth(transaction) {
  const parsedDate = new Date(`${transaction.date}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return false;

  return (
    parsedDate.getFullYear() === state.currentYear &&
    parsedDate.getMonth() === state.currentMonth
  );
}

function sortTransactionsByDateDesc(first, second) {
  return new Date(`${second.date}T00:00:00`) - new Date(`${first.date}T00:00:00`);
}

function getMonthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function getPreviousMonthContext() {
  if (state.currentMonth === 0) {
    return {
      year: state.currentYear - 1,
      month: 11
    };
  }

  return {
    year: state.currentYear,
    month: state.currentMonth - 1
  };
}

function cloneTransactionToMonth(transaction, targetYear, targetMonth) {
  const sourceDate = new Date(`${transaction.date}T00:00:00`);
  if (Number.isNaN(sourceDate.getTime())) return null;
  if (transaction.recurring === false) return null;

  const targetDayLimit = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(sourceDate.getDate(), targetDayLimit);
  const targetDate = new Date(targetYear, targetMonth, targetDay);

  return {
    uid: state.currentUser.uid,
    description: transaction.description,
    amount: transaction.amount,
    date: targetDate.toISOString().split('T')[0],
    type: transaction.type,
    category: transaction.category,
    recurring: transaction.recurring !== false,
    status: transaction.type === 'expense' ? transaction.status || 'pending' : 'paid',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
}

async function seedCurrentMonthFromPreviousMonth(previousMonthTransactions) {
  const monthKey = getMonthKey(state.currentYear, state.currentMonth);
  if (state.monthMirrorInProgressFor === monthKey) return;

  state.monthMirrorInProgressFor = monthKey;

  try {
    const batch = db.batch();
    let writeCount = 0;

    previousMonthTransactions.forEach((transaction) => {
      const mirroredTransaction = cloneTransactionToMonth(
        transaction,
        state.currentYear,
        state.currentMonth
      );

      if (!mirroredTransaction) return;

      const ref = db.collection('transactions').doc();
      batch.set(ref, mirroredTransaction);
      writeCount += 1;
    });

    if (writeCount > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error('Erro ao espelhar contas do mês anterior:', error);
  } finally {
    state.monthMirrorInProgressFor = null;
  }
}

export function refreshTransactions() {
  if (!state.currentUser) return;

  if (state.transactionsUnsub) {
    state.transactionsUnsub();
  }

  dom.pendingContainer.style.display = 'none';
  dom.pendingList.innerHTML = '';
  dom.completedList.innerHTML = '<li class="empty-state">A carregar...</li>';

  state.transactionsUnsub = db
    .collection('transactions')
    .where('uid', '==', state.currentUser.uid)
    .onSnapshot(
      (snapshot) => {
        const allTransactions = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));

        const transactions = allTransactions
          .filter(isTransactionInSelectedMonth)
          .sort(sortTransactionsByDateDesc);

        if (
          transactions.length === 0 &&
          state.monthMirrorInProgressFor !== getMonthKey(state.currentYear, state.currentMonth)
        ) {
          const previousMonthContext = getPreviousMonthContext();
          const previousMonthTransactions = allTransactions.filter((transaction) => {
            const parsedDate = new Date(`${transaction.date}T00:00:00`);
            return (
              !Number.isNaN(parsedDate.getTime()) &&
              parsedDate.getFullYear() === previousMonthContext.year &&
              parsedDate.getMonth() === previousMonthContext.month
            );
          });

          if (previousMonthTransactions.length > 0) {
            dom.completedList.innerHTML = '<li class="empty-state">Espelhando contas do mês anterior...</li>';
            void seedCurrentMonthFromPreviousMonth(previousMonthTransactions);
            return;
          }
        }

        state.visibleTransactions = transactions;
        renderTransactions(transactions);
        updateSummary(transactions);
      },
      (error) => {
        console.error('Erro ao carregar transações:', error);
        state.visibleTransactions = [];
        dom.completedList.innerHTML = '<li class="empty-state">Erro ao carregar dados.</li>';
      }
    );
}

function renderTransactions(transactions) {
  const pendingExpenses = transactions.filter((transaction) => {
    return transaction.type === 'expense' && transaction.status === 'pending';
  });

  const completedTransactions = transactions.filter((transaction) => {
    return transaction.type === 'income' || transaction.status === 'paid';
  });

  if (pendingExpenses.length > 0) {
    dom.pendingContainer.style.display = 'block';
    dom.pendingList.innerHTML = pendingExpenses.map((transaction) => renderTransactionItem(transaction, true)).join('');
  } else {
    dom.pendingContainer.style.display = 'none';
    dom.pendingList.innerHTML = '';
  }

  if (completedTransactions.length > 0) {
    dom.completedList.innerHTML = completedTransactions.map((transaction) => renderTransactionItem(transaction, false)).join('');
  } else if (pendingExpenses.length === 0) {
    dom.completedList.innerHTML = '<li class="empty-state">Nenhuma transação registada para este mês.</li>';
  } else {
    dom.completedList.innerHTML = '';
  }
}

function renderTransactionItem(transaction, isPending) {
  const iconClass = categoryIcons[transaction.category] || 'fa-question-circle';
  const sign = transaction.type === 'expense' ? '-' : '+';
  let actionButtons = '';

  if (isPending) {
    actionButtons = `
      <button class="pay-btn" type="button" data-id="${escapeHtml(transaction.id)}">Marcar como Pago</button>
    `;
  } else if (transaction.type === 'expense') {
    actionButtons = `
      <button class="unpay-btn" type="button" title="Marcar como pendente" data-id="${escapeHtml(transaction.id)}">
        <i class="fas fa-undo"></i>
      </button>
    `;
  }

  return `
    <li class="transaction-item ${escapeHtml(transaction.status)}" data-id="${escapeHtml(transaction.id)}">
      <div class="transaction-details">
        <div class="transaction-icon ${escapeHtml(transaction.type)}">
          <i class="fas ${escapeHtml(iconClass)}"></i>
        </div>
        <div>
          <div class="description">${escapeHtml(transaction.description)}</div>
          <div class="category">${escapeHtml(transaction.category)}</div>
        </div>
      </div>
      <div class="transaction-right">
        <div class="amount-date">
          <div class="amount ${escapeHtml(transaction.type)}">${sign} ${formatCurrency(transaction.amount)}</div>
          <div class="date">${escapeHtml(formatDisplayDate(transaction.date))}</div>
        </div>
        <div class="action-buttons">
          ${actionButtons}
          <button class="edit-btn" type="button" data-id="${escapeHtml(transaction.id)}" aria-label="Editar transação">
            <i class="fas fa-pencil-alt"></i>
          </button>
          <button class="delete-btn" type="button" data-id="${escapeHtml(transaction.id)}" aria-label="Excluir transação">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </li>
  `;
}

function updateSummary(transactions) {
  const totalIncome = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  const totalExpense = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  const paidExpenses = transactions
    .filter((transaction) => transaction.type === 'expense' && transaction.status === 'paid')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  const balance = totalIncome - paidExpenses;

  dom.totalIncomeEl.textContent = formatCurrency(totalIncome);
  dom.totalExpenseEl.textContent = formatCurrency(totalExpense);
  dom.balanceEl.textContent = formatCurrency(balance);
  setBalanceCardState(balance);
}

export function handleTransactionListClick(event) {
  const payButton = event.target.closest('.pay-btn');
  if (payButton) {
    toggleTransactionStatus(payButton.dataset.id, 'paid');
    return;
  }

  const unpayButton = event.target.closest('.unpay-btn');
  if (unpayButton) {
    toggleTransactionStatus(unpayButton.dataset.id, 'pending');
    return;
  }

  const deleteButton = event.target.closest('.delete-btn');
  if (deleteButton) {
    state.transactionIdToDelete = deleteButton.dataset.id;
    openModal(dom.deleteConfirmModal);
    return;
  }

  const editButton = event.target.closest('.edit-btn');
  if (!editButton) return;

  const transaction = state.visibleTransactions.find((item) => item.id === editButton.dataset.id);
  if (transaction) {
    openEditModal(transaction);
  }
}

function toggleTransactionStatus(id, newStatus) {
  db.collection('transactions')
    .doc(id)
    .update({ status: newStatus })
    .catch(() => {
      alert('Não foi possível atualizar o estado da transação.');
    });
}

export function openEditModal(transaction) {
  dom.editId.value = transaction.id;
  dom.editDescription.value = transaction.description;
  dom.editAmount.value = transaction.amount;
  dom.editDate.value = transaction.date;
  dom.editType.value = transaction.type;
  populateCategorySelector(transaction.type, dom.editCategory, transaction.category);
  dom.editStatus.value = transaction.status || 'pending';
  dom.editOriginalType.value = transaction.type;
  dom.editOriginalStatus.value = transaction.status || 'pending';
  dom.editRecurringCheckbox.checked = transaction.recurring !== false;
  openModal(dom.editModal);
}

function getTransactionStatusForEdit(originalType, originalStatus, newType) {
  if (newType === 'income') return 'paid';
  if (originalType !== newType) return 'pending';
  return originalStatus === 'paid' ? 'paid' : 'pending';
}

export function handleEditFormSubmit(event) {
  event.preventDefault();

  const id = dom.editId.value;
  const description = dom.editDescription.value.trim();
  const amount = Number.parseFloat(dom.editAmount.value);
  const date = dom.editDate.value;
  const type = dom.editType.value;
  const category = dom.editCategory.value;
  const recurring = dom.editRecurringCheckbox.checked;
  const originalType = dom.editOriginalType.value;
  const originalStatus = dom.editOriginalStatus.value;
  const status = getTransactionStatusForEdit(originalType, originalStatus, type);

  if (!description || Number.isNaN(amount) || amount <= 0 || !date) {
    alert('Por favor, preencha todos os campos com valores válidos.');
    return;
  }

  db.collection('transactions')
    .doc(id)
    .update({
      description,
      amount,
      date,
      type,
      category,
      recurring,
      status
    })
    .then(() => {
      closeModal(dom.editModal);
    })
    .catch(() => {
      alert('Não foi possível guardar as alterações.');
    });
}

export function handleAddTransaction(event) {
  event.preventDefault();

  const description = dom.addDescription.value.trim();
  const amount = Number.parseFloat(dom.addAmount.value);
  const date = dom.addDate.value;
  const type = dom.typeSelect.value;
  const category = dom.categorySelect.value;
  const recurring = dom.recurringCheckbox.checked;

  if (!description || Number.isNaN(amount) || amount <= 0 || !date) {
    alert('Por favor, preencha todos os campos com valores válidos.');
    return;
  }

  db.collection('transactions')
    .add({
      uid: state.currentUser.uid,
      description,
      amount,
      date,
      type,
      category,
      recurring,
      status: type === 'expense' ? 'pending' : 'paid',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      resetTransactionForm();
      toggleAddTransactionForm(false);
    })
    .catch(() => {
      alert('Não foi possível adicionar a transação.');
    });
}

export function handleDeleteConfirmation() {
  if (!state.transactionIdToDelete) return;

  db.collection('transactions')
    .doc(state.transactionIdToDelete)
    .delete()
    .catch(() => {
      alert('Não foi possível apagar a transação.');
    });

  state.transactionIdToDelete = null;
  closeModal(dom.deleteConfirmModal);
}
