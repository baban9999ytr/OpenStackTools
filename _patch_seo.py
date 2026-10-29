import re
from pathlib import Path

root = Path(r"C:\Users\KRR\Desktop\OpenStackTools\OpenStackTools")

DOMAIN = "https://openstacktool.com"

pages = {
    "pdf-merger": {
        "title": "Free Online PDF Merger (No Upload) | OpenStackTools",
        "desc": "Merge, split, and extract PDF pages in your browser. No server upload, no account, no cloud quota. pdf-lib runs in RAM on this device.",
        "h1": "Free online PDF merger — no upload, no account",
        "lead": "Combine PDFs, reorder pages, and extract ranges locally with pdf-lib. There is no OpenStackTools upload limit because files never leave this tab.",
        "path": "/pdf-merger/",
        "app": "PDF Merger & Splitter",
        "faq_q": "Is there a PDF merge upload limit?",
        "faq_a": "OpenStackTools does not host your PDFs. Limits are your browser and RAM, not a server quota.",
        "old_h1": "PDF Merger & Splitter",
    },
    "image-compressor": {
        "title": "Compress Image in Browser Locally (No Upload) | OpenStackTools",
        "desc": "Compress JPEG, PNG, and WebP in your browser with HTML5 Canvas. No upload, no account. Files stay in RAM on this device.",
        "h1": "Compress images locally in your browser — without uploading",
        "lead": "Resize and compress JPEG, PNG, and WebP on HTML5 Canvas. The original file is never sent to an OpenStackTools server.",
        "path": "/image-compressor/",
        "app": "Image Compressor",
        "faq_q": "Are my photos uploaded when I compress them?",
        "faq_a": "No. Compression runs on Canvas in this tab. Download the result from your device.",
        "old_h1": "Image Compressor & Resizer",
    },
    "audio-trimmer": {
        "title": "Trim Audio in Browser (No Upload) | OpenStackTools",
        "desc": "Cut MP3, WAV, OGG, or AAC in your browser with the Web Audio API. Export WAV locally. No server upload.",
        "h1": "Trim audio in the browser — files stay on your device",
        "lead": "Decode with the Web Audio API, set start and end on the waveform, export WAV from RAM. Nothing is uploaded to process the clip.",
        "path": "/audio-trimmer/",
        "app": "Audio Trimmer",
        "faq_q": "Does the audio cutter upload my file?",
        "faq_a": "No. Decoding, trimming, and WAV export happen in this browser session.",
        "old_h1": "Audio Waveform Trimmer",
    },
    "json-formatter": {
        "title": "JSON Formatter & CSV Converter in Browser | OpenStackTools",
        "desc": "Beautify, minify, and validate JSON and convert to CSV locally. No upload, no account. Processing stays in this tab.",
        "h1": "Format JSON and convert CSV locally — no upload",
        "lead": "Validate and pretty-print JSON, minify payloads, and convert JSON to CSV in memory. Your data does not go to a backend.",
        "path": "/json-formatter/",
        "app": "JSON & CSV Studio",
        "faq_q": "Is my JSON sent to a server?",
        "faq_a": "No. Formatting and CSV conversion run in JavaScript in this page.",
        "old_h1": "JSON & CSV Studio",
    },
    "password-generator": {
        "title": "Password, UUID & Hash Generator (WebCrypto) | OpenStackTools",
        "desc": "Generate CSPRNG passwords, UUID v4, and SHA-256 / SHA-512 / MD5 hashes in the browser with WebCrypto. Nothing is uploaded.",
        "h1": "Generate passwords and hashes in browser RAM",
        "lead": "Use WebCrypto for passwords, UUID v4, and hashes. Secrets are computed locally and are not sent to OpenStackTools.",
        "path": "/password-generator/",
        "app": "Cryptography Tools",
        "faq_q": "Do you store generated passwords?",
        "faq_a": "No. Values exist only in this page until you copy or leave. We have no password database.",
        "old_h1": "Password, Hash & UUID Generator",
    },
    "background-remover": {
        "title": "Crop Image & Remove Background Locally | OpenStackTools",
        "desc": "Crop images and erase solid backgrounds to transparent PNG on HTML5 Canvas. No upload. Processing stays in RAM.",
        "h1": "Crop and erase backgrounds locally — no upload",
        "lead": "Color-key transparency and crop on Canvas in this tab. Your image is not uploaded to a removal API.",
        "path": "/background-remover/",
        "app": "Crop & Background Eraser",
        "faq_q": "Is this an AI background remover that uploads photos?",
        "faq_a": "No. It is a local color-key and crop tool. Pixels stay in this browser.",
        "old_h1": "Canvas Crop & Color Key Eraser",
    },
}

