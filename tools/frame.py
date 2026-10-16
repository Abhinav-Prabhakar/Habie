"""Puts raw captures from tools/mockups.js into an iPad (A16) frame for the README.

    python3 tools/frame.py <raw-dir> [docs/images]

PNG screenshots (taken at 2x) become framed PNGs; .webm recordings become framed GIFs (ffmpeg).
"""
import pathlib, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter

RAW = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'docs/raw')
OUT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else 'docs/images')
OUT.mkdir(parents=True, exist_ok=True)
SCREEN = (1180, 820)                     # points, landscape


def rounded(size, radius, fill=255):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=fill)
    return m


def device(k, pad, bg=None):
    """Returns (canvas, screen_box). k = pixels per point."""
    sw, sh = SCREEN[0] * k, SCREEN[1] * k
    bez, edge, rs = 24 * k, 4 * k, 18 * k
    dw, dh = sw + 2 * (bez + edge), sh + 2 * (bez + edge)
    W, H = dw + 2 * pad, dh + 2 * pad
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    if bg:
        g = Image.new('RGBA', (W, H))
        top, bot = bg
        for y in range(H):
            t = y / (H - 1)
            g.paste(tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)) + (255,), (0, y, W, y + 1))
        canvas = g
    ox, oy = pad, pad
    # shadow
    sh_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh_layer).rounded_rectangle((ox + 10 * k, oy + 22 * k, ox + dw - 10 * k, oy + dh + 8 * k), radius=rs + bez + edge, fill=(40, 30, 90, 110))
    canvas = Image.alpha_composite(canvas, sh_layer.filter(ImageFilter.GaussianBlur(26 * k)))
    # aluminium edge with a soft vertical sheen
    alu = Image.new('RGBA', (dw, dh))
    for y in range(dh):
        t = y / (dh - 1)
        c = int(226 - 40 * abs(t - 0.35))
        alu.paste((c, c + 1, c + 5, 255), (0, y, dw, y + 1))
    canvas.paste(alu, (ox, oy), rounded((dw, dh), rs + bez + edge))
    # black glass
    glass = Image.new('RGBA', (dw - 2 * edge, dh - 2 * edge), (16, 16, 19, 255))
    canvas.paste(glass, (ox + edge, oy + edge), rounded(glass.size, rs + bez))
    d = ImageDraw.Draw(canvas)
    # thin inner highlight on the glass edge
    d.rounded_rectangle((ox + edge, oy + edge, ox + dw - edge - 1, oy + dh - edge - 1), radius=rs + bez, outline=(70, 70, 78, 255), width=max(1, k))
    # front camera sits on the long (top) edge in landscape
    cx, cy, cr = ox + dw // 2, oy + edge + bez // 2, 3 * k
    d.ellipse((cx - cr, cy - cr, cx + cr, cy + cr), fill=(34, 36, 48, 255))
    d.ellipse((cx - cr // 2, cy - cr // 2, cx, cy), fill=(70, 80, 120, 255))
    box = (ox + edge + bez, oy + edge + bez, sw, sh, rs)
    return canvas, box


def frame_png(src, dst, width=1600):
    shot = Image.open(src).convert('RGBA')
    k = shot.size[0] // SCREEN[0]
    canvas, (x, y, sw, sh, rs) = device(k, 40 * k)
    canvas.paste(shot.resize((sw, sh)), (x, y), rounded((sw, sh), rs))
    canvas = canvas.resize((width, round(canvas.size[1] * width / canvas.size[0])), Image.LANCZOS)
    canvas.save(dst, optimize=True)


def frame_gif(src, dst, width=880, fps=10, skip=2.2):
    canvas, (x, y, sw, sh, rs) = device(1, 36, bg=((239, 238, 254), (251, 236, 244)))
    hole = Image.new('L', canvas.size, 255)
    hole.paste(0, (x, y), rounded((sw, sh), rs))
    over = canvas.copy(); over.putalpha(hole)
    over_path = RAW / f'_{src.stem}_frame.png'
    over.save(over_path)
    W, H = canvas.size
    graph = (f"[0:v]fps={fps},scale={sw}:{sh},pad={W}:{H}:{x}:{y}:black[v];[v][1:v]overlay=0:0,"
             f"scale={width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];"
             f"[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle")
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(skip), '-i', str(src), '-i', str(over_path),
                    '-filter_complex', graph, '-loop', '0', str(dst)], check=True)
    over_path.unlink()


for f in sorted(RAW.glob('*.png')):
    if f.name.startswith('_'):
        continue
    frame_png(f, OUT / f.name)
    print('framed', f.name)
for f in sorted(RAW.glob('*.webm')):
    frame_gif(f, OUT / f'{f.stem}.gif')
    print('gif', f.stem, f'{(OUT / f"{f.stem}.gif").stat().st_size / 1e6:.1f} MB')
