/* ===========================================
   キノメノ 共通アクセス計測タグ (kn-track) — Phase 1
   ===========================================
   役割：
   - ページ表示時に「起動(open)」を1回だけ送信（参照元ドメイン付き）
   - window.knTrack('goal') 等で成果イベントを送信
   送るデータ：アプリID / イベント名 / 参照元ドメイン だけ。
   ★ ファイルの中身・入力内容・個人情報は一切送りません。IPは集計サーバー側でハッシュ化。

   使い方（HTML）：
     <script src="js/kn-track.js?v=x" data-kn-app="econofuri"></script>
   別アプリへ移すときは data-kn-app の値だけ変える（or window.KN_APP で指定）。

   ■ 安全設計（直接アクセス・誤用への耐性）
   - このファイルをURL直打ちしても、ブラウザは中身を表示するだけで何も起きません（実行されない）。
   - data-kn-app / window.KN_APP が無ければ一切送信しません（他所に貼られても暴発しない）。
   - file:// など http(s) 以外、または非ブラウザ環境では何もしません。
   - イベント名は固定書式のみ・自動の open は1回だけ。例外は全て握りつぶし、アプリ動作に影響させません。
   - ※ クライアント計測である以上「リクエスト自体の偽装」は技術的に完全には防げません
     （世のアクセス解析すべてに共通）。サーバー側で app/イベント名を許可リスト検証し、
     主指標は IPハッシュで同日重複を除いた「ユニーク数」を採用して、いたずらの影響を最小化しています。
*/
(function () {
  'use strict';

  // ブラウザ以外／必要APIが無い環境では何もしない
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof Image === 'undefined') return;
  // http(s) のページ以外（file: など）では送らない
  try { if (!/^https?:$/.test(location.protocol)) return; } catch (e) { return; }

  // 集計サーバー（song2game のクラウドを共用）
  var ENDPOINT = 'https://song2game-publish.kinomeno.workers.dev/track';

  // アプリID：script タグの data-kn-app、無ければ window.KN_APP
  var APP = '';
  try {
    var cs = document.currentScript;
    APP = (cs && cs.getAttribute('data-kn-app')) || window.KN_APP || '';
  } catch (e) { APP = ''; }
  APP = String(APP || '').toLowerCase().trim();

  // アプリ名が未設定なら一切動かない（単体アクセス／他所への貼り付けでの暴発防止）
  if (!APP) return;

  var sentOpen = false;

  function send(event) {
    event = String(event || '').toLowerCase().trim();
    if (!/^[a-z0-9_]{1,32}$/.test(event)) return; // 想定外の名前は送らない
    try {
      var ref = '';
      try { ref = (document.referrer || '').slice(0, 300); } catch (e) {}
      var url = ENDPOINT +
        '?app=' + encodeURIComponent(APP) +
        '&event=' + encodeURIComponent(event) +
        (ref ? '&ref=' + encodeURIComponent(ref) : '') +
        '&_=' + (new Date()).getTime(); // キャッシュ回避（毎回サーバーへ届く）
      // 画像ビーコン：CORS不要・撃ちっぱなし（結果は読まない／DOMにも入れない）
      var img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.src = url;
    } catch (e) { /* 計測失敗はアプリ動作に影響させない */ }
  }

  // 他スクリプトから成果イベントを送れるよう公開
  window.knTrack = function (event) {
    // open は自動送信の1回のみ（二重送信・乱用を避ける）
    if (String(event || '').toLowerCase().trim() === 'open') {
      if (sentOpen) return;
      sentOpen = true;
    }
    send(event);
  };

  // 起動カウント（1ページ表示につき1回）
  sentOpen = true;
  send('open');
})();
