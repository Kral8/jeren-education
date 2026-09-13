#!/usr/bin/env python3
"""Extract DOCX/DOC content to safe JSON for reader. Local only."""
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

SOURCE_DIR = Path(r"D:\сайт тещи\jeren-education\data\library\files")
OUT_DIR = Path(r"D:\сайт тещи\jeren-education\data\library\content")
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def extract_docx(path: Path):
    sections = []
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml")
    root = ET.fromstring(xml)
    body = root.find("w:body", NS)
    if body is None:
        return sections
    for child in body:
        if child.tag.split("}")[-1] != "p":
            continue
        texts = [t.text or "" for t in child.findall(".//w:t", NS)]
        line = "".join(texts).strip()
        if not line:
            continue
        style = child.find("w:pPr/w:pStyle", NS)
        style_val = style.get(f"{{{NS['w']}}}val") if style is not None else ""
        if style_val and "Heading" in style_val:
            level = int(re.search(r"Heading(\d)", style_val).group(1)) if re.search(r"Heading(\d)", style_val) else 1
            sections.append({"type": "heading", "level": level, "text": line})
        elif len(line) < 100 and line.isupper():
            sections.append({"type": "heading", "level": 2, "text": line})
        else:
            sections.append({"type": "paragraph", "text": line})
    return sections


def extract_doc_binary(path: Path):
    data = path.read_bytes()
    sections = []
    seen = set()
    i = 0
    while i < len(data) - 1:
        if data[i] >= 0x20 and data[i + 1] == 0:
            j = i
            chars = []
            while j < len(data) - 1 and data[j + 1] == 0 and 0x20 <= data[j] <= 0xFF:
                chars.append(data[j])
                j += 2
            if len(chars) >= 16:
                try:
                    text = bytes(chars).decode("cp1251", errors="ignore").strip()
                except Exception:
                    text = ""
                text = re.sub(r"\s+", " ", text)
                if len(text) >= 20 and text not in seen:
                    low = text.lower()
                    if not any(k in low for k in ("microsoft", "word", "normal", "root entry", "object")):
                        seen.add(text)
                        if len(text) < 90 and text[0].isupper():
                            sections.append({"type": "heading", "level": 2, "text": text})
                        else:
                            sections.append({"type": "paragraph", "text": text})
            i = j
        else:
            i += 1
    return sections[:800]


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for path in sorted(SOURCE_DIR.iterdir()):
        if path.suffix.lower() == ".docx":
            sections = extract_docx(path)
        elif path.suffix.lower() == ".doc":
            sections = extract_doc_binary(path)
        else:
            continue
        # Map file stem to book id in index.json
        out = OUT_DIR / f"{path.stem}.json"
        with open(out, "w", encoding="utf-8") as f:
            json.dump({"sections": sections}, f, ensure_ascii=False, indent=2)
        print(path.name, "->", len(sections), "sections")


if __name__ == "__main__":
    main()
