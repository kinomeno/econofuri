# エコノフリ / eco nofuri

> **印刷したいファイルを入れるだけで、表＝書類／裏＝裏紙風ダミーの表裏交互PDFを生成するブラウザアプリ。**

「裏紙を使え」と言われるオフィスで、新品の紙の裏側に「いかにも裏紙っぽい何か」を一緒に印刷してしまう、ちょっと馬鹿馬鹿しくて実用的なツール。

- 製品名：エコノフリ（英字：eco nofuri）
- キャッチ：私の**安全管理印刷**
- 作者：キノメノ / Kinomeno

## 特徴

- **ブラウザ完結**：すべての処理がブラウザ内で行われ、**ファイルは外部に送信されません**
- **対応形式**：PDF / PNG / JPG / WebP / txt / テキスト貼り付け（複数・フォルダごとOK）
- **表裏交互PDF**：表は投入ファイル、裏は28パターン×ランダム化で生成された裏紙風ダミー
- **濃度設定**：薄い／普通／濃い／**狂気**（印刷大失敗演出が乗る）
- **カモフラージュ画面モード**：Esc 2連打でGoogleスプレッドシート風UIに化ける（上司対策）
- **小窓モード**：右下に縮小して常駐
- **多言語**：日／英の完全切替
- 完全無料、サーバー費ゼロ

## 公開URL

**https://econofuri.vercel.app/**

## 動かしてみる

ローカルで試す：

```bash
cd app
python -m http.server 8030
# → http://localhost:8030/
```

## 技術構成

- 素のHTML / CSS / JavaScript（ビルド不要）
- pdf-lib 1.17（PDF組立、CDN）
- pdf.js 3.11（PDF読込、CDN）
- 裏ダミー生成は独立モジュール（`app/js/dummy-engine.js`）

## ファイル構成

```
エコノフリ/
├── app/                    # 公開アプリ本体（Vercel/GitHub Pagesの公開ルート）
│   ├── index.html
│   ├── favicon.svg
│   ├── css/
│   └── js/
├── テスト用ファイル/        # 動作確認用サンプル
├── note/                   # 公開記事原稿
├── GPTIMAGE/               # 参考画像
├── 引継ぎ.md               # 次のAI向け引継ぎ
├── 実装履歴.md             # 詳細実装ログ
├── vercel.json             # Vercelデプロイ設定（app/を公開）
└── README.md               # このファイル
```

## デプロイ

- **Vercel**：`vercel.json` の `outputDirectory: "app"` で `app/` を自動公開
- **GitHub Pages**：Settings → Pages で `app/` を Source に指定

## 紹介記事

note：https://note.com/kinomeno/n/ne88c1090c994

## 支援

このアプリは無料で公開しています。気に入ったら：

- [ko-fi](https://ko-fi.com/kinomeno) で支援
- [note](https://note.com/kinomeno) でチップ
- Xでシェア（アプリ内のシェアボタンから）

## ライセンス

© キノメノ / Kinomeno. 個人利用は自由。商用配布・改変版の再配布はご相談ください（LICENSE 参照）。
