import { db } from './firebase.js';
import { dom } from './dom.js';
import { state } from './state.js';
import { escapeHtml, formatCurrency, populateCategorySelector } from './utils.js';
import { openModal, closeModal, toggleAddTransactionForm, resetTemplateForm } from './ui.js';

export function bindTemplateListeners() {
  if (state.templateListenersBound) return;
  state.templateListenersBound = true;

  dom.manageTemplatesBtn.addEventListener('click', () => openModal(dom.templatesModal));
  dom.useTemplateBtn.addEventListener('click', () => openModal(dom.templatesModal));
  dom.closeTemplatesModalBtn.addEventListener('click', () => closeModal(dom.templatesModal));
  dom.templateType.addEventListener('change', () => {
    const selectedCategory = dom.templateCategory.value;
    populateCategorySelector(dom.templateType.value, dom.templateCategory, selectedCategory);
  });
  dom.addTemplateForm.addEventListener('submit', handleAddTemplate);
  dom.confirmDeleteTemplateBtn.addEventListener('click', handleDeleteTemplateConfirmation);
  dom.cancelDeleteTemplateBtn.addEventListener('click', () => closeModal(dom.deleteTemplateConfirmModal));
  dom.templatesListContainer.addEventListener('click', handleTemplatesListClick);
}

export function fetchTemplates() {
  if (!state.currentUser) return;

  if (state.templatesUnsub) {
    state.templatesUnsub();
  }

  state.templatesUnsub = db
    .collection('templates')
    .where('uid', '==', state.currentUser.uid)
    .onSnapshot(
      (snapshot) => {
        state.userTemplates = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        renderTemplatesList();
      },
      (error) => {
        console.error('Erro ao carregar modelos:', error);
        state.userTemplates = [];
        renderTemplatesList('Erro ao carregar modelos.');
      }
    );
}

export function renderTemplatesList(errorMessage = '') {
  const selectedType = dom.templateType.value || 'expense';
  const selectedCategory = dom.templateCategory.value;
  populateCategorySelector(selectedType, dom.templateCategory, selectedCategory);

  if (errorMessage) {
    dom.templatesListContainer.innerHTML = `<p class="empty-state">${escapeHtml(errorMessage)}</p>`;
    return;
  }

  if (state.userTemplates.length === 0) {
    dom.templatesListContainer.innerHTML = '<p class="empty-state">Nenhum modelo guardado.</p>';
    return;
  }

  dom.templatesListContainer.innerHTML = state.userTemplates
    .map((template) => {
      const amount = formatCurrency(template.amount);
      return `
        <div class="template-item" data-id="${escapeHtml(template.id)}">
          <div class="template-item-main">
            <strong>${escapeHtml(template.description)}</strong>
            <span>${escapeHtml(template.category)} · ${amount}</span>
          </div>
          <button class="delete-template-btn" type="button" data-id="${escapeHtml(template.id)}" aria-label="Excluir modelo">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
    })
    .join('');
}

export function handleTemplatesListClick(event) {
  const deleteButton = event.target.closest('.delete-template-btn');
  if (deleteButton) {
    event.stopPropagation();
    state.templateIdToDelete = deleteButton.dataset.id;
    openModal(dom.deleteTemplateConfirmModal);
    return;
  }

  const templateItem = event.target.closest('.template-item');
  if (!templateItem) return;

  const template = state.userTemplates.find((item) => item.id === templateItem.dataset.id);
  if (!template) return;

  dom.typeSelect.value = template.type;
  populateCategorySelector(template.type, dom.categorySelect, template.category);
  dom.addDescription.value = template.description;
  dom.addAmount.value = template.amount;
  closeModal(dom.templatesModal);
  toggleAddTransactionForm(true);
}

export function handleAddTemplate(event) {
  event.preventDefault();

  const description = dom.templateDescription.value.trim();
  const amount = Number.parseFloat(dom.templateAmount.value);
  const type = dom.templateType.value;
  const category = dom.templateCategory.value;

  if (!description || Number.isNaN(amount) || amount <= 0) {
    alert('Por favor, preencha a descrição e um valor válido.');
    return;
  }

  db.collection('templates')
    .add({
      uid: state.currentUser.uid,
      description,
      amount,
      type,
      category
    })
    .then(() => {
      resetTemplateForm();
    })
    .catch(() => {
      alert('Não foi possível guardar o modelo.');
    });
}

export function handleDeleteTemplateConfirmation() {
  if (!state.templateIdToDelete) return;

  db.collection('templates')
    .doc(state.templateIdToDelete)
    .delete()
    .catch(() => {
      alert('Não foi possível apagar o modelo.');
    });

  state.templateIdToDelete = null;
  closeModal(dom.deleteTemplateConfirmModal);
}
