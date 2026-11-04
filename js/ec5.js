/* ==========================================================================
   Lignum — moteur de vérification NF EN 1995-1-1 / 1995-1-2 (+ AN française)
   Section rectangulaire, bois massif ou lamellé-collé.
   Unités internes : N, mm, MPa (N/mm²), N·mm.
   Fonction pure : LignumEC5.compute(state) → résultats.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.LIGNUM_DATA;
  const KM = 0.7;      // km section rectangulaire (6.1.6)
  const D0 = 7;        // mm, couche à résistance nulle (EN 1995-1-2 4.2.2)
  const VAR = ['Q1', 'Q2', 'S', 'W', 'Wu'];
  const WIND = ['W', 'Wu'];               // deux cas de vent exclusifs l'un de l'autre
  const GPERM = ['PP', 'G', 'Gf'];
  const SEIS = ['EXp', 'EXm', 'EYp', 'EYm'];
  const EFF = ['N', 'My', 'Mz', 'Vz', 'Vy'];

  const num = (v, d = 0) => { const x = parseFloat(String(v).replace(',', '.')); return Number.isFinite(x) ? x : d; };
  const angle = (v, unit) => (unit === '%' ? Math.atan(num(v) / 100) : num(v) * Math.PI / 180);

  // ---------- unités ----------
  const UNIT = {
    daN: { F: 10, M: 1e4, fl: 'daN', ml: 'daN·m' },
    kN: { F: 1e3, M: 1e6, fl: 'kN', ml: 'kN·m' }
  };

  // ---------- coefficients ----------
  function kh(mat, d) {
    if (mat.type === 'LC') return d < 600 ? Math.min(Math.pow(600 / d, 0.1), 1.1) : 1;
    if (mat.rhok > 700) return 1;
    return d < 150 ? Math.min(Math.pow(150 / d, 0.2), 1.3) : 1;
  }
  function kcOf(lf, i, fck, E05, betac) {
    if (!(lf > 0) || !(i > 0)) return { lambda: 0, lrel: 0, k: 0, kc: 1 };
    const lambda = lf / i;
    const lrel = lambda / Math.PI * Math.sqrt(fck / E05);
    const k = 0.5 * (1 + betac * (lrel - 0.3) + lrel * lrel);
    const kc = lrel <= 0.3 ? 1 : 1 / (k + Math.sqrt(k * k - lrel * lrel));
    return { lambda, lrel, k, kc: Math.min(1, kc) };
  }
  function kcritOf(b, h, lef, E05, fmk) {
    if (!(lef > 0)) return { smcrit: Infinity, lrelm: 0, kcrit: 1 };
    const smcrit = 0.78 * b * b * E05 / (h * lef);         // (6.32)
    const lrelm = Math.sqrt(fmk / smcrit);                  // (6.30)
    const kcrit = lrelm <= 0.75 ? 1 : lrelm <= 1.4 ? 1.56 - 0.75 * lrelm : 1 / (lrelm * lrelm); // (6.34)
    return { smcrit, lrelm, kcrit };
  }

  // ---------- sollicitations unitaires depuis les hypothèses de charges ----------
  function unitFromPoutre(s, mat) {
    const P = s.loads.poutre, L = num(s.L), b = num(s.b), h = num(s.h);
    const aR = angle(P.rampant, P.rampantUnit), aD = angle(P.devers, P.deversUnit);
    const cR = Math.cos(aR), sR = Math.sin(aR), cD = Math.cos(aD), sD = Math.sin(aD);
    const facade = num(P.facadePas) * num(P.facadeQ);       // daN/m
    const out = {};
    const L8 = L * L / 8;
    const make = (q1, q2) => {
      const My = q1 * L8 * cD * cR + q2 * L8 * sD;
      const Mz = q2 * L8 * cD + q1 * L8 * sD * cR;
      const N = (cD * cR) !== 0 ? My * 8 / L / (cD * cR) * sR : 0;
      return { N: L ? N : 0, My, Mz, Vz: L ? My * 4 / L : 0, Vy: L ? Mz * 4 / L : 0 };
    };
    const qpp = b * h * mat.rhomean / 1e6;                   // kg/m ≈ daN/m
    out.PP = make(qpp, 0);
    // PP : composante d'axe faible uniquement par le dévers (q faible = 0)
    // le soulèvement (Wu) est saisi en valeur positive et appliqué en sens inverse de la pesanteur
    ['G', 'Gf', 'Q1', 'Q2', 'S', 'W', 'Wu'].forEach((c) => {
      const sg = c === 'Wu' ? -1 : 1;
      let q1 = sg * num(P.B) * num(P.strong[c]);
      const q2 = sg * num(P.Bz) * num(P.weak[c]);
      if (c === 'G' && !P.facadeFragile) q1 += facade;
      if (c === 'Gf' && P.facadeFragile) q1 += facade;
      out[c] = make(q1, q2);
    });
    SEIS.forEach((c) => { out[c] = { N: 0, My: 0, Mz: 0, Vz: 0, Vy: 0 }; });
    return { unit: 'daN', cases: out, extra: { qpp, cR, sR, cD, sD, facade } };
  }

  function unitFromPoteau(s, mat) {
    const P = s.loads.poteau, L = num(s.L), b = num(s.b), h = num(s.h);
    const A = num(P.S);
    const zero = () => ({ N: 0, My: 0, Mz: 0, Vz: 0, Vy: 0 });
    const out = {};
    ['PP', 'G', 'Gf', 'Q1', 'Q2', 'S', 'W', 'Wu'].concat(SEIS).forEach((c) => { out[c] = zero(); });
    out.PP.N = b * h * mat.rhomean / 1e6 * L;
    out.G.N = A * (num(P.G1) * num(P.nG1) + num(P.G2) * num(P.nG2));
    out.Gf.N = A * num(P.Gf) * num(P.nGf);
    out.Q1.N = A * num(P.Q1) * num(P.nQ1);
    out.Q2.N = A * num(P.Q2) * num(P.nQ2);
    out.S.N = A * num(P.S_) * num(P.nS);
    const H = num(P.H) || L;
    [[P.W1, P.BW1, P.axW1], [P.W2, P.BW2, P.axW2]].forEach(([w, B, ax]) => {
      const q = num(w) * num(B);
      const targets = P.WuLateral !== false ? [out.W, out.Wu] : [out.W];
      targets.forEach((o) => {
        if (ax === 'Z') { o.Mz += q * H * H / 8; o.Vy += q * H / 2; }
        else { o.My += q * H * H / 8; o.Vz += q * H / 2; }
      });
    });
    // vent descendant / soulèvement de toiture repris en effort normal
    out.W.N = A * num(P.Wd);
    out.Wu.N = -A * num(P.Wu);        // traction
    return { unit: 'daN', cases: out, extra: { A, H } };
  }

  function unitCases(s, mat) {
    if (s.loads.mode === 'poutre') return unitFromPoutre(s, mat);
    if (s.loads.mode === 'poteau') return unitFromPoteau(s, mat);
    const out = {};
    D.CASES.forEach((c) => {
      out[c.id] = {};
      EFF.forEach((e) => { out[c.id][e] = num(s.loads.direct[e] && s.loads.direct[e][c.id]); });
    });
    return { unit: s.loads.unit || 'daN', cases: out, extra: {} };
  }

  // ---------- ψ et durées ----------
  function psiOf(s, c) {
    if (c === 'Q1' || c === 'Q2') return (D.CATEGORIES[s.categories[c]] || D.CATEGORIES['Cat. A']).psi;
    if (c === 'S') return s.altitudeHigh ? D.PSI_SNOW.high : D.PSI_SNOW.low;
    if (c === 'W' || c === 'Wu') return D.PSI_WIND;
    return [0, 0, 0];
  }
  function durationOf(s, c) {
    if (GPERM.includes(c)) return 'P';
    if (SEIS.includes(c)) return 'I';
    const ov = s.durations && s.durations[c];
    if (ov && ov !== 'auto') return ov;
    if (c === 'Q1' || c === 'Q2') return (D.CATEGORIES[s.categories[c]] || {}).dur || 'MT';
    if (c === 'S') return s.altitudeHigh ? 'MT' : 'CT';
    return 'I';
  }

  // ---------- génération des combinaisons ----------
  function subsets(arr) {
    const res = [[]];
    arr.forEach((x) => { const n = res.length; for (let i = 0; i < n; i++) res.push(res[i].concat([x])); });
    return res;
  }
  const fmtC = (x) => (Math.round(x * 1000) / 1000).toString().replace('.', ',');
  const LBL = { PP: 'PP', G: 'G', Gf: 'Gfrag', Q1: 'Q1', Q2: 'Q2', S: 'S', W: 'W↓', Wu: 'W↑', EXp: 'EX+', EXm: 'EX−', EYp: 'EY+', EYm: 'EY−' };

  function comboLabel(f) {
    const parts = [];
    const g = f.PP;
    const gs = GPERM.filter((c) => f[c]);
    if (gs.length) parts.push((g === 1 ? '' : fmtC(g) + '·') + '(' + gs.map((c) => LBL[c]).join('+') + ')');
    VAR.concat(SEIS).forEach((c) => { if (f[c]) parts.push((f[c] === 1 ? '' : fmtC(f[c]) + '·') + LBL[c]); });
    return parts.join(' + ');
  }

  function buildCombos(s, cases) {
    const isActive = (c) => EFF.some((e) => Math.abs(cases[c][e]) > 1e-12);
    const active = VAR.filter(isActive);
    const seis = SEIS.filter(isActive);
    const catH = (c) => (c === 'Q1' || c === 'Q2') && s.categories[c] === 'Cat. H';
    const forbidden = (set) => (set.some(catH) && set.some((c) => c === 'S' || WIND.includes(c)))
      || WIND.every((w) => set.includes(w));     // vent descendant et soulèvement jamais simultanés
    const list = [];
    const seen = new Set();
    const push = (sit, f) => {
      const key = sit + JSON.stringify(f);
      if (seen.has(key)) return;
      seen.add(key);
      const used = Object.keys(f).filter((c) => f[c]);
      if (forbidden(used)) return;
      list.push({ sit, f });
    };
    const base = (g) => ({ PP: g, G: g, Gf: g });

    // ELU fondamental (6.10)
    const gammas = [1.35];
    if (s.options.gFav !== false && active.some((c) => WIND.includes(c))) gammas.push(1.0);
    gammas.forEach((g) => {
      if (g === 1.35) push('ELU', base(g));
      active.forEach((lead) => {
        subsets(active.filter((c) => c !== lead)).forEach((acc) => {
          const all = [lead].concat(acc);
          if (g === 1.0 && !all.some((c) => WIND.includes(c))) return;
          const f = base(g);
          f[lead] = 1.5;
          acc.forEach((c) => { const p = psiOf(s, c)[0]; if (p > 0) f[c] = 1.5 * p; });
          push('ELU', f);
        });
      });
    });

    // Incendie (6.11b) — uniquement si une durée de stabilité est demandée
    if (num(s.fire.t) > 0) {
      push('FEU', base(1));
      const iLead = s.options.fireLead === 'psi2' ? 2 : 1;
      active.forEach((lead) => {
        const pl = psiOf(s, lead)[iLead];
        if (!(pl > 0)) return;
        subsets(active.filter((c) => c !== lead && psiOf(s, c)[2] > 0)).forEach((acc) => {
          const f = base(1);
          f[lead] = pl;
          acc.forEach((c) => { f[c] = psiOf(s, c)[2]; });
          push('FEU', f);
        });
      });
    }

    // Séisme (6.12b)
    seis.forEach((e) => {
      const f = base(1);
      active.forEach((c) => { const p = psiOf(s, c)[2]; if (p > 0) f[c] = p; });
      f[e] = 1;
      push('SEI', f);
    });

    return { list, active, seis };
  }

  // ---------- calcul principal ----------
  function compute(s) {
    const mat = D.MATERIALS[s.grade] || D.MATERIALS.C24;
    const b = num(s.b), h = num(s.h), L = num(s.L) * 1000;
    const sc = String(s.serviceClass || 1);
    const ksys = num(s.ksys, 1) || 1;
    const gM = D.GAMMA_M[mat.type];
    const betac = mat.type === 'LC' ? 0.1 : 0.2;
    const kfi = mat.type === 'LC' ? 1.15 : 1.25;
    const warnings = [];
    if (!(b > 0 && h > 0)) warnings.push('Section non définie.');
    const E05 = mat.E005 * 1000, E0m = mat.E0mean * 1000;

    const lfy = num(s.lfy) * 1000, lfz = num(s.lfz) * 1000, lef = num(s.lef) * 1000;
    // longueur de déversement quand le moment s'inverse (soulèvement : fibre inférieure comprimée)
    const lefUp = (s.lefUp === undefined || s.lefUp === '' ? num(s.lef) : num(s.lefUp)) * 1000;

    // --- section à froid
    const sec = {
      b, h, A: b * h, Iy: b * h ** 3 / 12, Iz: h * b ** 3 / 12, Wy: b * h * h / 6, Wz: h * b * b / 6,
      khH: kh(mat, h), khB: kh(mat, b), khT: kh(mat, Math.max(b, h))
    };
    const instC = {
      y: kcOf(lfy, h / Math.sqrt(12), mat.fc0k, E05, betac),
      z: kcOf(lfz, b / Math.sqrt(12), mat.fc0k, E05, betac),
      lt: kcritOf(b, h, lef, E05, mat.fmk),
      ltUp: kcritOf(b, h, lefUp, E05, mat.fmk)
    };

    // --- section au feu (méthode de la section réduite, EN 1995-1-2 4.2.2)
    const t = num(s.fire.t);
    const k0 = Math.min(t / 20, 1);
    const dchar = mat.betan * t;
    const def = t > 0 ? dchar + k0 * D0 : 0;
    const nB = num(s.fire.facesB), nH = num(s.fire.facesH);
    const bf = Math.max(0, b - nB * def), hf = Math.max(0, h - nH * def);
    const fire = {
      t, k0, dchar, def, bf, hf, kfi, betan: mat.betan,
      A: bf * hf, Wy: bf * hf * hf / 6, Wz: hf * bf * bf / 6, Iy: bf * hf ** 3 / 12, Iz: hf * bf ** 3 / 12,
      E20: kfi * E05, fm20: kfi * mat.fmk, fc20: kfi * mat.fc0k, ft20: kfi * mat.ft0k, fv20: kfi * mat.fvk
    };
    if (t > 0 && (bf <= 0 || hf <= 0)) warnings.push('Section entièrement carbonisée pour la durée demandée.');
    const instF = t > 0 && bf > 0 && hf > 0 ? {
      y: kcOf(lfy, hf / Math.sqrt(12), fire.fc20, fire.E20, betac),
      z: kcOf(lfz, bf / Math.sqrt(12), fire.fc20, fire.E20, betac),
      lt: kcritOf(bf, hf, lef, fire.E20, fire.fm20),
      ltUp: kcritOf(bf, hf, lefUp, fire.E20, fire.fm20)
    } : null;

    // --- sollicitations unitaires
    const U = unitCases(s, mat);
    const uf = UNIT[U.unit] || UNIT.daN;
    const cases = {};
    D.CASES.forEach((c) => {
      const src = U.cases[c.id] || {};
      cases[c.id] = {
        N: num(src.N) * uf.F, My: num(src.My) * uf.M, Mz: num(src.Mz) * uf.M,
        Vz: num(src.Vz) * uf.F, Vy: num(src.Vy) * uf.F
      };
    });

    // --- sens « gravitaire » de My : celui des charges permanentes (sinon positif).
    // Un moment de calcul de signe opposé = moment inversé (soulèvement) → l_ef,inv.
    const myG = GPERM.reduce((a, c) => a + cases[c].My, 0);
    const gSign = myG < 0 ? -1 : 1;

    // --- combinaisons
    const C = buildCombos(s, cases);
    let iE = 0, iF = 0, iS = 0;
    const seisGM = s.options.seisGammaM === 'one' ? 1 : gM;
    const kmodTab = D.KMOD[sc];

    const combos = C.list.map(({ sit, f }) => {
      const used = Object.keys(f).filter((c) => f[c]);
      const eff = { N: 0, My: 0, Mz: 0, Vz: 0, Vy: 0 };
      used.forEach((c) => EFF.forEach((e) => { eff[e] += f[c] * cases[c][e]; }));
      // kmod : action de plus courte durée
      let dur = 'P';
      used.forEach((c) => { const d = durationOf(s, c); if (D.DUR_RANK[d] > D.DUR_RANK[dur]) dur = d; });
      let kmod, gamma, S, inst, fv, khH, khB, khT, fk;
      if (sit === 'FEU') {
        kmod = 1; gamma = 1; S = fire; inst = instF; khH = khB = khT = 1;
        fk = { fm: fire.fm20, ft: fire.ft20, fc: fire.fc20, fv: fire.fv20 };
      } else {
        kmod = sit === 'SEI' ? num(s.options.seisKmod, 1.1) : kmodTab[dur];
        gamma = sit === 'SEI' ? seisGM : gM;
        S = sec; inst = instC; khH = sec.khH; khB = sec.khB; khT = sec.khT;
        fk = { fm: mat.fmk, ft: mat.ft0k, fc: mat.fc0k, fv: mat.fvk };
      }
      const r = kmod / gamma;
      const fd = {
        t: fk.ft * khT * r, c: fk.fc * r, my: fk.fm * khH * ksys * r, mz: fk.fm * khB * ksys * r, v: fk.fv * r
      };
      // kcr (6.1.7 + AN française)
      let kcr = 1;
      if (s.options.kcrMode && s.options.kcrMode !== 'auto') kcr = num(s.options.kcrMode, 1);
      else {
        if (sc === '3') kcr = 0.67;
        else if (mat.type === 'massif' && Math.max(b, h) > 150) kcr = 0.67;
        else if (sc === '2' && mat.type === 'LC') {
          const vg = Math.hypot(...['Vz', 'Vy'].map((e) => GPERM.reduce((a, c) => a + f[c] * cases[c][e] || a, 0)));
          const vq = Math.hypot(...['Vz', 'Vy'].map((e) => VAR.concat(SEIS).reduce((a, c) => a + (f[c] || 0) * cases[c][e], 0)));
          kcr = vg + vq > 0 && vg / (vg + vq) >= 0.7 ? 0.67 : 1;
        }
      }
      const A = S.A || 1e-9;
      const sN = Math.abs(eff.N) / A;
      const comp = eff.N > 1e-9, tens = eff.N < -1e-9;
      const smy = Math.abs(eff.My) / (S.Wy || 1e-9);
      const smz = Math.abs(eff.Mz) / (S.Wz || 1e-9);
      const V = Math.hypot(eff.Vz, eff.Vy);
      const tau = sit === 'FEU' ? 0 : 1.5 * V / (kcr * S.A || 1e-9);
      const R = {};
      const m11 = smy / fd.my + KM * smz / fd.mz;
      const m12 = KM * smy / fd.my + smz / fd.mz;
      if (tens) R.t = sN / fd.t;
      if (comp) R.c = sN / fd.c;
      R.m11 = m11; R.m12 = m12;
      if (sit !== 'FEU') R.v = tau / fd.v;
      if (tens) { R.tm11 = R.t + m11; R.tm12 = R.t + m12; }
      if (comp) {
        R.cm19 = R.c * R.c + m11; R.cm20 = R.c * R.c + m12;
        R.b23 = sN / (inst.y.kc * fd.c) + m11;
        R.b24 = sN / (inst.z.kc * fd.c) + m12;
      }
      const reversed = eff.My * gSign < -1e-9;
      const ltI = reversed ? inst.ltUp : inst.lt;
      const lt = smy / (ltI.kcrit * fd.my);
      const kz = s.options.devMz !== false ? smz / fd.mz : 0;
      const k33 = reversed ? 'lt33u' : 'lt33', k35 = reversed ? 'lt35u' : 'lt35';
      R[k33] = lt + kz;
      if (comp) R[k35] = lt * lt + sN / (inst.z.kc * fd.c) + kz;
      let max = 0, gov = null;
      Object.keys(R).forEach((k) => { if (Number.isFinite(R[k]) && R[k] > max) { max = R[k]; gov = k; } });
      if (sit === 'FEU' && (fire.bf <= 0 || fire.hf <= 0)) { max = Infinity; gov = 'char'; }
      const id = sit === 'ELU' ? ++iE : sit === 'FEU' ? ++iF : ++iS;
      return {
        id: (sit === 'ELU' ? 'ELU ' : sit === 'FEU' ? 'FEU ' : 'SEI ') + String(id).padStart(2, '0'),
        sit, f, label: comboLabel(f), dur, kmod, gamma, kcr, eff, stress: { sN, smy, smz, tau, comp, tens },
        reversed, kcrit: ltI.kcrit,
        fd, R, max, gov
      };
    });

    // --- enveloppes par situation et par critère
    const env = {};
    ['ELU', 'FEU', 'SEI'].forEach((sit) => {
      const cs = combos.filter((c) => c.sit === sit);
      if (!cs.length) { env[sit] = null; return; }
      const worst = cs.reduce((a, c) => (c.max > a.max ? c : a), cs[0]);
      const byCrit = {};
      cs.forEach((c) => Object.keys(c.R).forEach((k) => {
        if (!byCrit[k] || c.R[k] > byCrit[k].r) byCrit[k] = { r: c.R[k], combo: c };
      }));
      env[sit] = { worst, max: worst.max, byCrit, n: cs.length };
    });

    // --- ELS : flèches (approche poutre bi-articulée sous charge répartie, ou saisie)
    const kdef = D.KDEF[sc];
    const uCase = {};
    const sls = s.sls || {};
    const Lsls = (num(sls.Lref) || num(s.L)) * 1000;
    D.CASES.forEach((c) => {
      if (sls.mode === 'input') {
        uCase[c.id] = { y: num(sls.uy && sls.uy[c.id]), z: num(sls.uz && sls.uz[c.id]) };
      } else {
        uCase[c.id] = {
          y: cases[c.id].My * Lsls * Lsls / (9.6 * E0m * sec.Iy),
          z: cases[c.id].Mz * Lsls * Lsls / (9.6 * E0m * sec.Iz)
        };
      }
    });
    const varAct = VAR.filter((c) => uCase[c].y !== 0 || uCase[c].z !== 0);
    // Enveloppe signée : pour chaque sens (+/−) et chaque action dominante, les actions
    // d'accompagnement ne sont retenues que si elles aggravent la flèche dans ce sens ;
    // W↓ et W↑ ne sont jamais cumulés. On garde la flèche de plus grande valeur absolue.
    function slsDir(dir) {
      const g = GPERM.reduce((a, c) => a + uCase[c][dir], 0);
      const gBefore = uCase.PP[dir] + uCase.G[dir];
      const best = { winst: 0, wfin: g * (1 + kdef), wact: g * (1 + kdef) - gBefore, lead: null };
      [1, -1].forEach((sg) => {
        [null].concat(varAct).forEach((L1) => {
          let wi = 0, wf = g * (1 + kdef);
          const used = [];
          if (L1) { wi = uCase[L1][dir]; wf += uCase[L1][dir] * (1 + psiOf(s, L1)[2] * kdef); used.push(L1); }
          varAct.forEach((c) => {
            if (c === L1 || (WIND.includes(c) && used.some((u) => WIND.includes(u)))) return;
            const ci = psiOf(s, c)[0] * uCase[c][dir];
            const cf = (psiOf(s, c)[0] + psiOf(s, c)[2] * kdef) * uCase[c][dir];
            if (sg * cf > 0) { wi += ci; wf += cf; used.push(c); }
          });
          if (L1 && sg * wi > Math.abs(best.winst)) best.winst = wi;
          if (sg * wf > Math.abs(best.wfin)) { best.wfin = wf; best.lead = L1; }
          if (sg * (wf - gBefore) > Math.abs(best.wact)) best.wact = wf - gBefore;
        });
      });
      return { winst: best.winst, wfin: best.wfin, wact: best.wact, ginst: g, lead: best.lead };
    }
    const lim = Object.assign({ inst: 300, fin: 250, act: 500 }, sls.limits || {});
    const defl = { y: slsDir('y'), z: slsDir('z') };
    const slsRows = [];
    [['winst', 'inst', 'w_inst(Q)'], ['wfin', 'fin', 'w_fin'], ['wact', 'act', 'w_fin − w_inst(PP+G)']].forEach(([k, l, lbl]) => {
      ['y', 'z'].forEach((dir) => {
        const w = Math.abs(defl[dir][k]);
        const wl = Lsls / num(lim[l], 1);
        slsRows.push({ key: k + dir, label: lbl, dir, w, lim: wl, limRatio: num(lim[l]), ratio: wl > 0 ? w / wl : 0, Lratio: w > 0 ? Lsls / w : Infinity });
      });
    });
    const slsMax = slsRows.reduce((a, r) => Math.max(a, r.ratio), 0);

    return {
      mat, sec, ksys, gM, betac, kfi, kdef, sc, L, lfy, lfz, lef, lefUp, gSign, instC, instF, fire,
      unit: U, cases, uCase, combos, env, sls: { rows: slsRows, max: slsMax, defl, kdef, L: Lsls, mode: sls.mode },
      active: C.active, seis: C.seis, warnings,
      durationOf: (c) => durationOf(s, c), psiOf: (c) => psiOf(s, c)
    };
  }

  const CRITERIA = {
    t: { label: 'Traction axiale', ref: '6.1', f: 'σt,0,d / ft,0,d' },
    c: { label: 'Compression axiale', ref: '6.2', f: 'σc,0,d / fc,0,d' },
    m11: { label: 'Flexion déviée My + km·Mz', ref: '6.11', f: 'σm,y,d/fm,y,d + km·σm,z,d/fm,z,d' },
    m12: { label: 'Flexion déviée km·My + Mz', ref: '6.12', f: 'km·σm,y,d/fm,y,d + σm,z,d/fm,z,d' },
    v: { label: 'Cisaillement', ref: '6.13', f: 'τd / fv,d   (b_ef = kcr·b)' },
    tm11: { label: 'Traction + flexion (My + km·Mz)', ref: '6.17', f: 'σt/ft + σm,y/fm,y + km·σm,z/fm,z' },
    tm12: { label: 'Traction + flexion (km·My + Mz)', ref: '6.18', f: 'σt/ft + km·σm,y/fm,y + σm,z/fm,z' },
    cm19: { label: 'Compression + flexion (My + km·Mz)', ref: '6.19', f: '(σc/fc)² + σm,y/fm,y + km·σm,z/fm,z' },
    cm20: { label: 'Compression + flexion (km·My + Mz)', ref: '6.20', f: '(σc/fc)² + km·σm,y/fm,y + σm,z/fm,z' },
    b23: { label: 'Flambement axe y + flexion', ref: '6.23', f: 'σc/(kc,y·fc) + σm,y/fm,y + km·σm,z/fm,z' },
    b24: { label: 'Flambement axe z + flexion', ref: '6.24', f: 'σc/(kc,z·fc) + km·σm,y/fm,y + σm,z/fm,z' },
    lt33: { label: 'Déversement', ref: '6.33', f: 'σm,y/(kcrit·fm,y) [+ σm,z/fm,z]' },
    lt35: { label: 'Déversement + flambement z', ref: '6.35', f: '(σm,y/(kcrit·fm,y))² + σc/(kc,z·fc) [+ σm,z/fm,z]' },
    lt33u: { label: 'Déversement — moment inversé (soulèvement)', ref: '6.33', f: 'σm,y/(kcrit,inv·fm,y) [+ σm,z/fm,z]' },
    lt35u: { label: 'Déversement inversé + flambement z', ref: '6.35', f: '(σm,y/(kcrit,inv·fm,y))² + σc/(kc,z·fc) [+ σm,z/fm,z]' },
    char: { label: 'Section entièrement carbonisée', ref: 'EN 1995-1-2', f: '—' }
  };

  window.LignumEC5 = { compute, kh, kcOf, kcritOf, CRITERIA, UNIT, num, EFF, VAR, GPERM, SEIS };
})();
