// ===== GRAPHIQUES =====
let chartMouvements = null;
let chartCategories = null;

function renderChartMouvements() {
  const ctx = document.getElementById('chart-mouvements');
  if (!ctx) return;

  // 7 derniers jours
  const jours = [];
  const entrees = [];
  const sorties = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label   = d.toLocaleDateString('fr-FR', {
      day  : '2-digit',
      month: 'short'
    });

    jours.push(label);

    const mvtsDuJour = state.mouvements.filter(m => m.date === dateStr);
    entrees.push(mvtsDuJour
      .filter(m => m.type === 'Entrée')
      .reduce((sum, m) => sum + m.qte, 0));
    sorties.push(mvtsDuJour
      .filter(m => m.type === 'Sortie')
      .reduce((sum, m) => sum + m.qte, 0));
  }

  // Détruire l'ancien graphique si existant
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
          borderRadius   : 4
        },
        {
          label          : 'Sorties',
          data           : sorties,
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor    : 'rgba(239, 68, 68, 1)',
          borderWidth    : 1,
          borderRadius   : 4
        }
      ]
    },
    options: {
      responsive       : true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: '#8b919e', font: { size: 12 } }
        }
      },
      scales: {
        x: {
          ticks : { color: '#8b919e' },
          grid  : { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
          ticks : { color: '#8b919e' },
          grid  : { color: 'rgba(255,255,255,0.05)' },
          beginAtZero: true
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

  document.getElementById('ds-total').textContent   = total;
  document.getElementById('ds-ok').textContent      = ok;
  document.getElementById('ds-faible').textContent  = faible;
  document.getElementById('ds-rupture').textContent = rupture;

  document.getElementById('dash-date').textContent =
    new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day    : 'numeric',
      month  : 'long',
      year   : 'numeric'
    });

  // --- Alertes ---
  const alerts = state.produits
    .filter(p => p.stock <= p.seuil)
    .slice(0, 4);

  document.getElementById('dash-alertes').innerHTML = alerts.length
    ? alerts.map(p => {
        const s = stockStatut(p);
        return `
          <div class="alert-item ${p.stock === 0 ? 'critical' : 'warning'}"
               style="margin-bottom:8px;">
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

  // --- Mouvements récents ---
  const mvts = [...state.mouvements].reverse().slice(0, 5);

  document.getElementById('dash-mouvements').innerHTML = mvts.length
    ? mvts.map(m => {
        const p = getProduit(m.produitId);
        return `
          <div style="display:flex;align-items:center;gap:10px;
                      padding:8px 0;border-bottom:1px solid var(--border);">
            <div style="width:28px;height:28px;border-radius:var(--rsm);
                        display:flex;align-items:center;justify-content:center;
                        font-size:13px;
                        background:${m.type === 'Entrée'
                          ? 'var(--green-glow)'
                          : 'var(--red-glow)'};">
              ${m.type === 'Entrée' ? '📥' : '📤'}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:12px;font-weight:600;
                          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${p ? p.nom : 'Produit supprimé'}
              </div>
              <div style="font-size:11px;color:var(--text2);">
                ${m.motif || m.type}
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div style="font-family:var(--mono);font-size:12px;
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

  // --- Catégories ---
  const cats = {};
  state.produits.forEach(p => {
    cats[p.cat] = (cats[p.cat] || 0) + 1;
  });

  document.getElementById('dash-categories').innerHTML =
    Object.entries(cats).map(([cat, count]) => `
      <div style="background:var(--bg3);border:1px solid var(--border);
                  border-radius:var(--rsm);padding:12px 16px;
                  display:flex;align-items:center;gap:10px;">
        <span style="font-size:24px;">${catEmoji(cat)}</span>
        <div>
          <div style="font-size:13px;font-weight:600;">${cat}</div>
          <div style="font-size:11px;color:var(--text2);">
            ${count} produit${count > 1 ? 's' : ''}
          </div>
        </div>
      </div>`
    ).join('') ||
    '<div style="color:var(--text2);font-size:13px;">Aucun produit</div>';

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
    const fourn = getFourn(p.fourniId);
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