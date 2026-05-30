import { auth, firebase } from './js/firebase.js';
import { dom } from './js/dom.js';
import { state } from './js/state.js';
import { populateCategorySelector, setVisible } from './js/utils.js';
import { showAuthView, showAppView, populateDateSelectors } from './js/ui.js';
import { bindTransactionListeners, refreshTransactions } from './js/transactions.js';
import { bindTemplateListeners, fetchTemplates } from './js/templates.js';

function teardownSubscriptions() {
  if (state.transactionsUnsub) {
    state.transactionsUnsub();
    state.transactionsUnsub = null;
  }

  if (state.templatesUnsub) {
    state.templatesUnsub();
    state.templatesUnsub = null;
  }
}

function initializeAppInterface() {
  populateDateSelectors();
  populateCategorySelector(dom.typeSelect.value, dom.categorySelect);
  populateCategorySelector(dom.templateType.value, dom.templateCategory);
  bindTransactionListeners();
  bindTemplateListeners();
  fetchTemplates();
  refreshTransactions();
}

auth.onAuthStateChanged((user) => {
  if (user) {
    state.currentUser = user;
    showAppView(user);
    initializeAppInterface();
  } else {
    state.currentUser = null;
    teardownSubscriptions();
    showAuthView();
  }
});

dom.loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  auth.signInWithEmailAndPassword(dom.loginEmail.value, dom.loginPassword.value)
    .catch((error) => alert(error.message));
});

dom.registerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  auth.createUserWithEmailAndPassword(dom.registerEmail.value, dom.registerPassword.value)
    .catch((error) => alert(error.message));
});

const signInWithGoogle = () => {
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
    .catch((error) => alert(error.message));
};

dom.googleSignInBtnLogin.addEventListener('click', signInWithGoogle);
dom.googleSignInBtnRegister.addEventListener('click', signInWithGoogle);
dom.logoutButton.addEventListener('click', () => auth.signOut());

dom.showRegister.addEventListener('click', (event) => {
  event.preventDefault();
  setVisible(dom.loginContainer, false);
  setVisible(dom.registerContainer, true, 'block');
});

dom.showLogin.addEventListener('click', (event) => {
  event.preventDefault();
  setVisible(dom.registerContainer, false);
  setVisible(dom.loginContainer, true, 'block');
});
