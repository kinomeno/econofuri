"""note記事のトップ画像（見出し画像）を生成。
   白背景の中央に、緑の「エコ」を小さく。
   出力: note/note_header.png（1280×670, noteの推奨比率）
"""
from PIL import Image, ImageDraw, ImageFont
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "note_header.png")

W, H = 1280, 670
GREEN_DEEP = (91, 160, 96)   # #5BA060

def get_font(size, bold=True):
    candidates = [
        r"C:\Windows\Fonts\YuGothB.ttc" if bold else r"C:\Windows\Fonts\YuGothR.ttc",
        r"C:\Windows\Fonts\meiryob.ttc" if bold else r"C:\Windows\Fonts\meiryo.ttc",
        r"C:\Windows\Fonts\YuGothM.ttc",
        r"C:\Windows\Fonts\msgothic.ttc",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

def main():
    img = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(img)

    # 「エコ」を緑で、小さめ・中央に
    font = get_font(120, bold=True)
    text = "エコ"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (W - tw) / 2 - bbox[0]
    y = (H - th) / 2 - bbox[1]
    draw.text((x, y), text, fill=GREEN_DEEP, font=font)

    img.save(OUT, "PNG")
    print(f"[OK] {OUT}")

if __name__ == "__main__":
    main()
