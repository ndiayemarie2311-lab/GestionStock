// ===== NAVIGATION =====
let currentPage = 'dashboard';

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  document.getElementById('page-' + id).classList.add('active');

  const nav = document.getElementById('nav-' + id);
  if (nav) nav.classList.add('active');

  currentPage = id;

  const titles = {
    dashboard    : 'Dashboard',
    produits     : 'Produits',
    mouvements   : 'Mouvements',
    fournisseurs : 'Fournisseurs',
    alertes      : 'Alertes',
    utilisateurs : 'Utilisateurs'
  };

  document.getElementById('topbar-title').textContent = titles[id] || id;

  if (id === 'dashboard')    renderDashboard();
  if (id === 'produits')     renderProduits();
  if (id === 'mouvements')   renderMouvements();
  if (id === 'fournisseurs') renderFournisseurs();
  if (id === 'alertes')      renderAlertes();
  if (id === 'categories')   renderCategories();
  if (id === 'utilisateurs') renderUtilisateurs().catch(console.error);
}

function gotoPage(id) {
  showPage(id);
  closeDrawer();
  document.querySelectorAll('.mnav-btn').forEach(b => b.classList.remove('active'));
  const b = document.getElementById('mnav-' + id);
  if (b) b.classList.add('active');
}

// ===== CRUD PRODUITS =====
async function saveProduit() {
  const nom   = document.getElementById('p-nom').value.trim();
  const cat   = document.getElementById('p-cat').value;
  const stock = parseInt(document.getElementById('p-stock').value) || 0;
  const seuil = parseInt(document.getElementById('p-seuil').value) || 0;

  if (!nom || !cat) {
    toast('Nom et catégorie requis', 'error');
    return;
  }

  const id   = document.getElementById('p-id').value;
  const data = {
    nom,
    ref         : document.getElementById('p-ref').value.trim(),
    cat,
    fourn_id    : document.getElementById('p-fourn').value || null,
    stock,
    seuil,
    prix        : parseInt(document.getElementById('p-prix').value)  || 0,
    unite       : document.getElementById('p-unite').value.trim(),
    description : document.getElementById('p-desc').value.trim()
  };

  if (id) {
    // Modification
    const { error } = await supa
      .from('produits')
      .update(data)
      .eq('id', id);

    if (error) { toast('Erreur modification', 'error'); return; }

    const idx = state.produits.findIndex(p => p.id === id);
    if (idx > -1) state.produits[idx] = { ...state.produits[idx], ...data };
    toast('Produit modifié ✓');

  } else {
    // Ajout
    const { data: inserted, error } = await supa
      .from('produits')
      .insert([{ ...data, user_id: state.currentUser.id }])
      .select();

    if (error) { toast('Erreur ajout', 'error'); return; }

    state.produits.push(inserted[0]);
    toast('Produit ajouté ✓');
  }

  closeModal('modal-produit');
  resetProduitForm();
  renderProduits();
  updateBadges();
  renderDashboard();
}

function resetProduitForm() {
  ['p-id','p-nom','p-ref','p-stock','p-seuil','p-prix','p-unite','p-desc']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('p-cat').value = '';
  document.getElementById('modal-produit-title').textContent = 'Nouveau produit';
}

function editProduit(id) {
  const p = getProduit(id);
  if (!p) return;

  populateFourniSelect();
  document.getElementById('p-id').value    = p.id;
  document.getElementById('p-nom').value   = p.nom;
  document.getElementById('p-ref').value   = p.ref         || '';
  document.getElementById('p-cat').value   = p.cat;
  document.getElementById('p-fourn').value = p.fourn_id    || '';
  document.getElementById('p-stock').value = p.stock;
  document.getElementById('p-seuil').value = p.seuil;
  document.getElementById('p-prix').value  = p.prix        || '';
  document.getElementById('p-unite').value = p.unite       || '';
  document.getElementById('p-desc').value  = p.description || '';
  document.getElementById('modal-produit-title').textContent = 'Modifier le produit';

  openModal('modal-produit');
}

async function deleteProduit(id) {
  if (!confirm('Supprimer ce produit ?')) return;

  const { error } = await supa
    .from('produits')
    .delete()
    .eq('id', id);

  if (error) { toast('Erreur suppression', 'error'); return; }

  state.produits = state.produits.filter(p => p.id !== id);
  renderProduits();
  updateBadges();
  renderDashboard();
  toast('Produit supprimé');
}

