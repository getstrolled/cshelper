"""
Remove top red/orange banner + corner branding from callout radar AVIFs.
Writes PNGs next to inputs: <name>.clean.png (does not modify originals).

 deps: pip install pillow pillow-avif-plugin numpy opencv-python-headless
"""
from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

import pillow_avif.AvifImagePlugin  # noqa: F401 — registers AVIF with Pillow


def red_text_mask(rgb: np.ndarray, y0: int, y1: int, *, rmin: float = 46, rg_gap: float = 6) -> np.ndarray:
    """Warm/red/orange watermark text in horizontal strip only (never below y1)."""
    h, w = rgb.shape[:2]
    band = np.zeros((h, w), dtype=bool)
    band[y0:y1, :] = True
    r = rgb[:, :, 0].astype(np.float32)
    g = rgb[:, :, 1].astype(np.float32)
    b = rgb[:, :, 2].astype(np.float32)
    maxgb = np.maximum(g, b)
    return band & (r > rmin) & (r > maxgb + rg_gap) & (r - maxgb > 10)


def top_strip_second_pass(rgb: np.ndarray, y1: int) -> np.ndarray:
    """Weaker threshold for anti-aliased remnants left in the banner rows."""
    return red_text_mask(rgb, 20, y1, rmin=34, rg_gap=4)


def median_grid_background(rgb: np.ndarray) -> np.ndarray:
    """Typical dark pixel outside map geometry (grid margin)."""
    h, w = rgb.shape[:2]
    patch = rgb[int(h * 0.06) : int(h * 0.24), int(w * 0.04) : int(w * 0.14)]
    if patch.size == 0:
        return np.array([12, 12, 12], dtype=np.uint8)
    return np.median(patch.reshape(-1, 3), axis=0).astype(np.uint8)


def flatten_top_right_margin(
    rgb: np.ndarray,
    *,
    x_dst_lo: int,
    y_end: int,
) -> np.ndarray:
    """Solid-fill top-right margin (removes store badge without tiling artifacts)."""
    out = rgb.copy()
    h, w = out.shape[:2]
    y_end = min(y_end, h)
    bg = median_grid_background(rgb)
    out[:y_end, x_dst_lo:w] = bg
    return out


def inpaint(rgb: np.ndarray, mask_u8: np.ndarray, radius: int) -> np.ndarray:
    if not np.any(mask_u8):
        return rgb
    return cv2.inpaint(rgb, mask_u8, radius, cv2.INPAINT_NS)


def dilate(mask_bool: np.ndarray, iterations: int = 2) -> np.ndarray:
    k = np.ones((3, 3), np.uint8)
    m = mask_bool.astype(np.uint8) * 255
    return cv2.dilate(m, k, iterations=iterations)


def process(rgb: np.ndarray) -> np.ndarray:
    h, w = rgb.shape[:2]
    # Keep strip tight — long inpaint here smears labels mid-map (e.g. "B APPS")
    y_strip = min(158, h)

    # Pass 1 — banner + URL line (strict red/orange; stops before mid-map warm roofs)
    out = inpaint(rgb, dilate(red_text_mask(rgb, 16, y_strip)), 5)

    # Pass 2 — softer threshold on same strip only (anti-alias leftovers)
    out = inpaint(out, dilate(top_strip_second_pass(out, y_strip), iterations=1), 3)

    # Pass 3 — top-right branding: wipe margin (start generous — badge overlaps grid letters)
    x_dst = int(w * 0.64)
    y_corner = min(145, int(h * 0.198))
    out = flatten_top_right_margin(out, x_dst_lo=x_dst, y_end=y_corner)

    # Pass 4 — top-left margin only (narrow — avoid touching map callouts)
    def corner_left_only_mask_narrow(rgb_inner: np.ndarray) -> np.ndarray:
        hh, ww = rgb_inner.shape[:2]
        r = rgb_inner[:, :, 0].astype(np.float32)
        g = rgb_inner[:, :, 1].astype(np.float32)
        b = rgb_inner[:, :, 2].astype(np.float32)
        maxgb = np.maximum(g, b)
        margin = np.zeros((hh, ww), dtype=bool)
        yb = int(hh * 0.2)
        xl = int(ww * 0.17)
        margin[:yb, :xl] = True
        bright_red = (r > 22) & (r > g + 3) & (r > b + 2)
        dark_red_fill = (r + g + b < 220) & (r > maxgb - 5) & (r > 18) & (maxgb < 95)
        return margin & (bright_red | dark_red_fill)

    out = inpaint(out, dilate(corner_left_only_mask_narrow(out), iterations=2), 5)

    return out


def main() -> None:
    root = Path(__file__).resolve().parent.parent / "watermark bye bye"
    if not root.is_dir():
        print("missing folder:", root, file=sys.stderr)
        sys.exit(1)

    avifs = sorted(root.glob("*.avif"))
    if not avifs:
        print("no .avif files in", root, file=sys.stderr)
        sys.exit(1)

    for src in avifs:
        im = np.array(Image.open(src).convert("RGB"))
        cleaned = process(im)
        out_path = root / f"{src.stem}.clean.png"
        bgr = cv2.cvtColor(cleaned, cv2.COLOR_RGB2BGR)
        cv2.imwrite(str(out_path), bgr)
        print("wrote", out_path.name)


if __name__ == "__main__":
    main()
