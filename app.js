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

// Inicializa o Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Seletores de Elementos do DOM ---
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const googleSignInBtnLogin = document.getElementById('google-signin-btn-login');
const googleSignInBtnRegister = document.getElementById('google-signin-btn-register');
const userEmailSpan = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');
const monthSelect = document.getElementById('month');
const yearInput = document.getElementById('year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const addTransactionForm = document.getElementById('add-transaction-form');
const typeSelect = document.getElementById('type');
const categorySelect = document.getElementById('category');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const balanceEl = document.getElementById('balance');
const transactionsHistoryList = document.getElementById('transactions-history-list');
const showAddFormBtn = document.getElementById('show-add-transaction-form');
const transactionFormContainer = document.getElementById('transaction-form-container');

// Modais
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-transaction-form');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

// --- Estado da Aplicação ---
let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let unsubscribe;
let transactionIdToDelete = null; // Guarda o ID da transação a ser apagada

const categories = {
    income: ['Salário', 'Freelance', 'Investimentos', 'Vendas', 'Outros'],
    expense: ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Compras', 'Contas', 'Outros']
};
const categoryIcons = {
    'Salário': 'fa-money-bill-wave', 'Freelance': 'fa-briefcase', 'Investimentos': 'fa-chart-line', 'Vendas': 'fa-tags',
    'Alimentação': 'fa-utensils', 'Moradia': 'fa-home', 'Transporte': 'fa-car', 'Saúde': 'fa-heartbeat', 'Lazer': 'fa-gamepad',
    'Educação': 'fa-graduation-cap', 'Compras': 'fa-shopping-cart', 'Contas': 'fa-file-invoice-dollar', 'Outros': 'fa-ellipsis-h'
};

// --- Lógica de Autenticação ---
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        userEmailSpan.textContent = user.displayName || user.email;
        initializeAppInterface();
    } else {
        currentUser = null;
        authContainer.style.display = 'flex';
        appContainer.style.display = 'none';
        if (unsubscribe) unsubscribe();
    }
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    auth.signInWithEmailAndPassword(email, password).catch(error => alert("Erro ao fazer login: " + error.message));
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    auth.createUserWithEmailAndPassword(email, password).catch(error => alert("Erro ao registar: " + error.message));
});

function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => alert("Erro ao fazer login com Google: " + error.message));
}

googleSignInBtnLogin.addEventListener('click', signInWithGoogle);
googleSignInBtnRegister.addEventListener('click', signInWithGoogle);
logoutButton.addEventListener('click', () => auth.signOut());
showRegister.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('login-container').style.display = 'none'; document.getElementById('register-container').style.display = 'block'; });
showLogin.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('register-container').style.display = 'none'; document.getElementById('login-container').style.display = 'block'; });

// --- Lógica Principal da Aplicação ---
function initializeAppInterface() {
    populateDateSelectors();
    populateCategorySelector(typeSelect.value, categorySelect);
    updateTransactions();

    monthSelect.addEventListener('change', handleDateChange);
    yearInput.addEventListener('change', handleDateChange);
    prevMonthBtn.addEventListener('click', goToPrevMonth);
    nextMonthBtn.addEventListener('click', goToNextMonth);
    typeSelect.addEventListener('change', () => populateCategorySelector(typeSelect.value, categorySelect));

    // Listeners dos Modais
    editForm.addEventListener('submit', handleEditFormSubmit);
    cancelEditBtn.addEventListener('click', () => editModal.style.display = 'none');
    confirmDeleteBtn.addEventListener('click', handleDeleteConfirmation);
    cancelDeleteBtn.addEventListener('click', () => deleteConfirmModal.style.display = 'none');
}

function handleDateChange() {
    currentMonth = parseInt(monthSelect.value);
    currentYear = parseInt(yearInput.value);
    updateTransactions();
}

function goToPrevMonth() {
    if (currentMonth === 0) { currentMonth = 11; currentYear--; } else { currentMonth--; }
    populateDateSelectors();
    updateTransactions();
}

function goToNextMonth() {
    if (currentMonth === 11) { currentMonth = 0; currentYear++; } else { currentMonth++; }
    populateDateSelectors();
    updateTransactions();
}

function populateDateSelectors() {
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    monthSelect.innerHTML = '';
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = month;
        monthSelect.appendChild(option);
    });
    monthSelect.value = currentMonth;
    yearInput.value = currentYear;
    document.getElementById('date').valueAsDate = new Date();
}

function populateCategorySelector(type, selectorElement, selectedCategory = null) {
    const currentCategories = categories[type];
    selectorElement.innerHTML = '';
    currentCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        selectorElement.appendChild(option);
    });
    if (selectedCategory) {
        selectorElement.value = selectedCategory;
    }
}

showAddFormBtn.addEventListener('click', () => {
    const isVisible = transactionFormContainer.style.display === 'block';
    transactionFormContainer.style.display = isVisible ? 'none' : 'block';
    showAddFormBtn.innerHTML = isVisible ? '<i class="fas fa-plus"></i> Adicionar Transação' : '<i class="fas fa-times"></i> Fechar';
});

addTransactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('type').value;
    const newTransaction = {
        uid: currentUser.uid,
        description: document.getElementById('description').value,
        amount: parseFloat(document.getElementById('amount').value),
        date: document.getElementById('date').value,
        type: type,
        category: document.getElementById('category').value,
        status: type === 'expense' ? 'pending' : 'paid',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!newTransaction.description || isNaN(newTransaction.amount) || !newTransaction.date || newTransaction.amount <= 0) {
        return alert("Por favor, preencha todos os campos com valores válidos.");
    }

    db.collection("transactions").add(newTransaction)
        .then(() => {
            addTransactionForm.reset();
            document.getElementById('date').valueAsDate = new Date();
            transactionFormContainer.style.display = 'none';
            showAddFormBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Transação';
        })
        .catch(error => alert("Não foi possível adicionar a transação."));
});

