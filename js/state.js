// ===== STATE GLOBAL =====
const state = {
  produits      : [],
  mouvements    : [],
  fournisseurs  : [],
  currentUser   : null,
  searchQuery   : ''
};

// ===== SAUVEGARDE LOCAL =====
function sauvegarder() {
  localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify({
    produits     : state.produits,
    mouvements   : state.mouvements,
    fournisseurs : state.fournisseurs
  }));
}

function charger() {
  try {
    const d = JSON.parse(localStorage.getItem(APP_CONFIG.storageKey) || '{}');
    if (d.produits) {
      state.produits     = d.produits;
      state.mouvements   = d.mouvements   || [];
      state.fournisseurs = d.fournisseurs || [];
      return true;
    }
  } catch(e) {}
  return false;
}

// ===== DEMO DATA =====
function initDemoData() {
  state.fournisseurs = [
    {
      id      : 'f1',
      nom     : 'SONARA Distribution',
      contact : 'Ibrahima Sow',
      tel     : '77 111 22 33',
      email   : 'contact@sonara.sn',
      cats    : 'Alimentaire',
      adresse : 'Dakar'
    },
    {
      id      : 'f2',
      nom     : 'Technoshop SARL',
      contact : 'Aminata Diallo',
      tel     : '78 222 33 44',
      email   : 'tech@techno.sn',
      cats    : 'Informatique / Électronique',
      adresse : 'Dakar Plateau'
    },
    {
      id      : 'f3',
      nom     : 'MediSupply',
      contact : 'Dr. Ndiaye',
      tel     : '70 333 44 55',
      email   : 'med@medisupply.sn',
      cats    : 'Pharmacie / Santé',
      adresse : 'Thiès'
    }
  ];

  state.produits = [
    {
      id       : 'p1',
      nom      : 'Riz Parfumé 25kg',
      ref      : 'RIZ-001',
      cat      : 'Alimentaire',
      fourniId : 'f1',
      stock    : 150,
      seuil    : 30,
      prix     : 18000,
      unite    : 'sac',
      desc     : ''
    },
    {
      id       : 'p2',
      nom      : 'Huile Végétale 5L',
      ref      : 'HUI-002',
      cat      : 'Alimentaire',
      fourniId : 'f1',
      stock    : 8,
      seuil    : 20,
      prix     : 4500,
      unite    : 'bidon',
      desc     : ''
    },
    {
      id       : 'p3',
      nom      : 'Laptop HP 15"',
      ref      : 'LAP-001',
      cat      : 'Informatique / Électronique',
      fourniId : 'f2',
      stock    : 3,
      seuil    : 5,
      prix     : 450000,
      unite    : 'pièce',
      desc     : ''
    },
    {
      id       : 'p4',
      nom      : 'Chemise Homme Slim',
      ref      : 'CHE-001',
      cat      : 'Vêtements / Textile',
      fourniId : '',
      stock    : 0,
      seuil    : 10,
      prix     : 8500,
      unite    : 'pièce',
      desc     : ''
    },
    {
      id       : 'p5',
      nom      : 'Paracétamol 500mg',
      ref      : 'PAR-001',
      cat      : 'Pharmacie / Santé',
      fourniId : 'f3',
      stock    : 200,
      seuil    : 50,
      prix     : 500,
      unite    : 'boite',
      desc     : ''
    },
    {
      id       : 'p6',
      nom      : 'Ciment Portland 50kg',
      ref      : 'CIM-001',
      cat      : 'Matériaux / BTP',
      fourniId : '',
      stock    : 40,
      seuil    : 20,
      prix     : 6000,
      unite    : 'sac',
      desc     : ''
    }
  ];

  state.mouvements = [
    {
      id        : 'm1',
      produitId : 'p1',
      type      : 'Entrée',
      qte       : 200,
      motif     : 'Livraison SONARA',
      date      : '2026-03-20',
      user      : 'Admin'
    },
    {
      id        : 'm2',
      produitId : 'p2',
      type      : 'Sortie',
      qte       : 12,
      motif     : 'Vente client',
      date      : '2026-03-22',
      user      : 'Admin'
    },
    {
      id        : 'm3',
      produitId : 'p3',
      type      : 'Sortie',
      qte       : 2,
      motif     : 'Commande entreprise',
      date      : '2026-03-25',
      user      : 'Admin'
    },
    {
      id        : 'm4',
      produitId : 'p5',
      type      : 'Entrée',
      qte       : 300,
      motif     : 'Approvisionnement',
      date      : '2026-03-26',
      user      : 'Admin'
    }
  ];

  sauvegarder();
}