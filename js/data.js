/* ==========================================================================
   Lignum — données normatives
   Propriétés : NF EN 338:2016 (bois massifs) et NF EN 14080:2013 (lamellé-collé),
   reprises de la feuille DONNEES des classeurs d'origine (valeurs contrôlées).
   ========================================================================== */
(function () {
  'use strict';

  // fm, ft0, ft90, fc0, fc90, fv [MPa] · E0mean, E005, E90mean, Gmean [kN/mm²] · rhok, rhomean [kg/m³] · betan [mm/min]
  const COLS = ['fmk', 'ft0k', 'ft90k', 'fc0k', 'fc90k', 'fvk', 'E0mean', 'E005', 'E90mean', 'Gmean', 'rhok', 'rhomean', 'betan'];
  const RAW = {
    // Résineux massifs (EN 338)
    C14: [14, 7.2, 0.4, 16, 2.0, 3.0, 7, 4.7, 0.23, 0.44, 290, 350, 0.8],
    C16: [16, 8.5, 0.4, 17, 2.2, 3.2, 8, 5.4, 0.27, 0.50, 310, 370, 0.8],
    C18: [18, 10, 0.4, 18, 2.2, 3.4, 9, 6.0, 0.30, 0.56, 320, 380, 0.8],
    C20: [20, 11.5, 0.4, 19, 2.3, 3.6, 9.5, 6.4, 0.32, 0.59, 330, 400, 0.8],
    C22: [22, 13, 0.4, 20, 2.4, 3.8, 10, 6.7, 0.33, 0.63, 340, 410, 0.8],
    C24: [24, 14.5, 0.4, 21, 2.5, 4.0, 11, 7.4, 0.37, 0.69, 350, 420, 0.8],
    C27: [27, 16.5, 0.4, 22, 2.5, 4.0, 11.5, 7.7, 0.38, 0.72, 360, 430, 0.8],
    C30: [30, 19, 0.4, 24, 2.7, 4.0, 12, 8.0, 0.40, 0.75, 380, 460, 0.8],
    C35: [35, 22.5, 0.4, 25, 2.7, 4.0, 13, 8.7, 0.43, 0.81, 390, 470, 0.8],
    C40: [40, 26, 0.4, 27, 2.8, 4.0, 14, 9.4, 0.47, 0.88, 400, 480, 0.8],
    C45: [45, 30, 0.4, 29, 2.9, 4.0, 15, 10.1, 0.50, 0.94, 410, 490, 0.8],
    C50: [50, 33.5, 0.4, 30, 3.0, 4.0, 16, 10.7, 0.53, 1.00, 430, 520, 0.8],
    // Feuillus massifs (EN 338)
    D18: [18, 11, 0.6, 18, 4.8, 3.5, 9.5, 8.0, 0.64, 0.59, 475, 570, 0.55],
    D24: [24, 14, 0.6, 21, 4.9, 3.7, 10, 8.4, 0.67, 0.63, 485, 580, 0.55],
    D27: [27, 16, 0.6, 22, 5.1, 3.8, 10.5, 8.8, 0.70, 0.66, 510, 610, 0.55],
    D30: [30, 18, 0.6, 24, 5.3, 3.9, 11, 9.2, 0.73, 0.69, 530, 640, 0.55],
    D35: [35, 21, 0.6, 25, 5.4, 4.1, 12, 10.1, 0.80, 0.75, 540, 650, 0.55],
    D40: [40, 24, 0.6, 27, 5.5, 4.2, 13, 10.9, 0.87, 0.81, 550, 660, 0.55],
    D45: [45, 27, 0.6, 29, 5.8, 4.4, 13.5, 11.3, 0.90, 0.84, 580, 700, 0.55],
    D50: [50, 30, 0.6, 30, 6.2, 4.5, 14, 11.8, 0.93, 0.88, 620, 740, 0.55],
    D55: [55, 33, 0.6, 32, 6.6, 4.7, 15.5, 13.0, 1.03, 0.97, 660, 790, 0.55],
    D60: [60, 36, 0.6, 33, 10.5, 4.8, 17, 14.3, 1.13, 1.06, 700, 840, 0.55],
    D65: [65, 39, 0.6, 35, 11.3, 5.0, 18.5, 15.5, 1.23, 1.16, 750, 900, 0.55],
    D70: [70, 42, 0.6, 36, 12.0, 5.0, 20, 16.8, 1.33, 1.25, 800, 960, 0.55],
    D75: [75, 45, 0.6, 37, 12.8, 5.0, 22, 18.5, 1.47, 1.38, 850, 1020, 0.55],
    D80: [80, 48, 0.6, 38, 13.5, 5.0, 24, 20.2, 1.60, 1.50, 900, 1080, 0.55],
    // Lamellé-collé homogène (EN 14080)
    GL20h: [20, 16, 0.5, 20, 2.5, 3.5, 8.4, 7.0, 0.30, 0.65, 340, 370, 0.7],
    GL22h: [22, 17.6, 0.5, 22, 2.5, 3.5, 10.5, 8.8, 0.30, 0.65, 370, 410, 0.7],
    GL24h: [24, 19.2, 0.5, 24, 2.5, 3.5, 11.5, 9.6, 0.30, 0.65, 385, 420, 0.7],
    GL26h: [26, 20.8, 0.5, 26, 2.5, 3.5, 12.1, 10.1, 0.30, 0.65, 405, 445, 0.7],
    GL28h: [28, 22.4, 0.5, 28, 2.5, 3.5, 12.6, 10.5, 0.30, 0.65, 425, 460, 0.7],
    GL30h: [30, 24, 0.5, 30, 2.5, 3.5, 13.6, 11.3, 0.30, 0.65, 430, 480, 0.7],
    GL32h: [32, 25.6, 0.5, 32, 2.5, 3.5, 14.2, 11.8, 0.30, 0.65, 440, 490, 0.7],
    // Lamellé-collé panaché (EN 14080)
    GL20c: [20, 15, 0.5, 18.5, 2.5, 3.5, 10.4, 8.6, 0.30, 0.65, 355, 390, 0.7],
    GL22c: [22, 16, 0.5, 20, 2.5, 3.5, 10.4, 8.6, 0.30, 0.65, 355, 390, 0.7],
    GL24c: [24, 17, 0.5, 21.5, 2.5, 3.5, 11, 9.1, 0.30, 0.65, 365, 400, 0.7],
    GL26c: [26, 19, 0.5, 23.5, 2.5, 3.5, 12, 10.0, 0.30, 0.65, 385, 420, 0.7],
    GL28c: [28, 19.5, 0.5, 24, 2.5, 3.5, 12.5, 10.4, 0.30, 0.65, 390, 420, 0.7],
    GL30c: [30, 19.5, 0.5, 24.5, 2.5, 3.5, 13, 10.8, 0.30, 0.65, 390, 430, 0.7],
    GL32c: [32, 19.5, 0.5, 24.5, 2.5, 3.5, 13.5, 11.2, 0.30, 0.65, 400, 440, 0.7]
  };

  const MATERIALS = {};
  Object.keys(RAW).forEach((k) => {
    const o = { name: k };
    COLS.forEach((c, i) => { o[c] = RAW[k][i]; });
    o.family = k[0] === 'C' ? 'Résineux massif' : k[0] === 'D' ? 'Feuillu massif' : (k.endsWith('h') ? 'Lamellé-collé homogène' : 'Lamellé-collé panaché');
    o.type = k.startsWith('GL') ? 'LC' : 'massif';
    MATERIALS[k] = o;
  });

  const GROUPS = [
    ['Résineux massifs (EN 338)', ['C14', 'C16', 'C18', 'C20', 'C22', 'C24', 'C27', 'C30', 'C35', 'C40', 'C45', 'C50']],
    ['Feuillus massifs (EN 338)', ['D18', 'D24', 'D27', 'D30', 'D35', 'D40', 'D45', 'D50', 'D55', 'D60', 'D65', 'D70', 'D75', 'D80']],
    ['Lamellé-collé homogène (EN 14080)', ['GL20h', 'GL22h', 'GL24h', 'GL26h', 'GL28h', 'GL30h', 'GL32h']],
    ['Lamellé-collé panaché (EN 14080)', ['GL20c', 'GL22c', 'GL24c', 'GL26c', 'GL28c', 'GL30c', 'GL32c']]
  ];

  // kmod — EN 1995-1-1 tableau 3.1 (bois massif et lamellé-collé)
  const DURATIONS = [
    ['P', 'Permanente'], ['LT', 'Long terme'], ['MT', 'Moyen terme'], ['CT', 'Court terme'], ['I', 'Instantanée']
  ];
  const DUR_RANK = { P: 0, LT: 1, MT: 2, CT: 3, I: 4 };
  const KMOD = {
    1: { P: 0.6, LT: 0.7, MT: 0.8, CT: 0.9, I: 1.1 },
    2: { P: 0.6, LT: 0.7, MT: 0.8, CT: 0.9, I: 1.1 },
    3: { P: 0.5, LT: 0.55, MT: 0.65, CT: 0.7, I: 0.9 }
  };
  // kdef — EN 1995-1-1 tableau 3.2
  const KDEF = { 1: 0.6, 2: 0.8, 3: 2.0 };
  // γM — EN 1995-1-1 tableau 2.3 + AN française
  const GAMMA_M = { massif: 1.3, LC: 1.25 };

  // ψ — NF EN 1990 tableau A1.1 + AN
  const CATEGORIES = {
    'Cat. A': { label: 'A — habitation', psi: [0.7, 0.5, 0.3], dur: 'MT' },
    'Cat. B': { label: 'B — bureaux', psi: [0.7, 0.5, 0.3], dur: 'MT' },
    'Cat. C': { label: 'C — lieux de réunion', psi: [0.7, 0.7, 0.6], dur: 'MT' },
    'Cat. D': { label: 'D — commerces', psi: [0.7, 0.7, 0.6], dur: 'MT' },
    'Cat. E': { label: 'E — stockage', psi: [1.0, 0.9, 0.8], dur: 'LT' },
    'Cat. F': { label: 'F — véhicules ≤ 30 kN', psi: [0.7, 0.7, 0.6], dur: 'MT' },
    'Cat. G': { label: 'G — véhicules 30–160 kN', psi: [0.7, 0.5, 0.3], dur: 'MT' },
    'Cat. H': { label: 'H — toitures', psi: [0, 0, 0], dur: 'CT' }
  };
  const PSI_SNOW = { low: [0.5, 0.2, 0], high: [0.7, 0.5, 0.2] }; // altitude ≤ 1000 m / > 1000 m
  const PSI_WIND = [0.6, 0.2, 0];

  // Cas de charge unitaires
  const CASES = [
    { id: 'PP', label: 'PP', title: 'Poids propre', kind: 'G' },
    { id: 'G', label: 'G', title: 'Permanentes (avant éléments fragiles)', kind: 'G' },
    { id: 'Gf', label: 'G fragile', title: 'Permanentes posées après les éléments fragiles (cloisons, carrelage…)', kind: 'G' },
    { id: 'Q1', label: 'Q1', title: "Exploitation n°1", kind: 'Q' },
    { id: 'Q2', label: 'Q2', title: "Exploitation n°2", kind: 'Q' },
    { id: 'S', label: 'S', title: 'Neige', kind: 'Q' },
    { id: 'W', label: 'W↓', title: 'Vent descendant (pression)', kind: 'Q' },
    { id: 'Wu', label: 'W↑', title: 'Vent de soulèvement (dépression)', kind: 'Q' },
    { id: 'EXp', label: 'EX+', title: 'Séisme X+', kind: 'E' },
    { id: 'EXm', label: 'EX−', title: 'Séisme X−', kind: 'E' },
    { id: 'EYp', label: 'EY+', title: 'Séisme Y+', kind: 'E' },
    { id: 'EYm', label: 'EY−', title: 'Séisme Y−', kind: 'E' }
  ];
  const EFFECTS = [
    { id: 'N', label: 'Fx', title: 'Effort normal (+ = compression)', unit: 'F' },
    { id: 'My', label: 'My', title: 'Moment axe fort', unit: 'M' },
    { id: 'Mz', label: 'Mz', title: 'Moment axe faible', unit: 'M' },
    { id: 'Vz', label: 'Vz', title: 'Effort tranchant axe fort', unit: 'F' },
    { id: 'Vy', label: 'Vy', title: 'Effort tranchant axe faible', unit: 'F' }
  ];

  window.LIGNUM_DATA = {
    MATERIALS, GROUPS, DURATIONS, DUR_RANK, KMOD, KDEF, GAMMA_M,
    CATEGORIES, PSI_SNOW, PSI_WIND, CASES, EFFECTS
  };
})();
