"""note見出し画像 v2：中央に黒・手書き風の「エコ」、その下に小さく「私の安全管理印刷」。
   両方ペン文字風。出力: note/note_header_v2.png（1280×670）
"""
from PIL import Image, ImageDraw, ImageFont
import os, random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "note_header_v2.png")

W, H = 1280, 670
INK = (25, 25, 25)


def get_font(size):
    candidates = [
        r"C:\Windows\Fonts\YuGothB.ttc",
        r"C:\Windows\Fonts\HGRPP1.TTC",
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


def render_char(ch, font, jitter=2.0, scale=4, fade=0.05):
    """1文字を手書き風アルファマスクに（255=黒）。"""
    rnd = random.Random(ord(ch) * 7 + 3)
    bbox = font.getbbox(ch)
    cw = (bbox[2] - bbox[0]) + 40
    chh = (bbox[3] - bbox[1]) + 40
    big = Image.new("L", (cw * scale, chh * scale), 0)
    d = ImageDraw.Draw(big)
    bigfont = font.font_variant(size=font.size * scale)
    bx = -bbox[0] * scale + 20 * scale
    by = -bbox[1] * scale + 20 * scale
    d.text((bx, by), ch, fill=255, font=bigfont)
    for _ in range(4):
        ox = rnd.uniform(-jitter, jitter) * scale
        oy = rnd.uniform(-jitter, jitter) * scale
        d.text((bx + ox, by + oy), ch, fill=220, font=bigfont)
    small = big.resize((cw, chh), Image.LANCZOS)
    px = small.load()
    for y in range(chh):
        for x in range(cw):
            v = px[x, y]
            if v < 30:
                px[x, y] = 0
            elif v > 60:
                if rnd.random() < fade:
                    px[x, y] = int(v * rnd.uniform(0.25, 0.6))
                else:
                    px[x, y] = min(255, int(v * 1.4))
    return small, cw, chh


def draw_text_handwritten(img, text, font, center_x, top_y, gap, rot=4, dyamp=10, jitter=2.0, fade=0.05):
    """手書き風に1行を中央寄せで描画。描画した行の高さを返す。"""
    rendered = [render_char(c, font, jitter=jitter, fade=fade) for c in text]
    total_w = sum(cw for _, cw, _ in rendered) + gap * (len(text) - 1)
    max_h = max(chh for _, _, chh in rendered)
    x = center_x - total_w // 2
    rnd = random.Random(hash(text) & 0xffff)
    for mask, cw, chh in rendered:
        angle = rnd.uniform(-rot, rot)
        dy = rnd.uniform(-dyamp, dyamp)
        ink_layer = Image.new("RGB", mask.size, INK)
        rot_mask = mask.rotate(angle, resample=Image.BICUBIC, expand=False)
        img.paste(ink_layer, (int(x), int(top_y + dy)), rot_mask)
        x += cw + gap
    return max_h


def main():
    random.seed(42)
    img = Image.new("RGB", (W, H), "white")

    # メイン「エコ」（大）
    main_font = get_font(120)
    # サブ「私の安全管理印刷」（小、ペン文字）
    sub_font = get_font(40)

    # レイアウト：メインを中央やや上、サブをその下に
    main_h = 150  # おおよその描画高
    sub_h = 60
    block_h = main_h + 30 + sub_h
    main_top = (H - block_h) // 2

    draw_text_handwritten(img, "エコ", main_font, center_x=W // 2, top_y=main_top,
                          gap=18, rot=4, dyamp=10, jitter=2.0, fade=0.05)

    sub_top = main_top + main_h + 30
    draw_text_handwritten(img, "私の安全管理印刷", sub_font, center_x=W // 2, top_y=sub_top,
                          gap=6, rot=3, dyamp=5, jitter=1.2, fade=0.04)

    img.save(OUT, "PNG")
    print(f"[OK] {OUT}")


if __name__ == "__main__":
    main()
