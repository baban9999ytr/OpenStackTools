import re
from pathlib import Path

root = Path(r"C:\Users\KRR\Desktop\OpenStackTools\OpenStackTools")
ads_head = re.compile(
    r"\s*<script async src=\"https://pagead2\.googlesyndication\.com/pagead/js/adsbygoogle\.js\?client=ca-pub-\d+\"\s*crossorigin=\"anonymous\"></script>",
    re.I,
)
ads_head2 = re.compile(
    r"\s*<script async src=\"https://pagead2\.googlesyndication\.com/pagead/js/adsbygoogle\.js\?client=ca-pub-\d+\"\s*\n\s*crossorigin=\"anonymous\"></script>",
    re.I,
)
push = re.compile(
    r"\s*<script>\s*document\.addEventListener\(\"DOMContentLoaded\", \(\) => \{\s*const ads = document\.querySelectorAll\('\.adsbygoogle'\);\s*ads\.forEach\(\(\) => \{\s*\(adsbygoogle = window\.adsbygoogle \|\| \[\]\)\.push\(\{\}\);\s*\}\);\s*\}\);\s*</script>",
    re.S,
)
consent_tag = '<script src="/js/consent-banner.js"></script>'
cookie_btn = '<button type="button" class="hover:text-zinc-300 transition-colors" onclick="window.OSTConsent&&OSTConsent.open()">Cookie settings</button>'

for path in root.rglob("index.html"):
    text = path.read_text(encoding="utf-8")
    orig = text
    text = ads_head.sub("", text)
    text = ads_head2.sub("", text)
    text = push.sub("", text)
    if consent_tag not in text:
        text = text.replace("</head>", f"  {consent_tag}\n</head>", 1)
    if "OSTConsent.open()" not in text and 'href="/gdpr-kvkk/"' in text:
        text = text.replace(
            '<a href="/gdpr-kvkk/" class="hover:text-zinc-300 transition-colors">GDPR</a>',
            '<a href="/gdpr-kvkk/" class="hover:text-zinc-300 transition-colors">GDPR</a>\n        <button type="button" class="hover:text-zinc-300 transition-colors" onclick="window.OSTConsent&&OSTConsent.open()">Cookie settings</button>',
            1,
        )
    if text != orig:
        path.write_text(text, encoding="utf-8")
        print("updated", path.relative_to(root))
    else:
        print("unchanged", path.relative_to(root))
