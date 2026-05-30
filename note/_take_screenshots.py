"""エコノフリの note 用スクショを Playwright で自動撮影。
   実行: python _take_screenshots.py
   出力: note/スクショ/ に7枚
"""
from playwright.sync_api import sync_playwright
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "スクショ")
os.makedirs(OUT, exist_ok=True)

URL = "http://localhost:8030/"

PASTE_TEXT = """会議資料サンプル
プロジェクト進捗報告
本日の議題と決定事項
1. 来月の予算配分について
2. 新システム導入の検討
3. 各部署からの報告
以上、関係者各位はご確認ください。"""

def shot(page, name):
    path = os.path.join(OUT, name)
    page.screenshot(path=path, full_page=False)
    print(f"[OK] {name}")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={"width": 1400, "height": 900},
                                       device_scale_factor=1.5,
                                       locale="ja-JP")
        page = context.new_page()
        page.set_default_timeout(15000)

        # ----- 01: トップ画面 -----
        page.goto(URL + "?bust=screenshot1")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        shot(page, "01_トップ画面.png")

        # ----- ファイルを投入する（テストファイルを直接アップロード） -----
        test_dir = os.path.join(os.path.dirname(HERE), "テスト用ファイル")
        page.set_input_files("#file-input", [
            os.path.join(test_dir, "01_短文.txt"),
            os.path.join(test_dir, "04_画像_横長.png"),
            os.path.join(test_dir, "06_PDF_1ページ.pdf"),
        ])
        # 3つの result-item が揃うまで待つ
        page.wait_for_function(
            "document.querySelectorAll('.result-item').length >= 3 && !document.getElementById('processing-overlay').classList.contains('active')",
            timeout=60000
        )
        page.wait_for_timeout(800)

        # ----- 02: ファイル投入後（結果一覧） -----
        shot(page, "02_ファイル投入後.png")

        # ----- 03: プレビュー画面 -----
        # 最初の result-item の表示ボタン
        page.locator('.result-item').first.locator('[data-act="preview"]').click()
        page.wait_for_timeout(1200)
        shot(page, "03_プレビュー画面.png")
        page.click("#preview-close")
        page.wait_for_timeout(400)

        # ----- 04: 設定パネル -----
        page.click("#btn-settings")
        page.wait_for_timeout(400)
        shot(page, "04_設定パネル.png")
        page.click("#settings-close")
        page.wait_for_timeout(300)

        # ----- 05: 擬態モード（スプレッドシート風） -----
        # Esc 2連打で発動。state.lastEscAt の 400ms 窓内に2回
        page.keyboard.press("Escape")
        page.wait_for_timeout(150)
        page.keyboard.press("Escape")
        page.wait_for_timeout(600)
        shot(page, "05_擬態モード_スプレッドシート風.png")
        page.click("#cam-exit")
        page.wait_for_timeout(400)

        # ----- 06: 小窓モード -----
        page.click("#btn-mini")
        page.wait_for_timeout(600)
        shot(page, "06_小窓モード.png")
        page.click("#mini-panel-expand")
        page.wait_for_timeout(400)

        # ----- 07: 狂気モード生成例（プレビュー画面で表＋裏が狂気） -----
        page.select_option("#density-select", "extreme")
        page.wait_for_timeout(300)
        page.click("#btn-regenerate")
        # 再生成は processing-overlay 出ない（旧コード）。少し長めに待つ
        page.wait_for_timeout(15000)
        page.locator('.result-item').first.locator('[data-act="preview"]').click()
        page.wait_for_timeout(1500)
        shot(page, "07_狂気モード生成例.png")

        browser.close()
    print("[DONE] 7枚撮影完了")

if __name__ == "__main__":
    main()
