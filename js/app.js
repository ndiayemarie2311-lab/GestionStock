// ===== NAVIGATION =====
let currentPage = 'dashboard';

async function showPage(id) {
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
    categories   : 'Catégories',
    historique   : 'Historique',
    rapport      : 'Rapport & Impression',
    utilisateurs : 'Utilisateurs'
  };

  document.getElementById('topbar-title').textContent = titles[id] || id;

  // Recharger les données depuis Supabase avant d'afficher
  await charger();

  if (id === 'dashboard')    renderDashboard();
  if (id === 'produits')     renderProduits();
  if (id === 'mouvements')   renderMouvements();
  if (id === 'fournisseurs') renderFournisseurs();
  if (id === 'alertes')      renderAlertes();
  if (id === 'categories')   renderCategories();
  if (id === 'historique')   renderHistorique();
  if (id === 'rapport')      renderRapport();
  if (id === 'utilisateurs') await renderUtilisateurs();

  updateBadges();
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
// ===== FILTRER PAR CATEGORIE =====
function filtrerParCategorie(nom) {
  showPage('produits');
  document.getElementById('filter-cat').value = nom;
  renderProduits();
}

// ===== EDIT PRODUIT DEPUIS CATEGORIES =====
function openEditProduit(id) {
  populateFourniSelect();
  populateCategoriesSelect('p-cat');
  
  const p = getProduit(id);
  if (!p) return;

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

  document.getElementById('modal-produit').classList.add('open');
}
// ===== RESET FILTRES HISTORIQUE =====
function resetFiltresHistorique() {
  document.getElementById('hist-search').value     = '';
  document.getElementById('hist-type').value       = '';
  document.getElementById('hist-date-debut').value = '';
  document.getElementById('hist-date-fin').value   = '';
  renderHistorique();
}

// ===== EXPORT EXCEL PRODUITS =====
function exportProduitsExcel() {
  const data = state.produits.map(p => {
    const fourn = getFourn(p.fourn_id);
    const s     = stockStatut(p);
    return {
      'Nom'         : p.nom,
      'Référence'   : p.ref         || '—',
      'Catégorie'   : p.cat,
      'Fournisseur' : fourn ? fourn.nom : '—',
      'Stock'       : p.stock,
      'Seuil alerte': p.seuil,
      'Prix unitaire': p.prix,
      'Unité'       : p.unite       || '—',
      'Valeur stock': p.stock * p.prix,
      'Statut'      : s.label
    };
  });

  const ws  = XLSX.utils.json_to_sheet(data);
  const wb  = XLSX.utils.book_new();

  // Largeur des colonnes
  ws['!cols'] = [
    { wch: 25 }, { wch: 12 }, { wch: 25 },
    { wch: 20 }, { wch: 8  }, { wch: 12 },
    { wch: 14 }, { wch: 8  }, { wch: 14 },
    { wch: 10 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Produits');
  XLSX.writeFile(wb, `StockPro_Produits_${new Date().toISOString().split('T')[0]}.xlsx`);
  toast('Export Excel téléchargé ✓');
}

// ===== EXPORT PDF PRODUITS =====
function exportProduitsPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });

  // Titre
  doc.setFontSize(18);
  doc.setTextColor(59, 130, 246);
  doc.text('StockPro — Liste des produits', 14, 16);

  // Date
  doc.setFontSize(10);
  doc.setTextColor(139, 145, 158);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 23);

  // Stats
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  const valeur = state.produits.reduce((s, p) => s + p.stock * p.prix, 0);
  doc.text(`Total : ${state.produits.length} produits  |  Valeur stock : ${fmtPrix(valeur)}`, 14, 30);

  // Table
  doc.autoTable({
    startY    : 35,
    head      : [['Produit', 'Catégorie', 'Fournisseur', 'Stock', 'Seuil', 'Prix', 'Valeur', 'Statut']],
    body      : state.produits.map(p => {
      const fourn = getFourn(p.fourn_id);
      const s     = stockStatut(p);
      return [
        p.nom,
        `${catEmoji(p.cat)} ${p.cat}`,
        fourn ? fourn.nom : '—',
        `${p.stock} ${p.unite || ''}`,
        p.seuil,
        fmtPrix(p.prix),
        fmtPrix(p.stock * p.prix),
        s.label
      ];
    }),
    styles    : { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      7: { cellWidth: 20 }
    }
  });

  doc.save(`StockPro_Produits_${new Date().toISOString().split('T')[0]}.pdf`);
  toast('Export PDF téléchargé ✓');
}

