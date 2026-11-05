#!/usr/bin/env python3
"""
Skrypt do skalowania grafik 100% (LDPI) do 200% (HDPI) dla gry Chrome Dino.
Działa CAŁKOWICIE BEZ POBIERANIA NOWYCH WTYCZEK / PAKIETÓW (używa wbudowanej
biblioteki standardowej Pythona: zlib i struct).

Skalowanie metodą najbliższego sąsiada (nearest-neighbor) zapewnia perfekcyjny,
ostry pixel art i pełne zachowanie kanału przezroczystości (alpha).
"""

import os
import sys
import zlib
import struct

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(SCRIPT_DIR, "default_100_percent")
DST_DIR = os.path.join(SCRIPT_DIR, "default_200_percent")


def unfilter_scanline(filter_type, scanline, prev_scanline, bpp):
    recon = bytearray(len(scanline))
    if filter_type == 0:  # None
        recon[:] = scanline
    elif filter_type == 1:  # Sub
        for i in range(len(scanline)):
            left = recon[i - bpp] if i >= bpp else 0
            recon[i] = (scanline[i] + left) & 0xff
    elif filter_type == 2:  # Up
        for i in range(len(scanline)):
            up = prev_scanline[i] if prev_scanline else 0
            recon[i] = (scanline[i] + up) & 0xff
    elif filter_type == 3:  # Average
        for i in range(len(scanline)):
            left = recon[i - bpp] if i >= bpp else 0
            up = prev_scanline[i] if prev_scanline else 0
            recon[i] = (scanline[i] + ((left + up) >> 1)) & 0xff
    elif filter_type == 4:  # Paeth
        for i in range(len(scanline)):
            left = recon[i - bpp] if i >= bpp else 0
            up = prev_scanline[i] if prev_scanline else 0
            corner = prev_scanline[i - bpp] if (prev_scanline and i >= bpp) else 0
            p = left + up - corner
            pa = abs(p - left)
            pb = abs(p - up)
            pc = abs(p - corner)
            if pa <= pb and pa <= pc:
                pr = left
            elif pb <= pc:
                pr = up
            else:
                pr = corner
            recon[i] = (scanline[i] + pr) & 0xff
    return recon


