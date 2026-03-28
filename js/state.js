// ===== STATE GLOBAL =====
// APRÈS
const state = {
  produits     : [],
  mouvements   : [],
  fournisseurs : [],
  categories   : [],
  currentUser  : null,
  searchQuery  : ''
};

// ===== CHARGER DEPUIS SUPABASE =====
// ===== CHARGER DEPUIS SUPABASE =====
async function charger() {
  try {
    // Categories
    const { data: categories, error: ec } = await supa
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (ec) throw ec;
    state.categories = categories || [];

    // Fournisseurs
    const { data: fournisseurs, error: ef } = await supa
      .from('fournisseurs')
      .select('*')
      .order('created_at', { ascending: true });

    if (ef) throw ef;
    state.fournisseurs = fournisseurs || [];

    // Produits
    const { data: produits, error: ep } = await supa
      .from('produits')
      .select('*')
      .order('created_at', { ascending: true });

    if (ep) throw ep;
    state.produits = produits || [];

    // Mouvements
    const { data: mouvements, error: em } = await supa
      .from('mouvements')
      .select('*')
      .order('created_at', { ascending: true });

    if (em) throw em;
    state.mouvements = mouvements || [];

    return true;
  } catch(e) {
    console.error('Erreur chargement:', e);
    return false;
  }
}

// ===== DEMO DATA =====
async function initDemoData() {
  try {
    const userId = state.currentUser.id;

    // Fournisseurs demo
    const { data: fourns } = await supa
      .from('fournisseurs')
      .insert([
        {
          user_id : userId,
          nom     : 'SONARA Distribution',
          contact : 'Ibrahima Sow',
          tel     : '77 111 22 33',
          email   : 'contact@sonara.sn',
          cats    : 'Alimentaire',
          adresse : 'Dakar'
        },
        {
          user_id : userId,
          nom     : 'Technoshop SARL',
          contact : 'Aminata Diallo',
          tel     : '78 222 33 44',
          email   : 'tech@techno.sn',
          cats    : 'Informatique / Électronique',
          adresse : 'Dakar Plateau'
        },
        {
          user_id : userId,
          nom     : 'MediSupply',
          contact : 'Dr. Ndiaye',
          tel     : '70 333 44 55',
          email   : 'med@medisupply.sn',
          cats    : 'Pharmacie / Santé',
          adresse : 'Thiès'
        }
      ])
      .select();

    state.fournisseurs = fourns || [];

    // Produits demo
    const f1 = state.fournisseurs[0]?.id;
    const f2 = state.fournisseurs[1]?.id;
    const f3 = state.fournisseurs[2]?.id;

    const { data: prods } = await supa
      .from('produits')
      .insert([
        {
          user_id    : userId,
          nom        : 'Riz Parfumé 25kg',
          ref        : 'RIZ-001',
          cat        : 'Alimentaire',
          fourn_id   : f1,
          stock      : 150,
          seuil      : 30,
          prix       : 18000,
          unite      : 'sac',
          description: ''
        },
        {
          user_id    : userId,
          nom        : 'Huile Végétale 5L',
          ref        : 'HUI-002',
          cat        : 'Alimentaire',
          fourn_id   : f1,
          stock      : 8,
          seuil      : 20,
          prix       : 4500,
          unite      : 'bidon',
          description: ''
        },
        {
          user_id    : userId,
          nom        : 'Laptop HP 15"',
          ref        : 'LAP-001',
          cat        : 'Informatique / Électronique',
          fourn_id   : f2,
          stock      : 3,
          seuil      : 5,
          prix       : 450000,
          unite      : 'pièce',
          description: ''
        },
        {
          user_id    : userId,
          nom        : 'Chemise Homme Slim',
          ref        : 'CHE-001',
          cat        : 'Vêtements / Textile',
          fourn_id   : null,
          stock      : 0,
          seuil      : 10,
          prix       : 8500,
          unite      : 'pièce',
          description: ''
        },
        {
          user_id    : userId,
          nom        : 'Paracétamol 500mg',
          ref        : 'PAR-001',
          cat        : 'Pharmacie / Santé',
          fourn_id   : f3,
          stock      : 200,
          seuil      : 50,
          prix       : 500,
          unite      : 'boite',
          description: ''
        },
        {
          user_id    : userId,
          nom        : 'Ciment Portland 50kg',
          ref        : 'CIM-001',
          cat        : 'Matériaux / BTP',
          fourn_id   : null,
          stock      : 40,
          seuil      : 20,
          prix       : 6000,
          unite      : 'sac',
          description: ''
        }
      ])
      .select();

    state.produits = prods || [];

  } catch(e) {
    console.error('Erreur demo data:', e);
  }
}