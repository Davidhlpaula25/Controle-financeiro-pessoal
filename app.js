// Configuração do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAbWl64wzFmDJ26XhgH41I5Gdp1F2l3Jmg",
  authDomain: "meu-controle-financeiro-d01e9.firebaseapp.com",
  projectId: "meu-controle-financeiro-d01e9",
  storageBucket: "meu-controle-financeiro-d01e9.appspot.com",
  messagingSenderId: "1028629675716",
  appId: "1:1028629675716:web:7d0e279b8cec22f2e4d391",
  measurementId: "G-7463KD4JBB"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Seletores do DOM ---
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const googleSignInBtnLogin = document.getElementById('google-signin-btn-login');
const googleSignInBtnRegister = document.getElementById('google-signin-btn-register');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const userEmailSpan = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');
const manageTemplatesBtn = document.getElementById('manage-templates-btn');
const monthSelect = document.getElementById('month');
const yearInput = document.getElementById('year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const balanceEl = document.getElementById('balance');
const pendingContainer = document.getElementById('pending-container');
const pendingList = document.getElementById('pending-list');
const completedList = document.getElementById('completed-list');
const showAddFormBtn = document.getElementById('show-add-transaction-form');
const transactionFormContainer = document.getElementById('transaction-form-container');
const addTransactionForm = document.getElementById('add-transaction-form');
const typeSelect = document.getElementById('type');
const categorySelect = document.getElementById('category');
const useTemplateBtn = document.getElementById('use-template-btn');

// Modais
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-transaction-form');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const templatesModal = document.getElementById('templates-modal');
const closeTemplatesModalBtn = document.getElementById('close-templates-modal-btn');
const templatesListContainer = document.getElementById('templates-list');
const addTemplateForm = document.getElementById('add-template-form');
const deleteTemplateConfirmModal = document.getElementById('delete-template-confirm-modal');
const confirmDeleteTemplateBtn = document.getElementById('confirm-delete-template-btn');
const cancelDeleteTemplateBtn = document.getElementById('cancel-delete-template-btn');


// --- Estado da Aplicação ---
let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let unsubscribeTransactions;
let unsubscribeTemplates;
let transactionIdToDelete = null;
let templateIdToDelete = null;
let userTemplates = [];

const categories = {
    income: ['Salário', 'Freelance', 'Investimentos', 'Vendas', 'Outros'],
    expense: ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Compras', 'Contas', 'Outros']
};
const categoryIcons = { 'Salário': 'fa-money-bill-wave', 'Freelance': 'fa-briefcase', 'Investimentos': 'fa-chart-line', 'Vendas': 'fa-tags', 'Alimentação': 'fa-utensils', 'Moradia': 'fa-home', 'Transporte': 'fa-car', 'Saúde': 'fa-heartbeat', 'Lazer': 'fa-gamepad', 'Educação': 'fa-graduation-cap', 'Compras': 'fa-shopping-cart', 'Contas': 'fa-file-invoice-dollar', 'Outros': 'fa-ellipsis-h' };

// --- Autenticação ---
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        authContainer.style.display = 'none'; appContainer.style.display = 'block';
        userEmailSpan.textContent = user.displayName || user.email;
        initializeAppInterface();
    } else {
        currentUser = null;
        authContainer.style.display = 'flex'; appContainer.style.display = 'none';
        if (unsubscribeTransactions) unsubscribeTransactions();
        if (unsubscribeTemplates) unsubscribeTemplates();
    }
});
loginForm.addEventListener('submit', (e) => { e.preventDefault(); auth.signInWithEmailAndPassword(loginForm.querySelector('#login-email').value, loginForm.querySelector('#login-password').value).catch(err => alert(err.message)); });
registerForm.addEventListener('submit', (e) => { e.preventDefault(); auth.createUserWithEmailAndPassword(registerForm.querySelector('#register-email').value, registerForm.querySelector('#register-password').value).catch(err => alert(err.message)); });
const signInWithGoogle = () => { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(err => alert(err.message)); };
googleSignInBtnLogin.addEventListener('click', signInWithGoogle);
googleSignInBtnRegister.addEventListener('click', signInWithGoogle);
logoutButton.addEventListener('click', () => auth.signOut());
showRegister.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('login-container').style.display = 'none'; document.getElementById('register-container').style.display = 'block'; });
showLogin.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('register-container').style.display = 'none'; document.getElementById('login-container').style.display = 'block'; });

