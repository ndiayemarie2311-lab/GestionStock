// ===== CONFIGURATION SUPABASE =====
const SUPA_URL = 'https://ppnktshvpcguhjorezbl.supabase.co';
const SUPA_KEY = 'sb_publishable_0IQmkRl7uoy4Ek2kPOcCxQ_U5W1VNsl';

const supa = supabase.createClient(SUPA_URL, SUPA_KEY);

// ===== CONFIGURATION APP =====
const APP_CONFIG = {
  nom        : 'StockPro',
  version    : '1.0',
  storageKey : 'stockpro_data',
  categories : [
    'Alimentaire',
    'Vêtements / Textile',
    'Informatique / Électronique',
    'Pharmacie / Santé',
    'Matériaux / BTP',
    'Autre'
  ],
  catEmojis : {
    'Alimentaire'                : '🥩',
    'Vêtements / Textile'        : '👔',
    'Informatique / Électronique': '💻',
    'Pharmacie / Santé'          : '💊',
    'Matériaux / BTP'            : '🧱',
    'Autre'                      : '📦'
  }
};

// ===== CONFIGURATION EMAILJS =====
const EMAIL_CONFIG = {
  publicKey  : '52sI0J-OdFz0YyGFf',
  serviceId  : 'service_rak0rnm',
  templateId : 'template_20mhpwg'
};

// Initialiser EmailJS
emailjs.init(EMAIL_CONFIG.publicKey);

// ===== CONFIGURATION DEVISES =====
const DEVISES = {
  XOF: { nom: 'Franc CFA',    symbole: 'F',   taux: 1        },
  EUR: { nom: 'Euro',         symbole: '€',   taux: 0.001524 },
  USD: { nom: 'Dollar',       symbole: '$',   taux: 0.001639 },
  GBP: { nom: 'Livre Sterling',symbole: '£',  taux: 0.001295 },
  MAD: { nom: 'Dirham',       symbole: 'DH',  taux: 0.016    },
  NGN: { nom: 'Naira',        symbole: '₦',   taux: 2.47     }
};

let deviseActive = localStorage.getItem('stockpro_devise') || 'XOF';

function getDevise() {
  return DEVISES[deviseActive] || DEVISES.XOF;
}

function setDevise(code) {
  deviseActive = code;
  localStorage.setItem('stockpro_devise', code);
}

function convertirPrix(montantXOF) {
  const d = getDevise();
  return montantXOF * d.taux;
}

function fmtPrixDevise(montantXOF) {
  const d      = getDevise();
  const valeur = montantXOF * d.taux;

  if (deviseActive === 'XOF') {
    return Number(valeur).toLocaleString('fr-FR').replace(/\s/g, ' ') +
           ' ' + d.symbole;
  }

  return d.symbole + ' ' +
    Number(valeur).toLocaleString('fr-FR', {
      minimumFractionDigits : 2,
      maximumFractionDigits : 2
    });
}