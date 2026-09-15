import csv
import io
import json
import random
import urllib.request

URL = (
    'https://raw.githubusercontent.com/evrog/Russian-QA-Jeopardy/main/'
    'Russian_QA_Jeopardy_dataset_extended.csv'
)
OUT = 'data/tests/chgk-bank.json'


def parse_rows(raw):
    rows = []
    reader = csv.reader(io.StringIO(raw), delimiter='\t')
    next(reader, None)
    for parts in reader:
        if len(parts) < 4:
            continue
        qid = parts[0].strip()
        question = parts[2].strip()
        answer = parts[3].strip()
        topic = parts[4].strip() if len(parts) > 4 else ''
        if not qid or not question or not answer or len(answer) > 40:
            continue
        rows.append({
            'id': f'chgk-{qid}',
            'question': question,
            'answer': answer,
            'topic': topic,
        })
    return rows


def guess_category(question, topic=''):
    text = f'{topic} {question}'.lower()
    rules = [
        (('литера', 'поэт', 'писат', 'роман', 'стих', 'театр'), 'literature'),
        (('граммат', 'глагол', 'часть речи', 'предлож'), 'grammar'),
        (('удар', 'произнош'), 'stress'),
        (('орфограф', 'букв', 'напис'), 'orthography'),
        (('пунктуац', 'запят', 'тире'), 'punctuation'),
        (('синон', 'антон', 'фразеол', 'лексик'), 'lexicon'),
        (('школ', 'учит', 'урок', 'педагог'), 'pedagogy'),
    ]
    for keys, category in rules:
        if any(key in text for key in keys):
            return category
    return 'general'


def main():
    raw = urllib.request.urlopen(URL, timeout=90).read().decode('utf-8', errors='replace')
    rows = parse_rows(raw)
    answers = [row['answer'] for row in rows]

    random.seed(2026)
    out = []
    for row in rows:
        if len(out) >= 1500:
            break

        wrong = set()
        for _ in range(100):
            candidate = random.choice(answers)
            if candidate != row['answer']:
                wrong.add(candidate)
            if len(wrong) >= 3:
                break

        if len(wrong) < 3:
            continue

        options = [row['answer'], *list(wrong)[:3]]
        random.shuffle(options)
        out.append({
            'id': row['id'],
            'category': guess_category(row['question'], row['topic']),
            'difficulty': (
                'easy' if len(row['answer']) <= 8
                else 'hard' if len(row['question']) > 120
                else 'medium'
            ),
            'question': row['question'],
            'options': options,
            'correct': options.index(row['answer']),
            'source': 'chgk',
        })

    with open(OUT, 'w', encoding='utf-8') as handle:
        json.dump(out, handle, ensure_ascii=False, indent=2)

    print(f'Parsed rows: {len(rows)}')
    print(f'Saved questions: {len(out)}')
    if out:
        print('Sample:', out[0]['id'], out[0]['question'][:80])


if __name__ == '__main__':
    main()
