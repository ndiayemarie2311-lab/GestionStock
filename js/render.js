// ===== GRAPHIQUES =====
let chartMouvements = null;
let chartCategories = null;

function renderChartMouvements() {
  const ctx = document.getElementById('chart-mouvements');
  if (!ctx) return;

  // 30 derniers jours
  const jours   = [];
  const entrees = [];
  const sorties = [];
  const stocks  = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label   = d.toLocaleDateString('fr-FR', {
      day  : '2-digit',
      month: 'short'
    });

    jours.push(label);

    const mvtsDuJour = state.mouvements.filter(m => m.date === dateStr);
    const e = mvtsDuJour
      .filter(m => m.type === 'Entrée')
      .reduce((sum, m) => sum + m.qte, 0);
    const s = mvtsDuJour
      .filter(m => m.type === 'Sortie')
      .reduce((sum, m) => sum + m.qte, 0);

    entrees.push(e);
    sorties.push(s);
  }

  // Calculer l'évolution du stock total
  const stockActuel = state.produits.reduce((sum, p) => sum + p.stock, 0);
  let stockCourant  = stockActuel;

  for (let i = 29; i >= 0; i--) {
    stocks[i] = stockCourant;
    stockCourant = stockCourant - entrees[i] + sorties[i];
  }

  if (chartMouvements) chartMouvements.destroy();

  chartMouvements = new Chart(ctx, {
    type: 'bar',
    data: {
      labels  : jours,
      datasets: [
        {
          label          : 'Entrées',
          data           : entrees,
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderColor    : 'rgba(34, 197, 94, 1)',
          borderWidth    : 1,
          borderRadius   : 4,
          yAxisID        : 'y'
        },
        {
          label          : 'Sorties',
          data           : sorties,
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor    : 'rgba(239, 68, 68, 1)',
          borderWidth    : 1,
          borderRadius   : 4,
          yAxisID        : 'y'
        },
        {
          label          : 'Stock total',
          data           : stocks,
          type           : 'line',
          borderColor    : 'rgba(59, 130, 246, 0.9)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth    : 2,
          pointRadius    : 2,
          fill           : true,
          tension        : 0.4,
          yAxisID        : 'y2'
        }
      ]
    },
    options: {
      responsive        : true,
      maintainAspectRatio: true,
      interaction       : {
        mode     : 'index',
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: '#8b919e',
            font : { size: 11 }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(19, 22, 27, 0.95)',
          titleColor     : '#e8eaf0',
          bodyColor      : '#8b919e',
          borderColor    : '#2a2f3a',
          borderWidth    : 1
        }
      },
      scales: {
        x: {
          ticks: {
            color    : '#8b919e',
            maxTicksLimit: 10
          },
          grid: { color: 'rgba(255,255,255,0.03)' }
        },
        y: {
          position    : 'left',
          ticks       : { color: '#8b919e' },
          grid        : { color: 'rgba(255,255,255,0.05)' },
          beginAtZero : true,
          title       : {
            display: true,
            text   : 'Mouvements',
            color  : '#555e6e',
            font   : { size: 10 }
          }
        },
        y2: {
          position    : 'right',
          ticks       : { color: '#3b82f6' },
          grid        : { drawOnChartArea: false },
          beginAtZero : false,
          title       : {
            display: true,
            text   : 'Stock total',
            color  : '#3b82f6',
            font   : { size: 10 }
          }
        }
      }
    }
  });
}

function renderChartCategories() {
  const ctx = document.getElementById('chart-categories');
  if (!ctx) return;

  // Compter produits par catégorie
  const cats  = {};
  state.produits.forEach(p => {
    cats[p.cat] = (cats[p.cat] || 0) + 1;
  });

  const labels = Object.keys(cats);
  const values = Object.values(cats);

  const colors = [
    'rgba(59,  130, 246, 0.8)',
    'rgba(34,  197, 94,  0.8)',
    'rgba(249, 115, 22,  0.8)',
    'rgba(239, 68,  68,  0.8)',
    'rgba(168, 85,  247, 0.8)',
    'rgba(234, 179, 8,   0.8)'
  ];

  // Détruire l'ancien graphique si existant
  if (chartCategories) chartCategories.destroy();

  chartCategories = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels  : labels,
      datasets: [{
        data           : values,
        backgroundColor: colors,
        borderColor    : 'rgba(19, 22, 27, 1)',
        borderWidth    : 3
      }]
    },
    options: {
      responsive        : true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels  : {
            color    : '#8b919e',
            font     : { size: 11 },
            padding  : 16,
            boxWidth : 12
          }
        }
      }
    }
  });
}

