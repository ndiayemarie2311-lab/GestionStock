// ===== IDENTIFIANT UNIQUE =====
function uid() {
  return 'id' + Date.now() + Math.random().toString(36).slice(2, 7);
}

// ===== FORMAT DATE =====
function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('fr-FR', {
    day  : '2-digit',
    month: 'short',
    year : 'numeric'
  });
}

// ===== FORMAT PRIX =====
function fmtPrix(n) {
  return Number(n || 0).toLocaleString('fr-FR') + ' F';
}

// ===== STATUT STOCK =====
function stockStatut(p) {
  if (p.stock === 0)        return { label: 'Rupture', cls: 'b-red'    };
  if (p.stock <= p.seuil)  return { label: 'Faible',  cls: 'b-orange' };
  return                          { label: 'Normal',  cls: 'b-green'  };
}

// ===== EMOJI CATEGORIE =====
function catEmoji(cat) {
  const found = state.categories.find(c => c.nom === cat);
  return found ? found.emoji : '📦';
}

// ===== COULEUR CATEGORIE =====
function catCouleur(cat) {
  const found = state.categories.find(c => c.nom === cat);
  return found ? found.couleur : '#3b82f6';
}

// ===== TROUVER PRODUIT =====
function getProduit(id) {
  return state.produits.find(p => p.id === id);
}

// ===== TOAST =====
function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  const icons = {
    success : '✓',
    error   : '✕',
    warning : '⚠'
  };
  t.innerHTML  = (icons[type] || '✓') + ' ' + msg;
  t.className  = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ===== OUVRIR MODAL =====
function openModal(id) {
  document.getElementById(id).classList.add('open');

  if (id === 'modal-mouvement') {
    populateProduitSelect();
    document.getElementById('m-date').value =
      new Date().toISOString().split('T')[0];
  }

  if (id === 'modal-produit') {
    populateFourniSelect();
    populateCategoriesSelect('p-cat');
  }
}

// ===== FERMER MODAL =====
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ===== FERMER MODAL EN CLIQUANT DEHORS =====
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.overlay').forEach(o => {
    o.addEventListener('click', e => {
      if (e.target === o) o.classList.remove('open');
    });
  });
});

// ===== POPULATE SELECTS =====
function populateProduitSelect() {
  const sel = document.getElementById('m-produit');
  sel.innerHTML =
    '<option value="">— Choisir un produit —</option>' +
    state.produits.map(p =>
      `<option value="${p.id}">${p.nom} (stock: ${p.stock})</option>`
    ).join('');
}

function populateFourniSelect() {
  const sel = document.getElementById('p-fourn');
  sel.innerHTML =
    '<option value="">— Aucun —</option>' +
    state.fournisseurs.map(f =>
      `<option value="${f.id}">${f.nom}</option>`
    ).join('');
}
// ===== POPULATE CATEGORIES SELECT =====
function populateCategoriesSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML =
    '<option value="">— Choisir —</option>' +
    state.categories.map(c =>
      `<option value="${c.nom}">${c.emoji} ${c.nom}</option>`
    ).join('');
}

// ===== BADGES ALERTES =====
function updateBadges() {
  const nb = state.produits.filter(p => p.stock <= p.seuil).length;

  ['badge-alertes', 'drawer-badge-alertes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent    = nb;
      el.style.display  = nb > 0 ? 'inline' : 'none';
    }
  });

  const dot = document.getElementById('mnav-dot-alertes');
  if (dot) dot.style.display = nb > 0 ? 'block' : 'none';
}

// ===== RECHERCHE =====
function handleSearch() {
  state.searchQuery = document
    .getElementById('search-input')
    .value.toLowerCase();

  if (currentPage === 'produits') renderProduits();
}

// ===== MOBILE DRAWER =====
function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('open');
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
}