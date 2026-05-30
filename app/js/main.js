/* ===========================================
   エコノフリ / eco nofuri — メインJS
   ===========================================
   - ファイル投入の受け取り
   - file-processor で表面Canvas化
   - dummy-engine で裏ダミー生成
   - pdf-builder で表裏交互PDFを組立
   - 結果一覧の表示と印刷・保存
*/

(function() {
  'use strict';

  // 直近の生成結果（再生成用に表ページCanvasを保持）
  const state = {
    results: [],         // { name, kind, canvases, blobUrl, pageCount }
    density: 'normal',
    skippedNames: [],
    lastEscAt: 0,
  };

  document.addEventListener('DOMContentLoaded', () => {
    setupLangSwitch();
    setupDropzone();
    setupOverlayDropzone();
    setupPaste();
    setupResultsControls();
    setupEscHint();
    setupHotkey();
    setupHeaderButtons();
    setupShareX();
    setupLogoClick();
    setupOverlays();
    // 言語切替後にシェアURLも更新する
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => setTimeout(updateShareXUrl, 50));
    });
  });

  /* ---- 状態管理 ---- */
  function setAppState(s) {
    document.body.dataset.appState = s; // 'landing' | 'results'
  }

  function setupLogoClick() {
    const logo = document.getElementById('logo-small');
    if (!logo) return;
    logo.addEventListener('click', () => {
      setAppState('landing');
      window.scrollTo(0, 0);
    });
  }

  /* ---- Overlay 制御 ---- */
  function openOverlay(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('active');
    el.setAttribute('aria-hidden', 'false');
  }
  function closeOverlay(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('active');
    el.setAttribute('aria-hidden', 'true');
    if (id === 'preview-overlay') {
      _previewState = { entry: null, index: 0 };
    }
  }
  function setupOverlays() {
    setupPreviewNav();
    // 各overlayの閉じるボタン
    document.getElementById('howto-close')?.addEventListener('click', () => closeOverlay('howto-overlay'));
    document.getElementById('dropzone-overlay-close')?.addEventListener('click', () => closeOverlay('dropzone-overlay'));
    document.getElementById('preview-close')?.addEventListener('click', () => closeOverlay('preview-overlay'));
    // 背景クリックで閉じる
    ['howto-overlay', 'dropzone-overlay', 'preview-overlay'].forEach(id => {
      const el = document.getElementById(id);
      el?.addEventListener('click', (e) => {
        if (e.target === el) closeOverlay(id);
      });
    });
    // Escで閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ['howto-overlay', 'dropzone-overlay', 'preview-overlay'].forEach(id => {
          if (document.getElementById(id)?.classList.contains('active')) closeOverlay(id);
        });
      }
    });
  }

  /* ---- Xシェアボタン ---- */
  function setupShareX() {
    updateShareXUrl();
  }

  function updateShareXUrl() {
    const links = document.querySelectorAll('.share-x-link');
    if (!links.length) return;
    const lang = document.documentElement.dataset.lang || 'ja';
    const dict = window.EconofuriI18n?.I18N?.[lang] || {};
    const text = dict.shareText || 'エコノフリ';
    const hashtags = dict.shareHashtags || '';
    // 公開後は実URLに差し替え（暫定で window.location.href ベース）
    const url = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({ text, url, hashtags });
    const href = `https://twitter.com/intent/tweet?${params.toString()}`;
    links.forEach(a => a.href = href);
  }

  /* ---- 言語切替 ---- */
  function setupLangSwitch() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        if (window.EconofuriI18n && lang) {
          window.EconofuriI18n.applyLang(lang);
        }
      });
    });
  }

  /* ---- ドロップエリア（landing 側） ---- */
  function setupDropzone() {
    bindDropzone(document.getElementById('dropzone'), document.getElementById('file-input'));
  }
  /* overlay 側の追加用ドロップ */
  function setupOverlayDropzone() {
    bindDropzone(document.getElementById('dropzone-overlay-inner'), document.getElementById('file-input-overlay'), () => closeOverlay('dropzone-overlay'));
  }
  function bindDropzone(dz, input, onDone) {
    if (!dz || !input) return;
    dz.addEventListener('click', () => input.click());
    dz.addEventListener('dragover', (e) => {
      e.preventDefault();
      dz.classList.add('dragover');
    });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', async (e) => {
      e.preventDefault();
      dz.classList.remove('dragover');
      const files = await collectFiles(e.dataTransfer);
      await handleFiles(files);
      if (onDone) onDone();
    });
    input.addEventListener('change', async () => {
      await handleFiles(Array.from(input.files || []));
      input.value = '';
      if (onDone) onDone();
    });
  }

  async function collectFiles(dt) {
    if (!dt) return [];
    if (dt.items && typeof dt.items[0]?.webkitGetAsEntry === 'function') {
      const entries = [];
      for (const item of dt.items) {
        const entry = item.webkitGetAsEntry?.();
        if (entry) entries.push(entry);
      }
      const arrs = await Promise.all(entries.map(readEntry));
      return arrs.flat();
    }
    return Array.from(dt.files || []);
  }

  function readEntry(entry) {
    return new Promise(resolve => {
      if (entry.isFile) {
        entry.file(f => resolve([f]), () => resolve([]));
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        reader.readEntries(items => {
          const files = items.filter(i => i.isFile);
          Promise.all(files.map(f => new Promise(r => f.file(r, () => r(null)))))
            .then(arr => resolve(arr.filter(Boolean)));
        }, () => resolve([]));
      } else {
        resolve([]);
      }
    });
  }

  /* ---- 貼り付け欄 ---- */
  function setupPaste() {
    const btn = document.getElementById('btn-paste-add');
    const ta = document.getElementById('paste-text');
    if (!btn || !ta) return;
    btn.addEventListener('click', async () => {
      const text = ta.value.trim();
      if (!text) return;
      const startedAt = performance.now();
      showProcessing('1 / 1');
      showResultsArea();
      const result = window.EconofuriFileProcessor.processPastedText(text);
      ta.value = '';
      await processResults([result]);
      hideProcessing();
      appendElapsed(Math.round(performance.now() - startedAt));
    });
  }

  /* ---- 結果エリアのコントロール ---- */
  function setupResultsControls() {
    const sel = document.getElementById('density-select');
    if (sel) sel.addEventListener('change', () => { state.density = sel.value; });
    const regen = document.getElementById('btn-regenerate');
    if (regen) regen.addEventListener('click', () => regenerateAll());
    const printAll = document.getElementById('btn-print-all');
    if (printAll) printAll.addEventListener('click', () => printAllResults());
    const addBtn = document.getElementById('btn-add-file');
    if (addBtn) addBtn.addEventListener('click', () => openOverlay('dropzone-overlay'));
  }

  /* ---- 投入されたファイルを処理 ---- */
  async function handleFiles(files) {
    if (!files || !files.length) return;
    const startedAt = performance.now();
    state.startedAt = startedAt;
    state.targetCount = files.length;
    state.processedCount = 0;
    showProcessing(`0 / ${files.length}`);
    showResultsArea();

    const processed = [];
    for (const file of files) {
      const r = await window.EconofuriFileProcessor.processFile(file);
      processed.push(r);
      state.processedCount++;
      showProcessing(`${state.processedCount} / ${files.length}`);
    }
    await processResults(processed);
    hideProcessing();
    const elapsed = Math.round(performance.now() - startedAt);
    appendElapsed(elapsed);
  }

  function showProcessing(sub) {
    const ov = document.getElementById('processing-overlay');
    if (ov) {
      ov.classList.add('active');
      ov.setAttribute('aria-hidden', 'false');
    }
    const subEl = document.getElementById('processing-sub');
    if (subEl) subEl.textContent = sub || '';
  }
  function hideProcessing() {
    const ov = document.getElementById('processing-overlay');
    if (ov) {
      ov.classList.remove('active');
      ov.setAttribute('aria-hidden', 'true');
    }
  }

  function appendElapsed(ms) {
    const cur = document.getElementById('results-status')?.textContent || '';
    setStatus(cur + `  (${formatMs(ms)})`);
  }
  function formatMs(ms) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  /* ---- 処理結果（成功+失敗まじり）を一覧化＆PDF化 ---- */
  async function processResults(results) {
    showResultsArea();
    let added = 0;
    for (const r of results) {
      if (!r.ok) {
        state.skippedNames.push(r.name);
        continue;
      }
      const seed = Math.floor(Math.random() * 1e9);
      const { pdfBytes, backCanvases } = await window.EconofuriPdfBuilder.buildAlternatingPdf(
        r.canvases,
        { density: state.density, baseSeed: seed }
      );
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const entry = {
        name: r.name,
        kind: r.kind,
        canvases: r.canvases,
        backCanvases,
        blobUrl: url,
        pageCount: r.canvases.length,
        seed,
      };
      state.results.push(entry);
      renderResultItem(entry);
      added++;
    }
    updateCount();
    updateStatusFinal();
    // mini-mode の結果リストも更新
    if (document.body.classList.contains('mini-mode')) renderMiniResults();
    if (document.body.classList.contains('camouflage-active')) renderCamouflageRows();
  }

  /* ---- 結果リスト DOM ---- */
  function renderResultItem(entry) {
    const list = document.getElementById('results-list');
    if (!list) return;
    const el = document.createElement('div');
    el.className = 'result-item';
    el.innerHTML = `
      <div class="result-icon ${'kind-' + entry.kind}">${kindIcon(entry.kind)}</div>
      <div class="result-info">
        <div class="result-name"></div>
        <div class="result-meta">
          <span class="result-pages"></span>
          <span class="result-kind"></span>
        </div>
      </div>
      <div class="result-actions">
        <button class="btn-secondary" data-act="preview"><span data-i18n="preview">表示</span></button>
        <button class="btn-secondary" data-act="print"><span data-i18n="print">印刷</span></button>
        <button class="btn-secondary" data-act="save"><span data-i18n="save">PDFを保存</span></button>
      </div>
    `;
    el.querySelector('.result-name').textContent = entry.name;
    el.querySelector('.result-pages').textContent = `${entry.pageCount * 2}${t('pageUnit')}（${entry.pageCount}表＋${entry.pageCount}裏）`;
    el.querySelector('.result-kind').textContent = t('kind' + entry.kind.charAt(0).toUpperCase() + entry.kind.slice(1));
    el.querySelector('[data-act="preview"]').addEventListener('click', () => previewOne(entry));
    el.querySelector('[data-act="print"]').addEventListener('click', () => printOne(entry));
    el.querySelector('[data-act="save"]').addEventListener('click', () => saveOne(entry));
    list.appendChild(el);

    // i18n 再適用（追加要素にも反映）
    if (window.EconofuriI18n) {
      const lang = document.documentElement.dataset.lang || 'ja';
      window.EconofuriI18n.applyLang(lang);
    }
  }

  function kindIcon(kind) {
    const color = kind === 'pdf' ? '#E54B4B' : kind === 'image' ? '#5BA060' : '#C8A23A';
    return `<svg viewBox="0 0 24 24" width="28" height="28">
      <path d="M6 2 H14 L20 8 V22 H6 Z" fill="${color}" opacity="0.15" stroke="${color}" stroke-width="1.6"/>
      <path d="M14 2 V8 H20" fill="none" stroke="${color}" stroke-width="1.6"/>
    </svg>`;
  }

  function updateCount() {
    const c = document.getElementById('results-count');
    if (c) c.textContent = String(state.results.length);
  }

  function setStatus(msg) {
    const el = document.getElementById('results-status');
    if (el) el.textContent = msg;
  }

  function updateStatusFinal() {
    const done = state.results.length;
    const skipped = state.skippedNames.length;
    let msg = `${done}${t('completedMsg')}`;
    if (skipped > 0) msg += ` / ${skipped}${t('skippedMsg')}`;
    setStatus(msg);
  }

  function showResultsArea() {
    const r = document.getElementById('results');
    if (r) r.classList.remove('hidden');
    // 結果画面状態に遷移（中央ロゴ・ミニ図解・3カラム・ドロップゾーンが消える）
    setAppState('results');
    setTimeout(() => {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (e) {
        window.scrollTo(0, 0);
      }
    }, 100);
  }

  function t(key) {
    const lang = document.documentElement.dataset.lang || 'ja';
    return (window.EconofuriI18n?.I18N?.[lang]?.[key]) ?? key;
  }

  /* ---- 表示（表+裏 Canvas 横並び＋ページナビ） ---- */
  let _previewState = { entry: null, index: 0 };

  function previewOne(entry) {
    _previewState = { entry, index: 0 };
    document.getElementById('preview-name').textContent = entry.name;
    // 濃度ドロップダウンを現状濃度に同期
    const dsel = document.getElementById('preview-density-select');
    if (dsel) dsel.value = state.density;
    renderPreviewPage();
    openOverlay('preview-overlay');
  }

  function renderPreviewPage() {
    const { entry, index } = _previewState;
    if (!entry) return;
    const front = entry.canvases[index];
    const back = entry.backCanvases?.[index];
    drawToPreviewCanvas('preview-canvas-front', front);
    drawToPreviewCanvas('preview-canvas-back', back);
    const ind = document.getElementById('preview-indicator');
    if (ind) ind.textContent = `${index + 1} / ${entry.pageCount}`;
    const footer = document.getElementById('preview-footer');
    if (footer) footer.style.display = entry.pageCount > 1 ? '' : 'none';
    document.getElementById('preview-prev').disabled = index === 0;
    document.getElementById('preview-next').disabled = index >= entry.pageCount - 1;
  }

  function drawToPreviewCanvas(targetId, srcCanvas) {
    const dst = document.getElementById(targetId);
    if (!dst || !srcCanvas) return;
    dst.width = srcCanvas.width;
    dst.height = srcCanvas.height;
    const ctx = dst.getContext('2d');
    ctx.drawImage(srcCanvas, 0, 0);
  }

  function setupPreviewNav() {
    document.getElementById('preview-prev')?.addEventListener('click', previewPrev);
    document.getElementById('preview-next')?.addEventListener('click', previewNext);
    // 矢印キー左右でページ送り
    document.addEventListener('keydown', (e) => {
      if (!document.getElementById('preview-overlay')?.classList.contains('active')) return;
      // 入力要素にフォーカスがある場合はスキップ
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); previewPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); previewNext(); }
    });
    // 裏面のみ再作成
    document.getElementById('preview-regen')?.addEventListener('click', () => regenerateBackOnly());
    // 濃度ドロップダウン変更
    document.getElementById('preview-density-select')?.addEventListener('change', (e) => {
      // 選んだだけでは再生成しない。「裏を再作成」を押した時に使う
    });
  }

  function previewPrev() {
    if (_previewState.entry && _previewState.index > 0) {
      _previewState.index--;
      renderPreviewPage();
    }
  }
  function previewNext() {
    if (_previewState.entry && _previewState.index < _previewState.entry.pageCount - 1) {
      _previewState.index++;
      renderPreviewPage();
    }
  }

  /* 裏面のみ再生成（プレビュー画面から） */
  async function regenerateBackOnly() {
    const entry = _previewState.entry;
    if (!entry) return;
    const density = document.getElementById('preview-density-select')?.value || state.density;
    const btn = document.getElementById('preview-regen');
    const icon = btn?.querySelector('.preview-regen-icon');
    if (btn) btn.disabled = true;
    if (icon) icon.classList.add('spinning');
    try {
      const newSeed = Math.floor(Math.random() * 1e9);
      const { pdfBytes, backCanvases } = await window.EconofuriPdfBuilder.buildAlternatingPdf(
        entry.canvases,
        { density, baseSeed: newSeed }
      );
      URL.revokeObjectURL(entry.blobUrl);
      entry.backCanvases = backCanvases;
      entry.seed = newSeed;
      entry.blobUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
      renderPreviewPage();
    } finally {
      if (btn) btn.disabled = false;
      if (icon) icon.classList.remove('spinning');
    }
  }

  function printOne(entry) {
    const w = window.open(entry.blobUrl, '_blank');
    if (!w) return;
    w.addEventListener('load', () => {
      setTimeout(() => { try { w.print(); } catch (e) {} }, 400);
    });
  }

  function saveOne(entry) {
    const a = document.createElement('a');
    a.href = entry.blobUrl;
    a.download = entry.name.replace(/\.[^.]+$/, '') + '_eco.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function printAllResults() {
    state.results.forEach((entry, i) => {
      setTimeout(() => printOne(entry), i * 500);
    });
  }

  async function regenerateAll() {
    // 既存結果の表ページを使って、現在の濃度で裏ダミーを作り直す
    const items = state.results.slice();
    const list = document.getElementById('results-list');
    // 「再生成中…」ラベルに置換（一度クリアして同数のプレースホルダ）
    list.innerHTML = '';
    items.forEach(it => {
      const el = document.createElement('div');
      el.className = 'result-item result-item-regenerating';
      el.innerHTML = `
        <div class="result-icon">${kindIcon(it.kind)}</div>
        <div class="result-info">
          <div class="result-name regenerating"></div>
          <div class="result-meta"><span></span></div>
        </div>
      `;
      el.querySelector('.result-name').textContent = `${it.name}  ${t('regenerating')}`;
      list.appendChild(el);
    });
    state.results = [];
    setStatus(t('processing'));
    const startedAt = performance.now();
    for (const item of items) {
      URL.revokeObjectURL(item.blobUrl);
      const newSeed = Math.floor(Math.random() * 1e9);
      const { pdfBytes, backCanvases } = await window.EconofuriPdfBuilder.buildAlternatingPdf(
        item.canvases,
        { density: state.density, baseSeed: newSeed }
      );
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const entry = { ...item, blobUrl: url, backCanvases, seed: newSeed };
      state.results.push(entry);
    }
    // プレースホルダを破棄して本物を描画し直す
    list.innerHTML = '';
    state.results.forEach(renderResultItem);
    updateCount();
    updateStatusFinal();
    appendElapsed(Math.round(performance.now() - startedAt));
  }

  /* ---- Escヒント / Esc2連打 ---- */
  function setupEscHint() {
    const closeBtn = document.getElementById('esc-close');
    const hint = document.getElementById('esc-hint');
    if (closeBtn && hint) {
      closeBtn.addEventListener('click', () => hint.classList.add('hidden'));
    }
  }

  function setupHotkey() {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const now = Date.now();
      if (now - state.lastEscAt < 400) {
        toggleCamouflage();
        state.lastEscAt = 0;
      } else {
        state.lastEscAt = now;
      }
    });
  }

  function toggleCamouflage(force) {
    const willBe = typeof force === 'boolean' ? force : !document.body.classList.contains('camouflage-active');
    document.body.classList.toggle('camouflage-active', willBe);
    const cam = document.getElementById('cam-mode');
    if (cam) cam.setAttribute('aria-hidden', willBe ? 'false' : 'true');
    if (willBe) renderCamouflageRows();
  }

  function renderCamouflageRows() {
    const list = document.getElementById('cam-rows');
    if (!list) return;
    list.innerHTML = '';
    if (!state.results.length) {
      // 空のセル群でそれっぽく見せる
      for (let i = 0; i < 12; i++) {
        const row = document.createElement('div');
        row.className = 'cam-row';
        row.innerHTML = `<div class="cam-cell cam-rownum">${i + 2}</div>` + '<div class="cam-cell"></div>'.repeat(8);
        list.appendChild(row);
      }
      return;
    }
    state.results.forEach((entry, idx) => {
      const row = document.createElement('div');
      row.className = 'cam-row';
      const kindLabel = t('kind' + entry.kind.charAt(0).toUpperCase() + entry.kind.slice(1));
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
      row.innerHTML = `
        <div class="cam-cell cam-rownum">${idx + 2}</div>
        <div class="cam-cell"></div>
        <div class="cam-cell">${entry.pageCount * 2}</div>
        <div class="cam-cell">${kindLabel}</div>
        <div class="cam-cell">完了</div>
        <div class="cam-cell"><button data-act="print">印刷</button></div>
        <div class="cam-cell"><button data-act="save">保存</button></div>
        <div class="cam-cell">${time}</div>
        <div class="cam-cell"></div>
      `;
      row.children[1].textContent = entry.name;
      row.querySelector('[data-act="print"]').addEventListener('click', () => printOne(entry));
      row.querySelector('[data-act="save"]').addEventListener('click', () => saveOne(entry));
      list.appendChild(row);
    });
    // 残りの空行
    for (let i = state.results.length; i < 12; i++) {
      const row = document.createElement('div');
      row.className = 'cam-row';
      row.innerHTML = `<div class="cam-cell cam-rownum">${i + 2}</div>` + '<div class="cam-cell"></div>'.repeat(8);
      list.appendChild(row);
    }
  }

  function setupHeaderButtons() {
    const howtoBtn = document.getElementById('btn-howto');
    if (howtoBtn) howtoBtn.addEventListener('click', () => openOverlay('howto-overlay'));
    const settingsBtn = document.getElementById('btn-settings');
    const miniBtn = document.getElementById('btn-mini');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => openOverlay('settings-overlay'));
    }
    setupSettingsPanel();
    if (miniBtn) {
      miniBtn.addEventListener('click', () => toggleMiniMode());
    }
    document.getElementById('mini-panel-expand')?.addEventListener('click', () => toggleMiniMode(false));
    document.getElementById('mini-panel-add')?.addEventListener('click', () => {
      openOverlay('dropzone-overlay');
    });
    document.getElementById('cam-exit')?.addEventListener('click', () => toggleCamouflage(false));
    document.getElementById('settings-close')?.addEventListener('click', () => closeOverlay('settings-overlay'));
    document.getElementById('settings-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'settings-overlay') closeOverlay('settings-overlay');
    });
  }

  /* ---- 設定パネルのロジック ---- */
  const SETTINGS_KEYS = {
    unlock: 'econofuri.unlocked',
    doublePrint: 'econofuri.opt.doublePrint',
    autoPreview: 'econofuri.opt.autoPreview',
  };
  // 解放パスワード（noteの有料記事「キノメノのパスワード」で配布）
  const UNLOCK_PASSWORD = 'efuri';

  function setupSettingsPanel() {
    // 濃度ラジオ
    document.querySelectorAll('input[name="settings-density"]').forEach(r => {
      r.addEventListener('change', () => {
        state.density = r.value;
        const sel = document.getElementById('density-select');
        if (sel) sel.value = r.value;
      });
    });
    // 結果側のセレクト変更を設定側に反映
    const sel = document.getElementById('density-select');
    if (sel) {
      sel.addEventListener('change', () => {
        const radio = document.querySelector(`input[name="settings-density"][value="${sel.value}"]`);
        if (radio) radio.checked = true;
      });
    }

    // 画面モードボタン
    document.querySelectorAll('.settings-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.locked === '1' && !btn.classList.contains('unlocked')) return;
        const mode = btn.dataset.mode;
        applyScreenMode(mode);
        closeOverlay('settings-overlay');
      });
    });

    // 有料解放
    const pwInput = document.getElementById('settings-password');
    const unlockBtn = document.getElementById('settings-unlock-btn');
    const statusEl = document.getElementById('settings-unlock-status');
    if (unlockBtn && pwInput) {
      unlockBtn.addEventListener('click', () => {
        if (pwInput.value === UNLOCK_PASSWORD) {
          localStorage.setItem(SETTINGS_KEYS.unlock, '1');
          applyUnlockState(true);
          statusEl.textContent = t('unlockOk');
          statusEl.className = 'settings-unlock-status ok';
        } else {
          statusEl.textContent = t('unlockFail');
          statusEl.className = 'settings-unlock-status fail';
        }
      });
    }
    applyUnlockState(localStorage.getItem(SETTINGS_KEYS.unlock) === '1');

    // その他オプション
    const dp = document.getElementById('settings-double-print');
    const ap = document.getElementById('settings-auto-preview');
    if (dp) {
      dp.checked = localStorage.getItem(SETTINGS_KEYS.doublePrint) === '1';
      dp.addEventListener('change', () => localStorage.setItem(SETTINGS_KEYS.doublePrint, dp.checked ? '1' : '0'));
    }
    if (ap) {
      ap.checked = localStorage.getItem(SETTINGS_KEYS.autoPreview) === '1';
      ap.addEventListener('change', () => localStorage.setItem(SETTINGS_KEYS.autoPreview, ap.checked ? '1' : '0'));
    }
  }

  function applyScreenMode(mode) {
    document.body.classList.remove('mini-mode', 'camouflage-active');
    if (mode === 'camouflage') toggleCamouflage(true);
    else if (mode === 'mini') toggleMiniMode(true);
    // 'standard' は何もしない（既存UIに戻す）
    // 有料モード（task/mail/filex）は実装無し、解除済みでも当面 alert で代用
    if (['task', 'mail', 'filex'].includes(mode)) {
      alert('このモードは次バージョンで実装予定です。');
    }
  }

  function applyUnlockState(unlocked) {
    document.querySelectorAll('.settings-mode-btn.locked').forEach(btn => {
      btn.classList.toggle('unlocked', !!unlocked);
    });
    state.unlocked = !!unlocked;
  }

  function toggleMiniMode(force) {
    const willBeMini = typeof force === 'boolean' ? force : !document.body.classList.contains('mini-mode');
    document.body.classList.toggle('mini-mode', willBeMini);
    const panel = document.getElementById('mini-panel');
    if (panel) panel.setAttribute('aria-hidden', willBeMini ? 'false' : 'true');
    if (willBeMini) renderMiniResults();
  }

  function renderMiniResults() {
    const list = document.getElementById('mini-panel-results');
    if (!list) return;
    if (!state.results.length) {
      list.innerHTML = `<div class="mini-empty">${t('miniEmpty')}</div>`;
      return;
    }
    list.innerHTML = '';
    state.results.forEach((entry, idx) => {
      const el = document.createElement('div');
      el.className = 'mini-result-item';
      el.innerHTML = `
        <span class="mini-result-name"></span>
        <div class="mini-result-actions">
          <button data-act="preview">${t('preview')}</button>
          <button data-act="print">${t('print')}</button>
        </div>
      `;
      el.querySelector('.mini-result-name').textContent = entry.name;
      el.querySelector('[data-act="preview"]').addEventListener('click', () => previewOne(entry));
      el.querySelector('[data-act="print"]').addEventListener('click', () => printOne(entry));
      list.appendChild(el);
    });
  }

})();
