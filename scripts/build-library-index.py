#!/usr/bin/env python3
"""Build library index from source. Does NOT modify source files."""
import json
import os
import re
import shutil
import unicodedata
from pathlib import Path

SOURCE = Path(r"D:\сайт тещи\словари\Книги-библиотека")
TARGET = Path(r"D:\сайт тещи\jeren-education\data\library")
FILES_DIR = TARGET / "files"

# Manual mapping: source filename -> safe web filename + parsed metadata from filename only
BOOK_MAP = [
    {
        "source": "волшебный справочник .rtf",
        "file": "volshebnyy-spravochnik.rtf",
        "title": "Волшебный справочник",
        "author": "",
    },
    {
        "source": "Дитмар Розенталь-ГОВОРИТЕ И ПИШИТЕ ПО-РУССКИ ПРАВИЛЬНО.docx",
        "file": "rozental-govorite-i-pishite.docx",
        "title": "Говорите и пишите по-русски правильно",
        "author": "Дитмар Розенталь",
    },
    {
        "source": "Е.Н. Квашнина. Языкознание в таблицах и схемах.doc",
        "file": "kvashnina-yazykoznanie.doc",
        "title": "Языкознание в таблицах и схемах",
        "author": "Е.Н. Квашнина",
    },
    {
        "source": "Правила русской орфографии и пунктуации. Полный академический справочник_2007 -480с.doc",
        "file": "pravila-orfografii-i-punkuacii-2007.doc",
        "title": "Правила русской орфографии и пунктуации. Полный академический справочник (2007)",
        "author": "",
    },
]

BROWSER_VIEWABLE = {"pdf", "txt", "html", "htm"}


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = text.replace("ё", "e")
    text = unicodedata.normalize("NFKD", text)
    text = re.sub(r"[^a-z0-9]+", "-", text.encode("ascii", "ignore").decode())
    return text.strip("-") or "book"


def main():
    FILES_DIR.mkdir(parents=True, exist_ok=True)
    source_files = set(os.listdir(SOURCE))
    books = []

    for i, meta in enumerate(BOOK_MAP, 1):
        src_name = meta["source"]
        if src_name not in source_files:
            raise FileNotFoundError(f"Missing source file: {src_name}")

        src_path = SOURCE / src_name
        dst_path = FILES_DIR / meta["file"]
        if not dst_path.exists() or dst_path.stat().st_size != src_path.stat().st_size:
            shutil.copy2(src_path, dst_path)

        ext = Path(meta["file"]).suffix.lstrip(".").lower()
        book_id = slugify(Path(meta["file"]).stem)

        books.append({
            "id": book_id,
            "title": meta["title"],
            "author": meta["author"],
            "format": ext,
            "path": f"files/{meta['file']}",
            "size": src_path.stat().st_size,
            "cover": None,
            "description": "",
            "viewableInBrowser": ext in BROWSER_VIEWABLE,
            "sourceFile": src_name,
        })

    # Verify all source files included
    mapped_sources = {m["source"] for m in BOOK_MAP}
    unmapped = source_files - mapped_sources
    if unmapped:
        raise RuntimeError(f"Unmapped source files: {unmapped}")

    index = {
        "version": 1,
        "generatedFrom": "../словари/Книги-библиотека (source archive, read-only)",
        "totalBooks": len(books),
        "totalSize": sum(b["size"] for b in books),
        "books": books,
    }

    with open(TARGET / "index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(json.dumps({
        "books": len(books),
        "totalSizeMB": round(index["totalSize"] / 1e6, 2),
        "formats": {b["format"]: 1 for b in books},
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