// --- Lógica Principal ---
function initializeAppInterface() {
    populateDateSelectors();
    populateCategorySelector(typeSelect.value, categorySelect);
    setupListeners();
    fetchTemplates();
    updateTransactions();
}

function setupListeners() {
    monthSelect.addEventListener('change', handleDateChange);
    yearInput.addEventListener('change', handleDateChange);
    prevMonthBtn.addEventListener('click', goToPrevMonth);
    nextMonthBtn.addEventListener('click', goToNextMonth);
    typeSelect.addEventListener('change', () => populateCategorySelector(typeSelect.value, categorySelect));
    editForm.addEventListener('submit', handleEditFormSubmit);
    cancelEditBtn.addEventListener('click', () => editModal.style.display = 'none');
    confirmDeleteBtn.addEventListener('click', handleDeleteConfirmation);
    cancelDeleteBtn.addEventListener('click', () => deleteConfirmModal.style.display = 'none');
    manageTemplatesBtn.addEventListener('click', () => templatesModal.style.display = 'flex');
    closeTemplatesModalBtn.addEventListener('click', () => templatesModal.style.display = 'none');
    addTemplateForm.addEventListener('submit', handleAddTemplate);
    document.getElementById('template-type').addEventListener('change', (e) => populateCategorySelector(e.target.value, document.getElementById('template-category')));
    useTemplateBtn.addEventListener('click', () => templatesModal.style.display = 'flex');
    confirmDeleteTemplateBtn.addEventListener('click', handleDeleteTemplateConfirmation);
    cancelDeleteTemplateBtn.addEventListener('click', () => deleteTemplateConfirmModal.style.display = 'none');
}

function handleDateChange() { currentMonth = parseInt(monthSelect.value); currentYear = parseInt(yearInput.value); updateTransactions(); }
const goToPrevMonth = () => { if (currentMonth === 0) { currentMonth = 11; currentYear--; } else { currentMonth--; } populateDateSelectors(); updateTransactions(); };
const goToNextMonth = () => { if (currentMonth === 11) { currentMonth = 0; currentYear++; } else { currentMonth++; } populateDateSelectors(); updateTransactions(); };
function populateDateSelectors() { const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]; monthSelect.innerHTML = months.map((m, i) => `<option value="${i}">${m}</option>`).join(''); monthSelect.value = currentMonth; yearInput.value = currentYear; document.getElementById('date').valueAsDate = new Date(); }
function populateCategorySelector(type, selectorElement, selectedCategory = null) { selectorElement.innerHTML = categories[type].map(c => `<option value="${c}">${c}</option>`).join(''); if (selectedCategory) selectorElement.value = selectedCategory; }

// --- Lógica de Modelos ---
function fetchTemplates() {
    if (unsubscribeTemplates) unsubscribeTemplates();
    unsubscribeTemplates = db.collection('templates').where('uid', '==', currentUser.uid)
        .onSnapshot(snapshot => {
            userTemplates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderTemplatesList();
        });
}

