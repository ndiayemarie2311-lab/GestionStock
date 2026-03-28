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