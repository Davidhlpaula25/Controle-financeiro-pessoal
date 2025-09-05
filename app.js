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

// Inicializa o Firebase usando a sintaxe compatível
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

// Botões de Login com Google
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

// Modal de Edição
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-transaction-form');
const cancelEditBtn = document.getElementById('cancel-edit-btn');


// --- Estado da Aplicação ---
let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let unsubscribe; // Para o listener do Firestore e evitar memory leaks

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
        userEmailSpan.textContent = user.displayName || user.email; // Mostra o nome do Google, se disponível
        initializeAppInterface();
    } else {
        currentUser = null;
        authContainer.style.display = 'flex';
        appContainer.style.display = 'none';
        if(unsubscribe) unsubscribe(); 
    }
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    auth.signInWithEmailAndPassword(email, password)
        .catch(error => {
            alert("Erro ao fazer login: " + error.message);
        });
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    auth.createUserWithEmailAndPassword(email, password)
        .catch(error => {
            alert("Erro ao cadastrar: " + error.message);
        });
});

// --- Lógica de Login com Google ---
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .catch(error => {
            console.error("Erro ao fazer login com Google:", error);
            alert("Erro: " + error.message);
        });
}

googleSignInBtnLogin.addEventListener('click', signInWithGoogle);
googleSignInBtnRegister.addEventListener('click', signInWithGoogle);
// --- Fim da Lógica de Login com Google ---

logoutButton.addEventListener('click', () => {
    auth.signOut();
});

showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('register-container').style.display = 'block';
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'block';
});


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
    
    // Listeners do modal de edição
    document.getElementById('edit-type').addEventListener('change', () => populateCategorySelector(document.getElementById('edit-type').value, document.getElementById('edit-category')));
    cancelEditBtn.addEventListener('click', () => editModal.style.display = 'none');
}

function handleDateChange() {
    currentMonth = parseInt(monthSelect.value);
    currentYear = parseInt(yearInput.value);
    updateTransactions();
}

function goToPrevMonth() {
    if (currentMonth === 0) {
        currentMonth = 11;
        currentYear--;
    } else {
        currentMonth--;
    }
    populateDateSelectors();
    updateTransactions();
}

function goToNextMonth() {
    if (currentMonth === 11) {
        currentMonth = 0;
        currentYear++;
    } else {
        currentMonth++;
    }
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
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    const type = document.getElementById('type').value;
    const category = document.getElementById('category').value;

    if (!description || isNaN(amount) || !date || amount <= 0) {
        alert("Por favor, preencha todos os campos com valores válidos.");
        return;
    }

    db.collection("transactions").add({
        uid: currentUser.uid,
        description,
        amount,
        date,
        type,
        category,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        addTransactionForm.reset();
        document.getElementById('date').valueAsDate = new Date();
        transactionFormContainer.style.display = 'none';
        showAddFormBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Transação';
    })
    .catch(error => {
        console.error("Erro ao adicionar transação: ", error);
        alert("Não foi possível adicionar a transação.");
    });
});

function updateTransactions() {
    if (!currentUser) return;
    
    if (unsubscribe) unsubscribe(); // Cancela o listener anterior

    transactionsHistoryList.innerHTML = '<li>Carregando...</li>';
    
    const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
    const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

    unsubscribe = db.collection("transactions")
        .where("uid", "==", currentUser.uid)
        .where("date", ">=", startDate)
        .where("date", "<=", endDate)
        .orderBy("date", "desc")
        .onSnapshot(querySnapshot => {
            const transactions = [];
            querySnapshot.forEach((doc) => {
                transactions.push({ id: doc.id, ...doc.data() });
            });
            renderTransactions(transactions);
            updateSummary(transactions);
        }, error => {
            console.error("Erro ao buscar transações:", error);
            transactionsHistoryList.innerHTML = '<li>Erro ao carregar dados.</li>';
        });
}

function renderTransactions(transactions) {
    transactionsHistoryList.innerHTML = '';
    
    if (transactions.length === 0) {
        transactionsHistoryList.innerHTML = '<li>Nenhuma transação registrada para este mês.</li>';
        return;
    }

    transactions.forEach(t => {
        const li = document.createElement('li');
        const iconClass = categoryIcons[t.category] || 'fa-question-circle';
        
        li.innerHTML = `
            <div class="transaction-details">
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
                    <button class="edit-btn" data-id="${t.id}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-btn" data-id="${t.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
        transactionsHistoryList.appendChild(li);

        // Adicionar eventos para os botões de ação
        li.querySelector('.delete-btn').addEventListener('click', () => deleteTransaction(t.id));
        li.querySelector('.edit-btn').addEventListener('click', () => openEditModal(t));
    });
}

function updateSummary(transactions) {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;

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

// --- Funções de Deletar e Editar ---

function deleteTransaction(id) {
    if (confirm("Tem certeza que deseja apagar esta transação?")) {
        db.collection('transactions').doc(id).delete()
            .catch(error => {
                console.error("Erro ao deletar transação:", error);
                alert("Não foi possível apagar a transação.");
            });
    }
}

function openEditModal(transaction) {
    editModal.style.display = 'flex';
    document.getElementById('edit-id').value = transaction.id;
    document.getElementById('edit-description').value = transaction.description;
    document.getElementById('edit-amount').value = transaction.amount;
    document.getElementById('edit-date').value = transaction.date;
    document.getElementById('edit-type').value = transaction.type;
    
    // Popula as categorias corretas e seleciona a atual
    populateCategorySelector(transaction.type, document.getElementById('edit-category'), transaction.category);
}

editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const updatedTransaction = {
        description: document.getElementById('edit-description').value,
        amount: parseFloat(document.getElementById('edit-amount').value),
        date: document.getElementById('edit-date').value,
        type: document.getElementById('edit-type').value,
        category: document.getElementById('edit-category').value,
    };
    
    if (!updatedTransaction.description || isNaN(updatedTransaction.amount) || !updatedTransaction.date || updatedTransaction.amount <= 0) {
        alert("Por favor, preencha todos os campos com valores válidos.");
        return;
    }

    db.collection('transactions').doc(id).update(updatedTransaction)
        .then(() => {
            editModal.style.display = 'none';
        })
        .catch(error => {
            console.error("Erro ao atualizar transação:", error);
            alert("Não foi possível salvar as alterações.");
        });
});