function updateTransactions() {
    if (!currentUser) return;
    if (unsubscribe) unsubscribe();

    transactionsHistoryList.innerHTML = '<li>A carregar...</li>';
    const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
    const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

    unsubscribe = db.collection("transactions")
        .where("uid", "==", currentUser.uid)
        .where("date", ">=", startDate)
        .where("date", "<=", endDate)
        .orderBy("date", "desc")
        .onSnapshot(querySnapshot => {
            const transactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderTransactions(transactions);
            updateSummary(transactions);
        }, error => {
            console.error("Erro ao procurar transações:", error);
            transactionsHistoryList.innerHTML = '<li>Erro ao carregar dados.</li>';
        });
}

function renderTransactions(transactions) {
    transactionsHistoryList.innerHTML = '';
    if (transactions.length === 0) {
        transactionsHistoryList.innerHTML = '<li>Nenhuma transação registada para este mês.</li>';
        return;
    }

    transactions.forEach(t => {
        const li = document.createElement('li');
        li.className = t.status === 'pending' ? 'pending' : '';
        const iconClass = categoryIcons[t.category] || 'fa-question-circle';

        const statusIcon = t.type === 'expense'
            ? `<span class="status-toggle" data-id="${t.id}" data-status="${t.status}">
                 <i class="fas ${t.status === 'paid' ? 'fa-check-circle' : 'fa-circle'}"></i>
               </span>`
            : '';

        li.innerHTML = `
            <div class="transaction-details">
                ${statusIcon}
                <div class="transaction-icon ${t.type}">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div>
                    <div class="description">${t.description}</div>
                    <div class="category">${t.category}</div>
                </div>
            </div>
            <div class="transaction-right">
                <div class="amount-date">
                     <div class="amount ${t.type}">
                        ${t.type === 'expense' ? '-' : '+'} R$ ${t.amount.toFixed(2).replace('.', ',')}
                    </div>
                     <div class="date">${new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                </div>
                <div class="action-buttons">
                    <button class="edit-btn"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-btn"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        transactionsHistoryList.appendChild(li);

        li.querySelector('.delete-btn').addEventListener('click', () => openDeleteConfirmation(t.id));
        li.querySelector('.edit-btn').addEventListener('click', () => openEditModal(t));
        if (t.type === 'expense') {
            li.querySelector('.status-toggle').addEventListener('click', toggleTransactionStatus);
        }
    });
}

function updateSummary(transactions) {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const paidExpenses = transactions
        .filter(t => t.type === 'expense' && t.status === 'paid')
        .reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - paidExpenses;

    totalIncomeEl.textContent = `R$ ${totalIncome.toFixed(2).replace('.', ',')}`;
    totalExpenseEl.textContent = `R$ ${totalExpense.toFixed(2).replace('.', ',')}`;
    balanceEl.textContent = `R$ ${balance.toFixed(2).replace('.', ',')}`;

    const balanceCard = balanceEl.closest('.card');
    if (balance < 0) {
        balanceCard.classList.add('expense');
        balanceCard.classList.remove('income', 'balance');
    } else {
        balanceCard.classList.add('balance');
        balanceCard.classList.remove('expense');
    }
}

// --- Funções de Apagar, Editar e Mudar Status ---

function toggleTransactionStatus(event) {
    const id = event.currentTarget.dataset.id;
    const currentStatus = event.currentTarget.dataset.status;
    const newStatus = currentStatus === 'pending' ? 'paid' : 'pending';
    db.collection('transactions').doc(id).update({ status: newStatus });
}

function openDeleteConfirmation(id) {
    transactionIdToDelete = id;
    deleteConfirmModal.style.display = 'flex';
}

function handleDeleteConfirmation() {
    if (transactionIdToDelete) {
        db.collection('transactions').doc(transactionIdToDelete).delete()
            .catch(error => alert("Não foi possível apagar a transação."));
        
        deleteConfirmModal.style.display = 'none';
        transactionIdToDelete = null;
    }
}

function openEditModal(transaction) {
    editModal.style.display = 'flex';
    editForm.querySelector('#edit-id').value = transaction.id;
    editForm.querySelector('#edit-description').value = transaction.description;
    editForm.querySelector('#edit-amount').value = transaction.amount;
    editForm.querySelector('#edit-date').value = transaction.date;
    editForm.querySelector('#edit-type').value = transaction.type;
    populateCategorySelector(transaction.type, editForm.querySelector('#edit-category'), transaction.category);
}

function handleEditFormSubmit(e) {
    e.preventDefault();
    const id = editForm.querySelector('#edit-id').value;
    const updatedTransaction = {
        description: editForm.querySelector('#edit-description').value,
        amount: parseFloat(editForm.querySelector('#edit-amount').value),
        date: editForm.querySelector('#edit-date').value,
        type: editForm.querySelector('#edit-type').value,
        category: editForm.querySelector('#edit-category').value,
    };

    if (!updatedTransaction.description || isNaN(updatedTransaction.amount) || !updatedTransaction.date || updatedTransaction.amount <= 0) {
        return alert("Por favor, preencha todos os campos com valores válidos.");
    }

    db.collection('transactions').doc(id).update(updatedTransaction)
        .then(() => editModal.style.display = 'none')
        .catch(error => alert("Não foi possível guardar as alterações."));
}