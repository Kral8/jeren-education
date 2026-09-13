#!/usr/bin/env python3
"""Convert source dictionaries to web-optimized format. Does NOT modify source files."""
import json
import os
import re
import shutil
from pathlib import Path

SOURCE = Path(r"D:\сайт тещи\словари\Словари")
TARGET = Path(r"D:\сайт тещи\jeren-education\data\dictionaries")
ARCHIVES = TARGET / "archives"


def normalize_key(word: str) -> str:
    return word.strip().lower().replace("ё", "е")


def convert_phraseology():
    src = SOURCE / "фразеологический словарь.json"
    with open(src, "r", encoding="utf-8") as f:
        data = json.load(f)

    entries = {}
    for slug, item in data.items():
        name = item.get("name", slug)
        key = normalize_key(name)
        entries[key] = {
            "id": slug,
            "word": name,
            "meaning": item.get("meaning", ""),
            "syntax": item.get("syntax", ""),
            "semanticGroup": item.get("semantic_group", ""),
            "etymology": item.get("etymology", ""),
            "synonyms": item.get("synonyms", []),
            "antonyms": item.get("antonyms", []),
            "examples": item.get("examples", []),
            "components": item.get("components", []),
        }

    out = TARGET / "phraseology.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, separators=(",", ":"))
    return len(entries)


def convert_foreign_words():
    src = SOURCE / "Словарь иностранных слов .json"
    with open(src, "r", encoding="utf-8") as f:
        data = json.load(f)

    entries = {}
    for word, definition in data.items():
        key = normalize_key(word)
        entries[key] = {"word": word, "meaning": definition}

    out = TARGET / "foreign-words.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, separators=(",", ":"))
    return len(entries)


def chunk_key(word: str) -> str:
    w = word.strip().lower()
    if not w:
        return "_other"
    ch = w[0]
    if ch in "абвгдеёжзийклмнопрстуфхцчшщъыьэюя":
        return ch
    if ch == "-":
        return "_prefix"
    return "_other"