// ===== EXPORT EXCEL HISTORIQUE =====
function exportHistoriqueExcel() {
  const data = [...state.mouvements].reverse().map(m => {
    const p = getProduit(m.produit_id || m.produitId);
    return {
      'Date'      : fmtDate(m.date),
      'Produit'   : p ? p.nom  : 'Supprimé',
      'Catégorie' : p ? p.cat  : '—',
      'Référence' : p ? p.ref  : '—',
      'Type'      : m.type,
      'Quantité'  : m.type === 'Entrée' ? +m.qte : -m.qte,
      'Motif'     : m.motif    || '—',
      'Opérateur' : m.operateur|| '—'
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();

  ws['!cols'] = [
    { wch: 14 }, { wch: 25 }, { wch: 25 },
    { wch: 12 }, { wch: 10 }, { wch: 10 },
    { wch: 25 }, { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Historique');
  XLSX.writeFile(wb, `StockPro_Historique_${new Date().toISOString().split('T')[0]}.xlsx`);
  toast('Export Excel téléchargé ✓');
}

// ===== EXPORT PDF HISTORIQUE =====
function exportHistoriquePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });

  // Titre
  doc.setFontSize(18);
  doc.setTextColor(59, 130, 246);
  doc.text('StockPro — Historique des mouvements', 14, 16);

  // Date
  doc.setFontSize(10);
  doc.setTextColor(139, 145, 158);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 23);

  // Stats
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  const entrees = state.mouvements
    .filter(m => m.type === 'Entrée')
    .reduce((s, m) => s + m.qte, 0);
  const sorties = state.mouvements
    .filter(m => m.type === 'Sortie')
    .reduce((s, m) => s + m.qte, 0);
  doc.text(
    `Total : ${state.mouvements.length} mouvements  |  Entrées : ${entrees}  |  Sorties : ${sorties}`,
    14, 30
  );

  // Table
  doc.autoTable({
    startY    : 35,
    head      : [['Date', 'Produit', 'Catégorie', 'Type', 'Quantité', 'Motif', 'Opérateur']],
    body      : [...state.mouvements].reverse().map(m => {
      const p = getProduit(m.produit_id || m.produitId);
      return [
        fmtDate(m.date),
        p ? p.nom : 'Supprimé',
        p ? p.cat : '—',
        m.type,
        `${m.type === 'Entrée' ? '+' : '−'}${m.qte}`,
        m.motif    || '—',
        m.operateur|| '—'
      ];
    }),
    styles    : { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    didDrawCell: (data) => {
      if (data.column.index === 3 && data.cell.section === 'body') {
        const isEntree = data.cell.raw === 'Entrée';
        doc.setTextColor(isEntree ? 34 : 239, isEntree ? 197 : 68, isEntree ? 94 : 68);
      }
    }
  });

  doc.save(`StockPro_Historique_${new Date().toISOString().split('T')[0]}.pdf`);
  toast('Export PDF téléchargé ✓');
}

// ===== EXPORT FICHE PRODUIT PDF =====
function exportFicheProduit(id) {
  const p = getProduit(id);
  if (!p) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const fourn  = getFourn(p.fourn_id);
  const s      = stockStatut(p);
  const valeur = p.stock * p.prix;

  // ===== HEADER =====
  // Fond header
  doc.setFillColor(13, 15, 18);
  doc.rect(0, 0, 210, 40, 'F');

  // Nom app
  doc.setFontSize(10);
  doc.setTextColor(59, 130, 246);
  doc.text('STOCKPRO', 14, 12);

  // Titre fiche
  doc.setFontSize(20);
  doc.setTextColor(232, 234, 240);
  doc.text('Fiche Produit', 14, 24);

  // Date génération
  doc.setFontSize(9);
  doc.setTextColor(139, 145, 158);
  doc.text(
    `Généré le ${new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    })}`,
    14, 33
  );

  // ===== IDENTITÉ PRODUIT =====
  let y = 50;

  // Fond section
  doc.setFillColor(26, 30, 37);
  doc.roundedRect(14, y, 182, 45, 3, 3, 'F');

  // Catégorie icône (texte à la place de l'emoji)
  doc.setFontSize(10);
  doc.setTextColor(59, 130, 246);
  doc.text(`[ ${p.cat} ]`, 22, y + 18);

  // Nom produit
  doc.setFontSize(16);
  doc.setTextColor(232, 234, 240);
  doc.text(p.nom, 45, y + 12);

  // Référence
  doc.setFontSize(10);
  doc.setTextColor(139, 145, 158);
  doc.text(`Réf: ${p.ref || '—'}`, 45, y + 20);

  // Catégorie
  doc.text(`${p.cat}`, 45, y + 28);

  // Badge statut
  const couleurStatut = s.label === 'Normal'
    ? [34, 197, 94]
    : s.label === 'Faible'
      ? [249, 115, 22]
      : [239, 68, 68];

  doc.setFillColor(...couleurStatut);
  doc.roundedRect(140, y + 8, 40, 10, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(s.label, 160, y + 15, { align: 'center' });

  y += 55;

  // ===== STATS PRODUIT =====
  const stats = [
    { label: 'Stock actuel',    val: `${p.stock} ${p.unite || ''}`, color: couleurStatut },
    { label: 'Seuil alerte',   val: `${p.seuil} ${p.unite || ''}`, color: [139, 145, 158] },
    { label: 'Prix unitaire',  val: fmtPrix(p.prix),               color: [59, 130, 246] },
    { label: 'Valeur stock',   val: fmtPrix(valeur),               color: [168, 85, 247] }
  ];

  const cardW = 42;
  const cardH = 28;
  const gap   = 4;

  stats.forEach((st, i) => {
    const x = 14 + i * (cardW + gap);
    doc.setFillColor(26, 30, 37);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');

    // Trait couleur en haut
    doc.setFillColor(...st.color);
    doc.rect(x, y, cardW, 2, 'F');

    // Label
    doc.setFontSize(7);
    doc.setTextColor(139, 145, 158);
    doc.text(st.label.toUpperCase(), x + cardW/2, y + 10, { align: 'center' });

    // Valeur
    doc.setFontSize(11);
    doc.setTextColor(...st.color);
    doc.text(st.val, x + cardW/2, y + 21, { align: 'center' });
  });

  y += cardH + 10;

  // ===== INFOS DÉTAILLÉES =====
  doc.setFontSize(12);
  doc.setTextColor(59, 130, 246);
  doc.text('Informations détaillées', 14, y);
  y += 6;

  doc.autoTable({
    startY    : y,
    head      : [['Champ', 'Valeur']],
    body      : [
      ['Nom du produit',  p.nom],
      ['Référence',       p.ref         || '—'],
      ['Catégorie',       p.cat],
      ['Unité de mesure', p.unite        || '—'],
      ['Prix unitaire',   fmtPrix(p.prix)],
      ['Stock actuel',    `${p.stock} ${p.unite || ''}`],
      ['Seuil d\'alerte', `${p.seuil} ${p.unite || ''}`],
      ['Valeur totale',   fmtPrix(valeur)],
      ['Fournisseur',     fourn ? fourn.nom : '—'],
      ['Contact fourn.',  fourn ? fourn.tel || '—' : '—'],
      ['Description',     p.description  || '—'],
      ['Statut stock',    s.label]
    ],
    styles          : { fontSize: 10, cellPadding: 5 },
    headStyles      : {
      fillColor : [59, 130, 246],
      textColor : 255,
      fontStyle : 'bold'
    },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    columnStyles    : {
      0: { fontStyle: 'bold', cellWidth: 55, textColor: [80, 80, 80] },
      1: { cellWidth: 125 }
    }
  });

  y = doc.lastAutoTable.finalY + 10;

  // ===== HISTORIQUE MOUVEMENTS =====
 const mvtsProduit = [...state.mouvements]
    .filter(m => {
      const mid = m.produit_id || m.produitId || '';
      return mid.toString() === id.toString();
    })
    .reverse()
    .slice(0, 10);

  if (mvtsProduit.length) {
    doc.setFontSize(12);
    doc.setTextColor(59, 130, 246);
    doc.text('Historique des mouvements (10 derniers)', 14, y);
    y += 4;

    doc.autoTable({
      startY    : y,
      head      : [['Date', 'Type', 'Quantité', 'Motif', 'Opérateur']],
      body      : mvtsProduit.map(m => [
        fmtDate(m.date),
        m.type,
        `${m.type === 'Entrée' ? '+' : '−'}${m.qte} ${p.unite || ''}`,
        m.motif    || '—',
        m.operateur|| '—'
      ]),
      styles    : { fontSize: 9, cellPadding: 4 },
      headStyles: {
        fillColor : [34, 34, 46],
        textColor : [139, 145, 158],
        fontStyle : 'bold'
      },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      didDrawCell: (data) => {
        if (data.column.index === 1 && data.cell.section === 'body') {
          const isEntree = data.cell.raw === 'Entrée';
          doc.setTextColor(
            isEntree ? 34  : 239,
            isEntree ? 197 : 68,
            isEntree ? 94  : 68
          );
        }
      }
    });
  }

  // ===== FOOTER =====
  const pageH = doc.internal.pageSize.height;
  doc.setFillColor(13, 15, 18);
  doc.rect(0, pageH - 15, 210, 15, 'F');
  doc.setFontSize(8);
  doc.setTextColor(85, 94, 110);
  doc.text('StockPro — Gestion de Stock', 14, pageH - 5);
  doc.text(
    `Page 1  |  ${new Date().toLocaleDateString('fr-FR')}`,
    196, pageH - 5,
    { align: 'right' }
  );

  // Sauvegarder
  doc.save(`StockPro_Fiche_${p.nom.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  toast(`Fiche PDF de "${p.nom}" téléchargée ✓`);
}
// ===== NOTIFICATIONS EMAIL =====
async function envoyerAlertesTous() {
  const alertes = state.produits.filter(p => p.stock <= p.seuil);

  if (!alertes.length) {
    toast('Aucune alerte à envoyer ✓', 'success');
    return;
  }

  const user = state.currentUser;
  if (!user?.email) {
    toast('Email utilisateur introuvable', 'error');
    return;
  }

  toast('Envoi en cours...', 'warning');

  let success = 0;
  let errors  = 0;

  for (const p of alertes) {
    const s = stockStatut(p);
    try {
      await emailjs.send(
        EMAIL_CONFIG.serviceId,
        EMAIL_CONFIG.templateId,
        {
          destinataire : user.prenom || user.email,
          produit_nom  : p.nom,
          produit_cat  : p.cat,
          stock_actuel : `${p.stock} ${p.unite || ''}`,
          seuil        : `${p.seuil} ${p.unite || ''}`,
          statut       : s.label,
          to_email     : user.email
        }
      );
      success++;
    } catch(e) {
      console.error('Erreur envoi email:', e);
      errors++;
    }
  }

  if (success > 0) {
    toast(`${success} alerte${success > 1 ? 's' : ''} envoyée${success > 1 ? 's' : ''} à ${user.email} ✓`);
  }
  if (errors > 0) {
    toast(`${errors} erreur${errors > 1 ? 's' : ''} lors de l'envoi`, 'error');
  }
}

// ===== ALERTE EMAIL AUTOMATIQUE =====
async function verifierEtEnvoyerAlertes() {
  const alertes = state.produits.filter(p => p.stock <= p.seuil);
  if (!alertes.length) return;

  const user = state.currentUser;
  if (!user?.email) return;

  // Vérifier si on a déjà envoyé aujourd'hui
  const today     = new Date().toISOString().split('T')[0];
  const lastSent  = localStorage.getItem('stockpro_last_alert');
  if (lastSent === today) return;

  // Envoyer un email récapitulatif
  const listeAlertes = alertes.map(p => {
    const s = stockStatut(p);
    return `• ${p.nom} — Stock: ${p.stock} ${p.unite || ''} (Seuil: ${p.seuil}) — ${s.label}`;
  }).join('\n');

  try {
    await emailjs.send(
      EMAIL_CONFIG.serviceId,
      EMAIL_CONFIG.templateId,
      {
        destinataire : user.prenom || user.email,
        produit_nom  : `${alertes.length} produit${alertes.length > 1 ? 's' : ''} en alerte`,
        produit_cat  : listeAlertes,
        stock_actuel : `${alertes.length} alertes détectées`,
        seuil        : 'Voir liste ci-dessus',
        statut       : 'Récapitulatif quotidien',
        to_email     : user.email
      }
    );

    // Sauvegarder la date d'envoi
    localStorage.setItem('stockpro_last_alert', today);
    console.log('Email récapitulatif envoyé ✓');
  } catch(e) {
    console.error('Erreur envoi récapitulatif:', e);
  }
}
// ===== IMPRESSION RAPPORT =====
function imprimerRapport() {
  window.print();
}

// ===== EXPORT RAPPORT EXCEL =====
function exportRapportExcel() {
  const wb = XLSX.utils.book_new();

  // Feuille 1 — Produits
  const produits = state.produits.map(p => {
    const fourn = getFourn(p.fourn_id);
    const s     = stockStatut(p);
    return {
      'Nom'          : p.nom,
      'Référence'    : p.ref    || '—',
      'Catégorie'    : p.cat,
      'Fournisseur'  : fourn ? fourn.nom : '—',
      'Stock'        : p.stock,
      'Seuil'        : p.seuil,
      'Prix unitaire': p.prix,
      'Valeur stock' : p.stock * p.prix,
      'Statut'       : s.label
    };
  });
  const ws1 = XLSX.utils.json_to_sheet(produits);
  ws1['!cols'] = [
    {wch:25},{wch:12},{wch:25},{wch:20},
    {wch:8},{wch:8},{wch:14},{wch:14},{wch:10}
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Produits');

  // Feuille 2 — Mouvements du mois
  const mois  = new Date().getMonth();
  const annee = new Date().getFullYear();
  const mvts  = state.mouvements
    .filter(m => {
      const d = new Date(m.date);
      return d.getMonth() === mois && d.getFullYear() === annee;
    })
    .map(m => {
      const p = getProduit(m.produit_id || m.produitId);
      return {
        'Date'      : fmtDate(m.date),
        'Produit'   : p ? p.nom : 'Supprimé',
        'Type'      : m.type,
        'Quantité'  : m.qte,
        'Motif'     : m.motif     || '—',
        'Opérateur' : m.operateur || '—'
      };
    });
  const ws2 = XLSX.utils.json_to_sheet(mvts);
  XLSX.utils.book_append_sheet(wb, ws2, 'Mouvements du mois');

  // Feuille 3 — Résumé par catégorie
  const cats = {};
  state.produits.forEach(p => {
    if (!cats[p.cat]) cats[p.cat] = { nb:0, valeur:0, alertes:0 };
    cats[p.cat].nb++;
    cats[p.cat].valeur  += p.stock * p.prix;
    if (p.stock <= p.seuil) cats[p.cat].alertes++;
  });
  const resume = Object.entries(cats).map(([cat, d]) => ({
    'Catégorie'    : cat,
    'Nb produits'  : d.nb,
    'Valeur totale': d.valeur,
    'Alertes'      : d.alertes
  }));
  const ws3 = XLSX.utils.json_to_sheet(resume);
  XLSX.utils.book_append_sheet(wb, ws3, 'Résumé catégories');

  XLSX.writeFile(wb,
    `StockPro_Rapport_${new Date().toISOString().split('T')[0]}.xlsx`);
  toast('Rapport Excel téléchargé ✓');
}

// ===== EXPORT RAPPORT PDF =====
function exportRapportPDF() {
  const { jsPDF } = window.jspdf;
  const doc   = new jsPDF({ orientation: 'landscape' });
  const valeur = state.produits
    .reduce((s, p) => s + p.stock * p.prix, 0);

  // Header
  doc.setFillColor(13, 15, 18);
  doc.rect(0, 0, 297, 35, 'F');

  doc.setFontSize(10);
  doc.setTextColor(59, 130, 246);
  doc.text('STOCKPRO', 14, 10);

  doc.setFontSize(18);
  doc.setTextColor(232, 234, 240);
  doc.text('Rapport de Stock', 14, 22);

  doc.setFontSize(9);
  doc.setTextColor(139, 145, 158);
  doc.text(
    `Généré le ${new Date().toLocaleDateString('fr-FR')} par ${state.currentUser?.prenom || ''}`,
    14, 30
  );

  doc.setFontSize(12);
  doc.setTextColor(59, 130, 246);
  doc.text(`Valeur totale : ${fmtPrix(valeur)}`, 200, 22);

  let y = 45;

  // Stats
  const statsData = [
    ['Total produits', state.produits.length],
    ['En stock normal', state.produits.filter(p => p.stock > p.seuil).length],
    ['Stock faible',   state.produits.filter(p => p.stock > 0 && p.stock <= p.seuil).length],
    ['Rupture stock',  state.produits.filter(p => p.stock === 0).length]
  ];

  doc.autoTable({
    startY      : y,
    head        : [['Indicateur', 'Valeur']],
    body        : statsData,
    styles      : { fontSize: 10, cellPadding: 5 },
    headStyles  : { fillColor: [59, 130, 246], textColor: 255 },
    tableWidth  : 80
  });

  y = doc.lastAutoTable.finalY + 10;

  // Produits
  doc.setFontSize(12);
  doc.setTextColor(59, 130, 246);
  doc.text('Liste des produits', 14, y);
  y += 4;

  doc.autoTable({
    startY    : y,
    head      : [['Produit', 'Catégorie', 'Stock', 'Seuil', 'Prix', 'Valeur', 'Statut']],
    body      : state.produits.map(p => {
      const s = stockStatut(p);
      return [
        p.nom,
        p.cat,
        `${p.stock} ${p.unite || ''}`,
        p.seuil,
        fmtPrix(p.prix),
        fmtPrix(p.stock * p.prix),
        s.label
      ];
    }),
    styles          : { fontSize: 8, cellPadding: 3 },
    headStyles      : { fillColor: [34, 34, 46], textColor: [139, 145, 158] },
    alternateRowStyles: { fillColor: [245, 245, 250] }
  });

  // Footer
  const pageH = doc.internal.pageSize.height;
  doc.setFillColor(13, 15, 18);
  doc.rect(0, pageH - 12, 297, 12, 'F');
  doc.setFontSize(8);
  doc.setTextColor(85, 94, 110);
  doc.text('StockPro — Rapport de Stock', 14, pageH - 4);
  doc.text(
    new Date().toLocaleDateString('fr-FR'),
    283, pageH - 4,
    { align: 'right' }
  );

  doc.save(`StockPro_Rapport_${new Date().toISOString().split('T')[0]}.pdf`);
  toast('Rapport PDF téléchargé ✓');
}

// ===== RECHERCHE GLOBALE =====
function openRechercheGlobale() {
  openModal('modal-recherche');
  setTimeout(() => {
    document.getElementById('global-search-input').focus();
    document.getElementById('global-search-input').value = '';
    document.getElementById('global-search-results').innerHTML =
      `<div style="text-align:center;padding:32px;color:var(--text3);
                   font-size:13px;">Tapez pour rechercher...</div>`;
  }, 100);
}

function rechercheGlobale() {
  const q = document.getElementById('global-search-input')
    .value.toLowerCase().trim();

  const container = document.getElementById('global-search-results');

  if (!q || q.length < 2) {
    container.innerHTML =
      `<div style="text-align:center;padding:32px;color:var(--text3);
                   font-size:13px;">Tapez au moins 2 caractères...</div>`;
    return;
  }

  let results = [];

  // Chercher dans les produits
  state.produits
    .filter(p =>
      p.nom.toLowerCase().includes(q) ||
      (p.ref  || '').toLowerCase().includes(q) ||
      p.cat.toLowerCase().includes(q)
    )
    .forEach(p => {
      const s = stockStatut(p);
      results.push({
        type    : 'produit',
        icon    : '📦',
        titre   : p.nom,
        sous    : `${p.cat} · Réf: ${p.ref || '—'} · Stock: ${p.stock} ${p.unite || ''}`,
        badge   : s.label,
        badgeCls: s.cls,
        action  : () => {
          closeModal('modal-recherche');
          showPage('produits');
          state.searchQuery = q;
          renderProduits();
        }
      });
    });

  // Chercher dans les fournisseurs
  state.fournisseurs
    .filter(f =>
      f.nom.toLowerCase().includes(q) ||
      (f.contact || '').toLowerCase().includes(q) ||
      (f.tel     || '').toLowerCase().includes(q) ||
      (f.email   || '').toLowerCase().includes(q)
    )
    .forEach(f => {
      results.push({
        type    : 'fournisseur',
        icon    : '🚚',
        titre   : f.nom,
        sous    : `${f.contact || '—'} · ${f.tel || '—'}`,
        badge   : 'Fournisseur',
        badgeCls: 'b-blue',
        action  : () => {
          closeModal('modal-recherche');
          showPage('fournisseurs');
        }
      });
    });

  // Chercher dans les mouvements
  state.mouvements
    .filter(m => {
      const p = getProduit(m.produit_id || m.produitId);
      return (
        (p && p.nom.toLowerCase().includes(q)) ||
        (m.motif     || '').toLowerCase().includes(q) ||
        (m.operateur || '').toLowerCase().includes(q)
      );
    })
    .slice(0, 5)
    .forEach(m => {
      const p = getProduit(m.produit_id || m.produitId);
      results.push({
        type    : 'mouvement',
        icon    : m.type === 'Entrée' ? '📥' : '📤',
        titre   : `${m.type} — ${p ? p.nom : 'Produit supprimé'}`,
        sous    : `${fmtDate(m.date)} · ${m.motif || '—'} · ${m.operateur || '—'}`,
        badge   : m.type,
        badgeCls: m.type === 'Entrée' ? 'b-green' : 'b-red',
        action  : () => {
          closeModal('modal-recherche');
          showPage('historique');
          document.getElementById('hist-search').value = q;
          renderHistorique();
        }
      });
    });

  // Chercher dans les catégories
  state.categories
    .filter(c => c.nom.toLowerCase().includes(q))
    .forEach(c => {
      const nb = state.produits.filter(p => p.cat === c.nom).length;
      results.push({
        type    : 'categorie',
        icon    : c.emoji || '🏷️',
        titre   : c.nom,
        sous    : `${nb} produit${nb > 1 ? 's' : ''}`,
        badge   : 'Catégorie',
        badgeCls: 'b-gray',
        action  : () => {
          closeModal('modal-recherche');
          filtrerParCategorie(c.nom);
        }
      });
    });

  // Afficher les résultats
  if (!results.length) {
    container.innerHTML =
      `<div style="text-align:center;padding:32px;">
         <div style="font-size:32px;margin-bottom:8px;">🔍</div>
         <div style="color:var(--text2);font-size:13px;">
           Aucun résultat pour "<b>${q}</b>"
         </div>
       </div>`;
    return;
  }

  // Grouper par type
  const groupes = {
    produit     : { label: '📦 Produits',     items: [] },
    fournisseur : { label: '🚚 Fournisseurs',  items: [] },
    mouvement   : { label: '🔄 Mouvements',    items: [] },
    categorie   : { label: '🏷️ Catégories',   items: [] }
  };

  results.forEach(r => groupes[r.type].items.push(r));

  let html = '';
  let idx  = 0;

  Object.values(groupes).forEach(groupe => {
    if (!groupe.items.length) return;

    html += `
      <div style="padding:8px 12px 4px;font-size:11px;font-weight:600;
                  color:var(--text3);text-transform:uppercase;
                  letter-spacing:1px;">
        ${groupe.label} (${groupe.items.length})
      </div>`;

    groupe.items.forEach(r => {
      const i = idx++;
      html += `
        <div class="search-result-item" id="sr-${i}"
             onclick="searchResultClick(${i})"
             style="display:flex;align-items:center;gap:12px;
                    padding:10px 12px;border-radius:var(--rsm);
                    cursor:pointer;transition:background .15s;
                    margin-bottom:2px;">
          <div style="width:36px;height:36px;border-radius:var(--rsm);
                      background:var(--bg3);border:1px solid var(--border);
                      display:flex;align-items:center;justify-content:center;
                      font-size:16px;flex-shrink:0;">
            ${r.icon}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;color:var(--text);
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${r.titre}
            </div>
            <div style="font-size:11px;color:var(--text2);margin-top:2px;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${r.sous}
            </div>
          </div>
          <span class="badge ${r.badgeCls}" style="flex-shrink:0;font-size:10px;">
            ${r.badge}
          </span>
        </div>`;
    });
  });

  container.innerHTML = html;

  // Stocker les actions
  window._searchResults = results;

  // Hover effect
  container.querySelectorAll('.search-result-item').forEach(el => {
    el.addEventListener('mouseover', () => {
      el.style.background = 'var(--bg3)';
    });
    el.addEventListener('mouseout', () => {
      el.style.background = 'transparent';
    });
  });
}

function searchResultClick(idx) {
  if (window._searchResults && window._searchResults[idx]) {
    window._searchResults[idx].action();
  }
}

// Raccourci clavier Ctrl+K
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    openRechercheGlobale();
  }
  if (e.key === 'Escape') {
    closeModal('modal-recherche');
  }
});