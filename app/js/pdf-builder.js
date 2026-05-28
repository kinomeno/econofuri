/* ===========================================
   エコノフリ / eco nofuri — 表裏交互PDF組立
   ===========================================
   表（実ファイル由来のCanvas）と 裏（生成ダミーCanvas）を
   表・裏・表・裏…の順で pdf-lib に積み上げてPDFを返す。
*/

(function() {
  'use strict';

  // A4 size in pdf-lib points (1pt = 1/72 inch)
  const A4_PDF = { width: 595.28, height: 841.89 };

  async function canvasToPngBytes(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) { reject(new Error('canvas toBlob failed')); return; }
        const buf = await blob.arrayBuffer();
        resolve(new Uint8Array(buf));
      }, 'image/png');
    });
  }

  /**
   * 表ページ群と濃度設定から、表裏交互PDFを組み立てる。
   * @param {HTMLCanvasElement[]} frontCanvases
   * @param {object} opts { density, baseSeed }
   * @returns {Promise<{pdfBytes: Uint8Array, backCanvases: HTMLCanvasElement[]}>}
   */
  async function buildAlternatingPdf(frontCanvases, opts = {}) {
    if (typeof PDFLib === 'undefined') {
      throw new Error('pdf-lib が読み込まれていません');
    }
    const density = opts.density || 'normal';
    const baseSeed = opts.baseSeed || Math.floor(Math.random() * 1e9);

    const pdfDoc = await PDFLib.PDFDocument.create();
    const backCanvases = [];

    for (let i = 0; i < frontCanvases.length; i++) {
      const frontCanvas = frontCanvases[i];

      const frontPng = await canvasToPngBytes(frontCanvas);
      const frontImg = await pdfDoc.embedPng(frontPng);
      const frontPage = pdfDoc.addPage([A4_PDF.width, A4_PDF.height]);
      const fScale = Math.min(A4_PDF.width / frontCanvas.width, A4_PDF.height / frontCanvas.height);
      const fW = frontCanvas.width * fScale;
      const fH = frontCanvas.height * fScale;
      frontPage.drawImage(frontImg, {
        x: (A4_PDF.width - fW) / 2,
        y: (A4_PDF.height - fH) / 2,
        width: fW,
        height: fH
      });

      const dummyCanvas = window.EconofuriDummyEngine.generateDummy(
        frontCanvas.width,
        frontCanvas.height,
        { density, seed: baseSeed + i * 1000 + 17 }
      );
      backCanvases.push(dummyCanvas);

      const dummyPng = await canvasToPngBytes(dummyCanvas);
      const dummyImg = await pdfDoc.embedPng(dummyPng);
      const dummyPage = pdfDoc.addPage([A4_PDF.width, A4_PDF.height]);
      dummyPage.drawImage(dummyImg, {
        x: 0, y: 0,
        width: A4_PDF.width, height: A4_PDF.height
      });
    }

    const pdfBytes = await pdfDoc.save();
    return { pdfBytes, backCanvases };
  }

  window.EconofuriPdfBuilder = {
    buildAlternatingPdf
  };
})();
