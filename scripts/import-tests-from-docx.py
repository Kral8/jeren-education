#!/usr/bin/env python3
"""Import school tests from DOCX archive into site JSON banks."""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

from docx import Document

ROOT = Path(r"D:\сайт тещи\словари\тесты")
OUT_DIR = Path(r"D:\сайт тещи\jeren-education\data\tests")

LETTER_TO_INDEX = {"а": 0, "a": 0, "б": 1, "b": 1, "в": 2, "v": 2, "г": 3, "g": 3}

FILE_MAP = {
    "Русский язык/Орфография.docx": ("russian", "orthography"),
    "Русский язык/Орфоэпия.docx": ("russian", "orthoepy"),
    "Русский язык/Синтаксис.docx": ("russian", "syntax"),
    "Русский язык/Фонетика.docx": ("russian", "phonetics"),
    "Русский язык/Части речи/1 имя сущ/Тест.docx": ("russian", "noun"),
    "Русский язык/Части речи/2 имя прилагательное/Тест.docx": ("russian", "adjective"),
    "Литература/Тесты Биография писателей.docx": ("literature", "authors"),
    "Литература/Тесты общие.docx": ("literature", "general"),
    "Литература/Тесты по произведениям.docx": ("literature", "works"),
}

def is_test_header(line: str) -> bool:
    lower = line.lower().strip()
    if not lower.startswith("тест"):
        return False
    if re.search(r"№|\d|[:.\-—]|по\s", lower):
        return True
    return len(lower) < 80
ANSWERS_HEADER = re.compile(r"^ответ", re.IGNORECASE)
QUESTION_LINE = re.compile(r"^(\d+)[\.)]\s*(.+)$")
OPTION_LINE = re.compile(r"^([абвг])\)\s*(.*)$", re.IGNORECASE)
OPTION_SPLIT = re.compile(r"(?<=\s)([абвг])\)\s*", re.IGNORECASE)
ANSWER_PAIR = re.compile(r"(\d+)\s*[\)\-—:]\s*([абвг])", re.IGNORECASE)


def read_lines(path: Path) -> list[str]:
    doc = Document(str(path))
    lines: list[str] = []
    for p in doc.paragraphs:
        text = re.sub(r"\s+", " ", p.text).strip()
        if text:
            lines.append(text)
    return lines


def parse_answer_key(text: str) -> dict[int, int]:
    answers: dict[int, int] = {}
    for num, letter in ANSWER_PAIR.findall(text):
        idx = LETTER_TO_INDEX.get(letter.lower())
        if idx is not None:
            answers[int(num)] = idx
    return answers


def has_inline_options(text: str) -> bool:
    letters = set(re.findall(r"(?<![\wа-яё])([абвг])\)", text, re.IGNORECASE))
    return len(letters) >= 2


def parse_inline_options(text: str) -> tuple[str, list[str]]:
    parts = OPTION_SPLIT.split(text)
    if len(parts) < 3:
        return text.strip(), []

    question = parts[0].strip(" .;:")
    options: list[str] = []
    i = 1
    while i < len(parts) - 1:
        letter = parts[i].lower()
        body = parts[i + 1].strip(" .;:")
        if letter in LETTER_TO_INDEX and body:
            options.append(body)
        i += 2

    return question, options[:4]


def finalize_question(
    qnum: int | None,
    question: str,
    options: list[str],
    answers: dict[int, int],
    fallback_num: int,
) -> dict | None:
    options = [o.strip() for o in options if o.strip()]
    if len(options) < 2:
        return None
    options = options[:4]

    num = qnum if qnum is not None else fallback_num
    correct = answers.get(num)
    if correct is None or correct >= len(options):
        correct = 0

    question = re.sub(r"\s+", " ", question).strip(" .;:")
    if not question:
        return None

    return {
        "num": num,
        "question": question,
        "options": options,
        "correct": correct,
    }


def split_blocks(lines: list[str]) -> list[tuple[str, list[str]]]:
    blocks: list[tuple[str, list[str]]] = []
    title = "Тест"
    body: list[str] = []

    for line in lines:
        if is_test_header(line):
            if body:
                blocks.append((title, body))
            title = line
            body = []
            continue
        body.append(line)

    if body:
        blocks.append((title, body))
    if not blocks:
        return [("Тест", lines)]
    return blocks