// ===== CRUD MOUVEMENTS =====
async function saveMouvement() {
  const produitId = document.getElementById('m-produit').value;
  const type      = document.getElementById('m-type').value;
  const qte       = parseInt(document.getElementById('m-qte').value) || 0;

  if (!produitId || !qte) {
    toast('Produit et quantité requis', 'error');
    return;
  }

  const p = getProduit(produitId);
  if (!p) return;

  if (type === 'Sortie' && qte > p.stock) {
    toast(`Stock insuffisant (${p.stock} disponibles)`, 'error');
    return;
  }

  // Nouveau stock
  const nouveauStock = type === 'Entrée' ? p.stock + qte : p.stock - qte;

  // Mettre à jour le stock du produit
  const { error: ep } = await supa
    .from('produits')
    .update({ stock: nouveauStock })
    .eq('id', produitId);

  if (ep) { toast('Erreur mise à jour stock', 'error'); return; }

  // Enregistrer le mouvement
  const { data: mvt, error: em } = await supa
    .from('mouvements')
    .insert([{
      user_id   : state.currentUser.id,
      produit_id: produitId,
      type,
      qte,
      motif     : document.getElementById('m-motif').value.trim(),
      date      : document.getElementById('m-date').value ||
                  new Date().toISOString().split('T')[0],
      operateur : state.currentUser?.prenom || 'Admin'
    }])
    .select();

  if (em) { toast('Erreur enregistrement mouvement', 'error'); return; }

  // Mettre à jour le state
  p.stock = nouveauStock;
  state.mouvements.push(mvt[0]);

  closeModal('modal-mouvement');
  document.getElementById('m-qte').value   = '';
  document.getElementById('m-motif').value = '';
  renderMouvements();
  renderProduits();
  updateBadges();
  renderDashboard();
  toast(`${type} enregistrée — Stock: ${nouveauStock} ${p.unite || ''}`);
}

function quickEntree(id) {
  populateProduitSelect();
  document.getElementById('m-produit').value = id;
  document.getElementById('m-type').value    = 'Entrée';
  openModal('modal-mouvement');
}

// ===== CRUD FOURNISSEURS =====
async function saveFournisseur() {
  const nom = document.getElementById('f-nom').value.trim();
  if (!nom) {
    toast('Nom requis', 'error');
    return;
  }

  const id   = document.getElementById('f-id').value;
  const data = {
    nom,
    contact : document.getElementById('f-contact').value.trim(),
    tel     : document.getElementById('f-tel').value.trim(),
    email   : document.getElementById('f-email').value.trim(),
    cats    : document.getElementById('f-cats').value.trim(),
    adresse : document.getElementById('f-adresse').value.trim()
  };

  if (id) {
    const { error } = await supa
      .from('fournisseurs')
      .update(data)
      .eq('id', id);

    if (error) { toast('Erreur modification', 'error'); return; }

    const idx = state.fournisseurs.findIndex(f => f.id === id);
    if (idx > -1) state.fournisseurs[idx] = { ...state.fournisseurs[idx], ...data };
    toast('Fournisseur modifié ✓');

  } else {
    const { data: inserted, error } = await supa
      .from('fournisseurs')
      .insert([{ ...data, user_id: state.currentUser.id }])
      .select();

    if (error) { toast('Erreur ajout', 'error'); return; }

    state.fournisseurs.push(inserted[0]);
    toast('Fournisseur ajouté ✓');
  }

  closeModal('modal-fournisseur');
  resetFournisseurForm();
  renderFournisseurs();
}

function resetFournisseurForm() {
  ['f-id','f-nom','f-contact','f-tel','f-email','f-cats','f-adresse']
    .forEach(id => document.getElementById(id).value = '');
}

function editFourn(id) {
  const f = getFourn(id);
  if (!f) return;

  document.getElementById('f-id').value      = f.id;
  document.getElementById('f-nom').value     = f.nom;
  document.getElementById('f-contact').value = f.contact || '';
  document.getElementById('f-tel').value     = f.tel     || '';
  document.getElementById('f-email').value   = f.email   || '';
  document.getElementById('f-cats').value    = f.cats    || '';
  document.getElementById('f-adresse').value = f.adresse || '';

  openModal('modal-fournisseur');
}

