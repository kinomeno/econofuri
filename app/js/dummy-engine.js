/* ===========================================
   エコノフリ / eco nofuri — 裏ダミー生成エンジン（Ver0.07）
   ===========================================
   独立モジュール。将来 Lv2.5（拡張機能版）／Lv3（exe版）で共有可能。

   設計方針：
   - **裏紙＝ボツ書類の裏面を再利用**。「表と同じ印刷濃度」で読める書類が描画される。
   - 濃度（density）は「黒インクの濃さ」ではなく **要素の量と失敗演出の数** で段階分け。
     全濃度で alpha は同じ（基本 0.95、表と同じはっきり度）。
   - 狂気モードは複数の **印刷大失敗演出** をランダム合成。
   - 多数のパターン関数＋擬似日本語のランダム化で、実質数百〜数千通りの見た目。
*/

(function() {
  'use strict';

  /* ========== コーパス ========== */
  const HIRA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんかすたとほみらんりれろまけしせ';
  const KANJI = '会議資料報告書見積案件状況検討事項対応備考確認実施項目内容詳細結果概要進捗予定担当部門課題追加変更修正資材改善計画提案承認発行通知';
  const KATA = 'システムサーバーデータベースクライアントネットワークレポートマネージャースケジュールプロジェクトミーティングフォルダリソースコンテンツプラットフォーム';

  const DEPARTMENTS = ['総務部', '人事部', '経理部', '営業部', '開発部', '企画部', 'システム部', '調達部', '品質管理部', '法務部', '広報部', '製造部', '管理部', '事業部', '管理本部'];
  const SECTIONS = ['一課', '二課', '三課', '管理課', '企画課', '推進課', '運用課', '営業課', '開発課', '広報課'];
  const HONORIFICS = ['様', '殿', '各位', '部長', '課長'];
  const SUBJECTS = ['について', 'の件', 'に関するご報告', 'のお知らせ', 'のご案内', 'の確認', 'の依頼', 'のご相談', 'の進捗', 'の検討結果'];
  const STAMPS = ['没', '不要', 'DRAFT', '案', '保留', '済', '却下', '再印刷', '社外秘', '至急', '要確認', '差戻し'];

  /* ========== 乱数 ========== */
  function mulberry32(seed) {
    return function() {
      let t = (seed += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function pickN(rnd, arr, n) {
    const copy = arr.slice();
    const out = [];
    for (let i = 0; i < n && copy.length; i++) {
      out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
    }
    return out;
  }
  function pickStr(rnd, str, n) {
    let out = '';
    for (let i = 0; i < n; i++) out += str.charAt(Math.floor(rnd() * str.length));
    return out;
  }
  function pickWord(rnd) {
    const mix = rnd();
    if (mix < 0.4) return pickStr(rnd, KANJI, 2 + Math.floor(rnd() * 3));
    if (mix < 0.75) return pickStr(rnd, KATA, 4 + Math.floor(rnd() * 4));
    return pickStr(rnd, HIRA, 2 + Math.floor(rnd() * 3));
  }
  function pickPhrase(rnd, len) {
    const words = [];
    for (let i = 0; i < len; i++) words.push(pickWord(rnd));
    return words.join('');
  }
  function randDate(rnd) {
    return `${2018 + Math.floor(rnd() * 10)}/${1 + Math.floor(rnd() * 12)}/${1 + Math.floor(rnd() * 28)}`;
  }
  function randDept(rnd) { return pick(rnd, DEPARTMENTS); }
  function randSection(rnd) { return pick(rnd, SECTIONS); }
  function randName(rnd) { return pickStr(rnd, KANJI, 2) + ' ' + pickStr(rnd, KANJI, 2); }
  function randTel(rnd) { return `03-${Math.floor(rnd() * 9000 + 1000)}-${Math.floor(rnd() * 9000 + 1000)}`; }

  /* ========== パターン一覧（描画関数群） ========== */
  const PATTERNS = [
    'memo', 'meeting', 'data', 'graph', 'mail', 'notice', 'fax', 'plain',
    'daily_report', 'weekly_report', 'monthly_report', 'travel_report',
    'leave_request', 'expense_report', 'org_chart', 'flow_chart',
    'checklist', 'invoice', 'quote', 'inventory',
    'schedule_table', 'budget', 'progress_table', 'contract',
    'handwritten_memo', 'handwritten_doc', 'blueprint', 'typo_pop'
  ];

  /* ========== 公開API ========== */
  function generateDummy(width, height, opts = {}) {
    const density = opts.density || 'normal';
    const seed = opts.seed || Math.floor(Math.random() * 1e9);
    const rnd = mulberry32(seed);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const cfg = densityConfig(density);
    if (cfg.alpha <= 0) return canvas;

    const failures = pickFailures(rnd, cfg.failureCount);

    // 主パターン
    const pattern = pick(rnd, PATTERNS);
    drawWithFailures(ctx, width, height, pattern, rnd, cfg, failures);

    // 追加パターン重ね
    for (let k = 0; k < cfg.extraPatterns; k++) {
      const extra = pick(rnd, PATTERNS.filter(p => p !== pattern));
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.translate(width * (0.05 + rnd() * 0.1), height * (0.45 + rnd() * 0.1));
      ctx.rotate((rnd() - 0.5) * 0.3);
      ctx.translate(-width * 0.5, -height * 0.5);
      drawPatternOnly(ctx, width, height, extra, rnd, cfg);
      ctx.restore();
    }

    if (cfg.noise > 0) drawNoise(ctx, width, height, rnd, cfg.noise);
    // スタンプ：濃度に応じて複数個
    if (rnd() < cfg.stampProb) {
      const stampN = Math.max(1, cfg.stampCount || 1);
      for (let s = 0; s < stampN; s++) drawStamp(ctx, width, height, rnd, cfg);
    }

    // 後処理エフェクト
    if (failures.includes('copyUneven')) applyCopyUneven(ctx, width, height, rnd);
    if (failures.includes('rollerLine')) applyRollerLine(ctx, width, height, rnd);
    if (failures.includes('staplerHole')) applyStaplerHole(ctx, width, height, rnd);
    if (failures.includes('fold')) applyFoldShadow(ctx, width, height, rnd);
    if (failures.includes('badFax')) applyBadFax(ctx, width, height, rnd);

    // コピー失敗系が含まれる場合の微妙な傾き（リアリティ向上）
    const copyFailureKeys = ['fold', 'copyUneven', 'rollerLine', 'staplerHole'];
    const hasCopyFailure = failures.some(f => copyFailureKeys.includes(f));
    if (hasCopyFailure) {
      const tilted = document.createElement('canvas');
      tilted.width = width;
      tilted.height = height;
      const tctx = tilted.getContext('2d');
      tctx.fillStyle = '#FFFFFF';
      tctx.fillRect(0, 0, width, height);
      const angle = (rnd() - 0.5) * 0.055; // 約 ±1.6度
      tctx.translate(width / 2, height / 2);
      tctx.rotate(angle);
      tctx.translate(-width / 2, -height / 2);
      tctx.drawImage(canvas, 0, 0);
      return tilted;
    }

    return canvas;
  }

  /* ========== 濃度設定（要素の量と失敗演出数で段階分け） ========== */
  function densityConfig(density) {
    // スタンプは「100枚に1度」が基本。狂気でも控えめ
    switch (density) {
      case 'light':
        return { alpha: 0.95, contentLines: 12, noise: 0.012, stampProb: 0.01, stampCount: 1, ruleProb: 0.7, extraPatterns: 0, failureCount: 0 };
      case 'normal':
        return { alpha: 0.95, contentLines: 22, noise: 0.018, stampProb: 0.01, stampCount: 1, ruleProb: 0.9, extraPatterns: 0, failureCount: 1 };
      case 'heavy':
        return { alpha: 0.95, contentLines: 36, noise: 0.025, stampProb: 0.02, stampCount: 1, ruleProb: 1.0, extraPatterns: 1, failureCount: 2 };
      case 'extreme':
        // 狂気でもスタンプは控えめ（出る時は2-3個）
        return { alpha: 0.95, contentLines: 30, noise: 0.1, stampProb: 0.08, stampCount: 3, ruleProb: 1.0, extraPatterns: 5, failureCount: 10 };
      default:
        return { alpha: 0.95, contentLines: 22, noise: 0.018, stampProb: 0.01, stampCount: 1, ruleProb: 0.9, extraPatterns: 0, failureCount: 1 };
    }
  }

  /* ========== 失敗エフェクト適用 ========== */
  function drawWithFailures(ctx, w, h, pattern, rnd, cfg, failures) {
    ctx.save();
    // 描画前の座標変換
    if (failures.includes('upsideDown')) {
      ctx.translate(w / 2, h / 2);
      ctx.rotate(Math.PI);
      ctx.translate(-w / 2, -h / 2);
    }
    if (failures.includes('crooked')) {
      const angle = (rnd() - 0.5) * 0.4;
      ctx.translate(w / 2, h / 2);
      ctx.rotate(angle);
      ctx.translate(-w / 2, -h / 2);
    }
    if (failures.includes('shift')) {
      ctx.translate(w * 0.08 * (rnd() - 0.3), h * 0.08 * (rnd() - 0.3));
    }
    if (failures.includes('sideways')) {
      // 縦の紙に横向きで印刷：上70.7%印刷＋下29.3%白紙
      ctx.save();
      const printRatio = 210 / 297;
      const printAreaH = h * printRatio;
      ctx.beginPath();
      ctx.rect(0, 0, w, printAreaH);
      ctx.clip();
      ctx.translate(w, 0);
      ctx.rotate(Math.PI / 2);
      drawPatternOnly(ctx, printAreaH, w, pattern, rnd, cfg);
      ctx.restore();
      ctx.restore();
      return;
    }
    if (failures.includes('excelOverflow')) {
      // エクセル印刷はみ出し：上部空白＋下部にヘッダ繰返し＋数行
      drawExcelOverflow(ctx, w, h, rnd, cfg);
      ctx.restore();
      return;
    }
    if (failures.includes('tornMemo')) {
      drawTornMemo(ctx, w, h, rnd, cfg);
      ctx.restore();
      return;
    }
    if (failures.includes('blackoutQuote')) {
      // 見積書を描いて、金額欄を黒ペンでぐちゃぐちゃ塗りつぶし
      drawQuote(ctx, w, h, 50, rnd, cfg);
      drawBlackout(ctx, w, h, rnd);
      ctx.restore();
      return;
    }
    if (failures.includes('smallOverlay')) {
      drawPatternOnly(ctx, w, h, pattern, rnd, cfg);
      ctx.restore();
      ctx.save();
      const sw = w * 0.55;
      const sh = h * 0.45;
      const sx = (w - sw) / 2 + (rnd() - 0.5) * w * 0.1;
      const sy = (h - sh) / 2 + (rnd() - 0.5) * h * 0.15;
      ctx.translate(sx, sy);
      // 小原稿の地色（背景に近い白）
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, sw, sh);
      // 細い縁線のみ（紙が乗っている感）。インク節約のため広い黒影は使わない
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, 0, sw, sh);
      ctx.beginPath();
      ctx.rect(0, 0, sw, sh);
      ctx.clip();
      drawPatternOnly(ctx, sw, sh, pick(rnd, PATTERNS.filter(p => p !== pattern)), rnd, cfg);
      ctx.restore();
      return;
    }
    drawPatternOnly(ctx, w, h, pattern, rnd, cfg);
    ctx.restore();
  }

  function drawPatternOnly(ctx, w, h, pattern, rnd, cfg) {
    const margin = 50;
    const fn = PATTERN_FUNCTIONS[pattern] || drawPlain;
    fn(ctx, w, h, margin, rnd, cfg);
  }

  function inkColor(cfg, base = '20,20,20') {
    return `rgba(${base},${cfg.alpha})`;
  }

  /* ========== ヘルパ：見出しブロック ========== */
  function drawHeader(ctx, w, margin, rnd, cfg, title, sub) {
    ctx.fillStyle = inkColor(cfg);
    ctx.font = 'bold 28px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText(title, margin, margin + 30);
    if (sub) {
      ctx.font = '13px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
      ctx.fillStyle = inkColor(cfg, '100,100,100');
      ctx.fillText(sub, margin, margin + 54);
    }
  }

  /* ========== パターン関数群 ========== */

  function drawPlain(ctx, w, h, margin, rnd, cfg) {
    ctx.strokeStyle = inkColor(cfg, '160,160,160');
    ctx.lineWidth = 0.6;
    for (let y = margin + 40; y < h - margin; y += 28) {
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(w - margin, y);
      ctx.stroke();
    }
  }

  function drawMemo(ctx, w, h, margin, rnd, cfg) {
    drawHeader(ctx, w, margin, rnd, cfg, pickPhrase(rnd, 3) + 'メモ', `${randDate(rnd)}  作成：${randName(rnd)}`);
    ctx.fillStyle = inkColor(cfg);
    ctx.font = '16px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    let y = margin + 96;
    for (let i = 0; i < cfg.contentLines && y < h - margin; i++) {
      ctx.fillText('・' + pickPhrase(rnd, 3 + Math.floor(rnd() * 5)), margin + 10, y);
      y += 26;
    }
  }

  function drawMeeting(ctx, w, h, margin, rnd, cfg) {
    drawHeader(ctx, w, margin, rnd, cfg, pickPhrase(rnd, 2) + '会議議事録', `日時：${randDate(rnd)}  出席：${randName(rnd)}・${randName(rnd)}・${randName(rnd)}`);
    let y = margin + 96;
    const headings = ['1. 議題', '2. 検討事項', '3. 決定事項', '4. 次回までの宿題', '5. 備考'];
    for (const hd of headings) {
      if (y > h - margin) break;
      ctx.fillStyle = inkColor(cfg);
      ctx.font = 'bold 16px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
      ctx.fillText(hd, margin, y);
      y += 22;
      ctx.font = '14px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
      for (let i = 0; i < 2 + Math.floor(cfg.contentLines / 5); i++) {
        if (y > h - margin) break;
        ctx.fillText('  ・' + pickPhrase(rnd, 4 + Math.floor(rnd() * 4)), margin, y);
        y += 22;
      }
      y += 8;
    }
  }

  function drawDataSheet(ctx, w, h, margin, rnd, cfg) {
    const cols = 4 + Math.floor(rnd() * 3);
    const colW = (w - margin * 2) / cols;
    const rows = 12 + Math.floor(cfg.contentLines / 4);
    const rowH = Math.min(28, (h - margin * 2 - 40) / rows);
    ctx.strokeStyle = inkColor(cfg, '100,100,100');
    ctx.lineWidth = 0.9;
    const startY = margin + 30;
    ctx.font = 'bold 13px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillStyle = inkColor(cfg);
    for (let c = 0; c < cols; c++) {
      ctx.fillText(pickWord(rnd).slice(0, 4), margin + c * colW + 6, startY);
    }
    ctx.beginPath();
    for (let r = 0; r <= rows; r++) {
      const y = startY + 8 + r * rowH;
      if (y > h - margin) break;
      ctx.moveTo(margin, y); ctx.lineTo(w - margin, y);
    }
    for (let c = 0; c <= cols; c++) {
      const x = margin + c * colW;
      ctx.moveTo(x, startY + 8);
      ctx.lineTo(x, Math.min(h - margin, startY + 8 + rows * rowH));
    }
    ctx.stroke();
    ctx.font = '13px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    for (let r = 0; r < rows; r++) {
      const y = startY + 8 + r * rowH + 18;
      if (y > h - margin) break;
      for (let c = 0; c < cols; c++) {
        const cell = c === 0 ? pickWord(rnd).slice(0, 3) : Math.floor(rnd() * 9999).toLocaleString();
        ctx.fillText(cell, margin + c * colW + 8, y);
      }
    }
  }

  function drawGraph(ctx, w, h, margin, rnd, cfg) {
    const top = margin + 50;
    const bottom = h - margin - 60;
    const left = margin + 30;
    const right = w - margin - 30;
    ctx.strokeStyle = inkColor(cfg);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(left, top); ctx.lineTo(left, bottom); ctx.lineTo(right, bottom);
    ctx.stroke();
    const kind = pick(rnd, ['bar', 'line', 'stacked']);
    const n = 7 + Math.floor(rnd() * 6);
    // たまにカラーグラフ（業績資料っぽさ）
    const isColored = rnd() < 0.15;
    const mainColor = isColored ? '60,120,80' : '40,40,40';
    if (kind === 'bar') {
      const barW = (right - left) / n * 0.7;
      ctx.fillStyle = inkColor(cfg, mainColor);
      for (let i = 0; i < n; i++) {
        const bh = 30 + rnd() * (bottom - top - 30);
        ctx.fillRect(left + i * ((right - left) / n) + 4, bottom - bh, barW, bh);
      }
    } else if (kind === 'line') {
      ctx.strokeStyle = inkColor(cfg, mainColor);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = left + (i * (right - left)) / (n - 1);
        const y = top + rnd() * (bottom - top);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else {
      // 積み上げ棒：たまにカラー3色
      const colors = isColored
        ? ['60,120,80', '180,140,60', '120,80,160']
        : ['40,40,40', '110,110,110', '170,170,170'];
      const barW = (right - left) / n * 0.7;
      for (let i = 0; i < n; i++) {
        let acc = bottom;
        for (let k = 0; k < 3; k++) {
          const segH = 20 + rnd() * 60;
          ctx.fillStyle = inkColor(cfg, colors[k]);
          ctx.fillRect(left + i * ((right - left) / n) + 4, acc - segH, barW, segH);
          acc -= segH;
        }
      }
    }
    ctx.fillStyle = inkColor(cfg);
    ctx.font = 'bold 16px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText(pickPhrase(rnd, 3) + '推移', left, top - 12);
  }

  function drawMail(ctx, w, h, margin, rnd, cfg) {
    ctx.fillStyle = inkColor(cfg);
    ctx.font = '13px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    const labels = ['From:', 'To:', 'Cc:', 'Subject:', 'Date:'];
    let y = margin + 16;
    for (const lab of labels) {
      ctx.fillStyle = inkColor(cfg, '90,90,90');
      ctx.fillText(lab, margin, y);
      ctx.fillStyle = inkColor(cfg);
      ctx.fillText(' ' + pickPhrase(rnd, 3) + '@example.invalid', margin + 76, y);
      y += 22;
    }
    ctx.beginPath();
    ctx.strokeStyle = inkColor(cfg, '160,160,160');
    ctx.moveTo(margin, y + 4); ctx.lineTo(w - margin, y + 4);
    ctx.stroke();
    y += 24;
    ctx.font = '14px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    for (let i = 0; i < cfg.contentLines && y < h - margin - 40; i++) {
      ctx.fillText(pickPhrase(rnd, 6 + Math.floor(rnd() * 4)), margin, y);
      y += 22;
    }
  }

  function drawNotice(ctx, w, h, margin, rnd, cfg) {
    ctx.textAlign = 'center';
    ctx.fillStyle = inkColor(cfg);
    ctx.font = 'bold 32px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText('通　　達', w / 2, margin + 36);
    ctx.textAlign = 'left';
    ctx.font = '13px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillStyle = inkColor(cfg, '100,100,100');
    ctx.fillText(`通達番号 第${Math.floor(rnd() * 999)}号`, margin, margin + 80);
    ctx.fillText(randDate(rnd), w - margin - 140, margin + 80);
    ctx.fillStyle = inkColor(cfg);
    ctx.font = '15px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText(`各部署各位`, margin, margin + 116);
    ctx.fillText(`発行：${randDept(rnd)} ${randSection(rnd)}`, w - margin - 240, margin + 116);
    ctx.font = 'bold 18px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText(`件名：${pickPhrase(rnd, 4)}${pick(rnd, SUBJECTS)}`, margin, margin + 160);
    ctx.font = '15px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    let y = margin + 200;
    for (let i = 0; i < 5 && y < h - margin - 80; i++) {
      ctx.font = 'bold 15px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
      ctx.fillText(`${i + 1}.`, margin, y);
      ctx.font = '15px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
      ctx.fillText(pickPhrase(rnd, 6 + Math.floor(rnd() * 3)) + 'のこと。', margin + 28, y);
      y += 26;
      for (let j = 0; j < 2 && y < h - margin - 80; j++) {
        ctx.fillText('  ' + pickPhrase(rnd, 5 + Math.floor(rnd() * 3)), margin + 28, y);
        y += 22;
      }
      y += 6;
    }
    // 押印（基本黒、たまに朱印の赤）
    const isRedSeal = rnd() < 0.25;
    const sealColor = isRedSeal ? '160,40,40' : '40,40,40';
    ctx.strokeStyle = inkColor(cfg, sealColor);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w - margin - 40, h - margin - 40, 32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = inkColor(cfg, sealColor);
    ctx.font = 'bold 13px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('印', w - margin - 40, h - margin - 36);
    ctx.textAlign = 'left';
  }

  function drawFax(ctx, w, h, margin, rnd, cfg) {
    drawHeader(ctx, w, margin, rnd, cfg, 'FAX送信票');
    ctx.strokeStyle = inkColor(cfg, '60,60,60');
    ctx.lineWidth = 1.5;
    ctx.strokeRect(margin, margin + 50, w - margin * 2, 150);
    const labels = [
      ['宛先：', pickPhrase(rnd, 3) + '株式会社'],
      ['　　　', randName(rnd) + ' ' + pick(rnd, HONORIFICS)],
      ['送信元：', pickPhrase(rnd, 2) + '商事 ' + randName(rnd)],
      ['TEL：', randTel(rnd)],
      ['送信日：', randDate(rnd)],
      ['ページ：', `${1 + Math.floor(rnd() * 9)} / ${2 + Math.floor(rnd() * 8)}`],
    ];
    ctx.font = '14px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    let y = margin + 76;
    for (const [lab, val] of labels) {
      ctx.fillStyle = inkColor(cfg, '100,100,100');
      ctx.fillText(lab, margin + 14, y);
      ctx.fillStyle = inkColor(cfg);
      ctx.fillText(val, margin + 100, y);
      y += 20;
    }
    ctx.font = 'bold 16px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillStyle = inkColor(cfg);
    ctx.fillText('件名：' + pickPhrase(rnd, 4) + pick(rnd, SUBJECTS), margin, margin + 230);
    ctx.font = '14px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    let yy = margin + 264;
    for (let i = 0; i < cfg.contentLines * 0.6 && yy < h - margin - 40; i++) {
      ctx.fillText(pickPhrase(rnd, 6 + Math.floor(rnd() * 4)), margin, yy);
      yy += 22;
    }
  }

  /* === 新パターン群 === */

  function drawDailyReport(ctx, w, h, margin, rnd, cfg) {
    drawHeader(ctx, w, margin, rnd, cfg, '業務日報', `${randDate(rnd)}  ${randDept(rnd)} ${randName(rnd)}`);
    let y = margin + 96;
    const sections = [
      ['本日の業務内容', 5],
      ['進捗状況', 3],
      ['課題・問題点', 3],
      ['明日の予定', 4],
      ['上長所見', 2],
    ];
    for (const [hd, n] of sections) {
      if (y > h - margin) break;
      ctx.fillStyle = inkColor(cfg);
      ctx.font = 'bold 16px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
      ctx.fillText('■ ' + hd, margin, y);
      y += 24;
      ctx.font = '14px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
      for (let i = 0; i < n && y < h - margin; i++) {
        ctx.fillText('  ・' + pickPhrase(rnd, 4 + Math.floor(rnd() * 4)), margin, y);
        y += 22;
      }
      y += 10;
    }
  }

  function drawWeeklyReport(ctx, w, h, margin, rnd, cfg) {
    drawHeader(ctx, w, margin, rnd, cfg, '週次報告書', `${randDate(rnd)} 〜 ${randDate(rnd)}  ${randDept(rnd)}`);
    let y = margin + 96;
    const days = ['月', '火', '水', '木', '金'];
    ctx.font = '14px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    for (const d of days) {
      if (y > h - margin) break;
      ctx.fillStyle = inkColor(cfg);
      ctx.font = 'bold 14px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
      ctx.fillText(`【${d}】`, margin, y);
      y += 22;
      ctx.font = '13px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
      for (let i = 0; i < 3; i++) {
        if (y > h - margin) break;
        ctx.fillText('  ' + pickPhrase(rnd, 4 + Math.floor(rnd() * 3)), margin, y);
        y += 20;
      }
      y += 6;
    }
  }

  function drawMonthlyReport(ctx, w, h, margin, rnd, cfg) {
    drawHeader(ctx, w, margin, rnd, cfg, '月次報告書', `${2018 + Math.floor(rnd() * 10)}年${1 + Math.floor(rnd() * 12)}月　${randDept(rnd)}`);
    let y = margin + 96;
    const sections = ['1. 今月の実績', '2. 売上分析', '3. 主要案件の進捗', '4. 来月の計画', '5. 課題と対策'];
    for (const hd of sections) {
      if (y > h - margin) break;
      ctx.fillStyle = inkColor(cfg);
      ctx.font = 'bold 16px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
      ctx.fillText(hd, margin, y);
      y += 24;
      ctx.font = '14px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
      for (let i = 0; i < 3 + Math.floor(rnd() * 2); i++) {
        if (y > h - margin) break;
        ctx.fillText('  ・' + pickPhrase(rnd, 5 + Math.floor(rnd() * 4)), margin, y);
        y += 22;
      }
      y += 8;
    }
  }

  function drawTravelReport(ctx, w, h, margin, rnd, cfg) {
    drawHeader(ctx, w, margin, rnd, cfg, '出張報告書');
    let y = margin + 96;
    const meta = [
      ['出張者', `${randDept(rnd)} ${randName(rnd)}`],
      ['出張先', pickPhrase(rnd, 2) + '営業所'],
      ['期間', `${randDate(rnd)} 〜 ${randDate(rnd)}`],
      ['目的', pickPhrase(rnd, 4)],
      ['交通費', `¥${Math.floor(rnd() * 50000 + 10000).toLocaleString()}`],
      ['宿泊費', `¥${Math.floor(rnd() * 30000 + 5000).toLocaleString()}`],
    ];
    ctx.font = '14px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    for (const [lab, val] of meta) {
      ctx.fillStyle = inkColor(cfg, '100,100,100');
      ctx.fillText(lab + '：', margin, y);
      ctx.fillStyle = inkColor(cfg);
      ctx.fillText(val, margin + 80, y);
      y += 22;
    }
    y += 14;
    ctx.fillStyle = inkColor(cfg);
    ctx.font = 'bold 15px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText('■ 業務内容', margin, y);
    y += 24;
    ctx.font = '14px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    for (let i = 0; i < 6 && y < h - margin; i++) {
      ctx.fillText(pickPhrase(rnd, 6 + Math.floor(rnd() * 3)), margin, y);
      y += 22;
    }
  }

  function drawLeaveRequest(ctx, w, h, margin, rnd, cfg) {
    drawHeader(ctx, w, margin, rnd, cfg, '休暇申請書');
    let y = margin + 100;
    ctx.font = '14px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    const fields = [
      ['申請日', randDate(rnd)],
      ['申請者', `${randDept(rnd)} ${randName(rnd)}`],
      ['休暇種別', pick(rnd, ['有給休暇', '特別休暇', '代休', '病気休暇', '慶弔休暇'])],
      ['期間', `${randDate(rnd)} 〜 ${randDate(rnd)}（${1 + Math.floor(rnd() * 5)}日間）`],
      ['理由', pickPhrase(rnd, 4)],
      ['代行者', randName(rnd)],
      ['緊急連絡先', randTel(rnd)],
    ];
    for (const [lab, val] of fields) {
      ctx.fillStyle = inkColor(cfg, '100,100,100');
      ctx.fillText(lab + '：', margin, y);
      ctx.fillStyle = inkColor(cfg);
      ctx.fillText(val, margin + 100, y);
      ctx.strokeStyle = inkColor(cfg, '180,180,180');
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(margin + 100, y + 4); ctx.lineTo(w - margin - 200, y + 4);
      ctx.stroke();
      y += 32;
    }
    // 押印枠
    const stampY = h - margin - 90;
    ['申請者印', '上長承認', '部長承認', '人事承認'].forEach((lab, i) => {
      const x = margin + i * ((w - margin * 2) / 4);
      ctx.strokeStyle = inkColor(cfg, '100,100,100');
      ctx.strokeRect(x, stampY, (w - margin * 2) / 4 - 8, 70);
      ctx.fillStyle = inkColor(cfg, '100,100,100');
      ctx.font = '11px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
      ctx.fillText(lab, x + 4, stampY + 14);
    });
  }

  function drawExpenseReport(ctx, w, h, margin, rnd, cfg) {
    drawHeader(ctx, w, margin, rnd, cfg, '経費精算書', `申請日：${randDate(rnd)}  申請者：${randName(rnd)}`);
    const cols = ['日付', '科目', '内容', '金額', '備考'];
    const colW = [90, 80, 250, 90, 120];
    const totalW = colW.reduce((a, b) => a + b, 0);
    const x0 = margin;
    const startY = margin + 100;
    const rowH = 28;
    // ヘッダ行
    ctx.fillStyle = inkColor(cfg, '230,230,230');
    ctx.fillRect(x0, startY, totalW, rowH);
    ctx.fillStyle = inkColor(cfg);
    ctx.font = 'bold 13px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    let xx = x0;
    for (let c = 0; c < cols.length; c++) {
      ctx.fillText(cols[c], xx + 8, startY + 18);
      xx += colW[c];
    }
    // 罫線＋行
    ctx.strokeStyle = inkColor(cfg, '100,100,100');
    ctx.lineWidth = 0.8;
    const rows = Math.min(18, Math.floor((h - margin - startY - 60) / rowH));
    ctx.beginPath();
    for (let r = 0; r <= rows; r++) {
      const y = startY + r * rowH;
      ctx.moveTo(x0, y); ctx.lineTo(x0 + totalW, y);
    }
    let cx = x0;
    for (let c = 0; c <= cols.length; c++) {
      ctx.moveTo(cx, startY); ctx.lineTo(cx, startY + rows * rowH);
      if (c < colW.length) cx += colW[c];
    }
    ctx.stroke();
    ctx.font = '12px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    let total = 0;
    for (let r = 1; r < rows; r++) {
      const y = startY + r * rowH + 18;
      const amount = Math.floor(rnd() * 50000 + 500);
      total += amount;
      const vals = [
        randDate(rnd).slice(5),
        pick(rnd, ['交通費', '会議費', '消耗品', '通信費', '接待費']),
        pickPhrase(rnd, 3),
        '¥' + amount.toLocaleString(),
        pickWord(rnd),
      ];
      let xv = x0;
      for (let c = 0; c < vals.length; c++) {
        ctx.fillText(vals[c], xv + 8, y);
        xv += colW[c];
      }
    }
    ctx.font = 'bold 14px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText(`合計：¥${total.toLocaleString()}`, x0 + totalW - 200, startY + rows * rowH + 24);
  }

  function drawOrgChart(ctx, w, h, margin, rnd, cfg) {
    drawHeader(ctx, w, margin, rnd, cfg, '組織図', `${2018 + Math.floor(rnd() * 10)}年度 ${randDept(rnd)}`);
    ctx.strokeStyle = inkColor(cfg);
    ctx.lineWidth = 1.2;
    ctx.font = '13px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillStyle = inkColor(cfg);
    // ルート（社長）
    const rootX = w / 2, rootY = margin + 100;
    drawOrgBox(ctx, cfg, rootX - 60, rootY, 120, 36, '代表取締役');
    // 第2階層 3つ
    const lv2Y = rootY + 80;
    const lv2 = ['経営企画', '営業統括', '管理本部'];
    const lv2X = [w * 0.2, w * 0.5, w * 0.8];
    lv2.forEach((name, i) => {
      drawOrgBox(ctx, cfg, lv2X[i] - 50, lv2Y, 100, 32, name);
      ctx.beginPath();
      ctx.moveTo(rootX, rootY + 36); ctx.lineTo(rootX, rootY + 50);
      ctx.moveTo(lv2X[0], rootY + 50); ctx.lineTo(lv2X[2], rootY + 50);
      ctx.moveTo(lv2X[i], rootY + 50); ctx.lineTo(lv2X[i], lv2Y);
      ctx.stroke();
    });
    // 第3階層（各2-3つ）
    const lv3Y = lv2Y + 80;
    lv2X.forEach((x, i) => {
      const sub = 2 + Math.floor(rnd() * 2);
      for (let k = 0; k < sub; k++) {
        const sx = x - 60 + k * 80;
        drawOrgBox(ctx, cfg, sx - 40, lv3Y, 80, 28, randSection(rnd));
        ctx.beginPath();
        ctx.moveTo(x, lv2Y + 32); ctx.lineTo(x, lv3Y - 14);
        ctx.moveTo(sx, lv3Y - 14); ctx.lineTo(sx, lv3Y);
        ctx.stroke();
      }
    });
  }
  function drawOrgBox(ctx, cfg, x, y, w, h, text) {
    ctx.strokeStyle = inkColor(cfg);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = inkColor(cfg);
    ctx.textAlign = 'center';
    ctx.font = '12px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText(text, x + w / 2, y + h / 2 + 4);
    ctx.textAlign = 'left';
  }

  function drawFlowChart(ctx, w, h, margin, rnd, cfg) {
    drawHeader(ctx, w, margin, rnd, cfg, '業務フロー図', pickPhrase(rnd, 3) + '業務');
    const cx = w / 2;
    let y = margin + 110;
    const steps = ['受付', '審査', '承認', '実施', '報告', '完了'];
    ctx.font = '13px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    for (let i = 0; i < steps.length && y < h - margin - 40; i++) {
      ctx.strokeStyle = inkColor(cfg);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - 70, y, 140, 36);
      ctx.strokeRect(cx - 70, y, 140, 36);
      ctx.fillStyle = inkColor(cfg);
      ctx.textAlign = 'center';
      ctx.fillText(steps[i] + ' ' + pickWord(rnd).slice(0, 3), cx, y + 22);
      ctx.textAlign = 'left';
      if (i < steps.length - 1) {
        ctx.beginPath();
        ctx.moveTo(cx, y + 36); ctx.lineTo(cx, y + 58);
        ctx.moveTo(cx - 5, y + 53); ctx.lineTo(cx, y + 58); ctx.lineTo(cx + 5, y + 53);
        ctx.stroke();
      }
      y += 62;
    }
  }

  function drawChecklist(ctx, w, h, margin, rnd, cfg) {
    drawHeader(ctx, w, margin, rnd, cfg, pickPhrase(rnd, 2) + 'チェックリスト', `作成日：${randDate(rnd)}  ${randDept(rnd)}`);
    let y = margin + 100;
    ctx.font = '14px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    for (let i = 0; i < cfg.contentLines && y < h - margin; i++) {
      const checked = rnd() < 0.4;
      ctx.strokeStyle = inkColor(cfg);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(margin, y - 12, 16, 16);
      if (checked) {
        ctx.beginPath();
        ctx.moveTo(margin + 3, y - 4); ctx.lineTo(margin + 7, y);
        ctx.lineTo(margin + 14, y - 10);
        ctx.stroke();
      }
      ctx.fillStyle = inkColor(cfg);
      ctx.fillText(pickPhrase(rnd, 4 + Math.floor(rnd() * 4)) + 'を確認', margin + 26, y);
      y += 26;
    }
  }

  function drawInvoice(ctx, w, h, margin, rnd, cfg) {
    drawHeader(ctx, w, margin, rnd, cfg, '請求書', `請求番号：第${Math.floor(rnd() * 9999)}号  発行日：${randDate(rnd)}`);
    let y = margin + 100;
    ctx.font = '14px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillStyle = inkColor(cfg);
    ctx.fillText(pickPhrase(rnd, 3) + '株式会社 御中', margin, y);
    y += 24;
    ctx.fillText('下記の通りご請求申し上げます。', margin, y);
    y += 36;
    // 請求項目テーブル
    const cols = ['品目', '数量', '単価', '金額'];
    const colW = [350, 80, 100, 120];
    const totalW = colW.reduce((a, b) => a + b, 0);
    ctx.fillStyle = inkColor(cfg, '230,230,230');
    ctx.fillRect(margin, y, totalW, 28);
    ctx.fillStyle = inkColor(cfg);
    ctx.font = 'bold 13px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    let xx = margin;
    for (let c = 0; c < cols.length; c++) {
      ctx.fillText(cols[c], xx + 8, y + 18);
      xx += colW[c];
    }
    y += 28;
    ctx.font = '13px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.strokeStyle = inkColor(cfg, '100,100,100');
    ctx.lineWidth = 0.8;
    let total = 0;
    const rows = 8 + Math.floor(rnd() * 6);
    for (let r = 0; r < rows && y < h - margin - 100; r++) {
      const qty = 1 + Math.floor(rnd() * 10);
      const price = Math.floor(rnd() * 50000 + 1000);
      const amt = qty * price;
      total += amt;
      const vals = [pickPhrase(rnd, 3), String(qty), '¥' + price.toLocaleString(), '¥' + amt.toLocaleString()];
      let xv = margin;
      for (let c = 0; c < vals.length; c++) {
        ctx.fillText(vals[c], xv + 8, y + 18);
        xv += colW[c];
      }
      ctx.beginPath(); ctx.moveTo(margin, y + 28); ctx.lineTo(margin + totalW, y + 28); ctx.stroke();
      y += 28;
    }
    ctx.font = 'bold 16px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText(`合計金額：¥${total.toLocaleString()}（税込）`, margin + totalW - 320, y + 30);
  }

  function drawQuote(ctx, w, h, margin, rnd, cfg) {
    drawHeader(ctx, w, margin, rnd, cfg, '御 見 積 書', `見積番号：MK-${Math.floor(rnd() * 999999)}  日付：${randDate(rnd)}`);
    let y = margin + 110;
    ctx.font = '14px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillStyle = inkColor(cfg);
    ctx.fillText(pickPhrase(rnd, 3) + '株式会社 御中', margin, y);
    y += 26;
    ctx.font = 'bold 18px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText('件名：' + pickPhrase(rnd, 4) + '一式', margin, y);
    y += 30;
    ctx.font = '14px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText('下記の通りお見積もり申し上げます。', margin, y);
    y += 14;
    // 表
    drawInvoiceLikeTable(ctx, w, margin, y, h, rnd, cfg, 'quote');
  }

  function drawInvoiceLikeTable(ctx, w, margin, y, h, rnd, cfg, kind) {
    const cols = ['項目', '数量', '単価', '金額'];
    const colW = [330, 70, 100, 110];
    const totalW = colW.reduce((a, b) => a + b, 0);
    y += 16;
    ctx.fillStyle = inkColor(cfg, '230,230,230');
    ctx.fillRect(margin, y, totalW, 28);
    ctx.fillStyle = inkColor(cfg);
    ctx.font = 'bold 13px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    let xx = margin;
    for (const c of cols) { ctx.fillText(c, xx + 8, y + 18); xx += colW[cols.indexOf(c)]; }
    y += 28;
    ctx.strokeStyle = inkColor(cfg, '100,100,100');
    ctx.lineWidth = 0.8;
    ctx.font = '13px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    let total = 0;
    const rows = 6 + Math.floor(rnd() * 6);
    for (let r = 0; r < rows && y < h - margin - 80; r++) {
      const qty = 1 + Math.floor(rnd() * 10);
      const price = Math.floor(rnd() * 100000 + 1000);
      const amt = qty * price;
      total += amt;
      const vals = [pickPhrase(rnd, 3), String(qty), '¥' + price.toLocaleString(), '¥' + amt.toLocaleString()];
      let xv = margin;
      for (let c = 0; c < vals.length; c++) {
        ctx.fillText(vals[c], xv + 8, y + 18);
        xv += colW[c];
      }
      ctx.beginPath(); ctx.moveTo(margin, y + 28); ctx.lineTo(margin + totalW, y + 28); ctx.stroke();
      y += 28;
    }
    ctx.font = 'bold 16px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText(`合計：¥${total.toLocaleString()}`, margin + totalW - 240, y + 30);
  }

  function drawInventory(ctx, w, h, margin, rnd, cfg) {
    drawHeader(ctx, w, margin, rnd, cfg, '在庫一覧表', `${randDate(rnd)}現在　${randDept(rnd)}`);
    const cols = ['品番', '品名', '区分', '在庫数', '単位', '保管場所'];
    const colW = [80, 200, 70, 80, 60, 130];
    const totalW = colW.reduce((a, b) => a + b, 0);
    let y = margin + 100;
    ctx.fillStyle = inkColor(cfg, '230,230,230');
    ctx.fillRect(margin, y, totalW, 28);
    ctx.fillStyle = inkColor(cfg);
    ctx.font = 'bold 13px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    let xx = margin;
    for (let c = 0; c < cols.length; c++) { ctx.fillText(cols[c], xx + 6, y + 18); xx += colW[c]; }
    y += 28;
    ctx.strokeStyle = inkColor(cfg, '100,100,100');
    ctx.lineWidth = 0.6;
    ctx.font = '12px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    const rows = Math.min(22, Math.floor((h - margin - y - 30) / 24));
    for (let r = 0; r < rows; r++) {
      const vals = [
        'P' + Math.floor(rnd() * 999999).toString().padStart(5, '0'),
        pickPhrase(rnd, 3),
        pick(rnd, ['消耗', '備品', '原料', '半製品', '完成品']),
        String(Math.floor(rnd() * 9999)),
        pick(rnd, ['個', '箱', 'kg', 'm', '本']),
        pick(rnd, ['倉庫A', '倉庫B', '営業所', '工場棟', '別棟']),
      ];
      let xv = margin;
      for (let c = 0; c < vals.length; c++) {
        ctx.fillText(vals[c], xv + 6, y + 16);
        xv += colW[c];
      }
      ctx.beginPath(); ctx.moveTo(margin, y + 24); ctx.lineTo(margin + totalW, y + 24); ctx.stroke();
      y += 24;
    }
  }

  function drawScheduleTable(ctx, w, h, margin, rnd, cfg) {
    drawHeader(ctx, w, margin, rnd, cfg, '勤怠管理表', `${2018 + Math.floor(rnd() * 10)}年${1 + Math.floor(rnd() * 12)}月　${randName(rnd)}`);
    const cols = ['日付', '曜日', '出勤', '退勤', '休憩', '実働', '備考'];
    const colW = [60, 50, 70, 70, 60, 70, 200];
    const totalW = colW.reduce((a, b) => a + b, 0);
    let y = margin + 100;
    ctx.fillStyle = inkColor(cfg, '230,230,230');
    ctx.fillRect(margin, y, totalW, 26);
    ctx.fillStyle = inkColor(cfg);
    ctx.font = 'bold 12px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    let xx = margin;
    for (let c = 0; c < cols.length; c++) { ctx.fillText(cols[c], xx + 6, y + 17); xx += colW[c]; }
    y += 26;
    ctx.strokeStyle = inkColor(cfg, '100,100,100');
    ctx.font = '11px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    const days = ['月', '火', '水', '木', '金', '土', '日'];
    const rows = Math.min(28, Math.floor((h - margin - y - 30) / 22));
    for (let r = 0; r < rows; r++) {
      const vals = [
        String(r + 1),
        days[r % 7],
        `9:${Math.floor(rnd() * 60).toString().padStart(2, '0')}`,
        `18:${Math.floor(rnd() * 60).toString().padStart(2, '0')}`,
        '1:00',
        '8:00',
        rnd() < 0.2 ? pickPhrase(rnd, 2) : '',
      ];
      let xv = margin;
      for (let c = 0; c < vals.length; c++) {
        ctx.fillText(vals[c], xv + 6, y + 14);
        xv += colW[c];
      }
      ctx.beginPath(); ctx.moveTo(margin, y + 22); ctx.lineTo(margin + totalW, y + 22); ctx.stroke();
      y += 22;
    }
  }

  function drawBudget(ctx, w, h, margin, rnd, cfg) {
    drawHeader(ctx, w, margin, rnd, cfg, '予算管理表', `${2018 + Math.floor(rnd() * 10)}年度  ${randDept(rnd)}`);
    const cols = ['項目', '計画', '実績', '差異', '達成率', '備考'];
    const colW = [180, 100, 100, 100, 80, 130];
    const totalW = colW.reduce((a, b) => a + b, 0);
    let y = margin + 100;
    ctx.fillStyle = inkColor(cfg, '230,230,230');
    ctx.fillRect(margin, y, totalW, 28);
    ctx.fillStyle = inkColor(cfg);
    ctx.font = 'bold 13px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    let xx = margin;
    for (let c = 0; c < cols.length; c++) { ctx.fillText(cols[c], xx + 6, y + 18); xx += colW[c]; }
    y += 28;
    ctx.strokeStyle = inkColor(cfg, '100,100,100');
    ctx.font = '12px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    const rows = Math.min(16, Math.floor((h - margin - y - 30) / 26));
    for (let r = 0; r < rows; r++) {
      const plan = Math.floor(rnd() * 5000000 + 500000);
      const real = Math.floor(plan * (0.7 + rnd() * 0.6));
      const diff = real - plan;
      const rate = Math.round((real / plan) * 100);
      const vals = [
        pickPhrase(rnd, 3),
        '¥' + plan.toLocaleString(),
        '¥' + real.toLocaleString(),
        (diff >= 0 ? '+' : '') + '¥' + Math.abs(diff).toLocaleString(),
        rate + '%',
        rnd() < 0.3 ? pickWord(rnd) : '',
      ];
      let xv = margin;
      for (let c = 0; c < vals.length; c++) {
        ctx.fillText(vals[c], xv + 6, y + 16);
        xv += colW[c];
      }
      ctx.beginPath(); ctx.moveTo(margin, y + 26); ctx.lineTo(margin + totalW, y + 26); ctx.stroke();
      y += 26;
    }
  }

  function drawProgressTable(ctx, w, h, margin, rnd, cfg) {
    drawHeader(ctx, w, margin, rnd, cfg, '進捗管理表', `${randDate(rnd)} 更新　${randDept(rnd)}`);
    const cols = ['案件', '担当', '期限', '進捗', 'ステータス'];
    const colW = [200, 100, 100, 200, 90];
    const totalW = colW.reduce((a, b) => a + b, 0);
    let y = margin + 100;
    ctx.fillStyle = inkColor(cfg, '230,230,230');
    ctx.fillRect(margin, y, totalW, 28);
    ctx.fillStyle = inkColor(cfg);
    ctx.font = 'bold 13px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    let xx = margin;
    for (let c = 0; c < cols.length; c++) { ctx.fillText(cols[c], xx + 6, y + 18); xx += colW[c]; }
    y += 28;
    ctx.strokeStyle = inkColor(cfg, '100,100,100');
    ctx.font = '12px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    const rows = Math.min(14, Math.floor((h - margin - y - 30) / 32));
    for (let r = 0; r < rows; r++) {
      const progress = Math.floor(rnd() * 100);
      const vals = [pickPhrase(rnd, 3), randName(rnd), randDate(rnd).slice(5), '', pick(rnd, ['進行中', '完了', '遅延', '保留'])];
      let xv = margin;
      for (let c = 0; c < vals.length; c++) {
        if (c !== 3) ctx.fillText(vals[c], xv + 6, y + 18);
        xv += colW[c];
      }
      // 進捗バー
      const barX = margin + colW[0] + colW[1] + colW[2] + 8;
      const barW = colW[3] - 16;
      ctx.strokeStyle = inkColor(cfg, '120,120,120');
      ctx.strokeRect(barX, y + 8, barW, 14);
      ctx.fillStyle = inkColor(cfg, '60,60,60');
      ctx.fillRect(barX + 1, y + 9, (barW - 2) * (progress / 100), 12);
      ctx.fillStyle = inkColor(cfg);
      ctx.font = '11px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
      ctx.fillText(progress + '%', barX + barW + 4, y + 18);
      ctx.font = '12px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
      ctx.strokeStyle = inkColor(cfg, '100,100,100');
      ctx.beginPath(); ctx.moveTo(margin, y + 32); ctx.lineTo(margin + totalW, y + 32); ctx.stroke();
      y += 32;
    }
  }

  function drawContract(ctx, w, h, margin, rnd, cfg) {
    ctx.textAlign = 'center';
    ctx.fillStyle = inkColor(cfg);
    ctx.font = 'bold 28px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText(pick(rnd, ['業務委託契約書', '秘密保持契約書', '取引基本契約書', '覚　書']), w / 2, margin + 36);
    ctx.textAlign = 'left';
    let y = margin + 90;
    ctx.font = '14px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillStyle = inkColor(cfg);
    ctx.fillText(pickPhrase(rnd, 3) + '株式会社（以下「甲」という）と、' + pickPhrase(rnd, 3) + '株式会社', margin, y);
    y += 22;
    ctx.fillText('（以下「乙」という）は、次の通り契約を締結する。', margin, y);
    y += 36;
    for (let i = 1; i <= 8 && y < h - margin - 60; i++) {
      ctx.font = 'bold 14px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
      ctx.fillText(`第${i}条（${pickPhrase(rnd, 2)}）`, margin, y);
      y += 22;
      ctx.font = '13px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
      for (let j = 0; j < 2 + Math.floor(rnd() * 2) && y < h - margin - 60; j++) {
        ctx.fillText('  ' + pickPhrase(rnd, 8 + Math.floor(rnd() * 4)) + '。', margin, y);
        y += 20;
      }
      y += 8;
    }
  }

  /* エクセル印刷はみ出し2ページ目 */
  function drawExcelOverflow(ctx, w, h, rnd, cfg) {
    // 紙の上 75% は白紙、下 25% にヘッダ繰り返し＋数行
    const startY = h * 0.75;
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
    const margin = 50;
    const colW = (w - margin * 2) / cols.length;
    // ヘッダ行（少し太く＝Excelっぽい）
    ctx.fillStyle = inkColor(cfg, '230,230,230');
    ctx.fillRect(margin, startY, w - margin * 2, 22);
    ctx.fillStyle = inkColor(cfg);
    ctx.font = 'bold 12px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    cols.forEach((c, i) => {
      ctx.fillText(c, margin + i * colW + colW / 2 - 4, startY + 15);
    });
    // データ行（数行のみ）
    ctx.strokeStyle = inkColor(cfg, '180,180,180');
    ctx.lineWidth = 0.5;
    ctx.font = '11px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    let y = startY + 22;
    const rows = 4 + Math.floor(rnd() * 3);
    for (let r = 0; r < rows && y < h - 20; r++) {
      for (let c = 0; c < cols.length; c++) {
        const x = margin + c * colW;
        ctx.strokeRect(x, y, colW, 20);
        ctx.fillText(Math.floor(rnd() * 9999).toLocaleString(), x + 6, y + 14);
      }
      y += 20;
    }
    // 上部に薄く「2ページ目」を示唆する文字
    ctx.fillStyle = inkColor(cfg, '180,180,180');
    ctx.font = '10px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText('— 2 —', w / 2 - 12, h - 8);
  }

  /* ========== 新パターン群（手書き・図面・POP） ========== */

  function drawHandwrittenMemo(ctx, w, h, margin, rnd, cfg) {
    // 手書き風：傾き＋ストロークの揺れ
    ctx.save();
    ctx.translate(w/2, h/2);
    ctx.rotate((rnd() - 0.5) * 0.06);
    ctx.translate(-w/2, -h/2);
    // 罫線（うすい）
    ctx.strokeStyle = inkColor(cfg, '200,200,200');
    ctx.lineWidth = 0.5;
    for (let y = margin + 50; y < h - margin; y += 36) {
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(w - margin, y);
      ctx.stroke();
    }
    // タイトル（手書き風＝太字＋微妙な傾き）
    ctx.fillStyle = inkColor(cfg);
    ctx.font = 'bold 32px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    drawWobblyText(ctx, pickPhrase(rnd, 2) + 'メモ', margin + 10, margin + 36, rnd);
    // 本文
    ctx.font = '22px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    let y = margin + 90;
    const lines = 8 + Math.floor(cfg.contentLines / 3);
    for (let i = 0; i < lines && y < h - margin; i++) {
      const indent = rnd() < 0.3 ? 30 : 0;
      drawWobblyText(ctx, (rnd() < 0.5 ? '・' : '') + pickPhrase(rnd, 3 + Math.floor(rnd() * 4)), margin + 10 + indent, y, rnd);
      y += 36;
    }
    // 矢印や囲み枠（手書き感）
    if (rnd() < 0.6) {
      ctx.strokeStyle = inkColor(cfg);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const ax = w * 0.6;
      const ay = h * (0.3 + rnd() * 0.3);
      ctx.moveTo(ax, ay);
      ctx.bezierCurveTo(ax + 80, ay - 20, ax + 100, ay + 30, ax + 160, ay + 10);
      ctx.stroke();
      // 矢印先
      ctx.beginPath();
      ctx.moveTo(ax + 160, ay + 10);
      ctx.lineTo(ax + 150, ay + 4);
      ctx.moveTo(ax + 160, ay + 10);
      ctx.lineTo(ax + 152, ay + 18);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWobblyText(ctx, text, x, y, rnd) {
    // 1文字ずつ y を揺らす
    let cx = x;
    for (const ch of text) {
      const yo = (rnd() - 0.5) * 3;
      ctx.fillText(ch, cx, y + yo);
      cx += ctx.measureText(ch).width;
    }
  }

  function drawHandwrittenDoc(ctx, w, h, margin, rnd, cfg) {
    ctx.save();
    ctx.translate(w/2, h/2);
    ctx.rotate((rnd() - 0.5) * 0.04);
    ctx.translate(-w/2, -h/2);
    // 原稿用紙風の薄い格子
    ctx.strokeStyle = inkColor(cfg, '210,210,210');
    ctx.lineWidth = 0.4;
    const gridY = margin + 70;
    for (let y = gridY; y < h - margin; y += 30) {
      ctx.beginPath();
      ctx.moveTo(margin, y); ctx.lineTo(w - margin, y);
      ctx.stroke();
    }
    // タイトル
    ctx.fillStyle = inkColor(cfg);
    ctx.font = 'bold 30px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    drawWobblyText(ctx, pickPhrase(rnd, 3) + 'について', margin + 10, margin + 36, rnd);
    // 日付・署名
    ctx.font = '18px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText(randDate(rnd) + '  ' + randName(rnd), w - margin - 220, margin + 36);
    // 本文（手書き感）
    ctx.font = '20px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    let y = gridY + 22;
    for (let i = 0; i < cfg.contentLines * 0.8 && y < h - margin; i++) {
      drawWobblyText(ctx, pickPhrase(rnd, 6 + Math.floor(rnd() * 4)), margin + 14, y, rnd);
      y += 30;
    }
    // 署名（最後に右下）
    ctx.font = 'bold 22px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    drawWobblyText(ctx, '以上', w - margin - 80, h - margin - 40, rnd);
    ctx.restore();
  }

  function drawBlueprint(ctx, w, h, margin, rnd, cfg) {
    // 図面っぽい：外枠＋部屋分け＋寸法線＋寸法数字
    ctx.strokeStyle = inkColor(cfg);
    ctx.lineWidth = 1.5;
    // 外形（建物の外壁）
    const ox = margin + 60;
    const oy = margin + 80;
    const ow = w - margin * 2 - 120;
    const oh = h - margin * 2 - 160;
    ctx.strokeRect(ox, oy, ow, oh);
    // 内部の壁（部屋分け）
    const rooms = 3 + Math.floor(rnd() * 3);
    let splitX = ox + 50;
    for (let i = 0; i < rooms; i++) {
      splitX += 60 + rnd() * 100;
      if (splitX > ox + ow - 40) break;
      ctx.beginPath();
      ctx.moveTo(splitX, oy);
      ctx.lineTo(splitX, oy + oh * (0.4 + rnd() * 0.5));
      ctx.stroke();
    }
    // 水平壁
    const hSplit = oy + oh * (0.4 + rnd() * 0.3);
    ctx.beginPath();
    ctx.moveTo(ox, hSplit);
    ctx.lineTo(ox + ow * (0.5 + rnd() * 0.4), hSplit);
    ctx.stroke();
    // 扉（円弧）
    ctx.lineWidth = 1;
    for (let i = 0; i < 3 + Math.floor(rnd() * 3); i++) {
      const dx = ox + 40 + rnd() * (ow - 80);
      const dy = oy + 40 + rnd() * (oh - 80);
      ctx.beginPath();
      ctx.arc(dx, dy, 18, 0, Math.PI / 2);
      ctx.stroke();
    }
    // 寸法線（外側）
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = inkColor(cfg, '80,80,80');
    ctx.beginPath();
    ctx.moveTo(ox, oy - 20); ctx.lineTo(ox + ow, oy - 20);
    ctx.moveTo(ox, oy - 24); ctx.lineTo(ox, oy - 16);
    ctx.moveTo(ox + ow, oy - 24); ctx.lineTo(ox + ow, oy - 16);
    ctx.stroke();
    ctx.fillStyle = inkColor(cfg);
    ctx.font = '12px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText(`${3000 + Math.floor(rnd() * 5000)}`, ox + ow/2 - 18, oy - 24);
    // 縦の寸法
    ctx.beginPath();
    ctx.moveTo(ox - 20, oy); ctx.lineTo(ox - 20, oy + oh);
    ctx.moveTo(ox - 24, oy); ctx.lineTo(ox - 16, oy);
    ctx.moveTo(ox - 24, oy + oh); ctx.lineTo(ox - 16, oy + oh);
    ctx.stroke();
    ctx.save();
    ctx.translate(ox - 28, oy + oh/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText(`${2000 + Math.floor(rnd() * 3000)}`, -18, 0);
    ctx.restore();
    // 図面タイトル
    ctx.font = 'bold 18px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText(pickPhrase(rnd, 2) + '平面図  S=1/' + (50 + Math.floor(rnd() * 5) * 10), margin, margin + 36);
    // 凡例
    ctx.font = '12px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText('単位：mm  ' + randDate(rnd) + '  作図：' + randName(rnd), margin, h - margin - 16);
  }

  function drawTypoPop(ctx, w, h, margin, rnd, cfg) {
    // 店内POP風。「ご自由にお持ちくさい」誤字
    ctx.fillStyle = inkColor(cfg);
    // 上下に装飾線
    ctx.strokeStyle = inkColor(cfg);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(margin + 40, margin + 60);
    ctx.lineTo(w - margin - 40, margin + 60);
    ctx.moveTo(margin + 40, h - margin - 60);
    ctx.lineTo(w - margin - 40, h - margin - 60);
    ctx.stroke();
    // メイン文字（特大）
    ctx.font = 'bold 80px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.textAlign = 'center';
    const popTexts = [
      'ご自由にお持ちくさい',
      'ご自由にお持ちくたさい',
      'ご自由におとり下さい',
      '自由にお持ち下さ',
      'コーピー使用禁止',
      '無料配布中',
      'ご来店ありがとう御座います',
    ];
    const main = pick(rnd, popTexts);
    // 改行で2行に
    const half = Math.ceil(main.length / 2);
    ctx.fillText(main.slice(0, half), w/2, margin + 220);
    ctx.fillText(main.slice(half), w/2, margin + 320);
    // 矢印（手描き風）
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(w/2 - 100, margin + 460);
    ctx.lineTo(w/2 + 100, margin + 460);
    ctx.lineTo(w/2 + 70, margin + 430);
    ctx.moveTo(w/2 + 100, margin + 460);
    ctx.lineTo(w/2 + 70, margin + 490);
    ctx.stroke();
    // サブ文字
    ctx.font = 'bold 36px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText('↓こちら', w/2, h - margin - 120);
    // 店舗風サイン
    ctx.font = '20px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
    ctx.fillText(pickPhrase(rnd, 2) + '商店  ' + randDate(rnd), w/2, h - margin - 80);
    ctx.textAlign = 'left';
  }

  /* ========== パターン関数マップ ========== */
  const PATTERN_FUNCTIONS = {
    memo: drawMemo,
    meeting: drawMeeting,
    data: drawDataSheet,
    graph: drawGraph,
    mail: drawMail,
    notice: drawNotice,
    fax: drawFax,
    plain: drawPlain,
    daily_report: drawDailyReport,
    weekly_report: drawWeeklyReport,
    monthly_report: drawMonthlyReport,
    travel_report: drawTravelReport,
    leave_request: drawLeaveRequest,
    expense_report: drawExpenseReport,
    org_chart: drawOrgChart,
    flow_chart: drawFlowChart,
    checklist: drawChecklist,
    invoice: drawInvoice,
    quote: drawQuote,
    inventory: drawInventory,
    schedule_table: drawScheduleTable,
    budget: drawBudget,
    progress_table: drawProgressTable,
    contract: drawContract,
    handwritten_memo: drawHandwrittenMemo,
    handwritten_doc: drawHandwrittenDoc,
    blueprint: drawBlueprint,
    typo_pop: drawTypoPop,
  };

  /* ========== ノイズ・スタンプ ========== */
  function drawNoise(ctx, w, h, rnd, amount) {
    const dots = Math.floor(w * h * amount * 0.0005);
    ctx.fillStyle = 'rgba(50,50,50,0.18)';
    for (let i = 0; i < dots; i++) {
      ctx.fillRect(rnd() * w, rnd() * h, rnd() < 0.9 ? 1 : 2, rnd() < 0.9 ? 1 : 2);
    }
  }

  function drawStamp(ctx, w, h, rnd, cfg) {
    const text = pick(rnd, STAMPS);
    ctx.save();
    ctx.translate(w / 2 + (rnd() - 0.5) * w * 0.6, h / 2 + (rnd() - 0.5) * h * 0.5);
    ctx.rotate((rnd() - 0.5) * 0.7);
    const size = 100 + rnd() * 80;
    // 主体はモノクロ印刷、たまに赤（社印・朱印イメージ）
    const isRed = rnd() < 0.12;
    let stroke, fill;
    if (isRed) {
      stroke = `rgba(180,40,40,${0.55 * cfg.alpha + 0.2})`;
      fill = `rgba(180,40,40,${0.6 * cfg.alpha + 0.2})`;
    } else {
      const k = 30 + Math.floor(rnd() * 30);
      stroke = `rgba(${k},${k},${k},${0.6 * cfg.alpha + 0.2})`;
      fill = `rgba(${k},${k},${k},${0.65 * cfg.alpha + 0.2})`;
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 4;
    ctx.strokeRect(-size / 1.4, -size / 2.2, size * 1.4, size);
    ctx.fillStyle = fill;
    ctx.font = `bold ${size * 0.7}px "Hiragino Sans","Yu Gothic","Meiryo",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  /* ========== 印刷失敗演出 ========== */
  const FAILURES = ['crooked', 'fold', 'sideways', 'smallOverlay', 'upsideDown', 'shift', 'copyUneven', 'rollerLine', 'staplerHole', 'excelOverflow', 'tornMemo', 'badFax', 'blackoutQuote'];

  function pickFailures(rnd, count) {
    if (count <= 0) return [];
    const transformGroup = ['crooked', 'sideways', 'upsideDown', 'shift', 'smallOverlay', 'excelOverflow', 'tornMemo', 'blackoutQuote'];
    const postGroup = ['fold', 'copyUneven', 'rollerLine', 'staplerHole', 'badFax'];
    const out = [];
    out.push(...pickN(rnd, transformGroup, 1));
    const rest = Math.max(0, count - 1);
    if (rest >= postGroup.length) {
      out.push(...postGroup);
      const dup = rest - postGroup.length;
      for (let i = 0; i < dup; i++) out.push(pick(rnd, postGroup));
    } else {
      out.push(...pickN(rnd, postGroup, rest));
    }
    return out;
  }

  /* 金額欄を黒ペンでぐちゃぐちゃ塗りつぶし */
  function drawBlackout(ctx, w, h, rnd) {
    // 右側の金額列付近（見積書は概ね右側）
    const x0 = w * 0.6;
    const x1 = w * 0.92;
    const y0 = h * 0.25;
    const y1 = h * 0.75;
    // 太い黒線をジグザグに何本も
    ctx.strokeStyle = 'rgba(0,0,0,0.95)';
    ctx.lineCap = 'round';
    const passes = 3 + Math.floor(rnd() * 4);
    for (let p = 0; p < passes; p++) {
      ctx.lineWidth = 8 + rnd() * 6;
      ctx.beginPath();
      const startY = y0 + p * ((y1 - y0) / passes) + (rnd() - 0.5) * 10;
      ctx.moveTo(x0 + rnd() * 20, startY);
      const steps = 10 + Math.floor(rnd() * 8);
      for (let s = 0; s < steps; s++) {
        const px = x0 + ((x1 - x0) * (s + 1)) / steps + (rnd() - 0.5) * 20;
        const py = startY + (rnd() - 0.5) * 40;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  function applyCopyUneven(ctx, w, h, rnd) {
    // インク節約：黒塗りはやめ、白い筋（インクかすれ）で「コピー機の不均一」を表現
    const stripes = 3 + Math.floor(rnd() * 4);
    for (let i = 0; i < stripes; i++) {
      const y = rnd() * h;
      const sh = 2 + rnd() * 12;
      ctx.fillStyle = `rgba(255,255,255,${0.5 + rnd() * 0.4})`;
      ctx.fillRect(0, y, w, sh);
    }
  }

  function applyRollerLine(ctx, w, h, rnd) {
    const stripes = 3 + Math.floor(rnd() * 4);
    for (let i = 0; i < stripes; i++) {
      const x = rnd() * w;
      const sw = 1 + rnd() * 3;
      ctx.fillStyle = `rgba(0,0,0,${0.25 + rnd() * 0.35})`;
      ctx.fillRect(x, 0, sw, h);
    }
  }

  function applyStaplerHole(ctx, w, h, rnd) {
    const cx = w * (0.05 + rnd() * 0.04);
    const cy = h * (0.05 + rnd() * 0.04);
    for (let i = 0; i < 2; i++) {
      const x = cx + i * 14;
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.fillRect(x, cy, 8, 2);
      ctx.fillStyle = 'rgba(180,180,180,0.7)';
      ctx.fillRect(x - 1, cy - 1, 10, 4);
    }
    ctx.fillStyle = 'rgba(80,80,80,0.5)';
    ctx.beginPath();
    ctx.arc(cx + 4, cy + 1, 1.5, 0, Math.PI * 2);
    ctx.arc(cx + 18, cy + 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function applyFoldShadow(ctx, w, h, rnd) {
    // インク節約：折り目の「線」のみ。広い暗領域は付けない。
    // 折り目は「中心が濃く左右に淡くなる」細いラインで表現（〜4px 程度）
    const vertical = rnd() < 0.5;
    if (vertical) {
      const fx = w * (0.3 + rnd() * 0.4);
      const grad = ctx.createLinearGradient(fx - 3, 0, fx + 3, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.55)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(fx - 3, 0, 6, h);
    } else {
      const fy = h * (0.3 + rnd() * 0.4);
      const grad = ctx.createLinearGradient(0, fy - 3, 0, fy + 3);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.55)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, fy - 3, w, 6);
    }
  }

  /* ========== 破れたメモ用紙のコピー（特例：周囲は黒OK） ========== */
  function drawTornMemo(ctx, w, h, rnd, cfg) {
    // 周囲はコピー機の蓋なしの黒
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillRect(0, 0, w, h);

    // メモ用紙のサイズと位置
    const memoW = w * (0.35 + rnd() * 0.2);
    const memoH = h * (0.28 + rnd() * 0.18);
    const mx = (w - memoW) / 2 + (rnd() - 0.5) * w * 0.15;
    const my = (h - memoH) / 2 + (rnd() - 0.5) * h * 0.15;

    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate((rnd() - 0.5) * 0.35);

    // 破れた輪郭をジグザグで作る
    const path = new Path2D();
    const segs = 18;
    const jitter = 7;
    const pts = [];
    for (let i = 0; i <= segs; i++) pts.push([(i / segs) * memoW, (rnd() - 0.5) * jitter * 2]);
    for (let i = 1; i <= segs; i++) pts.push([memoW + (rnd() - 0.5) * jitter * 2, (i / segs) * memoH]);
    for (let i = segs - 1; i >= 0; i--) pts.push([(i / segs) * memoW, memoH + (rnd() - 0.5) * jitter * 2]);
    for (let i = segs - 1; i >= 1; i--) pts.push([(rnd() - 0.5) * jitter * 2, (i / segs) * memoH]);
    path.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
    path.closePath();

    // 白で塗る（メモ用紙の地）
    ctx.fillStyle = '#FFFFFF';
    ctx.fill(path);

    // クリップしてメモパターンを内側に描画
    ctx.save();
    ctx.clip(path);
    drawMemo(ctx, memoW, memoH, Math.min(20, memoW * 0.06), rnd, cfg);
    ctx.restore();

    ctx.restore();
  }

  /* ========== 画質の悪すぎるFAX ========== */
  function applyBadFax(ctx, w, h, rnd) {
    // 横方向の細い濃淡帯（FAX解像度）。インクは増やさないように "白の筋" を主に
    for (let y = 0; y < h; y += 2) {
      if (rnd() < 0.35) {
        ctx.fillStyle = `rgba(255,255,255,${0.15 + rnd() * 0.25})`;
        ctx.fillRect(0, y, w, 1);
      }
    }
    // 横帯ノイズ（通信ノイズ・ライン抜け）
    const bands = 4 + Math.floor(rnd() * 5);
    for (let i = 0; i < bands; i++) {
      const y = rnd() * h;
      const bh = 1 + rnd() * 6;
      ctx.fillStyle = `rgba(255,255,255,${0.5 + rnd() * 0.4})`;
      ctx.fillRect(0, y, w, bh);
    }
    // 黒の細い横帯（解像度の粗さ＝太い走査線）も少しだけ
    const darkBands = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < darkBands; i++) {
      const y = rnd() * h;
      ctx.fillStyle = `rgba(0,0,0,${0.15 + rnd() * 0.2})`;
      ctx.fillRect(0, y, w, 1 + rnd() * 2);
    }
    // 全体の彩度低下＝薄い白被せ（コントラスト低下）
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(0, 0, w, h);
  }

  /* ========== Export ========== */
  window.EconofuriDummyEngine = {
    generateDummy,
    PATTERNS,
    FAILURES,
    PATTERN_COUNT: Object.keys(PATTERN_FUNCTIONS).length
  };
})();
