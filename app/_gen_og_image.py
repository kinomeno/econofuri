"""OGP画像（og-image.png、1200x630）を生成するスクリプト。
SNS共有時に表示される。Pillowで生成。
"""
from PIL import Image, ImageDraw, ImageFont
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def get_font(size=24, bold=False):
    candidates_bold = [
        r"C:\Windows\Fonts\YuGothB.ttc",
        r"C:\Windows\Fonts\meiryob.ttc",
        r"C:\Windows\Fonts\msgothic.ttc",
    ]
    candidates = [
        r"C:\Windows\Fonts\YuGothM.ttc",
        r"C:\Windows\Fonts\meiryo.ttc",
        r"C:\Windows\Fonts\msgothic.ttc",
    ]
    target = candidates_bold if bold else candidates
    for p in target:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def make_og_image():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), "#FFFFFF")
    draw = ImageDraw.Draw(img)
    # 緑の装飾帯（左）
    draw.rectangle([(0, 0), (12, H)], fill="#5BA060")
    # 紙のSVG風アイコン（中央左、大きく）
    px, py = 130, 200
    pw, ph = 180, 240
    # 表面
    draw.polygon([(px, py), (px + pw - 50, py), (px + pw, py + 50),
                  (px + pw, py + ph), (px, py + ph)],
                 fill="#FFFFFF", outline="#5BA060", width=4)
    # めくれた角
    draw.polygon([(px + pw - 50, py), (px + pw, py + 50), (px + pw - 50, py + 50)],
                 fill="#7BBC7E", outline="#5BA060")
    # 罫線
    for i, w_line in enumerate([130, 140, 100]):
        y = py + 90 + i * 20
        draw.line([(px + 20, y), (px + 20 + w_line, y)], fill="#C8DCC9", width=2)

    # メインタイトル「エコノフリ」（エコ大、ノフリ小）
    f_eco = get_font(120, bold=True)
    f_nofuri = get_font(80, bold=False)
    f_en = get_font(36, bold=True)
    f_en_small = get_font(28)
    f_catch = get_font(28, bold=True)
    f_sub = get_font(20)

    title_x = 380
    draw.text((title_x, 130), "エコ", fill="#5BA060", font=f_eco)
    draw.text((title_x + 260, 180), "ノフリ", fill="#202124", font=f_nofuri)

    # 英字
    draw.text((title_x, 290), "eco", fill="#5BA060", font=f_en)
    draw.text((title_x + 90, 295), "nofuri", fill="#777777", font=f_en_small)

    # キャッチ
    draw.text((title_x, 360), "印刷したいファイルを入れるだけ。", fill="#202124", font=f_catch)
    draw.text((title_x, 400), "表はそのまま、裏はいかにも裏紙っぽく。", fill="#5BA060", font=f_catch)

    # 著者
    draw.text((title_x, 500), "私の 安全管理印刷  ／  キノメノ", fill="#888888", font=f_sub)

    # 下部にプライバシー注記
    draw.text((40, H - 40), "🔒 すべてブラウザ内で処理。ファイルは外部に送信されません。", fill="#9AA0A6", font=f_sub)

    img.save(os.path.join(HERE, "og-image.png"), "PNG", optimize=True)
    print("og-image.png generated")


if __name__ == "__main__":
    make_og_image()