def parse_block(body: list[str]) -> list[dict]:
    answer_idx = next((i for i, line in enumerate(body) if ANSWERS_HEADER.match(line)), None)
    if answer_idx is not None:
        answer_text = " ".join(body[answer_idx:])
        answers = parse_answer_key(answer_text)
        content = body[:answer_idx]
    else:
        answers = {}
        content = body

    questions: list[dict] = []
    seq = 0

    current_num: int | None = None
    current_q = ""
    current_opts: list[str] = []

    def push_current() -> None:
        nonlocal seq, current_num, current_q, current_opts
        if not current_q and not current_opts:
            return
        seq += 1
        item = finalize_question(current_num, current_q, current_opts, answers, seq)
        if item:
            questions.append(item)
        current_num = None
        current_q = ""
        current_opts = []

    for line in content:
        if is_test_header(line) or ANSWERS_HEADER.match(line):
            continue

        numbered = QUESTION_LINE.match(line)
        if numbered:
            push_current()
            current_num = int(numbered.group(1))
            rest = numbered.group(2).strip()
            if has_inline_options(rest):
                q, opts = parse_inline_options(rest)
                current_q = q
                current_opts = opts
                if len(current_opts) >= 2:
                    push_current()
            else:
                current_q = rest
            continue

        option = OPTION_LINE.match(line)
        if option:
            if not current_q and questions:
                # orphan option line — attach to previous unfinished state
                pass
            current_opts.append(option.group(2).strip())
            if len(current_opts) >= 4:
                push_current()
            continue

        if has_inline_options(line):
            push_current()
            q, opts = parse_inline_options(line)
            current_q = q
            current_opts = opts
            if len(current_opts) >= 2:
                push_current()
            continue

        if current_opts:
            current_opts[-1] = f"{current_opts[-1]} {line}".strip()
        elif current_q:
            current_q = f"{current_q} {line}".strip()
        else:
            # stray continuation without active question — skip
            continue

    push_current()
    return questions


def difficulty_for(index: int, total: int) -> str:
    if total <= 1:
        return "medium"
    ratio = index / (total - 1)
    if ratio < 0.34:
        return "easy"
    if ratio < 0.67:
        return "medium"
    return "hard"


def slug(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9а-яё]+", "-", text, flags=re.IGNORECASE)
    return re.sub(r"-+", "-", text).strip("-")[:48]


def import_file(rel_path: str, track: str, category: str) -> list[dict]:
    path = ROOT / rel_path.replace("/", os.sep)
    lines = read_lines(path)
    blocks = split_blocks(lines)
    results: list[dict] = []
    file_slug = slug(Path(rel_path).stem)

    for block_idx, (title, body) in enumerate(blocks):
        parsed = parse_block(body)
        block_slug = slug(title) or f"block-{block_idx + 1}"
        for q_idx, q in enumerate(parsed):
            qid = f"{track}-{category}-{file_slug}-{block_slug}-{q['num']}"
            qid = re.sub(r"-+", "-", qid)
            results.append(
                {
                    "id": qid,
                    "track": track,
                    "category": category,
                    "difficulty": difficulty_for(q_idx, len(parsed)),
                    "question": q["question"],
                    "options": q["options"],
                    "correct": q["correct"],
                    "source": rel_path.replace("\\", "/"),
                    "testTitle": title,
                }
            )
    return results


def dedupe(questions: list[dict]) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for q in questions:
        question = re.sub(r"\s+", " ", q["question"].lower()).strip()
        options = "|".join(q.get("options") or [])
        key = f"{question}::{options}"
        if key in seen:
            continue
        seen.add(key)
        out.append(q)
    return out


def main() -> int:
    russian: list[dict] = []
    literature: list[dict] = []
    stats = []

    for rel, (track, category) in FILE_MAP.items():
        items = import_file(rel, track, category)
        if track == "russian":
            russian.extend(items)
        else:
            literature.extend(items)
        stats.append({"file": rel, "track": track, "category": category, "count": len(items)})

    russian = dedupe(russian)
    literature = dedupe(literature)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUT_DIR / "russian-language.json", "w", encoding="utf-8") as fh:
        json.dump(russian, fh, ensure_ascii=False, indent=2)
    with open(OUT_DIR / "literature-bank.json", "w", encoding="utf-8") as fh:
        json.dump(literature, fh, ensure_ascii=False, indent=2)

    meta = {
        "russianTotal": len(russian),
        "literatureTotal": len(literature),
        "files": stats,
        "categories": {
            "russian": sorted({q["category"] for q in russian}),
            "literature": sorted({q["category"] for q in literature}),
        },
    }
    with open(OUT_DIR / "index.json", "w", encoding="utf-8") as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=2)

    print(json.dumps(meta, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
