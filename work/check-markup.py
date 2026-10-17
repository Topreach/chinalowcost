import json
from html.parser import HTMLParser
from pathlib import Path

class MarkupCheck(HTMLParser):
    void = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr','use','path','circle','ellipse','rect'}
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack=[]
        self.errors=[]
    def handle_starttag(self, tag, attrs):
        if tag not in self.void: self.stack.append(tag)
    def handle_startendtag(self, tag, attrs): pass
    def handle_endtag(self, tag):
        if tag in self.void: return
        if not self.stack or self.stack[-1] != tag:
            self.errors.append(f'Unexpected </{tag}>; current {self.stack[-3:]}')
            if tag in self.stack:
                while self.stack and self.stack[-1] != tag: self.stack.pop()
                if self.stack: self.stack.pop()
        else: self.stack.pop()

errors=[]
for fixture in json.loads(Path('work/rendered-routes.json').read_text(encoding='utf8')):
    check=MarkupCheck();check.feed(fixture['html'])
    if check.errors or check.stack: errors.append((fixture['id'],check.errors,check.stack))
if errors:
    for e in errors: print(e)
    raise SystemExit(1)
print('PASS: all page layouts have balanced HTML structure.')
