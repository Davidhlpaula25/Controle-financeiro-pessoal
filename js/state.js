export const state = {
  currentUser: null,
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  transactionsUnsub: null,
  templatesUnsub: null,
  transactionIdToDelete: null,
  templateIdToDelete: null,
  visibleTransactions: [],
  userTemplates: [],
  transactionListenersBound: false,
  templateListenersBound: false,
  monthMirrorInProgressFor: null
};