function renderTemplatesList() {
    populateCategorySelector('expense', document.getElementById('template-category'));
    if (userTemplates.length > 0) {
        templatesListContainer.innerHTML = userTemplates.map(t => `
            <div class="template-item" data-id="${t.id}">
                <span>${t.description} (R$ ${t.amount.toFixed(2)})</span>
                <button class="delete-template-btn" data-id="${t.id}"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');
    } else {
        templatesListContainer.innerHTML = '<p>Nenhum modelo guardado.</p>';
    }
    document.querySelectorAll('.delete-template-btn').forEach(btn => btn.addEventListener('click', openDeleteTemplateConfirmation));
    document.querySelectorAll('.template-item').forEach(item => item.addEventListener('click', handleUseTemplate));
}

function handleAddTemplate(e) {
    e.preventDefault();
    const newTemplate = {
        uid: currentUser.uid,
        description: document.getElementById('template-description').value.trim(),
        amount: parseFloat(document.getElementById('template-amount').value),
        type: document.getElementById('template-type').value,
        category: document.getElementById('template-category').value
    };
    if (newTemplate.description && !isNaN(newTemplate.amount) && newTemplate.amount > 0) {
        db.collection('templates').add(newTemplate).then(() => addTemplateForm.reset());
    } else {
        alert("Por favor, preencha a descrição e um valor válido.");
    }
}

function openDeleteTemplateConfirmation(e) {
    e.stopPropagation();
    templateIdToDelete = e.currentTarget.dataset.id;
    deleteTemplateConfirmModal.style.display = 'flex';
}

function handleDeleteTemplateConfirmation() {
    if (templateIdToDelete) {
        db.collection('templates').doc(templateIdToDelete).delete()
            .catch(error => alert("Não foi possível apagar o modelo."));
        deleteTemplateConfirmModal.style.display = 'none';
        templateIdToDelete = null;
    }
}

function handleUseTemplate(e) {
    if (e.target.closest('.delete-template-btn')) return;
    const id = e.currentTarget.dataset.id;
    const template = userTemplates.find(t => t.id === id);
    if (template) {
        typeSelect.value = template.type;
        populateCategorySelector(template.type, categorySelect, template.category);
        addTransactionForm.description.value = template.description;
        addTransactionForm.amount.value = template.amount;
        templatesModal.style.display = 'none';
        if (transactionFormContainer.style.display === 'none') {
            showAddFormBtn.click();
        }
    }
}

// --- Lógica de Transações ---
showAddFormBtn.addEventListener('click', () => { const isVisible = transactionFormContainer.style.display === 'block'; transactionFormContainer.style.display = isVisible ? 'none' : 'block'; showAddFormBtn.innerHTML = isVisible ? '<i class="fas fa-plus"></i> Adicionar Transação' : '<i class="fas fa-times"></i> Fechar'; });
addTransactionForm.addEventListener('submit', (e) => { e.preventDefault(); const type = typeSelect.value; const newTransaction = { uid: currentUser.uid, description: document.getElementById('description').value, amount: parseFloat(document.getElementById('amount').value), date: document.getElementById('date').value, type: type, category: categorySelect.value, status: type === 'expense' ? 'pending' : 'paid', createdAt: firebase.firestore.FieldValue.serverTimestamp() }; if (!newTransaction.description || isNaN(newTransaction.amount) || !newTransaction.date || newTransaction.amount <= 0) { return alert("Por favor, preencha todos os campos com valores válidos."); } db.collection("transactions").add(newTransaction).then(() => { addTransactionForm.reset(); document.getElementById('date').valueAsDate = new Date(); transactionFormContainer.style.display = 'none'; showAddFormBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Transação'; }).catch(error => alert("Não foi possível adicionar a transação.")); });
async function updateTransactions() { if (!currentUser) return; if (unsubscribeTransactions) unsubscribeTransactions(); completedList.innerHTML = '<li>A carregar...</li>'; const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]; const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]; unsubscribeTransactions = db.collection("transactions").where("uid", "==", currentUser.uid).where("date", ">=", startDate).where("date", "<=", endDate).orderBy("date", "desc").onSnapshot(querySnapshot => { const transactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); renderTransactions(transactions); updateSummary(transactions); }, error => { console.error("Erro ao procurar transações:", error); completedList.innerHTML = '<li>Erro ao carregar dados.</li>'; }); }
function renderTransactions(transactions) { const pendingExpenses = transactions.filter(t => t.type === 'expense' && t.status === 'pending'); const completedTransactions = transactions.filter(t => t.type === 'income' || t.status === 'paid'); if (pendingExpenses.length > 0) { pendingContainer.style.display = 'block'; pendingList.innerHTML = pendingExpenses.map(t => renderTransactionItem(t, true)).join(''); } else { pendingContainer.style.display = 'none'; } if (completedTransactions.length > 0) { completedList.innerHTML = completedTransactions.map(t => renderTransactionItem(t, false)).join(''); } else if (pendingExpenses.length === 0) { completedList.innerHTML = '<li>Nenhuma transação registada para este mês.</li>'; } document.querySelectorAll('.pay-btn').forEach(btn => btn.addEventListener('click', e => toggleTransactionStatus(e.currentTarget.dataset.id, 'paid'))); document.querySelectorAll('.unpay-btn').forEach(btn => btn.addEventListener('click', e => toggleTransactionStatus(e.currentTarget.dataset.id, 'pending'))); document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', e => openDeleteConfirmation(e.currentTarget.dataset.id))); document.querySelectorAll('.edit-btn').forEach(btn => { const transaction = transactions.find(t => t.id === btn.dataset.id); btn.addEventListener('click', () => openEditModal(transaction)); }); }
function renderTransactionItem(t, isPending) { const iconClass = categoryIcons[t.category] || 'fa-question-circle'; const sign = t.type === 'expense' ? '-' : '+'; let actionButtonsHTML = ''; if (isPending) { actionButtonsHTML = `<button class="pay-btn" data-id="${t.id}">Marcar como Pago</button>`; } else if (t.type === 'expense') { actionButtonsHTML = `<button class="unpay-btn" title="Marcar como Pendente" data-id="${t.id}"><i class="fas fa-undo"></i></button>`; } return ` <li class="transaction-item ${t.status}" data-id="${t.id}"> <div class="transaction-details"> <div class="transaction-icon ${t.type}"><i class="fas ${iconClass}"></i></div> <div> <div class="description">${t.description}</div> <div class="category">${t.category}</div> </div> </div> <div class="transaction-right"> <div class="amount-date"> <div class="amount ${t.type}">${sign} R$ ${t.amount.toFixed(2).replace('.', ',')}</div> <div class="date">${new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</div> </div> <div class="action-buttons"> ${actionButtonsHTML} <button class="edit-btn" data-id="${t.id}"><i class="fas fa-pencil-alt"></i></button> <button class="delete-btn" data-id="${t.id}"><i class="fas fa-trash"></i></button> </div> </div> </li>`; }
function updateSummary(transactions) { const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0); const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0); const paidExpenses = transactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((sum, t) => sum + t.amount, 0); const balance = totalIncome - paidExpenses; totalIncomeEl.textContent = `R$ ${totalIncome.toFixed(2).replace('.', ',')}`; totalExpenseEl.textContent = `R$ ${totalExpense.toFixed(2).replace('.', ',')}`; balanceEl.textContent = `R$ ${balance.toFixed(2).replace('.', ',')}`; const balanceCard = balanceEl.closest('.card'); if (balance < 0) { balanceCard.classList.add('expense'); balanceCard.classList.remove('income', 'balance'); } else { balanceCard.classList.add('balance'); balanceCard.classList.remove('expense'); } }
function toggleTransactionStatus(id, newStatus) { db.collection('transactions').doc(id).update({ status: newStatus }); }
function openDeleteConfirmation(id) { transactionIdToDelete = id; deleteConfirmModal.style.display = 'flex'; }
function handleDeleteConfirmation() { if (transactionIdToDelete) { db.collection('transactions').doc(transactionIdToDelete).delete().catch(error => alert("Não foi possível apagar a transação.")); deleteConfirmModal.style.display = 'none'; transactionIdToDelete = null; } }
function openEditModal(transaction) { editModal.style.display = 'flex'; editForm.querySelector('#edit-id').value = transaction.id; editForm.querySelector('#edit-description').value = transaction.description; editForm.querySelector('#edit-amount').value = transaction.amount; editForm.querySelector('#edit-date').value = transaction.date; editForm.querySelector('#edit-type').value = transaction.type; populateCategorySelector(transaction.type, editForm.querySelector('#edit-category'), transaction.category); }
function handleEditFormSubmit(e) { e.preventDefault(); const id = editForm.querySelector('#edit-id').value; const updatedTransaction = { description: editForm.querySelector('#edit-description').value, amount: parseFloat(editForm.querySelector('#edit-amount').value), date: editForm.querySelector('#edit-date').value, type: editForm.querySelector('#edit-type').value, category: editForm.querySelector('#edit-category').value, }; if (!updatedTransaction.description || isNaN(updatedTransaction.amount) || !updatedTransaction.date || updatedTransaction.amount <= 0) { return alert("Por favor, preencha todos os campos com valores válidos."); } db.collection('transactions').doc(id).update(updatedTransaction).then(() => { editModal.style.display = 'none'; }).catch(error => { alert("Não foi possível guardar as alterações."); }); }