import html
import re
from pathlib import Path


source = Path("code-appscript/index.html").read_text(encoding="utf-8")
values = re.findall(r">([^<>\n{}]*[A-Za-z][^<>\n{}]*)<", source)
values += re.findall(
    r"(?:label|title|placeholder|text|hint|confirmButtonText|cancelButtonText)\s*[=:]\s*[\"']([^\"']*[A-Za-z][^\"']*)[\"']",
    source,
)

blocked = re.compile(r"https?://|className|function|return|const |var |let |=>|===|&&|\\")
clean = {
    html.unescape(value.strip())
    for value in values
    if 1 < len(value.strip()) < 180 and not blocked.search(value)
}
for value in sorted(clean, key=str.casefold):
    print(value)
