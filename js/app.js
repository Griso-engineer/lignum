/* ==========================================================================
   Lignum — interface
   ========================================================================== */
(function () {
  'use strict';
  const E = window.LignumEC5, D = window.LIGNUM_DATA, ST = window.LignumStore;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let db = ST.load();
  let state = db.draft ? ST.upgrade(db.draft) : ST.defaultState();
  let R = null;
  let dirty = !!db.draftDirty;

  // ---------- formats ----------
  const fmt = (x, d = 2) => (Number.isFinite(x) ? x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');
  const fmtG = (x, d = 3) => (Number.isFinite(x) ? x.toLocaleString('fr-FR', { maximumFractionDigits: d }) : '—');
  const pct = (r) => (Number.isFinite(r) ? Math.round(r * 100) + ' %' : '∞');
  const cls = (r) => (!(r <= 1) ? 'ko' : r > 0.9 ? 'hi' : '');
  const bar = (r) => `<div class="bar"><i class="${cls(r)}" style="width:${Math.min(100, (Number.isFinite(r) ? r : 1) * 100)}%"></i></div>`;
  const pill = (r) => (r == null ? '<span class="pill na">—</span>' : r <= 1 ? '<span class="pill ok">OK</span>' : '<span class="pill ko">NON</span>');

  // ---------- accès par chemin ----------
  const get = (p, o = state) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  function set(p, v, o = state) {
    const ks = p.split('.'); let a = o;
    ks.slice(0, -1).forEach((k) => { if (a[k] == null || typeof a[k] !== 'object') a[k] = {}; a = a[k]; });
    a[ks[ks.length - 1]] = v;
  }

  function recompute() { R = E.compute(state); return R; }
  let saveT = null;
  function persistDraft() {
    clearTimeout(saveT);
    saveT = setTimeout(() => { db.draft = state; db.draftDirty = dirty; ST.save(db); }, 250);
  }
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
  }

  // ---------- champs ----------
  function inp(p, opt = {}) {
    const v = get(p);
    const type = opt.type || 'number';
    const step = opt.step ? ` step="${opt.step}"` : ' step="any"';
    return `<input type="${type}" data-p="${p}" value="${esc(v)}"${type === 'number' ? step : ''}${opt.ph ? ` placeholder="${esc(opt.ph)}"` : ''}${opt.dis ? ' disabled' : ''}${opt.id ? ` id="${opt.id}"` : ''}>`;
  }
  function sel(p, options, opt = {}) {
    const v = String(get(p));
    const html = options.map((o) => {
      if (o.group) return `<optgroup label="${esc(o.group)}">${o.items.map((it) => `<option value="${esc(it[0])}"${String(it[0]) === v ? ' selected' : ''}>${esc(it[1])}</option>`).join('')}</optgroup>`;
      return `<option value="${esc(o[0])}"${String(o[0]) === v ? ' selected' : ''}>${esc(o[1])}</option>`;
    }).join('');
    return `<select data-p="${p}"${opt.rerender ? ' data-rerender="1"' : ''}${opt.dis ? ' disabled' : ''}>${html}</select>`;
  }
  const field = (label, control, unit, hint) => `<label class="field"><span>${label}${unit ? ` <span class="u">[${unit}]</span>` : ''}</span>${control}${hint ? `<span class="hint">${hint}</span>` : ''}</label>`;
  const chk = (p, label, rerender) => `<label class="check"><input type="checkbox" data-p="${p}"${get(p) ? ' checked' : ''}${rerender ? ' data-rerender="1"' : ''}> ${label}</label>`;
  const blockHead = (n, title, text) => `<div class="block-head"><span class="num">${n}</span><h2>${title}</h2><p>${text || ''}</p></div>`;

  const gradeOptions = () => D.GROUPS.map(([g, ks]) => ({ group: g, items: ks.map((k) => [k, k]) }));
  const catOptions = () => Object.keys(D.CATEGORIES).map((k) => [k, D.CATEGORIES[k].label]);
  const durOptions = () => [['auto', 'Auto']].concat(D.DURATIONS);

  // ---------- schéma de section ----------
  function sectionSvg(b, h, bf, hf, size = 110) {
    b = +b || 1; h = +h || 1;
    const k = (size - 30) / Math.max(b, h);
    const W = b * k, H = h * k, x0 = (size - W) / 2 + 6, y0 = (size - H) / 2;
    let res = '';
    if (bf != null && bf > 0 && hf > 0 && (bf < b || hf < h)) {
      // position du résiduel : faces exposées de façon symétrique sur b, par le dessous sur h
      const nB = +state.fire.facesB, nH = +state.fire.facesH;
      const dB = (b - bf) * k, dH = (h - hf) * k;
      const rx = x0 + (nB === 2 ? dB / 2 : nB === 1 ? dB : 0);
      const ry = y0 + (nH === 2 ? dH / 2 : 0);
      res = `<rect x="${rx}" y="${ry}" width="${bf * k}" height="${hf * k}" fill="none" stroke="#fa554f" stroke-width="1.2" stroke-dasharray="3 2"/>`;
    }
    return `<svg width="${size + 12}" height="${size}" viewBox="0 0 ${size + 12} ${size}" aria-hidden="true">
      <rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="#f6e3c8" stroke="#111" stroke-width="1.2"/>
      ${res}
      <line x1="${x0 + W / 2}" y1="${y0 - 6}" x2="${x0 + W / 2}" y2="${y0 + H + 6}" stroke="#111" stroke-width=".6" stroke-dasharray="4 2 1 2"/>
      <line x1="${x0 - 6}" y1="${y0 + H / 2}" x2="${x0 + W + 6}" y2="${y0 + H / 2}" stroke="#111" stroke-width=".6" stroke-dasharray="4 2 1 2"/>
      <text x="${x0 + W + 8}" y="${y0 + H / 2 + 4}">y</text><text x="${x0 + W / 2 + 3}" y="${y0 + H + 14}">z</text>
      <text x="${x0 - 4}" y="${y0 + H / 2 - 4}" text-anchor="end">h</text><text x="${x0 + W / 2 - 4}" y="${y0 - 4}" text-anchor="end">b</text>
    </svg>`;
  }

  // ======================================================================
  //  VÉRIFICATION
  // ======================================================================
  function crumb() {
    const p = db.current && db.projects.find((x) => x.id === db.current.projectId);
    const it = p && p.items.find((x) => x.id === db.current.itemId);
    return { p, it };
  }

  function renderVerification(app) {
    recompute();
    const { p } = crumb();
    const s = state;
    const modeChips = [['direct', 'Saisie directe des sollicitations (GSA…)'], ['poutre', 'Hypothèses de charges · poutre'], ['poteau', 'Hypothèses de charges · poteau']]
      .map(([k, l]) => `<button type="button" class="chip${s.loads.mode === k ? ' on' : ''}" data-act="mode" data-v="${k}">${l}</button>`).join('');

    app.innerHTML = `<div class="page">
      <div class="actionbar">
        <div class="grow">
          <span class="crumb">${p ? `Projet <b>${esc(p.name)}</b> ›` : 'Hors projet ›'} <b id="crumbName">${esc(s.name || 'Sans nom')}</b></span>
          <span class="dirty" id="dirtyFlag">${dirty ? 'modifié · non enregistré' : ''}</span>
        </div>
        <span id="verdict"></span>
        <div class="btn-group">
          <button class="btn" data-act="new">Nouveau</button>
          <button class="btn" data-act="save">Enregistrer</button>
          <button class="btn" data-act="saveas">Enregistrer sous…</button>
        </div>
        <button class="btn primary" data-act="report">Fiche NDC ↗</button>
      </div>

      ${blockHead('01', 'Élément', "Section rectangulaire, bois massif (EN 338) ou lamellé-collé (EN 14080). Axe y : axe fort (flexion dans le plan de h).")}
      <div class="cols2">
        <div class="fields">
          ${field('Repère', inp('name', { type: 'text', ph: 'ex. Poutre P3 – R+1' }))}
          ${field('Type', sel('elemType', [['poutre', 'Poutre'], ['poteau', 'Poteau']]))}
          ${field('b', inp('b'), 'mm')}
          ${field('h', inp('h'), 'mm')}
          ${field('Longueur L', inp('L'), 'm')}
          ${field('Classe de bois', sel('grade', gradeOptions()))}
          ${field('Classe de service', sel('serviceClass', [[1, 'Classe 1'], [2, 'Classe 2'], [3, 'Classe 3']]))}
          ${field('k<sub>sys</sub>', sel('ksys', [[1, '1,0'], [1.1, '1,1 — système (6.6)']]), '', 'Effet système : solives, chevrons… régulièrement espacés et liés.')}
        </div>
        <div class="section-fig" id="secFig"></div>
      </div>

      ${blockHead('02', 'Stabilité & feu', "Longueurs de flambement et de déversement, résistance au feu par la méthode de la section réduite (NF EN 1995-1-2 § 4.2.2).")}
      <div class="cols2">
        <div>
          <div class="sub-title">Instabilités</div>
          <div class="fields">
            ${field('l<sub>f,y</sub> flambement axe y', `<div class="inline">${inp('lfy', { dis: s.link.lfy })}</div>`, 'm')}
            ${field('l<sub>f,z</sub> flambement axe z', `<div class="inline">${inp('lfz', { dis: s.link.lfz })}</div>`, 'm')}
            ${field('l<sub>ef</sub> déversement', `<div class="inline">${inp('lef', { dis: s.link.lef })}</div>`, 'm')}
          </div>
          <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:8px">
            ${chk('link.lfy', 'l<sub>f,y</sub> = L', true)} ${chk('link.lfz', 'l<sub>f,z</sub> = L', true)} ${chk('link.lef', 'l<sub>ef</sub> = L', true)}
          </div>
          <p class="note">Tableau 6.1 : poutre sur appuis simples sous charge répartie, l<sub>ef</sub> = 0,9·L ; charge sur la fibre comprimée : + 2h, sur la fibre tendue : − 0,5h. Saisir 0 si l'élément est maintenu en continu (k<sub>c</sub> ou k<sub>crit</sub> = 1).</p>
        </div>
        <div>
          <div class="sub-title">Feu</div>
          <div class="fields">
            ${field('Durée requise', sel('fire.t', [[0, 'Aucune (pas de vérification)'], [15, 'R15'], [30, 'R30'], [45, 'R45'], [60, 'R60'], [90, 'R90'], [120, 'R120']], { rerender: true }), 'min')}
            ${field('Faces exposées sur b', sel('fire.facesB', [[0, '0 face'], [1, '1 face'], [2, '2 faces']]), '', 'Faces latérales (réduisent b).')}
            ${field('Faces exposées sur h', sel('fire.facesH', [[0, '0 face'], [1, '1 face'], [2, '2 faces']]), '', 'Sous-face / dessus (réduisent h).')}
          </div>
          <p class="note" id="fireNote"></p>
        </div>
      </div>

      ${blockHead('03', 'Actions', "Catégories d'usage (ψ, classe de durée), puis sollicitations par cas de charge unitaire — saisies directement depuis le modèle, ou calculées depuis des hypothèses de charges.")}
      <div class="fields wide">
        ${field('Catégorie de Q1', sel('categories.Q1', catOptions()))}
        ${field('Catégorie de Q2', sel('categories.Q2', catOptions()))}
        ${field('Neige', sel('altitudeHigh', [['false', 'Altitude ≤ 1000 m'], ['true', 'Altitude > 1000 m']]))}
      </div>
      <details class="fold" style="margin-top:14px">
        <summary>Durées de chargement et options de combinaison</summary>
        <div class="fields" style="margin:6px 0 10px">
          ${['Q1', 'Q2', 'S', 'W'].map((c) => field('Durée ' + c, sel('durations.' + c, durOptions()), '', 'Auto : ' + (D.DURATIONS.find((d) => d[0] === R.durationOf(c)) || [])[1])).join('')}
        </div>
        <div class="fields wide">
          ${field('Feu : action variable dominante', sel('options.fireLead', [['psi1', 'ψ1,1·Q1 (valeur fréquente)'], ['psi2', 'ψ2,1·Q1 (quasi-permanente)']]))}
          ${field('Séisme : k<sub>mod</sub>', inp('options.seisKmod'), '', 'Action instantanée : 1,1 (cl. 1-2).')}
          ${field('Séisme : γ<sub>M</sub>', sel('options.seisGammaM', [['fund', 'γM des situations durables (1,3 / 1,25)'], ['one', 'γM = 1,0']]))}
          ${field('k<sub>cr</sub> (cisaillement)', sel('options.kcrMode', [['auto', 'Auto (AN française)'], ['1', '1,00'], ['0.67', '0,67']]))}
        </div>
        <div style="display:flex;gap:18px;flex-wrap:wrap;margin:12px 0 6px">
          ${chk('options.gFav', 'Combinaisons avec G favorable (1,0·G + 1,5·W)')}
          ${chk('options.devMz', 'Ajouter σ<sub>m,z</sub>/f<sub>m,z,d</sub> aux critères de déversement (flexion déviée)')}
        </div>
      </details>

      <div class="sub-title" style="margin-top:26px">Sollicitations</div>
      <div class="chips" role="tablist">${modeChips}</div>
      <div id="loadInputs" style="margin-top:16px">${renderLoadInputs()}</div>
      <div id="unitTable" style="margin-top:16px"></div>

      <details class="fold">
        <summary>Flèches : méthode et limites</summary>
        <div class="fields wide" style="margin:6px 0 10px">
          ${field('Flèches unitaires', sel('sls.mode', [['calc', 'Calculées : M·L²/(9,6·E·I) — bi-articulée, charge répartie'], ['input', 'Saisies par cas (mm, depuis le modèle)']], { rerender: true }))}
          ${field('Portée de référence', inp('sls.Lref', { ph: 'L' }), 'm', 'Vide = L.')}
          ${field('w<sub>inst</sub>(Q) ≤ L /', inp('sls.limits.inst'))}
          ${field('w<sub>fin</sub> ≤ L /', inp('sls.limits.fin'))}
          ${field('w<sub>fin</sub> − w<sub>inst</sub>(PP+G) ≤ L /', inp('sls.limits.act'), '', 'Flèche active, éléments fragiles.')}
        </div>
      </details>

      ${blockHead('04', 'Résultats', "Taux de travail maximaux par situation de projet ; le détail de chaque combinaison est en bas de page.")}
      <div id="results"></div>
    </div>`;
    refreshDynamic();
  }

  function renderLoadInputs() {
    const s = state, m = s.loads.mode;
    if (m === 'direct') {
      return `<div class="fields wide">
        ${field('Unités du tableau', sel('loads.unit', [['daN', 'daN et daN·m'], ['kN', 'kN et kN·m']], { rerender: true }))}
        </div>
        <p class="note">Saisir les sollicitations <b>caractéristiques</b> de chaque cas unitaire (valeurs max. de l'élément). Convention : F<sub>x</sub> &gt; 0 en compression. Un bloc copié depuis Excel ou GSA (tabulations) peut être collé directement dans une cellule : il remplit le tableau vers la droite et vers le bas.</p>`;
    }
    if (m === 'poutre') {
      const P = 'loads.poutre.';
      const row = (side, c) => `<td>${inp(P + side + '.' + c)}</td>`;
      return `<div class="cols2">
        <div class="fields">
          ${field('Bande reprise axe fort', inp(P + 'B'), 'm')}
          ${field('Bande reprise axe faible', inp(P + 'Bz'), 'm')}
          ${field('Rampant', `<div class="inline">${inp(P + 'rampant')}${sel(P + 'rampantUnit', [['°', '°'], ['%', '%']])}</div>`)}
          ${field('Dévers', `<div class="inline">${inp(P + 'devers')}${sel(P + 'deversUnit', [['°', '°'], ['%', '%']])}</div>`)}
          ${field('Façade : pas d\'étage', inp(P + 'facadePas'), 'm')}
          ${field('Façade : charge', inp(P + 'facadeQ'), 'daN/m²')}
        </div>
        <div>
          <div class="tbl-wrap"><table class="grid">
            <thead><tr><th class="rowh">Charges surfaciques [daN/m²]</th>${['G', 'G fragile', 'Q1', 'Q2', 'S', 'W'].map((x) => `<th>${x}</th>`).join('')}</tr></thead>
            <tbody>
              <tr><td class="rowh">Axe fort <small>(⊥ à b)</small></td>${['G', 'Gf', 'Q1', 'Q2', 'S', 'W'].map((c) => row('strong', c)).join('')}</tr>
              <tr><td class="rowh">Axe faible <small>(⊥ à h)</small></td>${['G', 'Gf', 'Q1', 'Q2', 'S', 'W'].map((c) => row('weak', c)).join('')}</tr>
            </tbody></table></div>
          <div style="margin-top:10px">${chk(P + 'facadeFragile', 'Charge de façade considérée comme G fragile')}</div>
          <p class="note">Poutre bi-articulée sous charge uniforme : M = q·L²/8, V = q·L/2 ; PP calculé avec ρ<sub>mean</sub>. Le rampant et le dévers répartissent les charges sur les deux axes ; F<sub>x</sub> = q·L·sin(rampant).</p>
        </div>
      </div>`;
    }
    const P = 'loads.poteau.';
    const r = (lbl, q, n) => `<tr><td class="rowh">${lbl}</td><td>${inp(P + q)}</td><td>${inp(P + n)}</td></tr>`;
    return `<div class="cols2">
      <div>
        <div class="fields">${field('Surface reprise', inp(P + 'S'), 'm²')}</div>
        <div class="tbl-wrap" style="margin-top:12px"><table class="grid">
          <thead><tr><th class="rowh">Descente de charges</th><th>q [daN/m²]</th><th>nb niveaux</th></tr></thead>
          <tbody>
            ${r('G — type 1 <small>(niveau courant)</small>', 'G1', 'nG1')}
            ${r('G — type 2 <small>(toiture)</small>', 'G2', 'nG2')}
            ${r('G fragile', 'Gf', 'nGf')}
            ${r('Q1', 'Q1', 'nQ1')}
            ${r('Q2', 'Q2', 'nQ2')}
            ${r('S', 'S_', 'nS')}
          </tbody></table></div>
      </div>
      <div>
        <div class="tbl-wrap"><table class="grid">
          <thead><tr><th class="rowh">Vent</th><th>w [daN/m²]</th><th>bande [m]</th><th>moment</th></tr></thead>
          <tbody>
            <tr><td class="rowh">W — type 1</td><td>${inp(P + 'W1')}</td><td>${inp(P + 'BW1')}</td><td>${sel(P + 'axW1', [['Y', 'My'], ['Z', 'Mz']])}</td></tr>
            <tr><td class="rowh">W — type 2</td><td>${inp(P + 'W2')}</td><td>${inp(P + 'BW2')}</td><td>${sel(P + 'axW2', [['Y', 'My'], ['Z', 'Mz']])}</td></tr>
          </tbody></table></div>
        <div class="fields" style="margin-top:12px">${field('Hauteur de reprise du vent', inp(P + 'H', { ph: 'L' }), 'm', 'Vide = L. M = w·B·H²/8.')}</div>
        <p class="note">PP du poteau en effort normal (ρ<sub>mean</sub>·b·h·L). Vent : poteau bi-articulé sous charge répartie.</p>
      </div>
    </div>`;
  }

  function renderUnitTable() {
    const s = state, U = R.unit, direct = s.loads.mode === 'direct';
    const uL = E.UNIT[U.unit] || E.UNIT.daN;
    const inputSls = s.sls.mode === 'input';
    const head = `<tr><th class="rowh">Cas unitaires</th>${D.CASES.map((c) => `<th class="${c.kind === 'E' ? 'seis' : ''}" title="${esc(c.title)}">${c.label}</th>`).join('')}</tr>`;
    const rows = D.EFFECTS.map((e, ri) => `<tr><td class="rowh">${e.label} <small>${e.title} [${e.unit === 'F' ? uL.fl : uL.ml}]</small></td>${D.CASES.map((c, ci) => {
      const k = c.kind === 'E' ? ' seis' : '';
      if (direct) return `<td class="${k}"><input type="number" step="any" data-p="loads.direct.${e.id}.${c.id}" data-r="${ri}" data-c="${ci}" value="${esc(get('loads.direct.' + e.id + '.' + c.id))}"></td>`;
      const v = U.cases[c.id] ? U.cases[c.id][e.id] : 0;
      return `<td class="ro${k}">${v ? fmtG(v, 2) : '·'}</td>`;
    }).join('')}</tr>`).join('');
    const slsRows = inputSls ? ['uy', 'uz'].map((u, i) => `<tr><td class="rowh">${u === 'uy' ? 'u<sub>y</sub> flèche (plan de h)' : 'u<sub>z</sub> flèche (plan de b)'} <small>[mm]</small></td>${D.CASES.map((c, ci) => `<td class="${c.kind === 'E' ? 'seis' : ''}"><input type="number" step="any" data-p="sls.${u}.${c.id}" data-r="${5 + i}" data-c="${ci}" value="${esc(get('sls.' + u + '.' + c.id))}"></td>`).join('')}</tr>`).join('') : '';
    const tools = direct
      ? `<div class="row-actions" style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn sm" data-act="clearTable">Vider le tableau</button><button class="btn sm" data-act="addPP">Ajouter le PP calculé (poutre bi-articulée)</button></div>`
      : `<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn sm" data-act="toDirect">Reprendre ces valeurs en saisie directe</button></div>`;
    $('#unitTable').innerHTML = `<div class="tbl-wrap"><table class="grid"><thead>${head}</thead><tbody>${rows}${slsRows}</tbody></table></div>${tools}`;
  }

  function refreshDynamic() {
    recompute();
    const s = state;
    // figure
    const fig = $('#secFig');
    if (fig) {
      const f = R.fire;
      fig.innerHTML = sectionSvg(s.b, s.h, f.t > 0 ? f.bf : null, f.hf, 130) + `<div class="muted" style="font-size:12.5px;line-height:1.55">
        <b style="color:var(--ink)">${esc(s.grade)}</b> · ${esc(R.mat.family)}<br>
        A = ${fmtG(R.sec.A / 100, 1)} cm² · I<sub>y</sub> = ${fmtG(R.sec.Iy / 1e4, 0)} cm⁴<br>
        ρ<sub>mean</sub> = ${R.mat.rhomean} kg/m³ · PP ≈ ${fmtG(R.sec.A * R.mat.rhomean / 1e6, 1)} daN/m<br>
        γ<sub>M</sub> = ${fmt(R.gM, 2)} · k<sub>def</sub> = ${fmt(R.kdef, 1)}</div>`;
    }
    const fn = $('#fireNote');
    if (fn) {
      const f = R.fire;
      fn.innerHTML = f.t > 0
        ? `β<sub>n</sub> = ${fmt(f.betan, 2)} mm/min · d<sub>char,n</sub> = ${fmt(f.dchar, 1)} mm · k<sub>0</sub> = ${fmt(f.k0, 2)} · d<sub>ef</sub> = d<sub>char,n</sub> + k<sub>0</sub>·d<sub>0</sub> = ${fmt(f.def, 1)} mm<br>Section résiduelle : <b>${fmt(f.bf, 0)} × ${fmt(f.hf, 0)} mm</b> (tracé corail sur le schéma).`
        : 'Aucune durée requise : les combinaisons incendie ne sont pas évaluées.';
    }
    if ($('#unitTable')) renderUnitTable();
    renderResults();
    const v = $('#verdict');
    if (v) {
      const m = overallMax();
      v.innerHTML = `<span class="verdict ${m <= 1 ? 'ok' : 'ko'}">${pct(m)} <small>${m <= 1 ? 'vérifié' : 'non vérifié'}</small></span>`;
    }
    const df = $('#dirtyFlag'); if (df) df.textContent = dirty ? 'modifié · non enregistré' : '';
    const cn = $('#crumbName'); if (cn) cn.textContent = state.name || 'Sans nom';
  }

  function overallMax() {
    return Math.max(...['ELU', 'FEU', 'SEI'].map((k) => (R.env[k] ? R.env[k].max : 0)), R.sls.max);
  }

  function critRows(env) {
    const keys = Object.keys(E.CRITERIA).filter((k) => env.byCrit[k]);
    return keys.map((k) => {
      const c = E.CRITERIA[k], x = env.byCrit[k];
      return `<tr class="${env.worst.gov === k ? 'gov' : ''}"><td>${c.label}</td><td class="f">éq. ${c.ref}</td><td class="f">${esc(x.combo.id)} · ${esc(x.combo.label)}</td><td class="num"><span class="ratio">${pct(x.r)}</span></td><td style="width:120px">${bar(x.r)}</td><td>${pill(x.r)}</td></tr>`;
    }).join('');
  }

  function detailBlock(c, fireSec) {
    const st = c.stress, fd = c.fd;
    const S = fireSec ? R.fire : R.sec;
    const inst = fireSec ? R.instF : R.instC;
    const F = (x) => fmt(x, 2);
    return `<div class="tbl-wrap"><table class="tbl compact">
      <tr><th>Combinaison dimensionnante</th><th colspan="3">${esc(c.id)} — ${esc(c.label)}</th></tr>
      <tr><td>Efforts de calcul</td><td colspan="3">N = ${fmtG(c.eff.N / 1e3, 2)} kN · M<sub>y</sub> = ${fmtG(c.eff.My / 1e6, 2)} kN·m · M<sub>z</sub> = ${fmtG(c.eff.Mz / 1e6, 2)} kN·m · V<sub>z</sub> = ${fmtG(c.eff.Vz / 1e3, 2)} kN · V<sub>y</sub> = ${fmtG(c.eff.Vy / 1e3, 2)} kN</td></tr>
      <tr><td>Coefficients</td><td colspan="3">k<sub>mod</sub> = ${fmt(c.kmod, 2)} (${(D.DURATIONS.find((d) => d[0] === c.dur) || ['', ''])[1].toLowerCase()}) · γ<sub>M</sub> = ${fmt(c.gamma, 2)} · k<sub>cr</sub> = ${fmt(c.kcr, 2)} · k<sub>c,y</sub> = ${fmt(inst ? inst.y.kc : 1, 3)} · k<sub>c,z</sub> = ${fmt(inst ? inst.z.kc : 1, 3)} · k<sub>crit</sub> = ${fmt(inst ? inst.lt.kcrit : 1, 3)}</td></tr>
      <tr><th>Contrainte</th><th class="num">σ [MPa]</th><th>Résistance</th><th class="num">f<sub>d</sub> [MPa]</th></tr>
      ${st.comp || st.tens ? `<tr><td>${st.comp ? 'σ<sub>c,0,d</sub>' : 'σ<sub>t,0,d</sub>'} = N / A${fireSec ? '<sub>fi</sub>' : ''}</td><td class="num">${F(st.sN)}</td><td>${st.comp ? 'f<sub>c,0,d</sub>' : 'f<sub>t,0,d</sub>'}</td><td class="num">${F(st.comp ? fd.c : fd.t)}</td></tr>` : ''}
      <tr><td>σ<sub>m,y,d</sub> = M<sub>y</sub> / W<sub>y</sub></td><td class="num">${F(st.smy)}</td><td>f<sub>m,y,d</sub></td><td class="num">${F(fd.my)}</td></tr>
      <tr><td>σ<sub>m,z,d</sub> = M<sub>z</sub> / W<sub>z</sub></td><td class="num">${F(st.smz)}</td><td>f<sub>m,z,d</sub></td><td class="num">${F(fd.mz)}</td></tr>
      ${fireSec ? '' : `<tr><td>τ<sub>d</sub> = 1,5·V / (k<sub>cr</sub>·b·h)</td><td class="num">${F(st.tau)}</td><td>f<sub>v,d</sub></td><td class="num">${F(fd.v)}</td></tr>`}
      <tr><td class="f" colspan="4">Section ${fireSec ? 'résiduelle' : ''} ${fmt(S.bf || S.b, 0)} × ${fmt(S.hf || S.h, 0)} mm</td></tr>
    </table></div>`;
  }

  function renderResults() {
    const box = $('#results'); if (!box) return;
    const env = R.env;
    const k = (title, sit, extra) => {
      const e = env[sit];
      if (!e) return `<div class="kpi"><b>${title}</b><span class="muted">—</span><small>${extra}</small></div>`;
      const bad = e.max > 1;
      return `<div class="kpi${bad ? ' bad' : ''}"><b>${title}</b><span>${pct(e.max)}</span><small>${E.CRITERIA[e.worst.gov] ? 'éq. ' + E.CRITERIA[e.worst.gov].ref + ' · ' + E.CRITERIA[e.worst.gov].label : ''} · ${e.worst.id}</small></div>`;
    };
    const m = overallMax();
    const sl = R.sls.rows.reduce((a, r) => (r.ratio > a.ratio ? r : a), R.sls.rows[0]);
    const slsK = `<div class="kpi${R.sls.max > 1 ? ' bad' : ''}"><b>ELS — flèches</b><span>${pct(R.sls.max)}</span><small>${sl && sl.w > 0 ? esc(sl.label) + ' ' + sl.dir + ' = L/' + Math.round(sl.Lratio) : 'aucune flèche'}</small></div>`;
    const warn = R.warnings.map((w) => `<p class="note warn">${esc(w)}</p>`).join('');

    let html = `${warn}<div class="kpis">
      <div class="kpi ${m <= 1 ? 'hero' : 'bad'}"><b>Taux maximal</b><span>${pct(m)}</span><small>${m <= 1 ? 'Élément vérifié' : 'Élément non vérifié'}</small></div>
      ${k('ELU fondamental', 'ELU', '')}
      ${k('ELU incendie', 'FEU', R.fire.t > 0 ? '' : 'pas de durée requise')}
      ${k('ELA séisme', 'SEI', 'aucune action sismique saisie')}
      ${slsK}
    </div>`;

    [['ELU', 'ELU fondamental — enveloppe par critère', false], ['FEU', `ELU incendie R${R.fire.t} — section résiduelle`, true], ['SEI', 'ELA séisme — enveloppe par critère', false]].forEach(([sit, title, fs]) => {
      const e = env[sit]; if (!e) return;
      html += `<div class="sub-title" style="margin-top:30px">${title} <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:500">· ${e.n} combinaison${e.n > 1 ? 's' : ''}</span></div>
      <div class="cols2" style="grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)">
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Critère</th><th>Réf. EC5</th><th>Combinaison</th><th class="num">Taux</th><th></th><th></th></tr></thead><tbody>${critRows(e)}</tbody></table></div>
        ${detailBlock(e.worst, fs)}
      </div>`;
    });

    // flèches
    const lim = state.sls.limits;
    html += `<div class="sub-title" style="margin-top:30px">ELS — flèches <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:500">· ${R.sls.mode === 'input' ? 'flèches unitaires saisies' : 'M·L²/(9,6·E<sub>0,mean</sub>·I)'} · k<sub>def</sub> = ${fmt(R.kdef, 1)} · L = ${fmt(R.sls.L / 1000, 2)} m</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Flèche</th><th>Direction</th><th class="num">w [mm]</th><th class="num">Limite [mm]</th><th class="num">soit</th><th class="num">Taux</th><th></th><th></th></tr></thead><tbody>
      ${R.sls.rows.map((r) => `<tr><td>${r.label}</td><td>${r.dir === 'y' ? 'plan de h (u<sub>y</sub>)' : 'plan de b (u<sub>z</sub>)'}</td><td class="num">${fmt(r.w, 1)}</td><td class="num">L/${r.limRatio} = ${fmt(r.lim, 1)}</td><td class="num">${r.w > 0 ? 'L/' + Math.round(r.Lratio) : '—'}</td><td class="num"><span class="ratio">${pct(r.ratio)}</span></td><td style="width:120px">${bar(r.ratio)}</td><td>${pill(r.ratio)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="note">w<sub>inst</sub>(Q) : combinaison caractéristique (Q<sub>1</sub> + Σψ<sub>0,i</sub>Q<sub>i</sub>). w<sub>fin</sub> = w<sub>inst,G</sub>(1 + k<sub>def</sub>) + w<sub>inst,Q1</sub>(1 + ψ<sub>2,1</sub>k<sub>def</sub>) + Σ w<sub>inst,Qi</sub>(ψ<sub>0,i</sub> + ψ<sub>2,i</sub>k<sub>def</sub>) — NF EN 1995-1-1 § 2.3.2.2.</p>`;

    // toutes les combinaisons
    html += `<details class="fold"><summary>Toutes les combinaisons (${R.combos.length})</summary>
      <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>N°</th><th>Combinaison</th><th>Durée</th><th class="num">k<sub>mod</sub></th><th class="num">N [kN]</th><th class="num">M<sub>y</sub> [kN·m]</th><th class="num">M<sub>z</sub> [kN·m]</th><th class="num">V [kN]</th><th>Critère</th><th class="num">Taux</th></tr></thead><tbody>
      ${R.combos.map((c) => `<tr><td>${c.id}</td><td>${esc(c.label)}</td><td>${(D.DURATIONS.find((d) => d[0] === c.dur) || ['', ''])[1]}</td><td class="num">${fmt(c.kmod, 2)}</td><td class="num">${fmt(c.eff.N / 1e3, 2)}</td><td class="num">${fmt(c.eff.My / 1e6, 2)}</td><td class="num">${fmt(c.eff.Mz / 1e6, 2)}</td><td class="num">${fmt(Math.hypot(c.eff.Vz, c.eff.Vy) / 1e3, 2)}</td><td class="f">${c.gov && E.CRITERIA[c.gov] ? 'éq. ' + E.CRITERIA[c.gov].ref : '—'}</td><td class="num"><b>${pct(c.max)}</b></td></tr>`).join('')}
      </tbody></table></div></details>`;
    box.innerHTML = html;
  }

  // ======================================================================
  //  RÉSISTANCES / INSTABILITÉS / DONNÉES / MÉTHODE
  // ======================================================================
  function renderResistances(app) {
    recompute();
    const m = R.mat, sec = R.sec, f = R.fire, km = D.KMOD[R.sc];
    const durs = D.DURATIONS;
    const row = (lbl, fk, khv, ks, sym) => {
      const base = fk * khv * ks;
      return `<tr><td>${lbl}</td><td class="num">${fmt(fk, 2)}</td><td class="num">${fmt(khv, 3)}</td><td class="num">${fmt(base / R.gM, 2)}</td>${durs.map((d) => `<td class="num">${fmt(base * km[d[0]] / R.gM, 2)}</td>`).join('')}<td class="num">${R.fire.t > 0 ? fmt(R.kfi * fk * (sym === 'm' ? R.ksys : 1), 2) : '—'}</td></tr>`;
    };
    app.innerHTML = `<div class="page">
      ${blockHead('—', 'Résistances', `Valeurs de calcul de l'élément courant « ${esc(state.name)} » : ${esc(m.name)}, ${fmt(sec.b, 0)} × ${fmt(sec.h, 0)} mm, classe de service ${R.sc}, γ<sub>M</sub> = ${fmt(R.gM, 2)}.`)}
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Propriété</th><th class="num">f<sub>k</sub> [MPa]</th><th class="num">k<sub>h</sub> / k<sub>sys</sub></th><th class="num">f<sub>k</sub>·k/γ<sub>M</sub></th>${durs.map((d) => `<th class="num">${d[1]}<br><small>k<sub>mod</sub> = ${fmt(km[d[0]], 2)}</small></th>`).join('')}<th class="num">Feu f<sub>20</sub><br><small>k<sub>fi</sub> = ${fmt(R.kfi, 2)}</small></th></tr></thead><tbody>
        ${row('Traction axiale f<sub>t,0</sub> (k<sub>h</sub> sur max(b,h))', m.ft0k, sec.khT, 1, 't')}
        ${row('Compression axiale f<sub>c,0</sub>', m.fc0k, 1, 1, 'c')}
        ${row('Flexion axe fort f<sub>m,y</sub> (k<sub>h</sub> sur h)', m.fmk, sec.khH, R.ksys, 'm')}
        ${row('Flexion axe faible f<sub>m,z</sub> (k<sub>h</sub> sur b)', m.fmk, sec.khB, R.ksys, 'm')}
        ${row('Cisaillement f<sub>v</sub>', m.fvk, 1, 1, 'v')}
      </tbody></table></div>
      <p class="note">Valeurs de calcul f<sub>d</sub> = k<sub>mod</sub>·k<sub>h</sub>·f<sub>k</sub>/γ<sub>M</sub> (× k<sub>sys</sub> en flexion). Au feu : f<sub>d,fi</sub> = k<sub>mod,fi</sub>·k<sub>fi</sub>·f<sub>k</sub>/γ<sub>M,fi</sub> avec k<sub>mod,fi</sub> = γ<sub>M,fi</sub> = 1 (sans k<sub>h</sub>).</p>
      <div class="sub-title">Caractéristiques de section</div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th class="num">b [mm]</th><th class="num">h [mm]</th><th class="num">A [cm²]</th><th class="num">I<sub>y</sub> [cm⁴]</th><th class="num">I<sub>z</sub> [cm⁴]</th><th class="num">W<sub>y</sub> [cm³]</th><th class="num">W<sub>z</sub> [cm³]</th><th class="num">k<sub>h,y</sub></th><th class="num">k<sub>h,z</sub></th></tr></thead><tbody>
        <tr><td>À froid</td><td class="num">${fmt(sec.b, 0)}</td><td class="num">${fmt(sec.h, 0)}</td><td class="num">${fmt(sec.A / 100, 1)}</td><td class="num">${fmt(sec.Iy / 1e4, 0)}</td><td class="num">${fmt(sec.Iz / 1e4, 0)}</td><td class="num">${fmt(sec.Wy / 1e3, 1)}</td><td class="num">${fmt(sec.Wz / 1e3, 1)}</td><td class="num">${fmt(sec.khH, 3)}</td><td class="num">${fmt(sec.khB, 3)}</td></tr>
        ${f.t > 0 ? `<tr><td>Feu R${f.t} (résiduelle)</td><td class="num">${fmt(f.bf, 0)}</td><td class="num">${fmt(f.hf, 0)}</td><td class="num">${fmt(f.A / 100, 1)}</td><td class="num">${fmt(f.Iy / 1e4, 0)}</td><td class="num">${fmt(f.Iz / 1e4, 0)}</td><td class="num">${fmt(f.Wy / 1e3, 1)}</td><td class="num">${fmt(f.Wz / 1e3, 1)}</td><td class="num">—</td><td class="num">—</td></tr>` : ''}
      </tbody></table></div>
      ${f.t > 0 ? `<p class="note">d<sub>ef</sub> = β<sub>n</sub>·t + k<sub>0</sub>·d<sub>0</sub> = ${fmt(f.betan, 2)} × ${f.t} + ${fmt(f.k0, 2)} × 7 = ${fmt(f.def, 1)} mm — faces exposées : ${state.fire.facesB} sur b, ${state.fire.facesH} sur h.</p>` : ''}
    </div>`;
  }

  function renderInstabilites(app) {
    recompute();
    const c = R.instC, f = R.instF;
    const col = (i) => i ? [i.y.lambda, i.y.lrel, i.y.k, i.y.kc, i.z.lambda, i.z.lrel, i.z.k, i.z.kc, i.lt.smcrit, i.lt.lrelm, i.lt.kcrit] : null;
    const a = col(c), b = col(f);
    const labels = ['λ<sub>y</sub>', 'λ<sub>rel,y</sub> (6.21)', 'k<sub>y</sub> (6.27)', 'k<sub>c,y</sub> (6.25)', 'λ<sub>z</sub>', 'λ<sub>rel,z</sub> (6.22)', 'k<sub>z</sub> (6.28)', 'k<sub>c,z</sub> (6.26)', 'σ<sub>m,crit</sub> [MPa] (6.32)', 'λ<sub>rel,m</sub> (6.30)', 'k<sub>crit</sub> (6.34)'];
    const dec = [1, 3, 3, 3, 1, 3, 3, 3, 2, 3, 3];
    app.innerHTML = `<div class="page">
      ${blockHead('—', 'Instabilités', `Flambement (§ 6.3.2) et déversement (§ 6.3.3) de l'élément courant : l<sub>f,y</sub> = ${fmt(R.lfy / 1000, 2)} m, l<sub>f,z</sub> = ${fmt(R.lfz / 1000, 2)} m, l<sub>ef</sub> = ${fmt(R.lef / 1000, 2)} m ; β<sub>c</sub> = ${fmt(R.betac, 1)}.`)}
      <div class="tbl-wrap"><table class="tbl" style="max-width:720px"><thead><tr><th>Grandeur</th><th class="num">À froid</th><th class="num">Feu ${R.fire.t > 0 ? 'R' + R.fire.t : ''}</th></tr></thead><tbody>
      ${labels.map((l, i) => `<tr><td>${l}</td><td class="num">${fmt(a[i], dec[i])}</td><td class="num">${b ? fmt(b[i], dec[i]) : '—'}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="note">λ<sub>rel</sub> = λ/π·√(f<sub>c,0,k</sub>/E<sub>0,05</sub>) ; σ<sub>m,crit</sub> = 0,78·b²·E<sub>0,05</sub>/(h·l<sub>ef</sub>) (section rectangulaire, éq. 6.32) ; au feu, avec la section résiduelle et E<sub>0,20</sub> = k<sub>fi</sub>·E<sub>0,05</sub>, f<sub>m,20</sub> = k<sub>fi</sub>·f<sub>m,k</sub>.</p>
    </div>`;
  }

  function renderDonnees(app) {
    const cols = [['fmk', 'f<sub>m,k</sub>'], ['ft0k', 'f<sub>t,0,k</sub>'], ['ft90k', 'f<sub>t,90,k</sub>'], ['fc0k', 'f<sub>c,0,k</sub>'], ['fc90k', 'f<sub>c,90,k</sub>'], ['fvk', 'f<sub>v,k</sub>'], ['E0mean', 'E<sub>0,mean</sub>'], ['E005', 'E<sub>0,05</sub>'], ['E90mean', 'E<sub>90,mean</sub>'], ['Gmean', 'G<sub>mean</sub>'], ['rhok', 'ρ<sub>k</sub>'], ['rhomean', 'ρ<sub>mean</sub>'], ['betan', 'β<sub>n</sub>']];
    const mats = Object.values(D.MATERIALS);
    app.innerHTML = `<div class="page">
      ${blockHead('—', 'Données', 'Propriétés caractéristiques (MPa, kN/mm², kg/m³, mm/min) et coefficients normatifs utilisés par le calcul.')}
      <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Classe</th>${cols.map((c) => `<th class="num">${c[1]}</th>`).join('')}</tr></thead><tbody>
      ${mats.map((m) => `<tr${m.name === state.grade ? ' class="gov"' : ''}><td><b>${m.name}</b></td>${cols.map((c) => `<td class="num">${fmtG(m[c[0]], 2)}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
      <div class="cols3" style="margin-top:30px">
        <div><div class="sub-title">k<sub>mod</sub> — tableau 3.1</div><table class="tbl compact"><thead><tr><th>Durée</th><th class="num">Cl. 1</th><th class="num">Cl. 2</th><th class="num">Cl. 3</th></tr></thead><tbody>
          ${D.DURATIONS.map((d) => `<tr><td>${d[1]}</td>${[1, 2, 3].map((c) => `<td class="num">${fmt(D.KMOD[c][d[0]], 2)}</td>`).join('')}</tr>`).join('')}</tbody></table>
          <div class="sub-title">k<sub>def</sub> — tableau 3.2</div><table class="tbl compact"><tbody><tr><td>Massif et lamellé-collé</td>${[1, 2, 3].map((c) => `<td class="num">${fmt(D.KDEF[c], 1)}</td>`).join('')}</tr></tbody></table>
          <div class="sub-title">γ<sub>M</sub> — tableau 2.3 (AN)</div><table class="tbl compact"><tbody><tr><td>Bois massif</td><td class="num">1,30</td></tr><tr><td>Lamellé-collé</td><td class="num">1,25</td></tr><tr><td>Situations accidentelles (feu)</td><td class="num">1,00</td></tr></tbody></table>
        </div>
        <div><div class="sub-title">ψ — NF EN 1990 tableau A1.1</div><table class="tbl compact"><thead><tr><th>Action</th><th class="num">ψ0</th><th class="num">ψ1</th><th class="num">ψ2</th><th>Durée</th></tr></thead><tbody>
          ${Object.keys(D.CATEGORIES).map((k) => { const c = D.CATEGORIES[k]; return `<tr><td>${c.label}</td>${c.psi.map((p) => `<td class="num">${fmt(p, 1)}</td>`).join('')}<td>${D.DURATIONS.find((d) => d[0] === c.dur)[1]}</td></tr>`; }).join('')}
          <tr><td>Neige ≤ 1000 m</td>${D.PSI_SNOW.low.map((p) => `<td class="num">${fmt(p, 1)}</td>`).join('')}<td>Court terme</td></tr>
          <tr><td>Neige &gt; 1000 m</td>${D.PSI_SNOW.high.map((p) => `<td class="num">${fmt(p, 1)}</td>`).join('')}<td>Moyen terme</td></tr>
          <tr><td>Vent</td>${D.PSI_WIND.map((p) => `<td class="num">${fmt(p, 1)}</td>`).join('')}<td>Instantanée</td></tr>
          </tbody></table></div>
        <div><div class="sub-title">Autres coefficients</div><table class="tbl compact"><tbody>
          <tr><td>k<sub>fi</sub> massif / lamellé-collé</td><td class="num">1,25 / 1,15</td></tr>
          <tr><td>d<sub>0</sub></td><td class="num">7 mm</td></tr>
          <tr><td>β<sub>c</sub> massif / lamellé-collé</td><td class="num">0,2 / 0,1</td></tr>
          <tr><td>k<sub>m</sub> (section rectangulaire)</td><td class="num">0,7</td></tr>
          <tr><td>k<sub>h</sub> massif (ρ<sub>k</sub> ≤ 700, h &lt; 150)</td><td class="num">min((150/h)<sup>0,2</sup> ; 1,3)</td></tr>
          <tr><td>k<sub>h</sub> lamellé-collé (h &lt; 600)</td><td class="num">min((600/h)<sup>0,1</sup> ; 1,1)</td></tr>
          </tbody></table></div>
      </div>
    </div>`;
  }

  function renderMethode(app) {
    app.innerHTML = `<div class="page">
      ${blockHead('—', 'Méthode', "Ce que calcule Lignum, et ce qui a été corrigé par rapport aux classeurs Excel d'origine (« Poutre bois V02 » et « STR_OUT_Bois_Poteau_V1_2017 »).")}
      <div class="cols2">
        <div>
          <div class="sub-title">Combinaisons générées</div>
          <p><b>ELU fondamental (6.10)</b> : 1,35·G seul, puis pour chaque action variable dominante et chaque sous-ensemble d'actions d'accompagnement : 1,35·G + 1,5·Q<sub>1</sub> + Σ 1,5·ψ<sub>0,i</sub>·Q<sub>i</sub>. Variantes 1,0·G pour les combinaisons contenant le vent (soulèvement). Seules les actions non nulles sont combinées. Pas de concomitance entre une charge de toiture (cat. H) et la neige ou le vent.</p>
          <p><b>Incendie (6.11b)</b> : G + ψ<sub>1,1</sub>·Q<sub>1</sub> (ou ψ<sub>2,1</sub>) + Σ ψ<sub>2,i</sub>·Q<sub>i</sub>, sans coefficient partiel ; k<sub>mod,fi</sub> = γ<sub>M,fi</sub> = 1 ; section résiduelle ; cisaillement non vérifié (sections rectangulaires).</p>
          <p><b>Séisme (6.12b)</b> : G + Σ ψ<sub>2,i</sub>·Q<sub>i</sub> + A<sub>Ed</sub> pour chacun des cas EX+, EX−, EY+, EY− saisis.</p>
          <p><b>k<sub>mod</sub></b> : celui de l'action de plus courte durée présente dans la combinaison.</p>
          <div class="sub-title">Critères</div>
          <p>6.1, 6.2, 6.11/6.12, 6.13 (k<sub>cr</sub> selon l'AN : 0,67 en classe 3, en massif de section &gt; 150 mm, en lamellé-collé classe 2 sous ≥ 70 % de charges permanentes ; 1 sinon), 6.17/6.18, 6.19/6.20, 6.23/6.24, 6.33, 6.35. Les critères de déversement reçoivent, en option, le terme σ<sub>m,z,d</sub>/f<sub>m,z,d</sub> (flexion déviée, ex. dévers).</p>
        </div>
        <div>
          <div class="sub-title">Corrections par rapport aux classeurs d'origine</div>
          <ol style="padding-left:18px;margin:0;font-size:14px">
            <li><b>Séisme</b> : les colonnes EX±/EY± n'étaient jamais sommées dans les combinaisons ELA — l'action sismique était ignorée.</li>
            <li><b>Feu et séisme</b> : les coefficients 1,35 / 1,5 de la ligne « Combinaison » s'appliquaient aussi aux situations accidentelles (résultats majorés de 35 à 50 %).</li>
            <li><b>ψ</b> figés dans la table des combinaisons (0,7 / 0,5 / 0,6 à l'ELU ; valeurs du feu ressaisies à la main) : désormais tirés des catégories choisies (ex. cat. E : ψ<sub>0</sub> = 1,0 ; cat. H : 0).</li>
            <li><b>Feu sans durée requise</b> : la section réduite de 7 mm était quand même vérifiée et pouvait dimensionner. Et k<sub>0</sub> était calculé mais pas utilisé (d<sub>ef</sub> = d<sub>char</sub> + k<sub>0</sub>·d<sub>0</sub>).</li>
            <li><b>G favorable</b> absent (pas de 1,0·G + 1,5·W) : ajouté.</li>
            <li><b>Poteau</b> : k<sub>mod</sub> écrit en dur (pas de classe de service 3) et flèche active = w<sub>inst</sub>(PP+G) au lieu de w<sub>fin</sub> − w<sub>inst</sub>(PP+G).</li>
            <li><b>Poutre</b> : les listes « Poteau/Poutre » et « À chant/À plat » n'étaient reliées à aucun calcul.</li>
            <li><b>k<sub>h</sub></b> : sur b pour M<sub>z</sub>, sur max(b,h) en traction, k<sub>h</sub> = 1 pour ρ<sub>k</sub> &gt; 700 ; pas de k<sub>h</sub> au feu.</li>
          </ol>
          <p class="note">Hypothèses conservées : poutre bi-articulée sous charge répartie pour les flèches calculées et pour les hypothèses de charges ; σ<sub>m,crit</sub> par l'éq. 6.32 ; cisaillement sur la résultante √(V<sub>y</sub>² + V<sub>z</sub>²).</p>
        </div>
      </div>
    </div>`;
  }

  // ======================================================================
  //  PROJETS
  // ======================================================================
  function summaryOf(st) {
    try {
      const r = E.compute(st);
      const g = (k) => (r.env[k] ? r.env[k].max : null);
      return { elu: g('ELU'), feu: g('FEU'), sei: g('SEI'), els: r.sls.max, max: Math.max(g('ELU') || 0, g('FEU') || 0, g('SEI') || 0, r.sls.max), sec: `${st.grade} ${st.b}×${st.h}`, L: st.L };
    } catch (e) { return null; }
  }

  function renderProjets(app) {
    const kb = ST.usage() / 1024;
    const list = db.projects.map((p) => {
      const isCur = db.current && db.current.projectId === p.id;
      const rows = p.items.map((it) => {
        const sm = it.summary || summaryOf(it.state) || {};
        const isIt = isCur && db.current.itemId === it.id;
        const pc = (x) => (x == null ? '—' : pct(x));
        return `<tr${isIt ? ' class="gov"' : ''}><td><b>${esc(it.name)}</b></td><td>${esc(sm.sec || '')}</td><td class="num">${fmt(+sm.L, 2)} m</td><td class="num">${pc(sm.elu)}</td><td class="num">${pc(sm.feu)}</td><td class="num">${pc(sm.sei)}</td><td class="num">${pc(sm.els)}</td><td>${pill(sm.max)}</td><td class="f">${new Date(it.updated).toLocaleDateString('fr-FR')}</td>
          <td style="white-space:nowrap"><button class="btn sm" data-act="open" data-p="${p.id}" data-i="${it.id}">Ouvrir</button> <button class="btn sm ghost" data-act="dupItem" data-p="${p.id}" data-i="${it.id}">Dupliquer</button> <button class="btn sm ghost" data-act="delItem" data-p="${p.id}" data-i="${it.id}">Supprimer</button></td></tr>`;
      }).join('');
      return `<div class="proj${isCur ? ' current' : ''}">
        <div class="proj-head"><h3>${esc(p.name)}</h3><span class="muted" style="font-size:13px">${p.items.length} vérification${p.items.length > 1 ? 's' : ''}</span><span class="grow"></span>
          <button class="btn sm" data-act="reportProj" data-p="${p.id}"${p.items.length ? '' : ' disabled'}>Fiches NDC du projet</button>
          <button class="btn sm" data-act="exportProj" data-p="${p.id}">Exporter .json</button>
          <button class="btn sm ghost" data-act="renameProj" data-p="${p.id}">Renommer</button>
          <button class="btn sm ghost" data-act="delProj" data-p="${p.id}">Supprimer</button></div>
        ${p.items.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Repère</th><th>Section</th><th class="num">L</th><th class="num">ELU</th><th class="num">Feu</th><th class="num">Séisme</th><th class="num">ELS</th><th></th><th>Modifié</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="empty">Aucune vérification enregistrée dans ce projet.</p>'}
      </div>`;
    }).join('');
    app.innerHTML = `<div class="page">
      ${blockHead('—', 'Projets', "Chaque projet regroupe les vérifications enregistrées. Les données restent dans ce navigateur (aucun serveur) : exporter le projet en .json pour l'archiver avec l'affaire, le partager ou le rouvrir sur un autre poste.")}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">
        <button class="btn primary" data-act="newProj">Nouveau projet</button>
        <label class="btn" style="cursor:pointer">Importer un .json<input type="file" accept=".json,application/json" data-act="import" hidden></label>
        <span class="muted" style="font-size:12.5px;align-self:center">Stockage utilisé : ${fmt(kb, 1)} ko sur ~5 000 ko disponibles</span>
      </div>
      <div class="proj-list">${list || '<p class="empty">Aucun projet pour l\'instant. Créez-en un, puis enregistrez vos vérifications depuis l\'onglet Vérification.</p>'}</div>
    </div>`;
  }

  // ---------- modales ----------
  function modal(title, body, actions) {
    return new Promise((resolve) => {
      const bg = document.createElement('div'); bg.className = 'modal-bg';
      bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h3>${title}</h3>${body}<div class="row-actions">${actions.map((a, i) => `<button class="btn${a.primary ? ' primary' : ''}" data-i="${i}">${a.label}</button>`).join('')}</div></div>`;
      document.body.appendChild(bg);
      const close = (v) => { bg.remove(); resolve(v); };
      bg.addEventListener('click', (e) => {
        if (e.target === bg) return close(null);
        const b = e.target.closest('button[data-i]');
        if (b) { const a = actions[+b.dataset.i]; close(a.value ? a.value(bg) : null); }
      });
      bg.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close(null);
        if (e.key === 'Enter' && e.target.tagName === 'INPUT') { const a = actions.find((x) => x.primary); close(a && a.value ? a.value(bg) : null); }
      });
      const f = bg.querySelector('input,select'); if (f) { f.focus(); if (f.select) f.select(); }
    });
  }
  const confirmBox = (title, text) => modal(title, `<p>${text}</p>`, [{ label: 'Annuler' }, { label: 'Confirmer', primary: true, value: () => true }]);

  async function askSave(asNew) {
    const projOpts = db.projects.map((p) => `<option value="${p.id}"${db.current && db.current.projectId === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
    const res = await modal(asNew ? 'Enregistrer sous…' : 'Enregistrer la vérification', `
      <div class="fields wide" style="grid-template-columns:1fr">
        <label class="field">Projet<select id="mProj">${projOpts}<option value="__new"${db.projects.length ? '' : ' selected'}>+ Nouveau projet…</option></select></label>
        <label class="field" id="mNewWrap"${db.projects.length ? ' hidden' : ''}>Nom du nouveau projet<input type="text" id="mNewName" placeholder="ex. Frochot"></label>
        <label class="field">Repère de l'élément<input type="text" id="mName" value="${esc(state.name)}"></label>
      </div>`, [{ label: 'Annuler' }, { label: 'Enregistrer', primary: true, value: (bg) => ({ proj: $('#mProj', bg).value, newName: $('#mNewName', bg).value.trim(), name: $('#mName', bg).value.trim() }) }]);
    return res;
  }
  document.addEventListener('change', (e) => {
    if (e.target.id === 'mProj') { const w = $('#mNewWrap'); if (w) w.hidden = e.target.value !== '__new'; }
  });

  function storeItem(projectId, itemId, name) {
    const p = db.projects.find((x) => x.id === projectId);
    state.name = name || state.name;
    const copy = JSON.parse(JSON.stringify(state));
    let it = itemId && p.items.find((x) => x.id === itemId);
    if (!it) { it = { id: ST.uid(), created: Date.now() }; p.items.push(it); }
    Object.assign(it, { name: state.name || 'Sans nom', state: copy, updated: Date.now(), summary: summaryOf(copy) });
    db.current = { projectId, itemId: it.id };
    dirty = false; db.draft = state; db.draftDirty = false;
    if (!ST.save(db)) toast('Stockage du navigateur plein : exportez puis supprimez d\'anciens projets.');
    else toast('Enregistré dans « ' + p.name + ' »');
  }

  async function doSave(asNew) {
    const cur = crumb();
    if (!asNew && cur.p && cur.it) { storeItem(cur.p.id, cur.it.id, state.name); refreshDynamic(); return; }
    const r = await askSave(asNew);
    if (!r) return;
    let pid = r.proj;
    if (pid === '__new' || !pid) {
      const p = { id: ST.uid(), name: r.newName || 'Projet sans nom', created: Date.now(), items: [] };
      db.projects.push(p); pid = p.id;
    }
    storeItem(pid, null, r.name);
    route();
  }

  function download(name, text, type) {
    const blob = text instanceof Blob ? text : new Blob([text], { type: type || 'application/octet-stream' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const slug = (s) => String(s || 'lignum').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

  // ---------- événements ----------
  const app = $('#app');

  app.addEventListener('input', onEdit);
  app.addEventListener('change', onEdit);
  function onEdit(e) {
    const t = e.target;
    if (!t.dataset || !t.dataset.p || t.closest('.modal')) return;
    if (e.type === 'input' && (t.tagName === 'SELECT' || t.type === 'checkbox')) return;
    let v = t.type === 'checkbox' ? t.checked : t.value;
    if (t.dataset.p === 'altitudeHigh') v = v === 'true';
    if (t.dataset.p === 'fire.t' || t.dataset.p === 'serviceClass' || t.dataset.p === 'ksys') v = +v;
    set(t.dataset.p, v);
    // longueurs liées à L
    if (t.dataset.p === 'L' || t.dataset.p.startsWith('link.')) {
      ['lfy', 'lfz', 'lef'].forEach((k) => {
        if (state.link[k]) { state[k] = state.L; const el = $(`[data-p="${k}"]`); if (el) { el.value = state.L; } }
        const el = $(`[data-p="${k}"]`); if (el) el.disabled = !!state.link[k];
      });
    }
    dirty = true;
    persistDraft();
    if (t.dataset.rerender && e.type === 'change') { renderVerification(app); return; }
    refreshDynamic();
  }

  // collage d'un bloc (Excel / GSA) dans le tableau des sollicitations
  app.addEventListener('paste', (e) => {
    const t = e.target;
    if (!t.dataset || t.dataset.r == null) return;
    const txt = (e.clipboardData || window.clipboardData).getData('text');
    if (!/[\t\n]/.test(txt)) return;
    e.preventDefault();
    const r0 = +t.dataset.r, c0 = +t.dataset.c;
    txt.replace(/\r/g, '').split('\n').filter((l, i, a) => l.length || i < a.length - 1).forEach((line, i) => {
      line.split('\t').forEach((cell, j) => {
        const el = $(`#unitTable input[data-r="${r0 + i}"][data-c="${c0 + j}"]`);
        if (el) { const v = cell.trim().replace(/\s/g, '').replace(',', '.'); set(el.dataset.p, v); el.value = v; }
      });
    });
    dirty = true; persistDraft(); refreshDynamic();
  });

  app.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.tagName === 'INPUT') return;
    const a = b.dataset.act;
    if (a === 'mode') { state.loads.mode = b.dataset.v; dirty = true; persistDraft(); renderVerification(app); }
    else if (a === 'save') doSave(false);
    else if (a === 'saveas') doSave(true);
    else if (a === 'new') {
      if (dirty && !(await confirmBox('Nouvelle vérification', 'Les modifications non enregistrées seront perdues. Continuer ?'))) return;
      const keepProj = db.current && db.current.projectId;
      state = ST.defaultState(); state.name = 'Nouvel élément';
      db.current = keepProj ? { projectId: keepProj, itemId: null } : null;
      dirty = false; persistDraft(); renderVerification(app);
    }
    else if (a === 'report') window.LignumReport.open([{ state, project: crumb().p ? crumb().p.name : '' }]);
    else if (a === 'clearTable') { state.loads.direct = ST.emptyTable(); dirty = true; persistDraft(); refreshDynamic(); }
    else if (a === 'addPP') {
      const q = (+state.b) * (+state.h) * R.mat.rhomean / 1e6, L = +state.L;
      const k = state.loads.unit === 'kN' ? 0.01 : 1;
      if (state.elemType === 'poteau') state.loads.direct.N.PP = +(q * L * k).toFixed(3);
      else { state.loads.direct.My.PP = +(q * L * L / 8 * k).toFixed(3); state.loads.direct.Vz.PP = +(q * L / 2 * k).toFixed(3); }
      dirty = true; persistDraft(); refreshDynamic(); toast('PP ajouté : ' + fmt(q, 1) + ' daN/m');
    }
    else if (a === 'toDirect') {
      const U = R.unit, t = ST.emptyTable();
      D.EFFECTS.forEach((ef) => D.CASES.forEach((c) => { const v = U.cases[c.id] ? U.cases[c.id][ef.id] : 0; t[ef.id][c.id] = v ? +v.toFixed(3) : ''; }));
      state.loads.direct = t; state.loads.unit = U.unit; state.loads.mode = 'direct';
      dirty = true; persistDraft(); renderVerification(app); toast('Valeurs reprises en saisie directe');
    }
    // projets
    else if (a === 'newProj') {
      const n = await modal('Nouveau projet', '<label class="field">Nom<input type="text" id="mN" placeholder="ex. Frochot"></label>', [{ label: 'Annuler' }, { label: 'Créer', primary: true, value: (bg) => $('#mN', bg).value.trim() }]);
      if (n == null) return;
      db.projects.push({ id: ST.uid(), name: n || 'Projet sans nom', created: Date.now(), items: [] }); ST.save(db); route();
    }
    else if (a === 'renameProj') {
      const p = db.projects.find((x) => x.id === b.dataset.p);
      const n = await modal('Renommer le projet', `<label class="field">Nom<input type="text" id="mN" value="${esc(p.name)}"></label>`, [{ label: 'Annuler' }, { label: 'Renommer', primary: true, value: (bg) => $('#mN', bg).value.trim() }]);
      if (n) { p.name = n; ST.save(db); route(); }
    }
    else if (a === 'delProj') {
      const p = db.projects.find((x) => x.id === b.dataset.p);
      if (!(await confirmBox('Supprimer le projet', `Supprimer « ${esc(p.name)} » et ses ${p.items.length} vérification(s) ? Pensez à l'exporter avant.`))) return;
      db.projects = db.projects.filter((x) => x !== p);
      if (db.current && db.current.projectId === p.id) db.current = null;
      ST.save(db); route();
    }
    else if (a === 'open' || a === 'dupItem' || a === 'delItem') {
      const p = db.projects.find((x) => x.id === b.dataset.p), it = p.items.find((x) => x.id === b.dataset.i);
      if (a === 'open') {
        if (dirty && !(await confirmBox('Ouvrir', 'Les modifications non enregistrées de la vérification en cours seront perdues. Continuer ?'))) return;
        state = ST.upgrade(JSON.parse(JSON.stringify(it.state)));
        db.current = { projectId: p.id, itemId: it.id }; dirty = false; persistDraft();
        location.hash = '#/verification';
      } else if (a === 'dupItem') {
        const c = JSON.parse(JSON.stringify(it)); c.id = ST.uid(); c.name = it.name + ' (copie)'; c.state.name = c.name; c.updated = Date.now();
        p.items.splice(p.items.indexOf(it) + 1, 0, c); ST.save(db); route();
      } else {
        if (!(await confirmBox('Supprimer', `Supprimer la vérification « ${esc(it.name)} » ?`))) return;
        p.items = p.items.filter((x) => x !== it);
        if (db.current && db.current.itemId === it.id) db.current = { projectId: p.id, itemId: null };
        ST.save(db); route();
      }
    }
    else if (a === 'exportProj') {
      const p = db.projects.find((x) => x.id === b.dataset.p);
      download('lignum-' + slug(p.name) + '.json', JSON.stringify({ lignum: 1, exported: new Date().toISOString(), project: p }, null, 1), 'application/json');
    }
    else if (a === 'reportProj') {
      const p = db.projects.find((x) => x.id === b.dataset.p);
      window.LignumReport.open(p.items.map((it) => ({ state: ST.upgrade(JSON.parse(JSON.stringify(it.state))), project: p.name })));
    }
  });

  app.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.act === 'import' && t.files && t.files[0]) {
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const j = JSON.parse(fr.result);
          const p = j.project || j;
          if (!p || !Array.isArray(p.items)) throw new Error('format');
          p.id = ST.uid();
          if (db.projects.some((x) => x.name === p.name)) p.name += ' (import)';
          p.items.forEach((it) => { it.id = ST.uid(); it.state = ST.upgrade(it.state); });
          db.projects.push(p); ST.save(db); route(); toast('Projet « ' + p.name + ' » importé');
        } catch (err) { toast('Fichier non reconnu'); }
      };
      fr.readAsText(t.files[0]);
    }
  });

  // ---------- routage ----------
  function route() {
    const r = (location.hash.replace(/^#\/?/, '') || 'verification').split('/')[0];
    $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === r));
    const { p } = crumb();
    $('#topMeta').innerHTML = p ? `${esc(p.name)}<span>${p.items.length} vérification${p.items.length > 1 ? 's' : ''}</span>` : 'Vérification bois<span>NF EN 1995-1-1 + AN</span>';
    const views = { verification: renderVerification, resistances: renderResistances, instabilites: renderInstabilites, donnees: renderDonnees, methode: renderMethode, projets: renderProjets };
    (views[r] || renderVerification)(app);
    if (r !== 'verification') window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', () => { db.draft = state; db.draftDirty = dirty; ST.save(db); });
  route();

  window.LignumApp = { fmt, fmtG, pct, esc, sectionSvg, get state() { return state; } };
})();
