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
}

function gotoPage(id) {
  showPage(id);
  closeDrawer();
  document.querySelectorAll('.mnav-btn').forEach(b => b.classList.remove('active'));
  const b = document.getElementById('mnav-' + id);
  if (b) b.classList.add('active');
}

// ===== CRUD PRODUITS =====
function saveProduit() {
  const nom  = document.getElementById('p-nom').value.trim();
  const cat  = document.getElementById('p-cat').value;
  const stock = parseInt(document.getElementById('p-stock').value) || 0;
  const seuil = parseInt(document.getElementById('p-seuil').value) || 0;

  if (!nom || !cat) {
    toast('Nom et catégorie requis', 'error');
    return;
  }

  const id   = document.getElementById('p-id').value;
  const data = {
    nom,
    ref      : document.getElementById('p-ref').value.trim(),
    cat,
    fourniId : document.getElementById('p-fourn').value,
    stock,
    seuil,
    prix     : parseInt(document.getElementById('p-prix').value)  || 0,
    unite    : document.getElementById('p-unite').value.trim(),
    desc     : document.getElementById('p-desc').value.trim()
  };

  if (id) {
    const idx = state.produits.findIndex(p => p.id === id);
    if (idx > -1) state.produits[idx] = { ...state.produits[idx], ...data };
    toast('Produit modifié ✓');
  } else {
    state.produits.push({ id: uid(), ...data });
    toast('Produit ajouté ✓');
  }

  sauvegarder();
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
  document.getElementById('p-ref').value   = p.ref    || '';
  document.getElementById('p-cat').value   = p.cat;
  document.getElementById('p-fourn').value = p.fourniId || '';
  document.getElementById('p-stock').value = p.stock;
  document.getElementById('p-seuil').value = p.seuil;
  document.getElementById('p-prix').value  = p.prix   || '';
  document.getElementById('p-unite').value = p.unite  || '';
  document.getElementById('p-desc').value  = p.desc   || '';
  document.getElementById('modal-produit-title').textContent = 'Modifier le produit';

  openModal('modal-produit');
}

function deleteProduit(id) {
  if (!confirm('Supprimer ce produit ?')) return;
  state.produits = state.produits.filter(p => p.id !== id);
  sauvegarder();
  renderProduits();
  updateBadges();
  renderDashboard();
  toast('Produit supprimé');
}

// ===== CRUD MOUVEMENTS =====
function saveMouvement() {
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

  p.stock = type === 'Entrée' ? p.stock + qte : p.stock - qte;

  state.mouvements.push({
    id        : uid(),
    produitId,
    type,
    qte,
    motif : document.getElementById('m-motif').value.trim(),
    date  : document.getElementById('m-date').value ||
            new Date().toISOString().split('T')[0],
    user  : state.currentUser?.prenom || 'Admin'
  });

  sauvegarder();
  closeModal('modal-mouvement');
  document.getElementById('m-qte').value   = '';
  document.getElementById('m-motif').value = '';
  renderMouvements();
  renderProduits();
  updateBadges();
  renderDashboard();
  toast(`${type} enregistrée — Stock: ${p.stock} ${p.unite || ''}`);
}

function quickEntree(id) {
  populateProduitSelect();
  document.getElementById('m-produit').value = id;
  document.getElementById('m-type').value    = 'Entrée';
  openModal('modal-mouvement');
}

// ===== CRUD FOURNISSEURS =====
function saveFournisseur() {
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
    const idx = state.fournisseurs.findIndex(f => f.id === id);
    if (idx > -1) state.fournisseurs[idx] = { ...state.fournisseurs[idx], ...data };
    toast('Fournisseur modifié ✓');
  } else {
    state.fournisseurs.push({ id: uid(), ...data });
    toast('Fournisseur ajouté ✓');
  }

  sauvegarder();
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

function deleteFourn(id) {
  if (!confirm('Supprimer ce fournisseur ?')) return;
  state.fournisseurs = state.fournisseurs.filter(f => f.id !== id);
  sauvegarder();
  renderFournisseurs();
  toast('Fournisseur supprimé');
}

// ===== AUTH =====
function switchTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('form-login').style.display    = tab === 'login'    ? 'block' : 'none';
  document.getElementById('form-register').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('auth-error').style.display    = 'none';
}

function showAuthError(msg) {
  const e = document.getElementById('auth-error');
  e.textContent  = msg;
  e.style.display = 'block';
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pwd   = document.getElementById('login-pwd').value;

  if (!email || !pwd) {
    showAuthError('Veuillez remplir tous les champs.');
    return;
  }

  const btn = document.getElementById('btn-login');
  btn.disabled    = true;
  btn.textContent = 'Connexion...';
  document.getElementById('auth-error').style.display = 'none';

  const { data, error } = await supa.auth.signInWithPassword({
    email,
    password: pwd
  });

  btn.disabled    = false;
  btn.textContent = 'Se connecter';

  if (error) {
    showAuthError('Email ou mot de passe incorrect.');
    return;
  }

  const meta = data.user.user_metadata || {};
  bootApp({
    id    : data.user.id,
    email : data.user.email,
    prenom: meta.prenom || '',
    nom   : meta.nom    || ''
  });
}

async function doRegister() {
  const prenom = document.getElementById('reg-prenom').value.trim();
  const nom    = document.getElementById('reg-nom').value.trim();
  const email  = document.getElementById('reg-email').value.trim();
  const pwd    = document.getElementById('reg-pwd').value;

  if (!prenom || !nom || !email || !pwd) {
    showAuthError('Tous les champs sont obligatoires.');
    return;
  }

  if (pwd.length < 6) {
    showAuthError('Mot de passe : minimum 6 caractères.');
    return;
  }

  const btn = document.getElementById('btn-register');
  btn.disabled    = true;
  btn.textContent = 'Création...';
  document.getElementById('auth-error').style.display = 'none';

  const { data, error } = await supa.auth.signUp({
    email,
    password: pwd,
    options : { data: { prenom, nom } }
  });

  btn.disabled    = false;
  btn.textContent = 'Créer mon compte';

  if (error) {
    showAuthError(error.message);
    return;
  }

  if (data.session) {
    bootApp({
      id    : data.user.id,
      email : data.user.email,
      prenom,
      nom
    });
  } else {
    showAuthError('✅ Compte créé ! Vérifiez votre email.');
    switchTab('login');
  }
}

async function doLogout() {
  await supa.auth.signOut();
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-screen').style.display  = 'none';
}

// ===== BOOT APP =====
function bootApp(user) {
  state.currentUser = user;

  const prenom = user.prenom || user.email.split('@')[0];
  const nom    = user.nom    || '';

  document.getElementById('user-name').textContent =
    (prenom + ' ' + nom).trim();
  document.getElementById('user-av').textContent =
    (prenom[0] || '').toUpperCase() + (nom[0] || '').toUpperCase();

  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display  = 'block';

  const loaded = charger();
  if (!loaded || !state.produits.length) initDemoData();

  renderDashboard();
  updateBadges();
}

// ===== INITIALISATION =====
window.addEventListener('load', async () => {
  const { data: { session } } = await supa.auth.getSession();

  if (session && session.user) {
    const meta = session.user.user_metadata || {};
    bootApp({
      id    : session.user.id,
      email : session.user.email,
      prenom: meta.prenom || '',
      nom   : meta.nom    || ''
    });
  } else {
    document.getElementById('auth-screen').style.display = 'flex';
  }

  supa.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      document.getElementById('auth-screen').style.display = 'flex';
      document.getElementById('app-screen').style.display  = 'none';
    }
  });
});