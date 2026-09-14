import json, os

# Extract t("en", "zh") pairs from source files
en_zh = {}
total = 0

for root, dirs, files in os.walk('src'):
    for f in files:
        if f.endswith(('.tsx', '.ts')):
            path = os.path.join(root, f)
            with open(path, encoding='utf-8') as fp:
                content = fp.read()
            for line in content.split('\n'):
                stripped = line.strip()
                if not stripped.startswith('t('):
                    continue
                # Find first and last quote pair
                idx = stripped.find('t(')
                inner = stripped[idx+2:]
                # Look for second argument with quotes
                # Pattern: "..." , "..."
                if '", "' in inner or '",\n' in inner:
                    # Extract the first two quoted strings
                    parts = []
                    i = 0
                    while i < len(inner):
                        if inner[i] == '"':
                            j = i + 1
                            buf = ''
                            while j < len(inner):
                                if inner[j] == '\\' and j + 1 < len(inner):
                                    buf += inner[j:j+2]
                                    j += 2
                                elif inner[j] == '"':
                                    break
                                else:
                                    buf += inner[j]
                                    j += 1
                            parts.append(buf)
                            i = j + 1
                            if len(parts) >= 2:
                                break
                        else:
                            i += 1
                    if len(parts) >= 2:
                        en = parts[0]
                        zh_val = parts[1]
                        if en and zh_val:
                            en_zh[en] = zh_val
                            total += 1

print(f'Extracted {total} inline en->zh pairs, {len(en_zh)} unique')

# Load existing zh.json
with open('public/locales/zh.json', encoding='utf-8') as f:
    zh = json.load(f)

before = len(zh)
zh.update(en_zh)
print(f'zh.json: {before} -> {len(zh)}')

with open('public/locales/zh.json', 'w', encoding='utf-8') as f:
    json.dump(zh, f, ensure_ascii=False, indent=2)
print('zh.json saved')
