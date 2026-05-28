/* ===========================================
   エコノフリ / eco nofuri — ファイル投入処理
   ===========================================
   投入されたファイルを「表面」用の Canvas ページ配列に変換する。
   PDFは pdf.js でレンダリング、画像はそのまま描画、txtはテキスト描画。
*/

(function() {
  'use strict';

  // A4 96dpi 相当のCanvasサイズ
  const A4 = { width: 794, height: 1123 };

  const SUPPORTED_IMAGE = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const SUPPORTED_TEXT = ['text/plain'];

  function detectKind(file) {
    const name = (file.name || '').toLowerCase();
    const type = (file.type || '').toLowerCase();
    if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (SUPPORTED_IMAGE.includes(type) || /\.(png|jpe?g|webp)$/i.test(name)) return 'image';
    if (SUPPORTED_TEXT.includes(type) || name.endsWith('.txt')) return 'text';
    return null;
  }

  /* ---- PDF → Canvas配列 ---- */
  async function pdfToCanvases(file) {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('pdf.js が読み込まれていません');
    }
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const canvases = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      // ページの自然サイズを取得し、A4に収まる倍率でレンダリング
      const baseView = page.getViewport({ scale: 1 });
      const scale = Math.min(A4.width / baseView.width, A4.height / baseView.height);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = A4.width;
      canvas.height = A4.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, A4.width, A4.height);
      // ページをCanvas中央に配置
      const offsetX = (A4.width - viewport.width) / 2;
      const offsetY = (A4.height - viewport.height) / 2;
      ctx.translate(offsetX, offsetY);
      await page.render({ canvasContext: ctx, viewport }).promise;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      canvases.push(canvas);
    }
    return canvases;
  }

  /* ---- 画像 → Canvas（1枚） ---- */
  async function imageToCanvas(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const canvas = document.createElement('canvas');
      canvas.width = A4.width;
      canvas.height = A4.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, A4.width, A4.height);
      // アスペクトを維持してA4内に最大表示
      const scale = Math.min(A4.width / img.width, A4.height / img.height) * 0.95;
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (A4.width - w) / 2, (A4.height - h) / 2, w, h);
      return [canvas];
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  /* ---- テキスト → Canvas配列（自動改ページ） ---- */
  async function textToCanvases(file) {
    const text = await file.text();
    return textToCanvasesFromString(text);
  }

  function textToCanvasesFromString(text) {
    const margin = 56;
    const fontSize = 18;
    const lineHeight = fontSize * 1.7;
    const maxWidth = A4.width - margin * 2;
    const maxHeight = A4.height - margin * 2;
    const linesPerPage = Math.floor(maxHeight / lineHeight);

    // 等幅にせず、日本語にも対応する単純な改行
    const measure = document.createElement('canvas').getContext('2d');
    measure.font = `${fontSize}px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif`;

    const wrapped = [];
    const rawLines = text.split(/\r?\n/);
    for (const raw of rawLines) {
      if (raw === '') { wrapped.push(''); continue; }
      let buf = '';
      for (const ch of raw) {
        const w = measure.measureText(buf + ch).width;
        if (w > maxWidth && buf) {
          wrapped.push(buf);
          buf = ch;
        } else {
          buf += ch;
        }
      }
      if (buf) wrapped.push(buf);
    }

    const pages = [];
    for (let i = 0; i < Math.max(1, Math.ceil(wrapped.length / linesPerPage)); i++) {
      const slice = wrapped.slice(i * linesPerPage, (i + 1) * linesPerPage);
      const canvas = document.createElement('canvas');
      canvas.width = A4.width;
      canvas.height = A4.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, A4.width, A4.height);
      ctx.fillStyle = '#1A1A1A';
      ctx.font = `${fontSize}px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif`;
      ctx.textBaseline = 'top';
      slice.forEach((line, idx) => {
        ctx.fillText(line, margin, margin + idx * lineHeight);
      });
      pages.push(canvas);
    }
    return pages;
  }

  /* ---- 統一エントリ ---- */
  async function processFile(file) {
    const kind = detectKind(file);
    if (!kind) return { ok: false, reason: 'unsupported', name: file.name };
    try {
      let canvases;
      if (kind === 'pdf') canvases = await pdfToCanvases(file);
      else if (kind === 'image') canvases = await imageToCanvas(file);
      else if (kind === 'text') canvases = await textToCanvases(file);
      return { ok: true, name: file.name, kind, canvases };
    } catch (e) {
      console.error('[エコノフリ] 処理失敗', file.name, e);
      return { ok: false, reason: 'error', name: file.name, error: e };
    }
  }

  /* ---- 貼り付けテキスト用 ---- */
  function processPastedText(text, name = '貼り付けテキスト.txt') {
    const canvases = textToCanvasesFromString(text);
    return { ok: true, name, kind: 'text', canvases };
  }

  window.EconofuriFileProcessor = {
    A4,
    detectKind,
    processFile,
    processPastedText
  };
})();