def scale_png_2x_builtin(src_path, dst_path):
    """
    Wbudowany dekoder i 2x skalator PNG w czystym Pythonie (zlib + struct).
    Działa bez żadnych zewnętrznych bibliotek (bez pip, bez Pillow).
    """
    with open(src_path, "rb") as f:
        data = f.read()

    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Plik {src_path} nie jest poprawnym formatem PNG.")

    idx = 8
    ihdr = None
    idat_list = []
    plte = None
    trns = None

    while idx < len(data):
        length = struct.unpack(">I", data[idx:idx + 4])[0]
        ctype = data[idx + 4:idx + 8]
        cdata = data[idx + 8:idx + 8 + length]
        idx += 12 + length

        if ctype == b"IHDR":
            ihdr = cdata
        elif ctype == b"IDAT":
            idat_list.append(cdata)
        elif ctype == b"PLTE":
            plte = cdata
        elif ctype == b"tRNS":
            trns = cdata
        elif ctype == b"IEND":
            break

    width, height, bit_depth, color_type, comp, filt, interlace = struct.unpack(">IIBBBBB", ihdr)
    decomp = zlib.decompress(b"".join(idat_list))

    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}.get(color_type, 4)
    stride = (width * channels * bit_depth + 7) // 8
    bpp = max(1, (channels * bit_depth) // 8)

    rgba_pixels = []
    offset = 0
    prev_row = None
    for y in range(height):
        ftype = decomp[offset]
        offset += 1
        sline = decomp[offset:offset + stride]
        offset += stride
        unfiltered = unfilter_scanline(ftype, sline, prev_row, bpp)
        prev_row = unfiltered

        row_rgba = bytearray()
        if color_type == 4 and bit_depth == 8:  # Grayscale + Alpha
            for x in range(width):
                g = unfiltered[x * 2]
                a = unfiltered[x * 2 + 1]
                row_rgba.extend([g, g, g, a])
        elif color_type == 6 and bit_depth == 8:  # RGBA
            row_rgba.extend(unfiltered)
        elif color_type == 3 and bit_depth == 1:  # 1-bit Indexed
            for x in range(width):
                byte_val = unfiltered[x // 8]
                bit_val = (byte_val >> (7 - (x % 8))) & 1
                r = plte[bit_val * 3]
                g = plte[bit_val * 3 + 1]
                b = plte[bit_val * 3 + 2]
                a = trns[bit_val] if trns and bit_val < len(trns) else 255
                row_rgba.extend([r, g, b, a])
        elif color_type == 3 and bit_depth == 8:  # 8-bit Indexed
            for x in range(width):
                idx_val = unfiltered[x]
                r = plte[idx_val * 3]
                g = plte[idx_val * 3 + 1]
                b = plte[idx_val * 3 + 2]
                a = trns[idx_val] if trns and idx_val < len(trns) else 255
                row_rgba.extend([r, g, b, a])
        elif color_type == 2 and bit_depth == 8:  # RGB
            for x in range(width):
                r = unfiltered[x * 3]
                g = unfiltered[x * 3 + 1]
                b = unfiltered[x * 3 + 2]
                row_rgba.extend([r, g, b, 255])
        elif color_type == 0 and bit_depth == 8:  # Grayscale
            for x in range(width):
                g = unfiltered[x]
                row_rgba.extend([g, g, g, 255])
        else:
            row_rgba.extend(unfiltered)
        rgba_pixels.append(row_rgba)

    # Skalowanie 2x Nearest-Neighbor
    w2 = width * 2
    h2 = height * 2
    out_decomp = bytearray()
    for y in range(height):
        orig_row = rgba_pixels[y]
        scaled_row = bytearray()
        for x in range(width):
            p = orig_row[x * 4:x * 4 + 4]
            scaled_row.extend(p)
            scaled_row.extend(p)
        line = b"\x00" + bytes(scaled_row)
        out_decomp.extend(line)  # Powtórz 2x pionowo
        out_decomp.extend(line)

    out_ihdr = struct.pack(">IIBBBBB", w2, h2, 8, 6, 0, 0, 0)
    out_idat = zlib.compress(bytes(out_decomp))

    def make_chunk(ctype, cdata):
        return struct.pack(">I", len(cdata)) + ctype + cdata + struct.pack(">I", zlib.crc32(ctype + cdata) & 0xffffffff)

    out_bytes = (
        b"\x89PNG\r\n\x1a\n"
        + make_chunk(b"IHDR", out_ihdr)
        + make_chunk(b"IDAT", out_idat)
        + make_chunk(b"IEND", b"")
    )
    with open(dst_path, "wb") as f:
        f.write(out_bytes)
    return width, height, w2, h2


def scale_image(src_path, dst_path):
    # Jeśli na maszynie jest pygame, użyj go dla maksymalnej szybkości;
    # jeśli nie ma - wbudowany silnik czystego Pythona zadziała bezbłędnie bez instalowania niczego.
    try:
        os.environ["PYGAME_HIDE_SUPPORT_PROMPT"] = "hide"
        import pygame
        img = pygame.image.load(src_path)
        w, h = img.get_size()
        scaled = pygame.transform.scale(img, (w * 2, h * 2))
        pygame.image.save(scaled, dst_path)
        return w, h, w * 2, h * 2, "pygame (lokalny)"
    except Exception:
        w, h, w2, h2 = scale_png_2x_builtin(src_path, dst_path)
        return w, h, w2, h2, "wbudowany Python (zero zależności)"


def main():
    if not os.path.isdir(SRC_DIR):
        print(f"[BŁĄD] Katalog źródłowy nie istnieje: {SRC_DIR}")
        sys.exit(1)

    os.makedirs(DST_DIR, exist_ok=True)

    print("=== Dino Scaler: default_100_percent -> default_200_percent ===")
    print("[INFO] Skrypt działa samodzielnie, bez pobierania żadnych nowych wtyczek ani bibliotek pip.")
    print(f"Źródło: {SRC_DIR}")
    print(f"Cel:    {DST_DIR}\n")

    files = [f for f in os.listdir(SRC_DIR) if f.lower().endswith(".png")]
    if not files:
        print("[INFO] Brak plików PNG w katalogu default_100_percent.")
        return

    success_count = 0
    for filename in sorted(files):
        src_path = os.path.join(SRC_DIR, filename)

        if filename.startswith("100-"):
            dst_filename = "200-" + filename[4:]
        else:
            dst_filename = "200-" + filename

        dst_path = os.path.join(DST_DIR, dst_filename)

        try:
            w1, h1, w2, h2, engine = scale_image(src_path, dst_path)
            print(f" [OK] {filename} ({w1}x{h1}) -> {dst_filename} ({w2}x{h2}) [{engine}]")
            success_count += 1
        except Exception as e:
            print(f" [BŁĄD] Nie udało się przeskalować {filename}: {e}")

    print(f"\nUkończono! Pomyślnie przetworzono {success_count}/{len(files)} plików.")


if __name__ == "__main__":
    main()
