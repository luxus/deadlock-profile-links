#!/usr/bin/env python3
"""Build Panorama .vtex_c textures from src/images/*.png.

modlock only compiles layouts, scripts and styles; images must already be
compiled. This writes the resource layout Valve uses for Panorama PNGs:
header v12, RED2 + DATA, VTEX v1, BGRA8888, mip chain smallest first,
NO_LOD, one 32x32 DXT5 FALLBACK_BITS entry.

RED2 is compiler bookkeeping the game does not read at run time; this file
writes a short block of our own (not copied from another addon).
"""
import hashlib, os, struct, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src", "images")
OUT = os.path.join(ROOT, "src", "images")
SIZE = 64
# Pinned so a silently swapped logo is a build failure.
PINS = {
    "statlocker": "6462a028b71e8498e82528348d5b2001fa5eb8fbb69792a9d321ca052d3fd908",
    "deadchaps": "45a229d7cdc67b9fe5c029eca545b67f29e57645139da8f660fa7df0dbec092e",
}
FMT_BGRA8888 = 28
FLAG_NO_LOD = 1 << 3
EXTRA_FALLBACK_BITS = 1


def bgra(im):
    r, g, b, a = im.split()
    return Image.merge("RGBA", (b, g, r, a)).tobytes()


def dxt5_block(px):
    alphas = [p[3] for p in px]
    a0, a1 = max(alphas), min(alphas)
    if a0 == a1:
        aidx = [0] * 16
    else:
        pal = [a0, a1] + [((7 - i) * a0 + i * a1) // 7 for i in range(1, 7)]
        aidx = [min(range(8), key=lambda k: abs(pal[k] - a)) for a in alphas]
    abits = 0
    for i, k in enumerate(aidx):
        abits |= k << (3 * i)

    def to565(c):
        return ((c[0] >> 3) << 11) | ((c[1] >> 2) << 5) | (c[2] >> 3)

    def from565(v):
        r, g, b = (v >> 11) & 31, (v >> 5) & 63, v & 31
        return (r << 3 | r >> 2, g << 2 | g >> 4, b << 3 | b >> 2)

    hi = tuple(max(p[i] for p in px) for i in range(3))
    lo = tuple(min(p[i] for p in px) for i in range(3))
    c0, c1 = to565(hi), to565(lo)
    if c0 < c1:
        c0, c1 = c1, c0
    cidx = [0] * 16
    if c0 != c1:
        e0, e1 = from565(c0), from565(c1)
        pal = [e0, e1,
               tuple((2 * e0[i] + e1[i]) // 3 for i in range(3)),
               tuple((e0[i] + 2 * e1[i]) // 3 for i in range(3))]
        cidx = [min(range(4), key=lambda k: sum((pal[k][i] - p[i]) ** 2 for i in range(3))) for p in px]
    cbits = 0
    for i, k in enumerate(cidx):
        cbits |= k << (2 * i)
    return bytes([a0, a1]) + abits.to_bytes(6, "little") + struct.pack("<HHI", c0, c1, cbits)


def dxt5(im):
    w, h = im.size
    pix = im.load()
    out = bytearray()
    for by in range(0, h, 4):
        for bx in range(0, w, 4):
            out += dxt5_block([pix[bx + x, by + y] for y in range(4) for x in range(4)])
    return bytes(out)


def build(name):
    png = os.path.join(SRC, name + ".png")
    data = open(png, "rb").read()
    got = hashlib.sha256(data).hexdigest()
    if got != PINS[name]:
        sys.exit(f"{png}: sha256 {got} != pinned {PINS[name]}")
    src = Image.open(png).convert("RGBA")
    side = max(src.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(src, ((side - src.width) // 2, (side - src.height) // 2))
    mips = []
    s = SIZE
    while s >= 1:
        mips.append(canvas.resize((s, s), Image.LANCZOS))
        s //= 2
    pixels = b"".join(bgra(m) for m in reversed(mips))
    fallback = dxt5(canvas.resize((32, 32), Image.LANCZOS))
    if len(fallback) != 1024:
        sys.exit(f"dxt5 fallback is {len(fallback)}, expected 1024")

    lin = lambda c: (c / 255.0) ** 2.2
    raw = mips[0].tobytes()
    n = float(len(raw) // 4)
    refl = [sum(lin(raw[j]) for j in range(i, len(raw), 4)) / n for i in range(3)]
    refl.append(sum(raw[3::4]) / n / 255.0)

    hdr = struct.pack("<HH4fHHHBBI", 1, FLAG_NO_LOD, *refl, SIZE, SIZE, 1, FMT_BGRA8888, len(mips), 0)
    hdr += struct.pack("<II", 8, 1)
    hdr += struct.pack("<III", EXTRA_FALLBACK_BITS, 8, len(fallback))
    data_block = hdr + fallback
    if len(data_block) != 1076:
        sys.exit(f"DATA block is {len(data_block)}, expected 1076")

    # Our own unused RED2 bookkeeping; 16-byte aligned payload.
    red2 = b"DeadlockProfileLinks vtex\x00" + (name + ".png").encode() + b"\x00"
    red2 += b"\x00" * ((16 - (len(red2) % 16)) % 16)
    red2_off = 48
    data_off = (red2_off + len(red2) + 15) & ~15
    file_size = data_off + len(data_block)
    head = struct.pack("<IHHII", file_size, 12, 1, 8, 2)
    head += b"RED2" + struct.pack("<II", red2_off - 20, len(red2))
    head += b"DATA" + struct.pack("<II", data_off - 32, len(data_block))
    head = head.ljust(red2_off, b"\x00")
    body = (head + red2).ljust(data_off, b"\x00") + data_block
    if len(body) != file_size:
        sys.exit("header/body size mismatch")

    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, name + "_png.vtex_c")
    open(out, "wb").write(body + pixels)
    print(f"{out}: {SIZE}x{SIZE} BGRA8888, {len(mips)} mips, {len(body) + len(pixels)} bytes")
    return out


if __name__ == "__main__":
    for n in PINS:
        build(n)
