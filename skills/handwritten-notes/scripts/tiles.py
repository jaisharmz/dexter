"""Split a photo of a handwritten page into overlapping tiles at twice the size, so small or faint writing can be
read tile by tile. Writes <stem>_tiles/r<row>c<col>.png next to a scratch folder you name.

Run: python3 tiles.py <image> [--out <folder>] [--rows 3] [--cols 2] [--scale 2]"""

import argparse
import pathlib

from PIL import Image, ImageOps


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image")
    parser.add_argument("--out", default=None, help="folder for the tiles (default: <image stem>_tiles beside it)")
    parser.add_argument("--rows", type=int, default=3)
    parser.add_argument("--cols", type=int, default=2)
    parser.add_argument("--scale", type=float, default=2.0)
    parser.add_argument("--overlap", type=float, default=0.12, help="share of a tile repeated on each side")
    args = parser.parse_args()

    source = pathlib.Path(args.image)
    page = ImageOps.exif_transpose(Image.open(source)).convert("L")    # phone photos carry their rotation in EXIF
    page = ImageOps.autocontrast(page, cutoff=1)                          # faint pencil reads better with the range stretched
    width, height = page.size
    tile_width, tile_height = width / args.cols, height / args.rows
    pad_x, pad_y = tile_width * args.overlap, tile_height * args.overlap

    out = pathlib.Path(args.out) if args.out else source.with_name(source.stem + "_tiles")
    out.mkdir(parents=True, exist_ok=True)
    for row in range(args.rows):
        for col in range(args.cols):
            box = (max(0, int(col * tile_width - pad_x)), max(0, int(row * tile_height - pad_y)),
                   min(width, int((col + 1) * tile_width + pad_x)), min(height, int((row + 1) * tile_height + pad_y)))
            tile = page.crop(box)
            tile = tile.resize((int(tile.width * args.scale), int(tile.height * args.scale)), Image.LANCZOS)
            tile.save(out / ("r%dc%d.png" % (row + 1, col + 1)))
    print("%d tiles in %s" % (args.rows * args.cols, out))


if __name__ == "__main__":
    main()