// ===== RENDER DASHBOARD ======
function renderDashboard() {
  renderChartMouvements();
  renderChartCategories();

  const total   = state.produits.length;
  const ok      = state.produits.filter(p => p.stock > p.seuil).length;
  const faible  = state.produits.filter(p => p.stock > 0 && p.stock <= p.seuil).length;
  const rupture = state.produits.filter(p => p.stock === 0).length;

  // Stats principales
  document.getElementById('ds-total').textContent   = total;
  document.getElementById('ds-ok').textContent      = ok;
  document.getElementById('ds-faible').textContent  = faible;
  document.getElementById('ds-rupture').textContent = rupture;

  // Stats avancées
  const valeurTotale = state.produits.reduce((sum, p) =>
    sum + (p.stock * p.prix), 0);
  document.getElementById('ds-valeur').textContent = fmtPrix(valeurTotale);
  document.getElementById('ds-fournisseurs').textContent =
    state.fournisseurs.length;

  // Entrées / Sorties ce mois
  const maintenant  = new Date();
  const moisActuel  = maintenant.getMonth();
  const anneeActuelle = maintenant.getFullYear();

  const mvtsMois = state.mouvements.filter(m => {
    const d = new Date(m.date);
    return d.getMonth() === moisActuel &&
           d.getFullYear() === anneeActuelle;
  });

  const entreesMois = mvtsMois
    .filter(m => m.type === 'Entrée')
    .reduce((sum, m) => sum + m.qte, 0);
  const sortiesMois = mvtsMois
    .filter(m => m.type === 'Sortie')
    .reduce((sum, m) => sum + m.qte, 0);

  document.getElementById('ds-entrees').textContent = entreesMois;
  document.getElementById('ds-sorties').textContent = sortiesMois;

  document.getElementById('dash-date').textContent =
    new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day    : 'numeric',
      month  : 'long',
      year   : 'numeric'
    });

  // Top 5 produits par valeur stock
  const top5 = [...state.produits]
    .map(p => ({ ...p, valeur: p.stock * p.prix }))
    .sort((a, b) => b.valeur - a.valeur)
    .slice(0, 5);

  document.getElementById('dash-top-produits').innerHTML = top5.length
    ? top5.map((p, i) => {
        const pct = top5[0].valeur > 0
          ? Math.round(p.valeur / top5[0].valeur * 100)
          : 0;
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        return `
          <div style="margin-bottom:14px;">
            <div style="display:flex;align-items:center;
                        justify-content:space-between;margin-bottom:5px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:16px;">${medals[i]}</span>
                <div>
                  <div style="font-size:13px;font-weight:600;">${p.nom}</div>
                  <div style="font-size:11px;color:var(--text2);">
                    ${catEmoji(p.cat)} ${p.cat}
                  </div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-family:var(--mono);font-size:13px;
                            font-weight:700;color:var(--blue);">
                  ${fmtPrix(p.valeur)}
                </div>
                <div style="font-size:11px;color:var(--text2);">
                  ${p.stock} ${p.unite || ''}
                </div>
              </div>
            </div>
            <div class="stock-bar">
              <div class="stock-fill"
                   style="width:${pct}%;background:var(--blue);"></div>
            </div>
          </div>`;
      }).join('')
    : `<div class="empty" style="padding:20px;">
         <div style="font-size:13px;">Aucun produit</div>
       </div>`;

  // Alertes
  const alerts = state.produits
    .filter(p => p.stock <= p.seuil)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 4);

  document.getElementById('dash-alertes').innerHTML = alerts.length
    ? alerts.map(p => {
        const s = stockStatut(p);
        return `
          <div class="alert-item ${p.stock === 0 ? 'critical' : 'warning'}"
               style="margin-bottom:8px;">
            <div style="font-size:24px;">
              ${p.stock === 0 ? '🚨' : '⚠️'}
            </div>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:600;">${p.nom}</div>
              <div style="font-size:11px;color:var(--text2);margin-top:2px;">
                ${catEmoji(p.cat)} ${p.cat}
              </div>
            </div>
            <div style="text-align:right;">
              <span class="badge ${s.cls}">${s.label}</span>
              <div style="font-size:11px;color:var(--text2);margin-top:4px;">
                Stock: <b>${p.stock}</b> / Seuil: ${p.seuil}
              </div>
            </div>
          </div>`;
      }).join('')
    : `<div class="empty" style="padding:20px;">
         <div style="font-size:24px;margin-bottom:8px;">✅</div>
         <div style="font-size:13px;">Aucune alerte en cours</div>
       </div>`;

  // Mouvements récents
  const mvts = [...state.mouvements].reverse().slice(0, 5);

  document.getElementById('dash-mouvements').innerHTML = mvts.length
    ? mvts.map(m => {
        const p = getProduit(m.produit_id || m.produitId);
        return `
          <div style="display:flex;align-items:center;gap:10px;
                      padding:10px 0;border-bottom:1px solid var(--border);">
            <div style="width:32px;height:32px;border-radius:var(--rsm);
                        display:flex;align-items:center;justify-content:center;
                        font-size:14px;flex-shrink:0;
                        background:${m.type === 'Entrée'
                          ? 'var(--green-glow)'
                          : 'var(--red-glow)'};">
              ${m.type === 'Entrée' ? '📥' : '📤'}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:600;
                          white-space:nowrap;overflow:hidden;
                          text-overflow:ellipsis;">
                ${p ? p.nom : 'Produit supprimé'}
              </div>
              <div style="font-size:11px;color:var(--text2);">
                ${m.motif || m.type} · ${m.operateur || 'Admin'}
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div style="font-family:var(--mono);font-size:13px;font-weight:700;
                          color:${m.type === 'Entrée'
                            ? 'var(--green)'
                            : 'var(--red)'};">
                ${m.type === 'Entrée' ? '+' : '−'}${m.qte}
              </div>
              <div style="font-size:10px;color:var(--text3);">
                ${fmtDate(m.date)}
              </div>
            </div>
          </div>`;
      }).join('')
    : `<div class="empty" style="padding:20px;">
         <div style="font-size:13px;">Aucun mouvement</div>
       </div>`;

  updateBadges();
}

