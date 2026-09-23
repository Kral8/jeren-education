#!/usr/bin/env python3
"""Convert library books via Word + mammoth; copy covers; rebuild reader JSON."""
from __future__ import annotations

import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

import mammoth
import win32com.client

ROOT = Path(r"D:\сайт тещи\jeren-education")
SOURCE_DIR = Path(r"D:\сайт тещи\словари\Книги-библиотека")
COVERS_DIR = Path(r"D:\сайт тещи\словари\Обложки библиотеки")
LIB_DIR = ROOT / "data" / "library"
FILES_DIR = LIB_DIR / "files"
CONTENT_DIR = LIB_DIR / "content"
ASSETS_COVERS = ROOT / "assets" / "covers"

BOOKS = [
    {
        "id": "volshebnyy-spravochnik",
        "source": "волшебный справочник .rtf",
        "file": "volshebnyy-spravochnik.rtf",
        "cover_keys": ["волшебный справочник"],
    },
    {
        "id": "rozental-govorite-i-pishite",
        "source": "Дитмар Розенталь-ГОВОРИТЕ И ПИШИТЕ ПО-РУССКИ ПРАВИЛЬНО.docx",
        "file": "rozental-govorite-i-pishite.docx",
        "cover_keys": ["говорите и пишите"],
    },
    {
        "id": "kvashnina-yazykoznanie",
        "source": "Е.Н. Квашнина. Языкознание в таблицах и схемах.doc",
        "file": "kvashnina-yazykoznanie.doc",
        "cover_keys": ["языкознание в таблицах"],
    },
    {
        "id": "pravila-orfografii-i-punkuacii-2007",
        "source": "Правила русской орфографии и пунктуации. Полный академический справочник_2007 -480с.doc",
        "file": "pravila-orfografii-i-punkuacii-2007.doc",
        "cover_keys": ["академический справочник", "орфографии и пунктуации"],
    },
]

WD_FORMAT_DOCX = 16


def find_cover(keys: list[str]) -> Path | None:
    if not COVERS_DIR.exists():
        return None
    for path in COVERS_DIR.iterdir():
        if not path.is_file():
            continue
        name = path.name.lower()
        if any(k in name for k in keys):
            return path
    return None


def copy_cover(book_id: str, keys: list[str]) -> str | None:
    src = find_cover(keys)
    if not src:
        return None
    ASSETS_COVERS.mkdir(parents=True, exist_ok=True)
    ext = src.suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".jfif"}:
        ext = ".jpg"
    dst = ASSETS_COVERS / f"{book_id}{ext}"
    shutil.copy2(src, dst)
    return f"assets/covers/{dst.name}"


def word_convert_to_docx(source: Path, target: Path) -> None:
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    word.DisplayAlerts = 0
    doc = None
    try:
        doc = word.Documents.Open(str(source.resolve()), ReadOnly=True)
        doc.SaveAs2(str(target.resolve()), FileFormat=WD_FORMAT_DOCX)
    finally:
        if doc is not None:
            doc.Close(False)
        word.Quit()


def ensure_docx(book: dict) -> Path:
    src = SOURCE_DIR / book["source"]
    if not src.exists():
        raise FileNotFoundError(src)

    dst = FILES_DIR / book["file"]
    FILES_DIR.mkdir(parents=True, exist_ok=True)
    if dst.resolve() != src.resolve():
        if not dst.exists() or dst.stat().st_size != src.stat().st_size:
            shutil.copy2(src, dst)

    if dst.suffix.lower() == ".docx":
        return dst

    docx_path = FILES_DIR / f"{book['id']}.docx"
    if dst.suffix.lower() == ".rtf":
        if not docx_path.exists() or docx_path.stat().st_mtime < dst.stat().st_mtime:
            print(f"Converting RTF via Word: {book['source']}")
            word_convert_to_docx(dst, docx_path)
        return docx_path
    if not docx_path.exists() or docx_path.stat().st_mtime < dst.stat().st_mtime:
        print(f"Converting via Word: {book['source']}")
        word_convert_to_docx(dst, docx_path)
    return docx_path


def convert_image(image):
    with image.open() as img_bytes:
        data = img_bytes.read()
    ext = {
        "image/png": "png",
        "image/jpeg": "jpeg",
        "image/gif": "gif",
        "image/bmp": "bmp",
    }.get(image.content_type, "png")
    import base64

    encoded = base64.b64encode(data).decode("ascii")
    return {"src": f"data:{image.content_type};base64,{encoded}"}


def build_toc(html: str) -> list[dict]:
    toc: list[dict] = []
    for idx, match in enumerate(re.finditer(r"<h([1-3])[^>]*>(.*?)</h\1>", html, re.I | re.S)):
        text = re.sub(r"<[^>]+>", "", match.group(2))
        text = re.sub(r"\s+", " ", text).strip()
        if not text or len(text) < 2:
            continue
        toc.append({"id": f"je-sec-{idx}", "text": text[:120], "level": int(match.group(1))})
    return toc[:200]


def inject_heading_ids(html: str) -> str:
    counter = 0

    def repl(match):
        nonlocal counter
        level = match.group(1)
        inner = match.group(2)
        html_id = f' id="je-sec-{counter}"'
        counter += 1
        return f"<h{level}{html_id}>{inner}</h{level}>"

    return re.sub(r"<h([1-3])([^>]*)>(.*?)</h\1>", repl, html, flags=re.I | re.S)


def extract_with_mammoth(docx_path: Path) -> dict:
    with docx_path.open("rb") as fh:
        result = mammoth.convert_to_html(fh, convert_image=mammoth.images.img_element(convert_image))
    html = inject_heading_ids(result.value or "")
    html = re.sub(r"\u0007", "", html)
    return {
        "format": "html",
        "html": html,
        "toc": build_toc(html),
        "messages": [str(m) for m in result.messages[:20]],
    }


def load_index() -> dict:
    return json.loads((LIB_DIR / "index.json").read_text(encoding="utf-8"))


def main() -> int:
    index = load_index()
    book_by_id = {b["id"]: b for b in index["books"]}

    for meta in BOOKS:
        book = book_by_id.get(meta["id"])
        if not book:
            print("Missing in index:", meta["id"], file=sys.stderr)
            continue

        cover_url = copy_cover(meta["id"], meta["cover_keys"])
        if cover_url:
            book["coverUrl"] = cover_url
            print("Cover:", meta["id"], "->", cover_url)

        docx_path = ensure_docx(meta)
        payload = extract_with_mammoth(docx_path)
        out = CONTENT_DIR / f"{meta['id']}.json"
        CONTENT_DIR.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(
            meta["id"],
            "html chars:",
            len(payload["html"]),
            "toc:",
            len(payload["toc"]),
        )

        book["format"] = "html"
        book["viewableInBrowser"] = True
        if meta["id"] in {"kvashnina-yazykoznanie", "pravila-orfografii-i-punkuacii-2007"}:
            book["path"] = f"files/{docx_path.name}"

    (LIB_DIR / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Updated index.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
