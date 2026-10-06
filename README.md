# OpenStackTools 🛠️
> **Free, client-side web utilities with an MIT-licensed public code repository**
> No paywalls. No sign-up. No /mo subscriptions. Zero server file uploads.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Privacy: Zero-Upload](https://img.shields.io/badge/Privacy-Zero--Upload-blue.svg)](#strict-client-side-architecture)
[![i18n: EN/TR](https://img.shields.io/badge/i18n-EN%20%7C%20TR-zinc.svg)](#internationalization-i18n)

---

##  Architectural Privacy Guarantee: ZERO SERVER UPLOADS

Unlike conventional SaaS utility platforms that charge /mo subscriptions and upload your sensitive contracts, photos, and files to remote cloud servers:

- **100% Client-Side Computing:** Every file transformation, PDF page extraction, audio waveform slicing, image compression, and hash generation executes inside your browser\'s local RAM using modern Web standards (HTML5 Canvas, Web Audio API, WebCrypto API, and client-side WebAssembly).
- **Data Minimization by Architecture (GDPR Art. 25 & KVKK):** Your data never touches a backend API wire because there is NO backend server.

---

##  Included 6 Essential Utilities

1. **PDF Merger & Splitter (pdf-lib via CDN)**:
   - Reorder, combine, split, and extract specific page ranges in-memory.
2. **Image Compressor & Resizer (HTML5 Canvas / OffscreenCanvas)**:
   - High-fidelity JPEG, PNG, and WebP compression with real-time byte comparison and dimension scaling.
3. **Audio Waveform Trimmer & Exporter (Web Audio API)**:
   - Real-time channel waveform visualization, millisecond selection trimming, and client-side WAV export.
4. **JSON Formatter, Validator & CSV Converter**:
   - Instant syntax validation, beautification, minification, and bi-directional JSON <-> CSV conversions.
5. **Password, Hash & UUID Generator (Web Crypto API)**:
   - Cryptographically secure password generator, RFC4122 UUID v4 tokens, and instant SHA-256 / SHA-512 / MD5 hashing.
6. **Canvas Crop & Background Eraser**:
   - Interactive color tolerance eraser for transparent PNG output.

---

##  Internationalization (i18n)

- Complete support for **English (EN)** and **Turkish (TR)** across all interface labels, instructions, toasts, and legal documents.
- State persists in localStorage across page reloads.

---

## Legal & AdSense Configuration

Includes dedicated regulatory transparency pages:
- **Privacy Policy** (Zero-upload guarantee)
- **Terms of Service** (repository license distinction & liability limitations)
- **Cookie & Ad Policy** (Google AdSense compliance & localStorage usage)
- **GDPR / KVKK Statement** (Data Minimization by Architecture declaration)

---

## Deployment (Cloudflare Workers)

The GitHub Actions workflow deploys the Worker and static assets using Wrangler. Configure these GitHub repository settings:

- **Secret `CLOUDFLARE_API_TOKEN`** with permission to deploy Workers and static assets.
- **Secret `CLOUDFLARE_ACCOUNT_ID`** for the target Cloudflare account.
- Configure the `openstacktool.com` custom domain for the `openstacktools` Worker. The Wrangler configuration declares this custom domain and Worker-first asset routing.
- In the Cloudflare Worker settings for the **Production** environment, configure **`OST_ADSENSE_CLIENT`** as a Worker environment variable only if ads should be enabled. This publisher identifier is deployment-managed and must not be committed.

The Worker in `src/index.js` serves static assets through the `ASSETS` binding and replaces `__ADSENSE_PUBLISHER_ID__` in JavaScript responses with `env.OST_ADSENSE_CLIENT`. If the value is missing or malformed, ads remain disabled. `keep_vars = true` preserves dashboard-managed variables during Wrangler deployment. The AdSense script and ad elements are created only after explicit opt-in. Verify consent, Google policy, and international-transfer requirements before enabling advertising.

For local development, use Wrangler with a non-committed `.dev.vars` file or Wrangler secret for `OST_ADSENSE_CLIENT`; never put production values in source control.

---

##  License

The public repository code is distributed under the **MIT License**, as stated in [LICENSE](LICENSE). The MIT license does not grant rights to the hosted website, OpenStackTools name or trademarks, hosted infrastructure, or separately licensed third-party scripts and services.
