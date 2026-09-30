import { t } from '../i18n.js';

export function initJsonTool() {
  const inputEl = document.getElementById('json-input');
  const outputEl = document.getElementById('json-output');
  const formatBtn = document.getElementById('json-format-btn');
  const minifyBtn = document.getElementById('json-minify-btn');
  const toCsvBtn = document.getElementById('json-to-csv-btn');
  const toJsonBtn = document.getElementById('json-to-json-btn');
  const copyBtn = document.getElementById('json-copy-btn');
  const statusEl = document.getElementById('json-status');
  const fileInput = document.getElementById('json-file-input');
  const loadFileBtn = document.getElementById('json-load-file-btn');

  if (!inputEl) return;

  if (loadFileBtn && fileInput) {
    loadFileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
          inputEl.value = ev.target.result;
          validateRealtime();
        };
        reader.readAsText(file);
      }
    });
  }

  inputEl.addEventListener('input', validateRealtime);

  function validateRealtime() {
    const val = inputEl.value.trim();
    if (!val) {
      statusEl.textContent = '';
      statusEl.className = 'text-xs font-mono';
      return;
    }
    try {
      JSON.parse(val);
      statusEl.textContent = '✓ ' + t('json_status_valid');
      statusEl.className = 'text-xs font-mono text-emerald-400';
    } catch (err) {
      statusEl.textContent = '⚠ ' + t('json_status_error') + ': ' + err.message;
      statusEl.className = 'text-xs font-mono text-red-400';
    }
  }

  formatBtn.addEventListener('click', () => {
    try {
      const obj = JSON.parse(inputEl.value);
      outputEl.value = JSON.stringify(obj, null, 2);
      statusEl.textContent = '✓ Formatted JSON cleanly';
      statusEl.className = 'text-xs font-mono text-emerald-400';
    } catch (err) {
      alert('Invalid JSON: ' + err.message);
    }
  });

  minifyBtn.addEventListener('click', () => {
    try {
      const obj = JSON.parse(inputEl.value);
      outputEl.value = JSON.stringify(obj);
      statusEl.textContent = '✓ Minified JSON successfully';
      statusEl.className = 'text-xs font-mono text-emerald-400';
    } catch (err) {
      alert('Invalid JSON: ' + err.message);
    }
  });

  toCsvBtn.addEventListener('click', () => {
    try {
      const raw = JSON.parse(inputEl.value);
      const arr = Array.isArray(raw) ? raw : [raw];
      if (arr.length === 0) {
        outputEl.value = '';
        return;
      }

      // Collect all keys
      const headers = Array.from(
        arr.reduce((acc, obj) => {
          Object.keys(obj).forEach(k => acc.add(k));
          return acc;
        }, new Set())
      );

      const rows = [headers.join(',')];
      for (const obj of arr) {
        const row = headers.map(header => {
          let val = obj[header] === undefined || obj[header] === null ? '' : obj[header];
          if (typeof val === 'object') val = JSON.stringify(val);
          val = String(val).replace(/"/g, '""');
          if (val.includes(',') || val.includes('\n') || val.includes('"')) {
            val = `"${val}"`;
          }
          return val;
        });
        rows.push(row.join(','));
      }

      outputEl.value = rows.join('\n');
      statusEl.textContent = '✓ Converted JSON to CSV';
      statusEl.className = 'text-xs font-mono text-emerald-400';
    } catch (err) {
      alert('Conversion failed: ' + err.message);
    }
  });

  toJsonBtn.addEventListener('click', () => {
    try {
      const csv = inputEl.value.trim();
      if (!csv) return;

      const lines = csv.split(/\r?\n/).filter(l => l.trim() !== '');
      if (lines.length < 2) {
        alert('CSV must contain a header line and at least one data row.');
        return;
      }

      const headers = parseCsvLine(lines[0]);
      const result = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        const obj = {};
        headers.forEach((h, idx) => {
          let val = values[idx] !== undefined ? values[idx] : '';
          if (val.toLowerCase() === 'true') val = true;
          else if (val.toLowerCase() === 'false') val = false;
          else if (val !== '' && !isNaN(val)) val = Number(val);
          obj[h] = val;
        });
        result.push(obj);
      }

      outputEl.value = JSON.stringify(result, null, 2);
      statusEl.textContent = '✓ Converted CSV to JSON';
      statusEl.className = 'text-xs font-mono text-emerald-400';
    } catch (err) {
      alert('CSV parsing error: ' + err.message);
    }
  });

  function parseCsvLine(text) {
    const values = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        values.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    values.push(cur.trim());
    return values;
  }

  copyBtn.addEventListener('click', () => {
    if (!outputEl.value) return;
    navigator.clipboard.writeText(outputEl.value);
    const orig = copyBtn.textContent;
    copyBtn.textContent = '✓ ' + t('copied');
    setTimeout(() => copyBtn.textContent = orig, 1800);
  });
}