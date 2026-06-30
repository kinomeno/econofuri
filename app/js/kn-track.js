/* ===========================================
   キノメノ 共通アクセス計測タグ (kn-track) — Phase 1
   ===========================================
   役割：
   - ページ表示時に「起動(open)」を1回だけ送信（参照元ドメイン付き）
   - window.knTrack('goal') 等で任意の成果イベントを送信
   送るデータ：アプリID / イベント名 / 参照元ドメイン だけ。
   ★ ファイルの中身・入力内容・個人情報は一切送りません。IPはサーバー側でハッシュ化。

   使い方（HTML）：
     <script src="js/kn-track.js?v=x" data-kn-app="econofuri"></script>
   別アプリへ移すときは data-kn-app の値だけ変える（or window.KN_APP で指定）。
*/
(function () {
  'use strict';

  // 集計サーバー（song2game のクラウドを共用）
  var ENDPOINT = 'https://song2game-publish.kinomeno.workers.dev/track';

  // アプリID：script タグの data-kn-app、無ければ window.KN_APP
  var APP = '';
  try {
    var cs = document.currentScript;
    APP = (cs && cs.getAttribute('data-kn-app')) || window.KN_APP || '';
  } catch (e) {
    APP = window.KN_APP || '';
  }

  function send(event) {
    if (!APP || !event) return;
    try {
      var ref = '';
      try { ref = document.referrer || ''; } catch (e) {}
      var url = ENDPOINT +
        '?app=' + encodeURIComponent(APP) +
        '&event=' + encodeURIComponent(event) +
        (ref ? '&ref=' + encodeURIComponent(ref) : '') +
        '&_=' + (new Date()).getTime(); // キャッシュ回避（毎回記録させる）
      // 画像ビーコン：CORS不要・撃ちっぱなし（結果は読まない／DOMにも入れない）
      var img = new Image();
      img.referrerPolicy = 'no-referrer'; // ヘッダ経由でURL等を渡さない（refはdomainのみ明示送信）
      img.src = url;
    } catch (e) { /* 計測失敗はアプリ動作に影響させない */ }
  }

  // 他スクリプトから成果イベントを送れるよう公開
  window.knTrack = send;

  // 起動カウント（1ページ表示につき1回）
  send('open');
})();