seo_tpl = """  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="{domain}{path}">
  <link rel="alternate" hreflang="en" href="{domain}{path}?lang=en">
  <link rel="alternate" hreflang="tr" href="{domain}{path}?lang=tr">
  <link rel="alternate" hreflang="x-default" href="{domain}{path}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{domain}{path}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{desc}">
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@graph": [
      {{
        "@type": ["WebApplication", "SoftwareApplication"],
        "name": "{app}",
        "applicationCategory": "UtilitiesApplication",
        "operatingSystem": "Web browser",
        "isAccessibleForFree": true,
        "offers": {{ "@type": "Offer", "price": "0", "priceCurrency": "USD" }},
        "description": "{desc}"
      }},
      {{
        "@type": "FAQPage",
        "mainEntity": [{{
          "@type": "Question",
          "name": "{faq_q}",
          "acceptedAnswer": {{ "@type": "Answer", "text": "{faq_a}" }}
        }}]
      }}
    ]
  }}
  </script>"""

faq_html = """
        <article class="mt-8 border border-zinc-200 dark:border-zinc-900 p-6 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-600 dark:text-zinc-500 space-y-3">
          <h2 class="text-sm font-semibold text-zinc-300">FAQ</h2>
          <p class="leading-relaxed"><strong class="text-zinc-400">{faq_q}</strong> {faq_a}</p>
        </article>
"""

for slug, meta in pages.items():
    file_path = root / slug / "index.html"
    if not file_path.exists():
        print(f"Skipping {slug}: File not found at {file_path}")
        continue

    text = file_path.read_text(encoding="utf-8")

    formatted_seo = seo_tpl.format(domain=DOMAIN, **meta).strip()
    text = re.sub(
        r"<title>.*?</title>\s*<meta name=\"description\"\s*content=\"[^\"]*\">",
        formatted_seo,
        text,
        count=1,
        flags=re.S,
    )

    text = text.replace(
        "flex flex-col lg:flex-row gap-8", "flex flex-col lg:flex-row gap-12"
    )

    old_h1_str = f'<h1 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{meta["old_h1"]}</h1>'
    new_h1_str = f'<h1 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{meta["h1"]}</h1>'
    text = text.replace(old_h1_str, new_h1_str)

    escaped_h1 = re.escape(meta["h1"])
    pattern = rf'(<h1 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{escaped_h1}</h1>\s*<p class="text-xs text-zinc-500 mt-1">)[\s\S]*?(</p>)'
    text = re.sub(
        pattern,
        rf'\g<1>{meta["lead"]}\g<2>',
        text,
        count=1,
    )

    if "FAQ</h2>" not in text:
        marker = "      </div>\n\n      <!-- SIDEBAR ADSLOT"
        if marker in text:
            text = text.replace(
                marker,
                faq_html.format(**meta) + "\n      </div>\n\n      <!-- SIDEBAR ADSLOT",
                1,
            )
        else:
            marker2 = "      </div>\n\n      <aside"
            if marker2 in text:
                text = text.replace(
                    marker2,
                    faq_html.format(**meta) + "\n      </div>\n\n      <aside",
                    1,
                )

    file_path.write_text(text, encoding="utf-8")
    print(f"Successfully patched SEO for: {slug}")
