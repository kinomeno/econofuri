"""エコノフリ用テスト画像／PDFを生成するスクリプト。
Pillow のみ使用（reportlab 不要）。
このスクリプト自体もこのフォルダに置き、いつでも再生成可能にする。
"""
from PIL import Image, ImageDraw, ImageFont
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def get_font(size=24):
    """Windows のシステムフォントから日本語が使えるものを探す。"""
    candidates = [
        r"C:\Windows\Fonts\YuGothM.ttc",
        r"C:\Windows\Fonts\meiryo.ttc",
        r"C:\Windows\Fonts\msgothic.ttc",
        r"C:\Windows\Fonts\YuGothR.ttc",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def make_landscape_image(path):
    """横長サンプル画像（請求書風モック）"""
    W, H = 1280, 720
    img = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(img)
    title_font = get_font(40)
    body_font = get_font(22)

    draw.rectangle([(0, 0), (W, 80)], fill="#5BA060")
    draw.text((40, 18), "テスト用画像（横長）", fill="white", font=title_font)

    draw.text((40, 120), "■ サンプル見積書（架空）", fill="black", font=body_font)
    rows = [
        ("品目", "数量", "単価", "金額"),
        ("作業A", "10", "1,200", "12,000"),
        ("作業B", "5",  "2,400", "12,000"),
        ("作業C", "8",  "1,800", "14,400"),
        ("合計", "",    "",      "38,400"),
    ]
    x0, y0 = 40, 180
    cw = [180, 100, 140, 160]
    rh = 44
    for ri, row in enumerate(rows):
        for ci, cell in enumerate(row):
            x = x0 + sum(cw[:ci])
            y = y0 + ri * rh
            draw.rectangle([x, y, x + cw[ci], y + rh], outline="#7BBC7E", width=1)
            draw.text((x + 10, y + 10), cell, fill="black", font=body_font)

    draw.text((40, H - 60), "※ テスト用に生成された架空のデータです。", fill="#777", font=body_font)
    img.save(path, "PNG")


def make_portrait_image(path):
    """縦長サンプル画像（メモ風）"""
    W, H = 720, 1280
    img = Image.new("RGB", (W, H), "#FAFAF7")
    draw = ImageDraw.Draw(img)
    title_font = get_font(36)
    body_font = get_font(22)

    draw.rectangle([(0, 0), (W, 70)], fill="#E54B4B")
    draw.text((30, 16), "縦長サンプル画像", fill="white", font=title_font)

    notes = [
        "本日のタスク",
        "  ・午前：会議資料のレビュー",
        "  ・午後：来月の見積もり作成",
        "  ・夕方：メール返信まとめ",
        "",
        "明日の予定",
        "  ・10:00 定例ミーティング",
        "  ・13:30 顧客打ち合わせ",
        "  ・16:00 進捗報告会",
        "",
        "備考",
        "  ・この内容はすべて架空のものです。",
        "  ・エコノフリの縦画像投入テスト用です。",
    ]
    y = 120
    for line in notes:
        draw.text((40, y), line, fill="black", font=body_font)
        y += 38

    img.save(path, "JPEG", quality=88)


def make_pdf_single(path):
    """1ページPDF"""
    W, H = 1240, 1754
    img = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(img)
    title_font = get_font(56)
    body_font = get_font(30)

    draw.text((100, 100), "テスト用PDF（1ページ）", fill="#5BA060", font=title_font)
    draw.line([(100, 200), (W - 100, 200)], fill="#7BBC7E", width=3)

    lines = [
        "これはエコノフリの動作確認用に作られた、",
        "1ページのみのテスト用PDFです。",
        "",
        "投入すると：",
        "  ・このページが表面になる",
        "  ・裏面に自動生成された裏紙ダミーが入る",
        "",
        "計2ページのPDFが生成されるはずです。",
        "",
        "※ 内容はすべて架空・無意味なものです。",
    ]
    y = 280
    for line in lines:
        draw.text((100, y), line, fill="black", font=body_font)
        y += 56

    img.save(path, "PDF", resolution=150.0)


def make_pdf_multi(path):
    """3ページPDF"""
    W, H = 1240, 1754
    pages = []
    for page_no in range(1, 4):
        img = Image.new("RGB", (W, H), "white")
        draw = ImageDraw.Draw(img)
        title_font = get_font(56)
        body_font = get_font(30)
        page_font = get_font(22)

        draw.text((100, 100), "テスト用PDF（複数ページ）", fill="#5BA060", font=title_font)
        draw.line([(100, 200), (W - 100, 200)], fill="#7BBC7E", width=3)
        draw.text((100, 230), f"ページ {page_no} / 3", fill="#777", font=page_font)

        if page_no == 1:
            content = [
                "これは複数ページPDFのテストファイルです。",
                "",
                "投入後の期待動作：",
                "  ・3ページの表面に、それぞれ別の裏ダミーが付く",
                "  ・合計6ページの表裏交互PDFが生成される",
                "  ・裏ダミーは1枚ごとに別パターン（同じにならない）",
            ]
        elif page_no == 2:
            content = [
                "2ページ目の内容です。",
                "",
                "ここでも表は普通の書類のように",
                "見えていれば成功です。",
                "",
                "ダミーは裏側にのみ自動生成されます。",
            ]
        else:
            content = [
                "3ページ目です。",
                "",
                "最終ページなので、ここの裏面にも",
                "別パターンのダミーが付くはずです。",
                "",
                "両面印刷を想定した順序になっているか",
                "確認してください。",
            ]
        y = 280
        for line in content:
            draw.text((100, y), line, fill="black", font=body_font)
            y += 56
        pages.append(img)

    pages[0].save(path, "PDF", resolution=150.0, save_all=True, append_images=pages[1:])


def main():
    make_landscape_image(os.path.join(HERE, "04_画像_横長.png"))
    make_portrait_image(os.path.join(HERE, "05_画像_縦長.jpg"))
    make_pdf_single(os.path.join(HERE, "06_PDF_1ページ.pdf"))
    make_pdf_multi(os.path.join(HERE, "07_PDF_複数ページ.pdf"))
    print("done")


if __name__ == "__main__":
    main()
