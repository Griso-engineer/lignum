/* ==========================================================================
   Lignum — fiche pour note de calcul (NDC)
   Aperçu A4 à l'écran, puis :
     · PDF  : impression du navigateur (« Enregistrer au format PDF »)
     · Word : document .doc (HTML compatible Word, schéma en image)
     · JPEG : une image par page (html2canvas, chargé à la demande)
   ========================================================================== */
(function () {
  'use strict';
  const E = window.LignumEC5, D = window.LIGNUM_DATA;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (x, d = 2) => (Number.isFinite(x) ? x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');
  const fmtG = (x, d = 3) => (Number.isFinite(x) ? x.toLocaleString('fr-FR', { maximumFractionDigits: d }) : '—');
  const pct = (r) => (Number.isFinite(r) ? Math.round(r * 100) + ' %' : '∞');
  const ok = (r) => (r <= 1 ? '<span class="rp-ok">OK</span>' : '<span class="rp-ko">Non vérifié</span>');
  const durName = (d) => ((D.DURATIONS.find((x) => x[0] === d) || ['', ''])[1]).toLowerCase();

  let opts = { annex: false, logo: true, ref: '' };
  let items = [];

  function sectionSvg(s, R, size) {
    const b = +s.b || 1, h = +s.h || 1, f = R.fire;
    const k = (size - 26) / Math.max(b, h);
    const W = b * k, H = h * k, x0 = (size - W) / 2, y0 = (size - H) / 2;
    let res = '';
    if (f.t > 0 && f.bf > 0 && f.hf > 0) {
      const nB = +s.fire.facesB, nH = +s.fire.facesH, dB = (b - f.bf) * k, dH = (h - f.hf) * k;
      const rx = x0 + (nB === 2 ? dB / 2 : nB === 1 ? dB : 0), ry = y0 + (nH === 2 ? dH / 2 : 0);
      res = `<rect x="${rx}" y="${ry}" width="${f.bf * k}" height="${f.hf * k}" fill="none" stroke="#fa554f" stroke-width="1.2" stroke-dasharray="3 2"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="#f6e3c8" stroke="#111" stroke-width="1.2"/>${res}
      <line x1="${x0 + W / 2}" y1="${y0 - 6}" x2="${x0 + W / 2}" y2="${y0 + H + 6}" stroke="#111" stroke-width=".5" stroke-dasharray="4 2 1 2"/>
      <line x1="${x0 - 6}" y1="${y0 + H / 2}" x2="${x0 + W + 6}" y2="${y0 + H / 2}" stroke="#111" stroke-width=".5" stroke-dasharray="4 2 1 2"/>
      <text x="${x0 + W + 4}" y="${y0 + H / 2 - 3}" font-family="Arial" font-size="10">y</text>
      <text x="${x0 + W / 2 + 3}" y="${y0 + H + 12}" font-family="Arial" font-size="10">z</text>
      <text x="${x0 + W / 2}" y="${y0 - 8}" font-family="Arial" font-size="9" text-anchor="middle">b = ${fmtG(b, 0)}</text>
      <text x="${x0 - 8}" y="${y0 + H / 2}" font-family="Arial" font-size="9" text-anchor="middle" transform="rotate(-90 ${x0 - 8} ${y0 + H / 2})">h = ${fmtG(h, 0)}</text>
    </svg>`;
  }

  function head(s, project, page) {
    const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    return `<header class="rp-head">
      <div class="l"><b>${esc(project || 'Note de calcul')}</b>Vérification d'élément bois — NF EN 1995${opts.ref ? ' · ' + esc(opts.ref) : ''}</div>
      <div class="r">${opts.logo ? '<div class="logo-s">tracés</div>' : ''}${esc(s.name)} · ${date}${page ? ' · ' + page : ''}</div>
    </header>`;
  }

  function critTable(env, fire) {
    const keys = Object.keys(E.CRITERIA).filter((k) => env.byCrit[k]);
    return `<table><thead><tr><th>Critère</th><th>Réf.</th><th>Expression</th><th>Comb.</th><th class="num">Taux</th><th>Statut</th></tr></thead><tbody>
      ${keys.map((k) => { const c = E.CRITERIA[k], x = env.byCrit[k]; return `<tr${env.worst.gov === k ? ' class="gov"' : ''}><td>${c.label}</td><td>${c.ref}</td><td class="f">${esc(c.f)}</td><td>${x.combo.id}</td><td class="num">${pct(x.r)}</td><td>${ok(x.r)}</td></tr>`; }).join('')}
    </tbody></table>`;
  }

  function calcDetail(R, c, fire) {
    const st = c.stress, fd = c.fd, S = fire ? { b: R.fire.bf, h: R.fire.hf } : R.sec;
    const inst = fire ? R.instF : R.instC;
    const line = (a, b) => `<div><span>${a}</span><b>${b}</b></div>`;
    const kfiTxt = fire ? `k<sub>fi</sub> = ${fmt(R.kfi, 2)}, k<sub>mod,fi</sub> = γ<sub>M,fi</sub> = 1` : `k<sub>mod</sub> = ${fmt(c.kmod, 2)} (${durName(c.dur)}), γ<sub>M</sub> = ${fmt(c.gamma, 2)}`;
    const m = R.mat;
    const kf = fire ? R.kfi : c.kmod / c.gamma;
    const khy = fire ? 1 : R.sec.khH, khz = fire ? 1 : R.sec.khB, kht = fire ? 1 : R.sec.khT;
    let rows = '';
    rows += line(`Combinaison ${c.id}`, esc(c.label));
    rows += line('Efforts de calcul', `N = ${fmt(c.eff.N / 1e3, 2)} kN ; M<sub>y</sub> = ${fmt(c.eff.My / 1e6, 2)} kN·m ; M<sub>z</sub> = ${fmt(c.eff.Mz / 1e6, 2)} kN·m ; V = ${fmt(Math.hypot(c.eff.Vz, c.eff.Vy) / 1e3, 2)} kN`);
    rows += line('Coefficients', kfiTxt);
    rows += line(`Section ${fire ? 'résiduelle ' : ''}b × h`, `${fmt(S.b, 0)} × ${fmt(S.h, 0)} mm`);
    if (st.comp || st.tens) {
      rows += line(st.comp ? 'σ<sub>c,0,d</sub> = N / A' : 'σ<sub>t,0,d</sub> = N / A', `${fmt(st.sN, 2)} MPa`);
      rows += st.comp
        ? line(`f<sub>c,0,d</sub> = ${fire ? 'k<sub>fi</sub>·f<sub>c,0,k</sub>' : 'k<sub>mod</sub>·f<sub>c,0,k</sub>/γ<sub>M</sub>'}`, `${fmt(kf, 3)} × ${fmt(m.fc0k, 1)} = ${fmt(fd.c, 2)} MPa`)
        : line(`f<sub>t,0,d</sub> = ${fire ? 'k<sub>fi</sub>·f<sub>t,0,k</sub>' : 'k<sub>mod</sub>·k<sub>h</sub>·f<sub>t,0,k</sub>/γ<sub>M</sub>'}`, `${fmt(kf, 3)} × ${fmt(kht, 3)} × ${fmt(m.ft0k, 1)} = ${fmt(fd.t, 2)} MPa`);
    }
    rows += line('σ<sub>m,y,d</sub> = M<sub>y</sub> / W<sub>y</sub>', `${fmt(st.smy, 2)} MPa`);
    rows += line(`f<sub>m,y,d</sub> = ${fire ? 'k<sub>fi</sub>·k<sub>sys</sub>·f<sub>m,k</sub>' : 'k<sub>mod</sub>·k<sub>h,y</sub>·k<sub>sys</sub>·f<sub>m,k</sub>/γ<sub>M</sub>'}`, `${fmt(kf, 3)} × ${fmt(khy, 3)} × ${fmt(R.ksys, 1)} × ${fmt(m.fmk, 1)} = ${fmt(fd.my, 2)} MPa`);
    if (st.smz > 0) {
      rows += line('σ<sub>m,z,d</sub> = M<sub>z</sub> / W<sub>z</sub>', `${fmt(st.smz, 2)} MPa`);
      rows += line('f<sub>m,z,d</sub>', `${fmt(kf, 3)} × ${fmt(khz, 3)} × ${fmt(R.ksys, 1)} × ${fmt(m.fmk, 1)} = ${fmt(fd.mz, 2)} MPa`);
    }
    if (!fire && st.tau > 0) {
      rows += line('τ<sub>d</sub> = 1,5·V / (k<sub>cr</sub>·b·h)', `k<sub>cr</sub> = ${fmt(c.kcr, 2)} → ${fmt(st.tau, 2)} MPa`);
      rows += line('f<sub>v,d</sub> = k<sub>mod</sub>·f<sub>v,k</sub>/γ<sub>M</sub>', `${fmt(kf, 3)} × ${fmt(m.fvk, 1)} = ${fmt(fd.v, 2)} MPa`);
    }
    if (inst) rows += line('Instabilités', `k<sub>c,y</sub> = ${fmt(inst.y.kc, 3)} ; k<sub>c,z</sub> = ${fmt(inst.z.kc, 3)} ; k<sub>crit</sub> = ${fmt(inst.lt.kcrit, 3)}`);
    const g = E.CRITERIA[c.gov];
    if (g) rows += line(`Critère dimensionnant — éq. ${g.ref}`, `${esc(g.f)} = <b>${fmt(c.max, 3)}</b> ${c.max <= 1 ? '≤ 1' : '&gt; 1'}`);
    return `<div class="rp-calc">${rows}</div>`;
  }

  function pageFor(s, project, idx, total) {
    const R = E.compute(s);
    const m = R.mat;
    const typ = s.elemType === 'poteau' ? 'Poteau' : 'Poutre';
    const activeCases = D.CASES.filter((c) => D.EFFECTS.some((e) => Math.abs(R.cases[c.id][e.id]) > 1e-9));
    const uL = E.UNIT[R.unit.unit] || E.UNIT.daN;
    const overall = Math.max(...['ELU', 'FEU', 'SEI'].map((k) => (R.env[k] ? R.env[k].max : 0)), R.sls.max);
    const kv = (a, b) => `<div><span>${a}</span><b>${b}</b></div>`;
    const psiRow = (c) => {
      const p = R.psiOf(c.id), cat = (c.id === 'Q1' || c.id === 'Q2') ? D.CATEGORIES[s.categories[c.id]].label : c.kind === 'G' ? '—' : c.kind === 'E' ? 'Sismique' : c.id === 'S' ? (s.altitudeHigh ? 'Neige > 1000 m' : 'Neige ≤ 1000 m') : 'Vent';
      return `<tr><td><b>${c.label}</b></td><td>${c.title}</td><td>${cat}</td><td class="num">${c.kind === 'Q' ? fmt(p[0], 1) : '—'}</td><td class="num">${c.kind === 'Q' ? fmt(p[1], 1) : '—'}</td><td class="num">${c.kind === 'Q' ? fmt(p[2], 1) : '—'}</td><td>${durName(R.durationOf(c.id))}</td></tr>`;
    };
    let n = 0;
    const H2 = (t) => `<h2><span class="n">${++n}</span>${t}</h2>`;
    const sub = total > 1 ? ` (${idx + 1}/${total})` : '';

    // --- page 1
    let p1 = `<section class="rp-page">${head(s, project, 'p. 1')}
      <div class="rp-title"><h1>${esc(s.name || 'Élément')} — ${typ} ${esc(m.name)} ${fmtG(+s.b, 0)} × ${fmtG(+s.h, 0)} mm${sub}</h1>
      <p>L = ${fmt(+s.L, 2)} m · classe de service ${R.sc} · vérification selon NF EN 1990, NF EN 1995-1-1${R.fire.t > 0 ? ', NF EN 1995-1-2' : ''} et annexes nationales françaises</p></div>
      ${H2('Hypothèses')}
      <div class="rp-fig">${sectionSvg(s, R, 118)}<div style="flex:1">
        <div class="rp-kv">
          ${kv('Matériau', `${esc(m.name)} — ${m.family.toLowerCase()}`)}${kv('γ<sub>M</sub>', fmt(R.gM, 2))}${kv('k<sub>def</sub>', fmt(R.kdef, 1))}
          ${kv('f<sub>m,k</sub> / f<sub>v,k</sub>', `${fmtG(m.fmk, 1)} / ${fmtG(m.fvk, 1)} MPa`)}${kv('f<sub>c,0,k</sub> / f<sub>t,0,k</sub>', `${fmtG(m.fc0k, 1)} / ${fmtG(m.ft0k, 1)} MPa`)}${kv('E<sub>0,mean</sub> / E<sub>0,05</sub>', `${fmtG(m.E0mean * 1000, 0)} / ${fmtG(m.E005 * 1000, 0)} MPa`)}
          ${kv('ρ<sub>k</sub> / ρ<sub>mean</sub>', `${m.rhok} / ${m.rhomean} kg/m³`)}${kv('k<sub>h,y</sub> / k<sub>h,z</sub>', `${fmt(R.sec.khH, 3)} / ${fmt(R.sec.khB, 3)}`)}${kv('k<sub>sys</sub>', fmt(R.ksys, 2))}
          ${kv('A / I<sub>y</sub>', `${fmtG(R.sec.A / 100, 1)} cm² / ${fmtG(R.sec.Iy / 1e4, 0)} cm⁴`)}${kv('W<sub>y</sub> / W<sub>z</sub>', `${fmtG(R.sec.Wy / 1e3, 1)} / ${fmtG(R.sec.Wz / 1e3, 1)} cm³`)}${kv('I<sub>z</sub>', `${fmtG(R.sec.Iz / 1e4, 0)} cm⁴`)}
          ${kv('l<sub>f,y</sub> / l<sub>f,z</sub>', `${fmt(R.lfy / 1000, 2)} / ${fmt(R.lfz / 1000, 2)} m`)}${kv('l<sub>ef</sub> déversement', `${fmt(R.lef / 1000, 2)} m`)}${kv('Stabilité au feu', R.fire.t > 0 ? `R${R.fire.t} (${s.fire.facesB} face(s) sur b, ${s.fire.facesH} sur h)` : 'non requise')}
        </div></div></div>
      ${H2('Actions et sollicitations caractéristiques')}
      <table><thead><tr><th>Cas</th><th>Description</th><th>Catégorie</th><th class="num">ψ<sub>0</sub></th><th class="num">ψ<sub>1</sub></th><th class="num">ψ<sub>2</sub></th><th>Durée (k<sub>mod</sub>)</th></tr></thead><tbody>${activeCases.map(psiRow).join('')}</tbody></table>
      <table><thead><tr><th>Sollicitation</th>${activeCases.map((c) => `<th class="num">${c.label}</th>`).join('')}</tr></thead><tbody>
        ${D.EFFECTS.map((e) => `<tr><td>${e.label} [${e.unit === 'F' ? uL.fl : uL.ml}]</td>${activeCases.map((c) => { const v = R.unit.cases[c.id] ? +R.unit.cases[c.id][e.id] || 0 : 0; return `<td class="num">${v ? fmtG(v, 2) : '·'}</td>`; }).join('')}</tr>`).join('')}
      </tbody></table>
      <p class="f" style="font-size:7.8pt;color:#555">${s.loads.mode === 'direct' ? 'Sollicitations issues du modèle de calcul (saisie directe par cas unitaire).' : s.loads.mode === 'poutre' ? `Sollicitations calculées : poutre bi-articulée sous charges réparties, bande ${fmtG(+s.loads.poutre.B, 2)} m${+s.loads.poutre.Bz ? ' (axe faible ' + fmtG(+s.loads.poutre.Bz, 2) + ' m)' : ''}${+s.loads.poutre.rampant ? ', rampant ' + s.loads.poutre.rampant + ' ' + s.loads.poutre.rampantUnit : ''}${+s.loads.poutre.devers ? ', dévers ' + s.loads.poutre.devers + ' ' + s.loads.poutre.deversUnit : ''}.` : `Sollicitations calculées par descente de charges : surface reprise ${fmtG(+s.loads.poteau.S, 2)} m².`} Convention : F<sub>x</sub> &gt; 0 en compression.</p>
      ${H2('Combinaisons d\'actions')}
      <p>ELU fondamental (NF EN 1990 éq. 6.10) : 1,35·G + 1,5·Q<sub>k,1</sub> + Σ 1,5·ψ<sub>0,i</sub>·Q<sub>k,i</sub>${s.options.gFav !== false && R.active.includes('W') ? ', et 1,0·G + 1,5·W (G favorable)' : ''} — ${R.env.ELU ? R.env.ELU.n : 0} combinaisons.
      ${R.env.FEU ? ` Incendie (6.11b) : G + ψ<sub>${s.options.fireLead === 'psi2' ? '2' : '1'},1</sub>·Q<sub>k,1</sub> + Σ ψ<sub>2,i</sub>·Q<sub>k,i</sub> — ${R.env.FEU.n} combinaisons.` : ''}
      ${R.env.SEI ? ` Sismique (6.12b) : G + Σ ψ<sub>2,i</sub>·Q<sub>k,i</sub> + A<sub>Ed</sub> — ${R.env.SEI.n} combinaisons (k<sub>mod</sub> = ${fmt(+s.options.seisKmod || 1.1, 2)}, γ<sub>M</sub> = ${fmt(s.options.seisGammaM === 'one' ? 1 : R.gM, 2)}).` : ''}
      k<sub>mod</sub> retenu : celui de l'action de plus courte durée de chaque combinaison.</p>
      ${R.env.ELU ? `${H2('Vérifications ELU — situation durable')}${critTable(R.env.ELU)}` : ''}
    </section>`;

    // --- page 2
    const ic = R.instC, iF = R.instF;
    let p2 = `<section class="rp-page">${head(s, project, 'p. 2')}
      ${R.env.ELU ? `<h3 style="margin-top:0">ELU — détail de la combinaison dimensionnante</h3>${calcDetail(R, R.env.ELU.worst, false)}` : ''}
      ${H2('Instabilités')}
      <table><thead><tr><th></th><th class="num">λ<sub>rel,y</sub></th><th class="num">k<sub>c,y</sub></th><th class="num">λ<sub>rel,z</sub></th><th class="num">k<sub>c,z</sub></th><th class="num">σ<sub>m,crit</sub> [MPa]</th><th class="num">λ<sub>rel,m</sub></th><th class="num">k<sub>crit</sub></th></tr></thead><tbody>
        <tr><td>À froid</td><td class="num">${fmt(ic.y.lrel, 3)}</td><td class="num">${fmt(ic.y.kc, 3)}</td><td class="num">${fmt(ic.z.lrel, 3)}</td><td class="num">${fmt(ic.z.kc, 3)}</td><td class="num">${fmt(ic.lt.smcrit, 1)}</td><td class="num">${fmt(ic.lt.lrelm, 3)}</td><td class="num">${fmt(ic.lt.kcrit, 3)}</td></tr>
        ${iF ? `<tr><td>Feu R${R.fire.t}</td><td class="num">${fmt(iF.y.lrel, 3)}</td><td class="num">${fmt(iF.y.kc, 3)}</td><td class="num">${fmt(iF.z.lrel, 3)}</td><td class="num">${fmt(iF.z.kc, 3)}</td><td class="num">${fmt(iF.lt.smcrit, 1)}</td><td class="num">${fmt(iF.lt.lrelm, 3)}</td><td class="num">${fmt(iF.lt.kcrit, 3)}</td></tr>` : ''}
      </tbody></table>
      <p style="font-size:7.8pt;color:#555">Éq. 6.21 à 6.28 (β<sub>c</sub> = ${fmt(R.betac, 1)}), σ<sub>m,crit</sub> = 0,78·b²·E<sub>0,05</sub>/(h·l<sub>ef</sub>) (6.32), k<sub>crit</sub> (6.34).</p>`;
    if (R.env.FEU) {
      const f = R.fire;
      p2 += `${H2(`Vérifications ELU — incendie R${f.t}`)}
        <p>Méthode de la section réduite (NF EN 1995-1-2 § 4.2.2) : β<sub>n</sub> = ${fmt(f.betan, 2)} mm/min, d<sub>char,n</sub> = ${fmt(f.dchar, 1)} mm, k<sub>0</sub> = ${fmt(f.k0, 2)}, d<sub>0</sub> = 7 mm, d<sub>ef</sub> = ${fmt(f.def, 1)} mm → section résiduelle ${fmt(f.bf, 0)} × ${fmt(f.hf, 0)} mm. f<sub>d,fi</sub> = k<sub>fi</sub>·f<sub>k</sub> (k<sub>fi</sub> = ${fmt(R.kfi, 2)}).</p>
        ${critTable(R.env.FEU, true)}<h3>Détail de la combinaison dimensionnante</h3>${calcDetail(R, R.env.FEU.worst, true)}`;
    }
    if (R.env.SEI) p2 += `${H2('Vérifications ELA — séisme')}${critTable(R.env.SEI)}<h3>Détail de la combinaison dimensionnante</h3>${calcDetail(R, R.env.SEI.worst, false)}`;
    p2 += `${H2('Vérifications ELS — flèches')}
      <table><thead><tr><th>Flèche</th><th>Direction</th><th class="num">w [mm]</th><th class="num">Limite</th><th class="num">soit</th><th class="num">Taux</th><th>Statut</th></tr></thead><tbody>
      ${R.sls.rows.map((r) => `<tr><td>${r.label}</td><td>${r.dir === 'y' ? 'plan de h' : 'plan de b'}</td><td class="num">${fmt(r.w, 1)}</td><td class="num">L/${r.limRatio} = ${fmt(r.lim, 1)} mm</td><td class="num">${r.w > 0 ? 'L/' + Math.round(r.Lratio) : '—'}</td><td class="num">${pct(r.ratio)}</td><td>${ok(r.ratio)}</td></tr>`).join('')}
      </tbody></table>
      <p style="font-size:7.8pt;color:#555">${R.sls.mode === 'input' ? 'Flèches unitaires issues du modèle.' : `Flèches unitaires : u = M·L²/(9,6·E<sub>0,mean</sub>·I) (poutre bi-articulée sous charge répartie), L = ${fmt(R.sls.L / 1000, 2)} m.`} w<sub>fin</sub> = w<sub>inst,G</sub>(1 + k<sub>def</sub>) + w<sub>inst,Q1</sub>(1 + ψ<sub>2,1</sub>·k<sub>def</sub>) + Σ w<sub>inst,Qi</sub>(ψ<sub>0,i</sub> + ψ<sub>2,i</sub>·k<sub>def</sub>) (NF EN 1995-1-1 § 2.3.2.2), k<sub>def</sub> = ${fmt(R.kdef, 1)}.</p>
      <div class="rp-concl"><span>Conclusion — ${typ.toLowerCase()} ${esc(m.name)} ${fmtG(+s.b, 0)} × ${fmtG(+s.h, 0)} mm</span><b class="${overall <= 1 ? 'rp-ok' : 'rp-ko'}">${overall <= 1 ? 'Vérifié' : 'Non vérifié'} — taux max. ${pct(overall)}</b></div>
    </section>`;

    let p3 = '';
    if (opts.annex) {
      p3 = `<section class="rp-page">${head(s, project, 'annexe')}${H2('Annexe — combinaisons étudiées')}
        <table><thead><tr><th>N°</th><th>Combinaison</th><th class="num">k<sub>mod</sub></th><th class="num">N [kN]</th><th class="num">M<sub>y</sub> [kN·m]</th><th class="num">M<sub>z</sub> [kN·m]</th><th class="num">V [kN]</th><th>Critère</th><th class="num">Taux</th></tr></thead><tbody>
        ${R.combos.map((c) => `<tr><td>${c.id}</td><td>${esc(c.label)}</td><td class="num">${fmt(c.kmod, 2)}</td><td class="num">${fmt(c.eff.N / 1e3, 2)}</td><td class="num">${fmt(c.eff.My / 1e6, 2)}</td><td class="num">${fmt(c.eff.Mz / 1e6, 2)}</td><td class="num">${fmt(Math.hypot(c.eff.Vz, c.eff.Vy) / 1e3, 2)}</td><td>${E.CRITERIA[c.gov] ? E.CRITERIA[c.gov].ref : '—'}</td><td class="num">${pct(c.max)}</td></tr>`).join('')}
        </tbody></table></section>`;
    }
    return p1 + p2 + p3;
  }

  function build() {
    return items.map((it, i) => pageFor(it.state, it.project, i, items.length)).join('');
  }

  function render(ov) {
    $('.rp-pages', ov).innerHTML = build();
  }
  function $(s, r = document) { return r.querySelector(s); }

  function open(list) {
    items = list;
    const name = list.length === 1 ? (list[0].state.name || 'element') : (list[0].project || 'projet');
    const ov = document.createElement('div');
    ov.className = 'rp-overlay';
    ov.innerHTML = `<div class="rp-bar"><b>Fiche NDC — ${esc(name)}</b>
      <label><input type="text" id="rpRef" placeholder="Réf. affaire / NDC" value="${esc(opts.ref)}" style="width:150px;padding:4px 6px;font-size:12px;border:0"></label>
      <label><input type="checkbox" id="rpLogo"${opts.logo ? ' checked' : ''}> logo tracés</label>
      <label><input type="checkbox" id="rpAnnex"${opts.annex ? ' checked' : ''}> annexe combinaisons</label>
      <button class="btn primary" data-x="pdf">PDF</button>
      <button class="btn" data-x="doc">Word</button>
      <button class="btn" data-x="jpg">JPEG</button>
      <button class="btn" data-x="close">Fermer ✕</button></div>
      <div class="rp-pages"></div>`;
    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';
    render(ov);
    ov.addEventListener('change', (e) => {
      if (e.target.id === 'rpLogo') opts.logo = e.target.checked;
      if (e.target.id === 'rpAnnex') opts.annex = e.target.checked;
      if (e.target.id === 'rpRef') opts.ref = e.target.value;
      render(ov);
    });
    ov.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      const x = b.dataset.x;
      if (x === 'close') { ov.remove(); document.body.style.overflow = ''; }
      if (x === 'pdf') { const t = document.title; document.title = 'NDC-' + slug(name); window.print(); document.title = t; }
      if (x === 'doc') exportWord(ov, name);
      if (x === 'jpg') { b.textContent = '…'; try { await exportJpeg(ov, name); } finally { b.textContent = 'JPEG'; } }
    });
    const onKey = (e) => { if (e.key === 'Escape' && document.body.contains(ov)) { ov.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
  }

  const slug = (s) => String(s || 'lignum').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  function download(fname, blob) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }

  // ---------- Word (.doc HTML) ----------
  function svgToPng(svg) {
    return new Promise((resolve) => {
      const img = new Image();
      const scale = 3;
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = img.width * scale; c.height = img.height * scale;
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        resolve({ src: c.toDataURL('image/png'), w: img.width, h: img.height });
      };
      img.onerror = () => resolve(null);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.outerHTML);
    });
  }
  async function exportWord(ov, name) {
    const clone = $('.rp-pages', ov).cloneNode(true);
    const svgs = Array.from(clone.querySelectorAll('svg'));
    for (const sv of svgs) {
      const png = await svgToPng(sv);
      if (png) { const im = document.createElement('img'); im.src = png.src; im.width = png.w; im.height = png.h; sv.replaceWith(im); } else sv.remove();
    }
    // mise en page Word : la grille et les flex deviennent des tableaux simples
    clone.querySelectorAll('.rp-fig').forEach((f) => {
      const t = document.createElement('table'); const tr = t.insertRow();
      Array.from(f.children).forEach((ch) => { const td = tr.insertCell(); td.style.border = '0'; td.style.verticalAlign = 'top'; td.appendChild(ch); });
      f.replaceWith(t);
    });
    clone.querySelectorAll('.rp-kv, .rp-calc').forEach((k) => {
      const t = document.createElement('table');
      Array.from(k.children).forEach((d) => { const tr = t.insertRow(); Array.from(d.children).forEach((x) => { const td = tr.insertCell(); td.innerHTML = x.innerHTML; }); });
      k.replaceWith(t);
    });
    clone.querySelectorAll('.rp-head').forEach((h) => {
      const t = document.createElement('table'); t.className = 'hd'; const tr = t.insertRow();
      Array.from(h.children).forEach((ch, i) => { const td = tr.insertCell(); td.innerHTML = ch.innerHTML; if (i) td.style.textAlign = 'right'; });
      h.replaceWith(t);
    });
    clone.querySelectorAll('.rp-concl').forEach((h) => {
      const t = document.createElement('table'); t.className = 'cc'; const tr = t.insertRow();
      Array.from(h.children).forEach((ch, i) => { const td = tr.insertCell(); td.innerHTML = ch.outerHTML; if (i) td.style.textAlign = 'right'; });
      h.replaceWith(t);
    });
    const pages = Array.from(clone.querySelectorAll('.rp-page')).map((p) => p.innerHTML);
    const css = `body{font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#111}
      h1{font-size:15pt;margin:4pt 0}h2{font-size:10.5pt;border-top:1pt solid #111;padding-top:3pt;margin:12pt 0 4pt}h3{font-size:9.5pt;margin:8pt 0 3pt}
      table{border-collapse:collapse;width:100%;font-size:8.5pt;margin:2pt 0 5pt}th,td{border-bottom:.5pt solid #bbb;padding:2pt 4pt;text-align:left;vertical-align:top}
      th{border-bottom:1pt solid #111}td.num,th.num{text-align:right}.n{color:#fa554f;margin-right:6pt}.logo-s{color:#fa554f;font-weight:bold;font-size:14pt}
      table.hd td{border:0;border-bottom:1.2pt solid #111;font-size:8pt;color:#555}table.cc td{border:1pt solid #111;font-size:10pt;padding:5pt}
      .rp-ok{color:#1f7a4d;font-weight:bold}.rp-ko{color:#c62f29;font-weight:bold}.f{color:#555}tr.gov td{font-weight:bold}p{margin:0 0 4pt}`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>${esc(name)}</title>
      <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
      <style>@page{size:21cm 29.7cm;margin:1.6cm 1.6cm 1.6cm 1.6cm}${css}</style></head>
      <body>${pages.map((p, i) => (i ? '<br clear="all" style="page-break-before:always">' : '') + p).join('')}</body></html>`;
    download('NDC-' + slug(name) + '.doc', new Blob(['﻿', html], { type: 'application/msword' }));
  }

  // ---------- JPEG ----------
  function loadH2C() {
    if (window.html2canvas) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload = res; s.onerror = () => rej(new Error('html2canvas'));
      document.head.appendChild(s);
    });
  }
  async function exportJpeg(ov, name) {
    try { await loadH2C(); } catch (e) { alert('Export image indisponible hors connexion.'); return; }
    const pages = Array.from(ov.querySelectorAll('.rp-page'));
    for (let i = 0; i < pages.length; i++) {
      const c = await window.html2canvas(pages[i], { scale: 2.2, backgroundColor: '#ffffff', useCORS: true });
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
      download(`NDC-${slug(name)}-p${i + 1}.jpg`, blob);
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  window.LignumReport = { open };
})();