def convert_ozhegov():
    src = SOURCE / "ozhegov.txt"
    chunks: dict[str, dict] = {}

    with open(src, "r", encoding="utf-8", errors="replace") as f:
        f.readline()  # header
        for line in f:
            parts = line.rstrip("\n").split("|")
            if len(parts) < 8:
                continue
            vocab = parts[0].strip()
            if not vocab:
                continue
            key = normalize_key(vocab)
            entry = {
                "word": vocab,
                "baseForm": parts[1].strip(),
                "phonetic": parts[2].strip(),
                "grammar": parts[3].strip(),
                "style": parts[4].strip(),
                "meaning": parts[5].strip(),
                "antonym": parts[6].strip(),
                "examples": parts[7].strip(),
            }
            ck = chunk_key(vocab)
            bucket = chunks.setdefault(ck, {})
            bucket.setdefault(key, []).append(entry)

    oz_dir = TARGET / "ozhegov"
    oz_dir.mkdir(parents=True, exist_ok=True)
    letter_index = {}

    for ck, bucket in sorted(chunks.items()):
        fname = f"{ck}.json"
        out = oz_dir / fname
        with open(out, "w", encoding="utf-8") as f:
            json.dump(bucket, f, ensure_ascii=False, separators=(",", ":"))
        letter_index[ck] = {"file": f"ozhegov/{fname}", "entries": len(bucket)}

    meta = {
        "id": "ozhegov",
        "totalKeys": sum(x["entries"] for x in letter_index.values()),
        "chunks": letter_index,
    }
    with open(oz_dir / "meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    return meta["totalKeys"]


def copy_archives():
    ARCHIVES.mkdir(parents=True, exist_ok=True)
    archive_defs = [
        ("text.pdf", "text.pdf", "PDF-документ"),
        ("Веселый фразеологический словарь для детей.docx", "veselyy-frazeologicheskiy-dlya-detey.docx", "DOCX"),
        ("Львов М.Р. Словарь антонимов русского языка (1984).doc", "lvov-antonimy-1984.doc", "DOC"),
        ("РУССКИЕ ПОСЛОВИЦЫ И ПОГОВОРКИ.docx", "russkie-poslovitsy-i-pogovorki.docx", "DOCX"),
        ("СЛОВАРЬ УСТАРЕВШИХ СЛОВ СРЕДНЕВЕКОВОЙ РУСИ.docx", "ustarevshie-slova-srednevekovoy-rusi.docx", "DOCX"),
        ("Словарь паронимов   Краткий словарь паронимов русского языка.docx", "paronimy.docx", "DOCX"),
        ("Словарь синонимов русского языка Под общей ред.docx", "sinonimy.docx", "DOCX"),
        ("Словарь фразеологизмов.docx", "frazeologizmy.docx", "DOCX"),
        ("Т.Ф. Ефремова - Новый толково-словообразовательный словарь русского языка.2000.doc", "efremova-2000.doc", "DOC"),
    ]
    copied = []
    for src_name, dst_name, fmt in archive_defs:
        src = SOURCE / src_name
        dst = ARCHIVES / dst_name
        if src.exists():
            shutil.copy2(src, dst)
            copied.append({
                "source": src_name,
                "file": f"archives/{dst_name}",
                "format": fmt,
                "size": src.stat().st_size,
            })
    return copied


def build_index(counts, archives):
    dictionaries = [
        {
            "id": "ozhegov",
            "title": "Толковый словарь (Ожегов)",
            "description": "Словарь русского языка в формате ozhegov.txt — толкования, грамматика, примеры.",
            "language": "ru",
            "type": "explanatory",
            "entryCount": counts["ozhegov"],
            "data": "ozhegov/meta.json",
            "format": "chunked-json",
            "searchable": True,
            "status": "available",
        },
        {
            "id": "foreign-words",
            "title": "Словарь иностранных слов",
            "description": "Словарь иностранных слов, вошедших в русский язык.",
            "language": "ru",
            "type": "foreign",
            "entryCount": counts["foreign"],
            "data": "foreign-words.json",
            "format": "json",
            "searchable": True,
            "status": "available",
        },
        {
            "id": "phraseology",
            "title": "Фразеологический словарь",
            "description": "Фразеологизмы русского языка с этимологией, синонимами и примерами.",
            "language": "ru",
            "type": "phraseology",
            "entryCount": counts["phraseology"],
            "data": "phraseology.json",
            "format": "json",
            "searchable": True,
            "status": "available",
        },
    ]

    archive_titles = {
        "text.pdf": ("text.pdf", "PDF-документ", "reference"),
        "veselyy-frazeologicheskiy-dlya-detey.docx": ("Веселый фразеологический словарь для детей", "Фразеологический словарь для детей", "phraseology"),
        "lvov-antonimy-1984.doc": ("Львов М.Р. Словарь антонимов (1984)", "Словарь антонимов русского языка", "antonyms"),
        "russkie-poslovitsy-i-pogovorki.docx": ("Русские пословицы и поговорки", "Сборник пословиц и поговорок", "proverb"),
        "ustarevshie-slova-srednevekovoy-rusi.docx": ("Словарь устаревших слов средневековой Руси", "Устаревшая лексика", "historical"),
        "paronimy.docx": ("Словарь паронимов", "Краткий словарь паронимов русского языка", "paronyms"),
        "sinonimy.docx": ("Словарь синонимов", "Словарь синонимов русского языка", "synonyms"),
        "frazeologizmy.docx": ("Словарь фразеологизмов", "Фразеологизмы (DOCX)", "phraseology"),
        "efremova-2000.doc": ("Т.Ф. Ефремова — Толковый словарь (2000)", "Новый толково-словообразовательный словарь", "explanatory"),
    }

    for arch in archives:
        dst = Path(arch["file"]).name
        title, desc, dtype = archive_titles.get(dst, (dst, "Архивный словарь", "archive"))
        dictionaries.append({
            "id": f"archive-{dst.rsplit('.', 1)[0]}",
            "title": title,
            "description": desc,
            "language": "ru",
            "type": dtype,
            "entryCount": None,
            "data": arch["file"],
            "format": arch["format"].lower(),
            "searchable": False,
            "status": "archive",
            "statusNote": "Формат не поддерживает поиск в браузере. Файл доступен для скачивания.",
            "size": arch["size"],
        })

    index = {
        "version": 1,
        "generatedFrom": str(SOURCE),
        "totalDictionaries": len(dictionaries),
        "searchableCount": sum(1 for d in dictionaries if d["searchable"]),
        "dictionaries": dictionaries,
    }

    with open(TARGET / "index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    return index


def main():
    TARGET.mkdir(parents=True, exist_ok=True)
    counts = {
        "phraseology": convert_phraseology(),
        "foreign": convert_foreign_words(),
        "ozhegov": convert_ozhegov(),
    }
    archives = copy_archives()
    index = build_index(counts, archives)
    print(json.dumps({"counts": counts, "archives": len(archives), "total": index["totalDictionaries"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