async function deleteFourn(id) {
  if (!confirm('Supprimer ce fournisseur ?')) return;

  const { error } = await supa
    .from('fournisseurs')
    .delete()
    .eq('id', id);

  if (error) { toast('Erreur suppression', 'error'); return; }

  state.fournisseurs = state.fournisseurs.filter(f => f.id !== id);
  renderFournisseurs();
  toast('Fournisseur supprimé');
}

// ===== SAUVEGARDER PROFIL =====
async function saveProfil() {
  const prenom = document.getElementById('profil-prenom').value.trim();
  const nom    = document.getElementById('profil-nom').value.trim();

  if (!prenom || !nom) {
    toast('Prénom et nom requis', 'error');
    return;
  }

  const { error } = await supa
    .from('profils')
    .update({ prenom, nom })
    .eq('id', state.currentUser.id);

  if (error) {
    toast('Erreur sauvegarde profil', 'error');
    return;
  }

  // Mettre à jour l'affichage
  state.currentUser.prenom = prenom;
  state.currentUser.nom    = nom;

  document.getElementById('user-name').textContent =
    (prenom + ' ' + nom).trim();
  document.getElementById('user-av').textContent =
    (prenom[0] || '').toUpperCase() + (nom[0] || '').toUpperCase();

  toast('Profil mis à jour ✓');
}
// ===== CRUD CATEGORIES =====
async function saveCategorie() {
  const nom    = document.getElementById('cat-nom').value.trim();
  const emoji  = document.getElementById('cat-emoji').value.trim() || '📦';
  const couleur= document.getElementById('cat-couleur').value;

  if (!nom) {
    toast('Nom de la catégorie requis', 'error');
    return;
  }

  const id   = document.getElementById('cat-id').value;
  const data = { nom, emoji, couleur };

  if (id) {
    // Modification
    const { error } = await supa
      .from('categories')
      .update(data)
      .eq('id', id);

    if (error) { toast('Erreur modification', 'error'); return; }

    const idx = state.categories.findIndex(c => c.id === id);
    if (idx > -1) state.categories[idx] = { ...state.categories[idx], ...data };
    toast('Catégorie modifiée ✓');

  } else {
    // Ajout
    const { data: inserted, error } = await supa
      .from('categories')
      .insert([{ ...data, user_id: state.currentUser.id }])
      .select();

    if (error) { toast('Erreur ajout', 'error'); return; }

    state.categories.push(inserted[0]);
    toast('Catégorie ajoutée ✓');
  }

  closeModal('modal-categorie');
  resetCategorieForm();
  renderCategories();
}

function resetCategorieForm() {
  document.getElementById('cat-id').value     = '';
  document.getElementById('cat-nom').value    = '';
  document.getElementById('cat-emoji').value  = '';
  document.getElementById('cat-couleur').value= '#3b82f6';
  document.getElementById('modal-cat-title').textContent = 'Nouvelle catégorie';
}

function editCategorie(id) {
  const c = state.categories.find(cat => cat.id === id);
  if (!c) return;

  document.getElementById('cat-id').value      = c.id;
  document.getElementById('cat-nom').value     = c.nom;
  document.getElementById('cat-emoji').value   = c.emoji   || '';
  document.getElementById('cat-couleur').value = c.couleur || '#3b82f6';
  document.getElementById('modal-cat-title').textContent = 'Modifier la catégorie';

  openModal('modal-categorie');
}

async function deleteCategorie(id) {
  const c = state.categories.find(cat => cat.id === id);
  if (!c) return;

  const nbProduits = state.produits.filter(p => p.cat === c.nom).length;
  if (nbProduits > 0) {
    toast(`Impossible — ${nbProduits} produit(s) utilisent cette catégorie`, 'error');
    return;
  }

  if (!confirm('Supprimer cette catégorie ?')) return;

  const { error } = await supa
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) { toast('Erreur suppression', 'error'); return; }

  state.categories = state.categories.filter(c => c.id !== id);
  renderCategories();
  toast('Catégorie supprimée');
}