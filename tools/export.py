# -*- coding: utf-8 -*-
"""
export.py — Emballe le site déployable dans un zip prêt à héberger.

Usage :
    python tools/export.py
    python tools/export.py --dir dist/site     # copie en dossier au lieu d'un zip

Inclut : index.html, assets/ (css, js, données), README.md.
Exclut : archives/ (source XLSX), tools/, dist/.
Pensez à lancer tools/build_data.py avant pour des données à jour.
"""

import argparse
import datetime
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE_FILES = ["index.html", "README.md", "assets"]


def collect():
    files = []
    for name in SITE_FILES:
        p = ROOT / name
        if p.is_file():
            files.append(p)
        elif p.is_dir():
            files.extend(f for f in sorted(p.rglob("*")) if f.is_file())
    return files


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", metavar="DOSSIER",
                    help="copie dans un dossier au lieu de produire un zip (chemin relatif au projet)")
    args = ap.parse_args()
    files = collect()
    stamp = datetime.date.today().isoformat()

    if args.dir:
        dest = ROOT / args.dir
        if dest.exists():
            shutil.rmtree(dest)
        dest.mkdir(parents=True)
        for f in files:
            target = dest / f.relative_to(ROOT)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, target)
        print(f"Site copié dans : {dest}")
    else:
        outdir = ROOT / "dist"
        outdir.mkdir(exist_ok=True)
        zip_path = outdir / f"classements-fisf-{stamp}.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
            for f in files:
                z.write(f, f.relative_to(ROOT))
        mb = zip_path.stat().st_size / 1e6
        print(f"Zip créé : {zip_path} ({mb:.2f} Mo, {len(files)} fichiers)")

    print("Déployable tel quel sur GitHub Pages, Netlify, Cloudflare, o2switch…")


if __name__ == "__main__":
    main()
