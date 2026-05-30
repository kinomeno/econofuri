/* ===========================================
   エコノフリ / eco nofuri — 多言語辞書と切替
   ===========================================
   仕様：全UI日英切替。開始時に navigator.language で自動判定、
   localStorageに保存。data-i18n="key" のテキストを置換する。
*/

const I18N = {
  ja: {
    // ヘッダー
    settings: '設定',
    mini: '小窓表示',
    // Hero
    subtitle2: '安全管理印刷',
    catch1: '印刷したいファイルを入れるだけ。',
    catchMid: 'はそのまま、',
    catchMid2: 'はいかにも',
    catchEnd: 'っぽく。',
    accentSurface: '表',
    accentBack: '裏',
    accentReuse: '裏紙',
    // ミニ図解
    flow1: '投入ファイル',
    flow1Sub: 'PDF / 画像 / txt',
    flow2: '表＝書類／裏＝ダミー',
    flow2Sub: '表裏交互のPDFを生成',
    flow3: '両面印刷',
    flow3Sub: '"裏紙を使っている体裁"に',
    // ドロップエリア
    dropTitle: 'ここにファイルをドラッグ＆ドロップ',
    dropSub: 'またはクリックして選択',
    dropTypes: '対応：PDF / 画像（PNG, JPG, WebP）/ txt / テキスト貼り付け',
    dropMulti: '複数ファイル・フォルダの投入もOK（直下のファイルのみ）',
    // Features
    featuresTitle: 'エコノフリでできること',
    feat1Title: '表はそのまま',
    feat1Desc: '投入したファイルをそのまま表面にします',
    feat2Title: '裏はダミーでカモフラージュ',
    feat2Desc: 'いかにも裏紙っぽいダミーを1枚ごとに自動生成します',
    feat3Title: '表裏交互のPDFを生成',
    feat3Desc: '両面印刷するだけで裏紙を使っている体裁に',
    // プライバシー
    privacy: 'すべてブラウザ内で処理しています。ファイルは外部に送信されません。',
    privacyMore: 'プライバシーについて ›',
    // Esc
    escHint: 'を2連打で擬態モードへ',
    // フッター
    kofi: 'ko-fiで支援',
    noteTip: 'noteでチップ',
    shareX: 'Xでシェア',
    shareText: 'エコノフリ — 印刷したいファイルを入れるだけで、表は書類／裏は裏紙風ダミーの表裏交互PDFを生成。私の安全管理印刷。',
    shareHashtags: 'エコノフリ,安全管理印刷',
    // 貼り付け欄
    pasteToggle: 'テキストを貼り付けて投入する',
    pasteAdd: 'この内容で1ファイルとして追加',
    // 結果
    resultsTitle: '生成結果',
    ken: '件',
    printAll: '全て印刷',
    preview: '表示',
    print: '印刷',
    save: 'PDFを保存',
    addFile: 'ファイル追加',
    backToTop: 'タイトルに戻る',
    miniEmpty: 'ファイルを追加してください',
    howTo: '使い方',
    howStep1: 'ファイルを投入',
    howStep1Desc: '：PDF / 画像 / txt をドラッグ＆ドロップ、クリック選択、貼り付け、フォルダごとどれでも。',
    howStep2: '表裏交互PDF',
    howStep2Desc: '：投入したファイルが表、自動生成のダミーが裏。表面はそのまま読める。',
    howStep3: '確認・印刷・保存',
    howStep3Desc: '：「表示」で中身を見て、「印刷」で両面印刷、「PDFを保存」でダウンロード。',
    howStep4: '濃度切替',
    howStep4Desc: '：薄い／普通／濃い／狂気 で裏紙の盛り具合が変わる。「狂気」は印刷大失敗演出が乗る。',
    howStep5: '緊急回避',
    howStep5Desc: '：Escキー2連打で擬態モードへ（上司が来たとき用）。',
    howNote: 'すべてブラウザ内で処理。ファイルは外部に送信されません。',
    supportTitle: '気に入ったら…',
    supportText: '無料で公開しているアプリです。「面白かった」「役に立った」と思っていただけたら、開発の励みになります。よろしければ支援・シェアをお願いします。',
    supportKofi: '☞ ko-fiで支援',
    supportNote: '☞ noteでチップ',
    supportShare: 'Xでシェアして応援',
    previewFront: '表',
    previewBack: '裏',
    regenBack: '裏を再作成',
    regenerating: '再生成中…',
    densityNote: '変更すると、結果一覧の濃度セレクトと同期します。',
    screenMode: '画面モード',
    modeStandard: 'スタンダード',
    modeSpreadsheet: 'スプレッドシート風',
    modeTask: 'タスク管理風',
    modeMail: 'メールクライアント風',
    modeFileTransfer: 'ファイル転送ツール風',
    free: '無料',
    paid: '🔒 有料',
    paidUnlock: '有料パターンの解放',
    paidUnlockText: '追加パターン（業界別ダミー・有料の画面モード）は解放パスワードで使えるようになります。<br>・購入はこちら（noteの販売ページ「キノメノのパスワード」へリンク）<br>・<b>会員登録は不要</b>です。メールアドレスだけで購入できます。<br>・支払いは PayPay・クレジットカード・Amazon Pay などから選べます。<br>・購入後、メールでパスワードが届きます。',
    unlock: '解除',
    buyHere: '☞ 購入はこちら（noteの販売ページへ）',
    other: 'その他',
    doublePrintNote: '印刷時に両面印刷を推奨するメッセージを表示',
    autoPreview: '生成後にプレビューを開く',
    unlockOk: '✓ 解除済み',
    unlockFail: '✗ パスワードが違います',
    density: 'ダミー濃度',
    dLight: '薄い',
    dNormal: '普通',
    dHeavy: '濃い',
    dExtreme: '狂気',
    regenerate: 'この濃度で作り直す',
    processing: '生成中…',
    completedMsg: '件 完了',
    skippedMsg: '件 スキップ（対応外）',
    pageUnit: 'ページ',
    kindPdf: 'PDF',
    kindImage: '画像',
    kindText: 'テキスト',
  },
  en: {
    settings: 'Settings',
    mini: 'Mini view',
    subtitle2: 'safety-managed printing',
    catch1: 'Just drop in the file you want to print.',
    catchMid: ' stays as is, ',
    catchMid2: ' looks just like ',
    catchEnd: '.',
    accentSurface: 'Front',
    accentBack: 'Back',
    accentReuse: 'recycled paper',
    flow1: 'Input file',
    flow1Sub: 'PDF / Image / txt',
    flow2: 'Front = doc / Back = dummy',
    flow2Sub: 'Alternating PDF generated',
    flow3: 'Double-sided print',
    flow3Sub: 'Looks like recycled paper',
    dropTitle: 'Drag & drop files here',
    dropSub: 'or click to select',
    dropTypes: 'Supports: PDF / Image (PNG, JPG, WebP) / txt / pasted text',
    dropMulti: 'Multiple files and folders accepted (top-level files only)',
    featuresTitle: 'What eco nofuri does',
    feat1Title: 'Front, untouched',
    feat1Desc: 'Your file becomes the front side, as is.',
    feat2Title: 'Back, camouflaged',
    feat2Desc: 'A unique recycled-paper-looking dummy per page, auto-generated.',
    feat3Title: 'Alternating front/back PDF',
    feat3Desc: 'Print double-sided and it looks like you used recycled paper.',
    privacy: 'Everything runs in your browser. Files are never sent externally.',
    privacyMore: 'About privacy ›',
    escHint: 'twice for camouflage mode',
    kofi: 'Support on ko-fi',
    noteTip: 'Tip on note',
    shareX: 'Share on X',
    shareText: 'eco nofuri — drop a file, get a front/back-alternating PDF with a recycled-paper-looking dummy on the back.',
    shareHashtags: 'econofuri',
    pasteToggle: 'Paste text to add as a file',
    pasteAdd: 'Add as one file',
    resultsTitle: 'Results',
    ken: '',
    printAll: 'Print all',
    preview: 'View',
    print: 'Print',
    save: 'Save PDF',
    addFile: 'Add file',
    backToTop: 'Back to top',
    miniEmpty: 'No files yet',
    howTo: 'How to use',
    howStep1: 'Drop files',
    howStep1Desc: ': PDF / Image / txt — drag & drop, click to choose, paste, or whole folders.',
    howStep2: 'Front/back PDF',
    howStep2Desc: ': Your file becomes the front, an auto-generated dummy becomes the back. The front stays readable.',
    howStep3: 'View / Print / Save',
    howStep3Desc: ': "View" to preview, "Print" for double-sided printing, "Save PDF" to download.',
    howStep4: 'Density',
    howStep4Desc: ': Light / Normal / Heavy / Extreme — controls how busy the back is. "Extreme" adds printing-failure effects.',
    howStep5: 'Emergency',
    howStep5Desc: ': Double-tap Esc to switch to camouflage mode (when the boss approaches).',
    howNote: 'Everything runs in your browser. Files are never sent externally.',
    supportTitle: 'If you liked it…',
    supportText: 'This app is free. If you found it fun or useful, your support keeps me building things like this. Tips and shares are very welcome.',
    supportKofi: '☞ Support on ko-fi',
    supportNote: '☞ Tip on note',
    supportShare: 'Share on X to support',
    previewFront: 'Front',
    previewBack: 'Back',
    regenBack: 'Regenerate back',
    regenerating: 'Regenerating…',
    densityNote: 'Syncs with the density selector in the results list.',
    screenMode: 'Screen mode',
    modeStandard: 'Standard',
    modeSpreadsheet: 'Spreadsheet',
    modeTask: 'Task tracker',
    modeMail: 'Mail client',
    modeFileTransfer: 'File transfer tool',
    free: 'Free',
    paid: '🔒 Paid',
    paidUnlock: 'Unlock paid patterns',
    paidUnlockText: 'Additional patterns (industry-specific dummies, paid screen modes) are unlocked with a password.<br>・Buy here (note paid article "Kinomeno passwords")<br>・<b>No sign-up required</b>. Just an email address.<br>・Pay with PayPay / credit card / Amazon Pay etc.<br>・The password is delivered by email after purchase.',
    unlock: 'Unlock',
    buyHere: '☞ Buy here (note sales page)',
    other: 'Other',
    doublePrintNote: 'Show double-sided print hint',
    autoPreview: 'Open preview after generation',
    unlockOk: '✓ Unlocked',
    unlockFail: '✗ Wrong password',
    density: 'Dummy density',
    dLight: 'Light',
    dNormal: 'Normal',
    dHeavy: 'Heavy',
    dExtreme: 'Extreme',
    regenerate: 'Regenerate with this density',
    processing: 'Generating…',
    completedMsg: ' done',
    skippedMsg: ' skipped (unsupported)',
    pageUnit: ' pages',
    kindPdf: 'PDF',
    kindImage: 'Image',
    kindText: 'Text',
  }
};

const LANG_STORAGE_KEY = 'econofuri.lang';

function detectInitialLang() {
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved === 'ja' || saved === 'en') return saved;
  const nav = (navigator.language || 'en').toLowerCase();
  return nav.startsWith('ja') ? 'ja' : 'en';
}

function applyLang(lang) {
  if (!I18N[lang]) return;
  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = I18N[lang][key];
    if (val !== undefined) el.textContent = val;
  });
  // 言語切替ボタンのactive状態を更新
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  localStorage.setItem(LANG_STORAGE_KEY, lang);
}

// 起動時に適用
document.addEventListener('DOMContentLoaded', () => {
  applyLang(detectInitialLang());
});

// グローバルに公開（main.jsから呼ぶ）
window.EconofuriI18n = { applyLang, detectInitialLang, I18N };
