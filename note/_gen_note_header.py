"""note記事のトップ画像（見出し画像）を生成。
   白背景の中央に、黒の「エコ」を手書き風（ペン）で。
   出力: note/note_header.png（1280×670, noteの推奨比率）

   手書き感の出し方（Pillowのみ）：
   - フォントを高解像度で一旦描画
   - 各文字を微妙に回転・上下にずらす（紙に書いた揺れ）
   - 輪郭をわずかにジッターさせ、線にかすれ（白い抜け）を入れる
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os, math, random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "note_header.png")

W, H = 1280, 670
INK = (25, 25, 25)  # ほぼ黒（少し柔らかい黒）

def get_font(size):
    # 手書き風フォントがあれば優先、無ければ太めゴシック
    candidates = [
        r"C:\Windows\Fonts\YuGothB.ttc",
        r"C:\Windows\Fonts\HGRPP1.TTC",   # HG創英角ポップ体（あれば手書き寄り）
        r"C:\Windows\Fonts\meiryob.ttc",
        r"C:\Windows\Fonts\msgothic.ttc",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def render_char(ch, font, jitter=2.0, scale=4):
    """1文字を高解像度で描画し、輪郭をジッターさせた手書き風アルファマスクを返す。
       マスク値 = インクの濃さ（255=真っ黒）。"""
    rnd = random.Random(ord(ch) * 7 + 3)
    bbox = font.getbbox(ch)
    cw = (bbox[2] - bbox[0]) + 40
    chh = (bbox[3] - bbox[1]) + 40
    big = Image.new("L", (cw * scale, chh * scale), 0)
    d = ImageDraw.Draw(big)
    bigfont = font.font_variant(size=font.size * scale)
    bx = -bbox[0] * scale + 20 * scale
    by = -bbox[1] * scale + 20 * scale
    # 本体をしっかり濃く（255）描く
    d.text((bx, by), ch, fill=255, font=bigfont)
    # 手書きの揺れ：少しずらして重ね描き（線に強弱）。値も濃いめ
    for _ in range(4):
        ox = rnd.uniform(-jitter, jitter) * scale
        oy = rnd.uniform(-jitter, jitter) * scale
        d.text((bx + ox, by + oy), ch, fill=220, font=bigfont)
    # 縮小（アンチエイリアス）
    small = big.resize((cw, chh), Image.LANCZOS)
    # しきい値で締める：薄い縁だけ残しつつ本体を濃く
    px = small.load()
    for y in range(chh):
        for x in range(cw):
            v = px[x, y]
            if v < 30:
                px[x, y] = 0
            elif v > 60:
                # 本体はほぼ最大濃度に。たまにかすれ
                if rnd.random() < 0.05:
                    px[x, y] = int(v * rnd.uniform(0.25, 0.6))  # かすれ（インク抜け）
                else:
                    px[x, y] = min(255, int(v * 1.4))
    return small, cw, chh


def main():
    random.seed(42)
    img = Image.new("RGB", (W, H), "white")

    font = get_font(120)
    chars = "エコ"
    rendered = [render_char(c, font) for c in chars]

    gap = 18
    total_w = sum(cw for _, cw, _ in rendered) + gap * (len(chars) - 1)
    max_h = max(chh for _, _, chh in rendered)
    start_x = (W - total_w) // 2
    base_y = (H - max_h) // 2

    rnd = random.Random(99)
    x = start_x
    for mask, cw, chh in rendered:
        # 文字ごとに微回転＆上下のばらつき（手書きの揺れ）
        angle = rnd.uniform(-4, 4)
        dy = rnd.uniform(-10, 10)
        # インク色のRGB画像を作り、maskで合成
        ink_layer = Image.new("RGB", mask.size, INK)
        rotated_mask = mask.rotate(angle, resample=Image.BICUBIC, expand=False)
        img.paste(ink_layer, (int(x), int(base_y + dy)), rotated_mask)
        x += cw + gap

    img.save(OUT, "PNG")
    print(f"[OK] {OUT}")


if __name__ == "__main__":
    main()