// ===== RENDER PRODUITS =====
function renderProduits() {
  const catF    = document.getElementById('filter-cat').value;
  const statF   = document.getElementById('filter-statut').value;

  let list = state.produits.filter(p => {
    if (catF  && p.cat !== catF) return false;
    if (statF && stockStatut(p).label !== statF) return false;
    if (state.searchQuery &&
        !p.nom.toLowerCase().includes(state.searchQuery) &&
        !p.ref.toLowerCase().includes(state.searchQuery)) return false;
    return true;
  });

  document.getElementById('produits-count').textContent =
    `${list.length} produit${list.length > 1 ? 's' : ''}`;

  const tbody = document.getElementById('tbody-produits');

  if (!list.length) {
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty">
          <div class="empty-icon">📦</div>
          <div class="empty-text">Aucun produit trouvé</div>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => {
    const s     = stockStatut(p);
    const fourn = getFourn(p.fourn_id);
    const pct   = p.seuil > 0
      ? Math.min(100, Math.round(p.stock / p.seuil * 50))
      : 100;

    return `
      <tr>
        <td>
          <div style="font-weight:600;font-size:13px;">${p.nom}</div>
          <div style="font-size:11px;color:var(--text3);
                      font-family:var(--mono);">${p.ref || '—'}</div>
        </td>
        <td><span class="cat-pill">${catEmoji(p.cat)} ${p.cat}</span></td>
        <td style="font-size:12px;color:var(--text2);">
          ${fourn ? fourn.nom : '—'}
        </td>
        <td>
          <div style="font-family:var(--mono);font-weight:700;font-size:14px;">
            ${p.stock}
            <span style="font-size:11px;color:var(--text3);font-weight:400;">
              ${p.unite || ''}
            </span>
          </div>
          <div class="stock-bar">
            <div class="stock-fill" style="width:${pct}%;
              background:${p.stock === 0
                ? 'var(--red)'
                : p.stock <= p.seuil
                  ? 'var(--orange)'
                  : 'var(--green)'};"></div>
          </div>
        </td>
        <td style="font-family:var(--mono);font-size:12px;
                   color:var(--text2);">${p.seuil}</td>
        <td style="font-family:var(--mono);font-size:12px;">
          ${fmtPrix(p.prix)}
        </td>
        <td><span class="badge ${s.cls}">${s.label}</span></td>
        <td>
          <div style="display:flex;gap:4px;">
           <button class="btn btn-ghost btn-sm btn-icon"
        onclick="exportFicheProduit('${p.id}')" title="Fiche PDF">📄</button>
<button class="btn btn-ghost btn-sm btn-icon"
        onclick="editProduit('${p.id}')" title="Modifier">✏️</button>
<button class="btn btn-danger btn-sm btn-icon"
        onclick="deleteProduit('${p.id}')" title="Supprimer">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

// ===== RENDER MOUVEMENTS =====
function renderMouvements() {
  const typeF = document.getElementById('filter-type').value;

  let list = [...state.mouvements]
    .filter(m => !typeF || m.type === typeF)
    .reverse();

  const tbody = document.getElementById('tbody-mouvements');

  if (!list.length) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty">
          <div class="empty-icon">🔄</div>
          <div class="empty-text">Aucun mouvement enregistré</div>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(m => {
    const p = getProduit(m.produitId);
    return `
      <tr>
        <td style="font-size:12px;color:var(--text2);font-family:var(--mono);">
          ${fmtDate(m.date)}
        </td>
        <td>
          <div style="font-weight:600;font-size:13px;">
            ${p ? p.nom : 'Produit supprimé'}
          </div>
          ${p ? `<span class="cat-pill" style="font-size:10px;padding:2px 7px;">
                   ${catEmoji(p.cat)} ${p.cat}
                 </span>` : ''}
        </td>
        <td>
          <span class="badge ${m.type === 'Entrée' ? 'b-green' : 'b-red'}">
            ${m.type === 'Entrée' ? '📥' : '📤'} ${m.type}
          </span>
        </td>
        <td style="font-family:var(--mono);font-weight:700;font-size:14px;
                   color:${m.type === 'Entrée'
                     ? 'var(--green)'
                     : 'var(--red)'};">
          ${m.type === 'Entrée' ? '+' : '−'}${m.qte}
        </td>
        <td style="font-size:12px;color:var(--text2);">${m.motif || '—'}</td>
        <td style="font-size:12px;color:var(--text2);">${m.user  || '—'}</td>
      </tr>`;
  }).join('');
}

// ===== RENDER FOURNISSEURS =====
function renderFournisseurs() {
  document.getElementById('fourn-count').textContent =
    `${state.fournisseurs.length} fournisseur${state.fournisseurs.length > 1 ? 's' : ''}`;

  const container = document.getElementById('liste-fournisseurs');

  if (!state.fournisseurs.length) {
    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🚚</div>
        <div class="empty-text">Aucun fournisseur ajouté</div>
      </div>`;
    return;
  }

  container.innerHTML = state.fournisseurs.map(f => {
    const nbProduits = state.produits.filter(p => p.fourniId === f.id).length;
    return `
      <div class="card" style="margin-bottom:12px;">
        <div class="card-header">
          <div>
            <div class="card-title">${f.nom}</div>
            <div style="font-size:12px;color:var(--text2);margin-top:2px;">
              ${f.cats || '—'}
            </div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm"
                    onclick="editFourn('${f.id}')">✏️ Modifier</button>
            <button class="btn btn-danger btn-sm"
                    onclick="deleteFourn('${f.id}')">🗑️</button>
          </div>
        </div>
        <div class="card-body"
             style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <div style="font-size:11px;color:var(--text3);margin-bottom:3px;">
              Contact
            </div>
            <div style="font-size:13px;">${f.contact || '—'}</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--text3);margin-bottom:3px;">
              Téléphone
            </div>
            <div style="font-size:13px;font-family:var(--mono);">
              ${f.tel || '—'}
            </div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--text3);margin-bottom:3px;">
              Email
            </div>
            <div style="font-size:13px;">${f.email || '—'}</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--text3);margin-bottom:3px;">
              Produits liés
            </div>
            <div style="font-size:13px;font-weight:600;color:var(--blue);">
              ${nbProduits} produit${nbProduits > 1 ? 's' : ''}
            </div>
          </div>
          ${f.adresse ? `
            <div style="grid-column:span 2;">
              <div style="font-size:11px;color:var(--text3);margin-bottom:3px;">
                Adresse
              </div>
              <div style="font-size:13px;">${f.adresse}</div>
            </div>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ===== RENDER ALERTES =====
function renderAlertes() {
  const alertes = state.produits
    .filter(p => p.stock <= p.seuil)
    .sort((a, b) => a.stock - b.stock);

  const container = document.getElementById('liste-alertes');

  if (!alertes.length) {
    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon">✅</div>
        <div class="empty-text">
          Aucune alerte — tous les stocks sont à niveau !
        </div>
      </div>`;
    return;
  }

  container.innerHTML = alertes.map(p => {
    const s = stockStatut(p);
    return `
      <div class="alert-item ${p.stock === 0 ? 'critical' : 'warning'}">
        <div style="font-size:28px;">${p.stock === 0 ? '🚨' : '⚠️'}</div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:700;">${p.nom}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:2px;">
            ${catEmoji(p.cat)} ${p.cat} ${p.ref ? '· ' + p.ref : ''}
          </div>
        </div>
        <div style="text-align:right;">
          <span class="badge ${s.cls}" style="margin-bottom:6px;">
            ${s.label}
          </span>
          <div style="font-size:12px;color:var(--text2);">
            Stock : <b style="font-family:var(--mono);">
              ${p.stock} ${p.unite || ''}
            </b>
          </div>
          <div style="font-size:12px;color:var(--text2);">
            Seuil : <b style="font-family:var(--mono);">
              ${p.seuil} ${p.unite || ''}
            </b>
          </div>
        </div>
        <button class="btn btn-primary btn-sm"
                onclick="quickEntree('${p.id}')">📥 Entrée</button>
      </div>`;
  }).join('');
}

// ===== RENDER UTILISATEURS =====
async function renderUtilisateurs() {
  // Charger les profils depuis Supabase
  const { data: profils, error } = await supa
    .from('profils')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erreur chargement profils:', error);
    return;
  }

  // Stats
  document.getElementById('us-total').textContent = profils.length;
  document.getElementById('us-role').textContent  =
    state.currentUser?.role || 'Gestionnaire';
  document.getElementById('users-count').textContent =
    `${profils.length} utilisateur${profils.length > 1 ? 's' : ''} enregistré${profils.length > 1 ? 's' : ''}`;

  // Remplir mon profil
  const moi = profils.find(p => p.id === state.currentUser?.id);
  if (moi) {
    document.getElementById('profil-prenom').value = moi.prenom || '';
    document.getElementById('profil-nom').value    = moi.nom    || '';
    document.getElementById('profil-email').value  = moi.email || state.currentUser?.email || '';  

    }

  // Liste utilisateurs
  const tbody = document.getElementById('tbody-utilisateurs');

  if (!profils.length) {
    tbody.innerHTML = `
      <tr><td colspan="4">
        <div class="empty">
          <div class="empty-icon">👥</div>
          <div class="empty-text">Aucun utilisateur trouvé</div>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = profils.map(p => {
    const estMoi  = p.id === state.currentUser?.id;
    const prenom  = p.prenom || '—';
    const nom     = p.nom    || '—';
    const initiales =
      (p.prenom?.[0] || '').toUpperCase() +
      (p.nom?.[0]    || '').toUpperCase();

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="user-av" style="width:34px;height:34px;font-size:12px;
                 background:${estMoi ? 'var(--blue)' : 'var(--bg4)'};
                 border:1px solid ${estMoi ? 'var(--blue)' : 'var(--border2)'};">
              ${initiales || '??'}
            </div>
            <div>
              <div style="font-size:13px;font-weight:600;">
                ${prenom} ${nom}
                ${estMoi
                  ? '<span class="badge b-blue" style="margin-left:6px;">Moi</span>'
                  : ''}
              </div>
            </div>
          </div>
        </td>
        <td style="font-size:12px;color:var(--text2);">${p.email || '—'}</td>
        <td>
          <span class="badge ${p.role === 'admin'
            ? 'b-orange'
            : 'b-gray'}">
            ${p.role === 'admin' ? '👑 Admin' : '👤 Gestionnaire'}
          </span>
        </td>
        <td style="font-size:12px;color:var(--text2);font-family:var(--mono);">
          ${fmtDate(p.created_at)}
        </td>
      </tr>`;
  }).join('');
}
// ===== RENDER CATEGORIES =====
function renderCategories() {
  document.getElementById('cat-count').textContent =
    `${state.categories.length} catégorie${state.categories.length > 1 ? 's' : ''}`;

  const container = document.getElementById('liste-categories');

  if (!state.categories.length) {
    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🏷️</div>
        <div class="empty-text">Aucune catégorie ajoutée</div>
      </div>`;
    return;
  }

  container.innerHTML = state.categories.map(c => {
    const produitsCat = state.produits.filter(p => p.cat === c.nom);
    const nbProduits  = produitsCat.length;
    const nbAlertes   = produitsCat.filter(p => p.stock <= p.seuil).length;
    const valeurTotale= produitsCat.reduce((sum, p) => sum + (p.stock * p.prix), 0);

    return `
      <div class="card" style="margin-bottom:12px;">
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:46px;height:46px;border-radius:var(--rsm);
                        background:${c.couleur}22;
                        border:2px solid ${c.couleur}55;
                        display:flex;align-items:center;
                        justify-content:center;font-size:22px;">
              ${c.emoji}
            </div>
            <div>
              <div class="card-title" style="font-size:15px;">${c.nom}</div>
              <div style="font-size:11px;color:var(--text2);margin-top:2px;">
                ${nbProduits} produit${nbProduits > 1 ? 's' : ''}
                ${nbAlertes > 0
                  ? `· <span style="color:var(--orange);">
                       ⚠️ ${nbAlertes} alerte${nbAlertes > 1 ? 's' : ''}
                     </span>`
                  : ''}
              </div>
            </div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm"
                    onclick="editCategorie('${c.id}')">✏️</button>
            <button class="btn btn-danger btn-sm"
                    onclick="deleteCategorie('${c.id}')">🗑️</button>
          </div>
        </div>
        <div class="card-body"
             style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <div style="font-size:11px;color:var(--text3);margin-bottom:4px;">
              Valeur totale stock
            </div>
            <div style="font-family:var(--mono);font-size:14px;
                        font-weight:700;color:var(--blue);">
              ${fmtPrix(valeurTotale)}
            </div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--text3);margin-bottom:4px;">
              Statut stock
            </div>
            <div>
              ${nbAlertes > 0
                ? `<span class="badge b-orange">⚠️ ${nbAlertes} alerte${nbAlertes > 1 ? 's' : ''}</span>`
                : `<span class="badge b-green">✅ Normal</span>`}
            </div>
          </div>
          <div style="grid-column:span 2;">
            <div style="font-size:11px;color:var(--text3);margin-bottom:6px;">
              Produits
            </div>
            ${produitsCat.length
              ? produitsCat.map(p => {
                  const s = stockStatut(p);
                  return `
                    <div style="display:flex;align-items:center;gap:8px;
                                padding:6px 0;border-bottom:1px solid var(--border);">
                      <div style="flex:1;font-size:12px;font-weight:500;">
                        ${p.nom}
                      </div>
                      <div style="font-family:var(--mono);font-size:12px;
                                  color:var(--text2);">
                        ${p.stock} ${p.unite || ''}
                      </div>
                      <span class="badge ${s.cls}" style="font-size:10px;">
                        ${s.label}
                      </span>
                      <button class="btn btn-ghost btn-sm btn-icon"
                              onclick="openEditProduit('${p.id}')"
                              title="Modifier">✏️</button>
                    </div>`;
                }).join('')
              : `<div style="font-size:12px;color:var(--text3);
                             padding:8px 0;">
                   Aucun produit dans cette catégorie
                 </div>`}
          </div>
          <div style="grid-column:span 2;margin-top:4px;">
            <button class="btn btn-ghost btn-sm" style="width:100%;"
                    onclick="filtrerParCategorie('${c.nom}')">
              📦 Voir tous les produits →
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}
// ===== RENDER HISTORIQUE =====
function renderHistorique() {
  const search    = (document.getElementById('hist-search')?.value || '').toLowerCase();
  const typeF     = document.getElementById('hist-type')?.value || '';
  const dateDebut = document.getElementById('hist-date-debut')?.value || '';
  const dateFin   = document.getElementById('hist-date-fin')?.value || '';

  // Stats globales
  const total    = state.mouvements.length;
  const entrees  = state.mouvements
    .filter(m => m.type === 'Entrée')
    .reduce((sum, m) => sum + m.qte, 0);
  const sorties  = state.mouvements
    .filter(m => m.type === 'Sortie')
    .reduce((sum, m) => sum + m.qte, 0);

  const maintenant    = new Date();
  const moisActuel    = maintenant.getMonth();
  const anneeActuelle = maintenant.getFullYear();
  const mvtsMois      = state.mouvements.filter(m => {
    const d = new Date(m.date);
    return d.getMonth()    === moisActuel &&
           d.getFullYear() === anneeActuelle;
  }).length;

  document.getElementById('hist-total').textContent   = total;
  document.getElementById('hist-entrees').textContent = entrees;
  document.getElementById('hist-sorties').textContent = sorties;
  document.getElementById('hist-mois').textContent    = mvtsMois;

  // Filtrer
  let list = [...state.mouvements].reverse().filter(m => {
    const p = getProduit(m.produit_id || m.produitId);

    // Recherche
    if (search) {
      const nomProduit = p ? p.nom.toLowerCase() : '';
      const motif      = (m.motif      || '').toLowerCase();
      const operateur  = (m.operateur  || '').toLowerCase();
      if (!nomProduit.includes(search) &&
          !motif.includes(search) &&
          !operateur.includes(search)) return false;
    }

    // Type
    if (typeF && m.type !== typeF) return false;

    // Date début
    if (dateDebut && m.date < dateDebut) return false;

    // Date fin
    if (dateFin && m.date > dateFin) return false;

    return true;
  });

  document.getElementById('hist-count').textContent =
    `${list.length} mouvement${list.length > 1 ? 's' : ''} trouvé${list.length > 1 ? 's' : ''}`;

  const tbody = document.getElementById('tbody-historique');

  if (!list.length) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty">
          <div class="empty-icon">📋</div>
          <div class="empty-text">Aucun mouvement trouvé</div>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(m => {
    const p = getProduit(m.produit_id || m.produitId);
    return `
      <tr>
        <td style="font-size:12px;color:var(--text2);
                   font-family:var(--mono);white-space:nowrap;">
          ${fmtDate(m.date)}
        </td>
        <td>
          <div style="font-weight:600;font-size:13px;">
            ${p ? p.nom : 'Produit supprimé'}
          </div>
          ${p ? `<div style="font-size:11px;color:var(--text3);
                             font-family:var(--mono);">
                   ${p.ref || ''}
                 </div>` : ''}
        </td>
        <td>
          ${p
            ? `<span class="cat-pill">
                 ${catEmoji(p.cat)} ${p.cat}
               </span>`
            : '—'}
        </td>
        <td>
          <span class="badge ${m.type === 'Entrée' ? 'b-green' : 'b-red'}">
            ${m.type === 'Entrée' ? '📥' : '📤'} ${m.type}
          </span>
        </td>
        <td style="font-family:var(--mono);font-weight:700;font-size:14px;
                   color:${m.type === 'Entrée'
                     ? 'var(--green)'
                     : 'var(--red)'};">
          ${m.type === 'Entrée' ? '+' : '−'}${m.qte}
          <span style="font-size:11px;color:var(--text3);font-weight:400;">
            ${p ? p.unite || '' : ''}
          </span>
        </td>
        <td style="font-size:12px;color:var(--text2);">
          ${m.motif || '—'}
        </td>
        <td style="font-size:12px;color:var(--text2);">
          ${m.operateur || '—'}
        </td>
      </tr>`;
  }).join('');
}

// ===== RENDER RAPPORT =====
function renderRapport() {
  const valeurTotale = state.produits
    .reduce((sum, p) => sum + p.stock * p.prix, 0);

  // En-tête
  document.getElementById('rapport-date').textContent =
    new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric',
      month  : 'long', year: 'numeric'
    });
  document.getElementById('rapport-user').textContent =
    `Généré par ${state.currentUser?.prenom || ''} ${state.currentUser?.nom || ''}`;
  document.getElementById('rapport-valeur').textContent =
    fmtPrix(valeurTotale);

  // Stats
  document.getElementById('rp-total').textContent =
    state.produits.length;
  document.getElementById('rp-ok').textContent =
    state.produits.filter(p => p.stock > p.seuil).length;
  document.getElementById('rp-faible').textContent =
    state.produits.filter(p => p.stock > 0 && p.stock <= p.seuil).length;
  document.getElementById('rp-rupture').textContent =
    state.produits.filter(p => p.stock === 0).length;

  // Résumé par catégorie
  const cats = {};
  state.produits.forEach(p => {
    if (!cats[p.cat]) {
      cats[p.cat] = {
        nb      : 0,
        stock   : 0,
        valeur  : 0,
        alertes : 0
      };
    }
    cats[p.cat].nb++;
    cats[p.cat].stock  += p.stock;
    cats[p.cat].valeur += p.stock * p.prix;
    if (p.stock <= p.seuil) cats[p.cat].alertes++;
  });

  document.getElementById('tbody-rapport-cats').innerHTML =
    Object.entries(cats).map(([cat, d]) => `
      <tr>
        <td>
          <span class="cat-pill">${catEmoji(cat)} ${cat}</span>
        </td>
        <td style="font-family:var(--mono);font-weight:700;">
          ${d.nb}
        </td>
        <td style="font-family:var(--mono);">${d.stock}</td>
        <td style="font-family:var(--mono);color:var(--blue);font-weight:700;">
          ${fmtPrix(d.valeur)}
        </td>
        <td>
          ${d.alertes > 0
            ? `<span class="badge b-orange">⚠️ ${d.alertes}</span>`
            : `<span class="badge b-green">✅ OK</span>`}
        </td>
      </tr>`
    ).join('');

  // Liste complète produits
  document.getElementById('tbody-rapport-produits').innerHTML =
    state.produits.map(p => {
      const s     = stockStatut(p);
      const fourn = getFourn(p.fourn_id);
      return `
        <tr>
          <td style="font-weight:600;">${p.nom}</td>
          <td style="font-family:var(--mono);font-size:11px;
                     color:var(--text3);">${p.ref || '—'}</td>
          <td>
            <span class="cat-pill" style="font-size:10px;">
              ${catEmoji(p.cat)} ${p.cat}
            </span>
          </td>
          <td style="font-size:12px;color:var(--text2);">
            ${fourn ? fourn.nom : '—'}
          </td>
          <td style="font-family:var(--mono);font-weight:700;">
            ${p.stock} ${p.unite || ''}
          </td>
          <td style="font-family:var(--mono);color:var(--text2);">
            ${p.seuil}
          </td>
          <td style="font-family:var(--mono);">${fmtPrix(p.prix)}</td>
          <td style="font-family:var(--mono);color:var(--blue);font-weight:700;">
            ${fmtPrix(p.stock * p.prix)}
          </td>
          <td><span class="badge ${s.cls}">${s.label}</span></td>
        </tr>`;
    }).join('');

  // Alertes actives
  const alertes = state.produits.filter(p => p.stock <= p.seuil);
  document.getElementById('rapport-alertes').innerHTML = alertes.length
    ? alertes.map(p => {
        const s = stockStatut(p);
        return `
          <div class="alert-item ${p.stock === 0 ? 'critical' : 'warning'}"
               style="margin-bottom:8px;">
            <div style="font-size:22px;">
              ${p.stock === 0 ? '🚨' : '⚠️'}
            </div>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:700;">${p.nom}</div>
              <div style="font-size:11px;color:var(--text2);">
                ${catEmoji(p.cat)} ${p.cat}
              </div>
            </div>
            <div style="text-align:right;">
              <span class="badge ${s.cls}">${s.label}</span>
              <div style="font-size:11px;color:var(--text2);margin-top:4px;">
                Stock: <b>${p.stock}</b> / Seuil: ${p.seuil}
              </div>
            </div>
          </div>`;
      }).join('')
    : `<div style="padding:16px;text-align:center;color:var(--text2);
                   font-size:13px;">✅ Aucune alerte active</div>`;

  // Mouvements du mois
  const mois    = new Date().getMonth();
  const annee   = new Date().getFullYear();
  const mvtsMois = [...state.mouvements]
    .filter(m => {
      const d = new Date(m.date);
      return d.getMonth()    === mois &&
             d.getFullYear() === annee;
    })
    .reverse();

  document.getElementById('tbody-rapport-mvts').innerHTML =
    mvtsMois.length
      ? mvtsMois.map(m => {
          const p = getProduit(m.produit_id || m.produitId);
          return `
            <tr>
              <td style="font-size:12px;color:var(--text2);
                         font-family:var(--mono);">
                ${fmtDate(m.date)}
              </td>
              <td style="font-weight:600;font-size:13px;">
                ${p ? p.nom : 'Supprimé'}
              </td>
              <td>
                <span class="badge ${m.type === 'Entrée'
                  ? 'b-green' : 'b-red'}">
                  ${m.type === 'Entrée' ? '📥' : '📤'} ${m.type}
                </span>
              </td>
              <td style="font-family:var(--mono);font-weight:700;
                         color:${m.type === 'Entrée'
                           ? 'var(--green)' : 'var(--red)'};">
                ${m.type === 'Entrée' ? '+' : '−'}${m.qte}
              </td>
              <td style="font-size:12px;color:var(--text2);">
                ${m.motif || '—'}
              </td>
              <td style="font-size:12px;color:var(--text2);">
                ${m.operateur || '—'}
              </td>
            </tr>`;
        }).join('')
      : `<tr><td colspan="6">
           <div class="empty" style="padding:20px;">
             <div style="font-size:13px;">Aucun mouvement ce mois</div>
           </div>
         </td></tr>`;
}

// ===== RENDER INVENTAIRE =====
function renderInventaire() {
  const catF   = document.getElementById('inv-filter-cat')?.value   || '';
  const ecartF = document.getElementById('inv-filter-ecart')?.value || '';

  // Remplir le select catégories
  const selCat = document.getElementById('inv-filter-cat');
  if (selCat && selCat.options.length <= 1) {
    state.categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.nom;
      opt.text  = `${c.emoji} ${c.nom}`;
      selCat.appendChild(opt);
    });
  }

  // Filtrer produits
  let list = state.produits.filter(p => {
    if (catF && p.cat !== catF) return false;

    const compteEl = document.getElementById(`inv-${p.id}`);
    const compte   = compteEl ? parseInt(compteEl.value) : NaN;
    const ecart    = !isNaN(compte) ? compte - p.stock : null;

    if (ecartF === 'ecart'     && (ecart === null || ecart === 0)) return false;
    if (ecartF === 'conforme'  && (ecart === null || ecart !== 0)) return false;
    if (ecartF === 'noncompte' && ecart !== null)                   return false;

    return true;
  });

  // Stats
  let conformes  = 0;
  let ecarts     = 0;
  let nonComptes = 0;

  state.produits.forEach(p => {
    const el     = document.getElementById(`inv-${p.id}`);
    const compte = el ? parseInt(el.value) : NaN;
    if (isNaN(compte))       nonComptes++;
    else if (compte === p.stock) conformes++;
    else                         ecarts++;
  });

  document.getElementById('inv-total').textContent    = state.produits.length;
  document.getElementById('inv-conformes').textContent = conformes;
  document.getElementById('inv-ecarts').textContent    = ecarts;
  document.getElementById('inv-restants').textContent  = nonComptes;

  const tbody = document.getElementById('tbody-inventaire');

  if (!list.length) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty">
          <div class="empty-icon">🔢</div>
          <div class="empty-text">Aucun produit trouvé</div>
        </div>
      </td></tr>`;
    return;
  }

  // Garder les valeurs existantes
  const valeurs = {};
  state.produits.forEach(p => {
    const el = document.getElementById(`inv-${p.id}`);
    if (el && el.value !== '') valeurs[p.id] = el.value;
  });

  tbody.innerHTML = list.map(p => {
    const valeur = valeurs[p.id] || '';
    const compte = valeur !== '' ? parseInt(valeur) : NaN;
    const ecart  = !isNaN(compte) ? compte - p.stock : null;

    let ecartHtml = '<span style="color:var(--text3);">—</span>';
    let statutHtml= '<span class="badge b-gray">En attente</span>';

    if (ecart !== null) {
      if (ecart === 0) {
        ecartHtml  = '<span style="color:var(--green);font-family:var(--mono);font-weight:700;">0</span>';
        statutHtml = '<span class="badge b-green">✅ Conforme</span>';
      } else if (ecart > 0) {
        ecartHtml  = `<span style="color:var(--green);font-family:var(--mono);font-weight:700;">+${ecart}</span>`;
        statutHtml = '<span class="badge b-blue">📈 Surplus</span>';
      } else {
        ecartHtml  = `<span style="color:var(--red);font-family:var(--mono);font-weight:700;">${ecart}</span>`;
        statutHtml = '<span class="badge b-red">📉 Manque</span>';
      }
    }

    return `
      <tr id="inv-row-${p.id}">
        <td>
          <div style="font-weight:600;font-size:13px;">${p.nom}</div>
          <div style="font-size:11px;color:var(--text3);
                      font-family:var(--mono);">${p.ref || '—'}</div>
        </td>
        <td>
          <span class="cat-pill">${catEmoji(p.cat)} ${p.cat}</span>
        </td>
        <td style="font-family:var(--mono);font-weight:700;font-size:14px;">
          ${p.stock}
          <span style="font-size:11px;color:var(--text3);font-weight:400;">
            ${p.unite || ''}
          </span>
        </td>
        <td>
          <input id="inv-${p.id}"
                 type="number" min="0"
                 value="${valeur}"
                 placeholder="Saisir..."
                 oninput="updateInventaireRow('${p.id}')"
                 style="width:100px;padding:6px 10px;
                        border-radius:var(--rsm);
                        border:1px solid var(--border2);
                        background:var(--bg3);color:var(--text);
                        font-size:13px;font-family:var(--mono);
                        outline:none;"/>
        </td>
        <td id="inv-ecart-${p.id}">${ecartHtml}</td>
        <td id="inv-statut-${p.id}">${statutHtml}</td>
      </tr>`;
  }).join('');
}

function updateInventaireRow(id) {
  const p      = getProduit(id);
  if (!p) return;

  const el     = document.getElementById(`inv-${id}`);
  const compte = parseInt(el.value);
  const ecart  = !isNaN(compte) ? compte - p.stock : null;

  const ecartEl  = document.getElementById(`inv-ecart-${id}`);
  const statutEl = document.getElementById(`inv-statut-${id}`);

  if (ecart === null) {
    ecartEl.innerHTML  = '<span style="color:var(--text3);">—</span>';
    statutEl.innerHTML = '<span class="badge b-gray">En attente</span>';
  } else if (ecart === 0) {
    ecartEl.innerHTML  = '<span style="color:var(--green);font-family:var(--mono);font-weight:700;">0</span>';
    statutEl.innerHTML = '<span class="badge b-green">✅ Conforme</span>';
  } else if (ecart > 0) {
    ecartEl.innerHTML  = `<span style="color:var(--green);font-family:var(--mono);font-weight:700;">+${ecart}</span>`;
    statutEl.innerHTML = '<span class="badge b-blue">📈 Surplus</span>';
  } else {
    ecartEl.innerHTML  = `<span style="color:var(--red);font-family:var(--mono);font-weight:700;">${ecart}</span>`;
    statutEl.innerHTML = '<span class="badge b-red">📉 Manque</span>';
  }

  // Mettre à jour les stats
  let conformes  = 0;
  let ecarts     = 0;
  let nonComptes = 0;

  state.produits.forEach(p => {
    const el     = document.getElementById(`inv-${p.id}`);
    const compte = el ? parseInt(el.value) : NaN;
    if (isNaN(compte))            nonComptes++;
    else if (compte === p.stock)  conformes++;
    else                          ecarts++;
  });

  document.getElementById('inv-conformes').textContent = conformes;
  document.getElementById('inv-ecarts').textContent    = ecarts;
  document.getElementById('inv-restants').textContent  = nonComptes;
}