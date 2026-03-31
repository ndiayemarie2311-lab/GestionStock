// ===== AFFICHAGE AUTH / APP =====
function showAuth() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-screen').style.display  = 'none';
}

function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display  = 'block';
}

// ===== ERREUR AUTH =====
function showAuthError(msg) {
  const e         = document.getElementById('auth-error');
  e.textContent   = msg;
  e.style.display = 'block';
}

function hideAuthError() {
  const e         = document.getElementById('auth-error');
  e.textContent   = '';
  e.style.display = 'none';
}

// ===== ONGLETS =====
function switchTab(tab) {
  document.getElementById('tab-login')
    .classList.toggle('active', tab === 'login');
  document.getElementById('tab-register')
    .classList.toggle('active', tab === 'register');

  document.getElementById('form-login').style.display =
    tab === 'login' ? 'block' : 'none';
  document.getElementById('form-register').style.display =
    tab === 'register' ? 'block' : 'none';

  hideAuthError();
}

// ===== CONNEXION =====
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pwd   = document.getElementById('login-pwd').value;

  if (!email || !pwd) {
    showAuthError('Veuillez remplir tous les champs.');
    return;
  }

  const btn       = document.getElementById('btn-login');
  btn.disabled    = true;
  btn.textContent = 'Connexion...';
  hideAuthError();

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
  await bootApp({
    id    : data.user.id,
    email : data.user.email,
    prenom: meta.prenom || '',
    nom   : meta.nom    || ''
  });
}

// ===== INSCRIPTION =====
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

  const btn       = document.getElementById('btn-register');
  btn.disabled    = true;
  btn.textContent = 'Création...';
  hideAuthError();

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
    await bootApp({
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

// ===== DÉCONNEXION =====
async function doLogout() {
  await supa.auth.signOut();
  state.produits     = [];
  state.mouvements   = [];
  state.fournisseurs = [];
  state.currentUser  = null;
  showAuth();
}

// ===== BOOT APP =====
async function bootApp(user) {
  state.currentUser = user;

  const prenom = user.prenom || user.email.split('@')[0];
  const nom    = user.nom    || '';

  document.getElementById('user-name').textContent =
    (prenom + ' ' + nom).trim();
  document.getElementById('user-av').textContent =
    (prenom[0] || '').toUpperCase() + (nom[0] || '').toUpperCase();

  showApp();

  // Charger toutes les données
  await charger();

  // Si pas de données demo
  if (!state.produits.length) {
    await initDemoData();
  }

  // Initialiser la devise
  const sel = document.getElementById('devise-selector');
  if (sel) sel.value = deviseActive;
  // Afficher dashboard
  renderDashboard();
  updateBadges();
}