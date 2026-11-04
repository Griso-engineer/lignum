/* ==========================================================================
   Lignum — état par défaut et enregistrement des projets (localStorage).
   Une vérification pèse environ 2 à 4 ko : un navigateur en garde plusieurs
   milliers. Les projets s'exportent / s'importent en fichier .json.
   ========================================================================== */
(function () {
  'use strict';
  const KEY = 'lignum.v1';
  const D = window.LIGNUM_DATA;

  function emptyTable() {
    const t = {};
    D.EFFECTS.forEach((e) => { t[e.id] = {}; D.CASES.forEach((c) => { t[e.id][c.id] = ''; }); });
    return t;
  }
  const loads = () => ({ G: '', Gf: '', Q1: '', Q2: '', S: '', W: '', Wu: '' });

  function defaultState() {
    const direct = emptyTable();
    direct.My.G = 180; direct.My.Gf = 60; direct.My.Q1 = 340; direct.My.S = 0;
    direct.Vz.G = 160; direct.Vz.Gf = 55; direct.Vz.Q1 = 300;
    return {
      v: 1,
      name: 'Solive S1',
      elemType: 'poutre',
      b: 100, h: 275, L: 4.5,
      grade: 'C24', serviceClass: 1, ksys: 1,
      lfy: 4.5, lfz: 4.5, lef: 4.5, lefUp: 4.5, link: { lfy: true, lfz: true, lef: true, lefUp: true },
      fire: { t: 0, facesB: 2, facesH: 1 },
      categories: { Q1: 'Cat. A', Q2: 'Cat. A' },
      altitudeHigh: false,
      durations: { Q1: 'auto', Q2: 'auto', S: 'auto', W: 'auto', Wu: 'auto' },
      options: { gFav: true, fireLead: 'psi1', seisKmod: 1.1, seisGammaM: 'fund', kcrMode: 'auto', devMz: true },
      sls: { mode: 'calc', preset: 'an-courant', shear: true, wc: 0, Lref: '', limits: { inst: 300, netfin: 200, fin: 125, act: 500 }, uy: {}, uz: {} },
      loads: {
        mode: 'direct', unit: 'daN',
        direct,
        poutre: {
          B: 0.5, Bz: 0, strong: Object.assign(loads(), { G: 60, Gf: 50, Q1: 150 }), weak: loads(),
          rampant: 0, rampantUnit: '°', devers: 0, deversUnit: '°',
          facadePas: 0, facadeQ: 0, facadeFragile: false
        },
        poteau: {
          S: 10, G1: 250, nG1: 1, G2: 0, nG2: 0, Gf: 100, nGf: 1, Q1: 150, nQ1: 1, Q2: 0, nQ2: 0, S_: 0, nS: 0,
          H: '', W1: 0, BW1: 0, axW1: 'Y', W2: 0, BW2: 0, axW2: 'Z', Wd: 0, Wu: 0, WuLateral: true
        }
      }
    };
  }

  // fusion profonde : complète un état ancien avec les champs par défaut
  function upgrade(s) {
    const d = defaultState();
    if (s.lefUp === undefined) { s.lefUp = s.lef; if (s.link) s.link.lefUp = !!s.link.lef; }
    // anciennes vérifications : limites 300/250/500 conservées, sans flèche d'effort tranchant
    if (s.sls && s.sls.limits && s.sls.limits.netfin === undefined) {
      s.sls.limits.netfin = '';
      s.sls.preset = 'custom';
      if (s.sls.shear === undefined) s.sls.shear = false;
    }
    (function merge(dst, src) {
      Object.keys(src).forEach((k) => {
        if (dst[k] === undefined) dst[k] = src[k];
        else if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object') merge(dst[k], src[k]);
      });
    })(s, d);
    return s;
  }

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  function load() {
    let db = null;
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
    if (!db || !Array.isArray(db.projects)) db = { projects: [], current: null, draft: null };
    return db;
  }
  function save(db) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; } catch (e) { return false; }
  }
  function usage() {
    try { const s = localStorage.getItem(KEY) || ''; return s.length * 2; } catch (e) { return 0; }
  }

  window.LignumStore = { defaultState, upgrade, load, save, usage, uid, emptyTable };
})();
