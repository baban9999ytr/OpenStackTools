import { t } from "../i18n.js";
import { downloadBlob } from "../file-utils.js";

export function initJsonTool() {
  const inputEl = document.getElementById("json-input");
  const outputEl = document.getElementById("json-output");
  const formatBtn = document.getElementById("json-format-btn");
  const minifyBtn = document.getElementById("json-minify-btn");
  const toCsvBtn = document.getElementById("json-to-csv-btn");
  const toJsonBtn = document.getElementById("json-to-json-btn");
  const copyBtn = document.getElementById("json-copy-btn");
  const statusEl = document.getElementById("json-status");
  const fileInput = document.getElementById("json-file-input");
  const loadFileBtn = document.getElementById("json-load-file-btn");
  const lineNumbersEl = document.getElementById("json-line-numbers");
  const searchInput = document.getElementById("json-search-input");
  const searchNextBtn = document.getElementById("json-search-next");
  const downloadBtn = document.getElementById("json-download-btn");

  if (!inputEl) return;

  function syncLineNumbers() {
    const lineCount = Math.max(1, inputEl.value.split("\n").length);
    lineNumbersEl.textContent = Array.from({ length: lineCount }, (_, index) => index + 1).join("\n");
    lineNumbersEl.scrollTop = inputEl.scrollTop;
  }

  function showError(label, error, source = inputEl.value) {
    const message = error instanceof Error ? error.message : String(error);
    const explicitLocation = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
    const position = message.match(/position\s+(\d+)/i);
    const unexpected = message.match(/Unexpected token ['"](.+?)['"]/i)?.[1];
    let offset = position ? Number(position[1]) : unexpected ? source.indexOf(unexpected) : -1;
    if (/Unexpected end of JSON input/i.test(message)) offset = source.length;
    let line = Number(explicitLocation?.[1]);
    let column = Number(explicitLocation?.[2]);
    if (!line && offset >= 0) {
      const lines = source.slice(0, offset).split("\n");
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    }
    statusEl.textContent = `${label}${line ? ` · Line ${line}, column ${column}` : ""}: ${message}`;
    statusEl.className = "text-xs font-mono text-red-400";
  }

  inputEl.addEventListener("scroll", () => { lineNumbersEl.scrollTop = inputEl.scrollTop; });
  syncLineNumbers();

  if (loadFileBtn && fileInput) {
    loadFileBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
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

  inputEl.addEventListener("input", () => { syncLineNumbers(); validateRealtime(); });

  function validateRealtime() {
    const val = inputEl.value.trim();
    if (!val) {
      statusEl.textContent = "";
      statusEl.className = "text-xs font-mono";
      return;
    }
    try {
      JSON.parse(val);
      statusEl.textContent = "✓ " + t("json_status_valid");
      statusEl.className = "text-xs font-mono text-emerald-400";
    } catch (err) {
      showError("⚠ " + t("json_status_error"), err);
    }
  }

  formatBtn.addEventListener("click", () => {
    try {
      const obj = JSON.parse(inputEl.value);
      outputEl.value = JSON.stringify(obj, null, 2);
      outputEl.dataset.outputFormat = "json";
      statusEl.textContent = "✓ Formatted JSON cleanly";
      statusEl.className = "text-xs font-mono text-emerald-400";
    } catch (err) {
      showError("Invalid JSON", err);
    }
  });

  minifyBtn.addEventListener("click", () => {
    try {
      const obj = JSON.parse(inputEl.value);
      outputEl.value = JSON.stringify(obj);
      outputEl.dataset.outputFormat = "json";
      statusEl.textContent = "✓ Minified JSON successfully";
      statusEl.className = "text-xs font-mono text-emerald-400";
    } catch (err) {
      showError("Invalid JSON", err);
    }
  });

  toCsvBtn.addEventListener("click", () => {
    try {
      const raw = JSON.parse(inputEl.value);
      const arr = Array.isArray(raw) ? raw : [raw];
      if (arr.length === 0) {
        outputEl.value = "";
        outputEl.dataset.outputFormat = "csv";
        statusEl.textContent = "✓ Converted an empty array to CSV";
        statusEl.className = "text-xs font-mono text-emerald-400";
        return;
      }

      if (!arr.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
        throw new Error("JSON to CSV requires an object or an array of objects.");
      }

      // Collect all keys
      const headers = Array.from(
        arr.reduce((acc, obj) => {
          Object.keys(obj).forEach((k) => acc.add(k));
          return acc;
        }, new Set()),
      );

      const rows = [headers.join(",")];
      for (const obj of arr) {
        const row = headers.map((header) => {
          let val =
            obj[header] === undefined || obj[header] === null
              ? ""
              : obj[header];
          if (typeof val === "object") val = JSON.stringify(val);
          val = String(val).replace(/"/g, '""');
          if (val.includes(",") || val.includes("\n") || val.includes('"')) {
            val = `"${val}"`;
          }
          return val;
        });
        rows.push(row.join(","));
      }

      outputEl.value = rows.join("\n");
      outputEl.dataset.outputFormat = "csv";
      statusEl.textContent = "✓ Converted JSON to CSV";
      statusEl.className = "text-xs font-mono text-emerald-400";
    } catch (err) {
      showError("Conversion failed", err);
    }
  });

  toJsonBtn.addEventListener("click", () => {
    try {
      const csv = inputEl.value.trim();
      if (!csv) return;

      const rows = parseCsv(csv);
      if (rows.length < 2) {
        showError("CSV needs a header row and at least one data row", new Error("Add a row beneath the headings."));
        return;
      }

      const headers = rows[0].map((header) => header.trim());
      const result = [];

      for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        const obj = {};
        headers.forEach((h, idx) => {
          let val = values[idx] !== undefined ? values[idx] : "";
          if (val.toLowerCase() === "true") val = true;
          else if (val.toLowerCase() === "false") val = false;
          else if (val !== "" && !isNaN(val)) val = Number(val);
          obj[h] = val;
        });
        result.push(obj);
      }

      outputEl.value = JSON.stringify(result, null, 2);
      outputEl.dataset.outputFormat = "json";
      statusEl.textContent = "✓ Converted CSV to JSON";
      statusEl.className = "text-xs font-mono text-emerald-400";
    } catch (err) {
      showError("CSV parsing error", err);
    }
  });

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    let closedQuote = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"' && text[i + 1] === '"') {
          field += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
          closedQuote = true;
        } else {
          field += char;
        }
        continue;
      }

      if (char === '"' && field === "" && !closedQuote) {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
        closedQuote = false;
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        if (row.some((value) => value !== "")) rows.push(row);
        row = [];
        field = "";
        closedQuote = false;
      } else if (closedQuote && !/\s/.test(char)) {
        throw new Error("Unexpected character after a quoted CSV field.");
      } else if (!closedQuote) {
        field += char;
      }
    }
    if (inQuotes) throw new Error("A quoted CSV field is not closed.");
    row.push(field);
    if (row.some((value) => value !== "")) rows.push(row);
    return rows;
  }

  copyBtn.addEventListener("click", async () => {
    if (!outputEl.value) return;
    try {
      await navigator.clipboard.writeText(outputEl.value);
      const orig = copyBtn.textContent;
      copyBtn.textContent = "✓ " + t("copied");
      setTimeout(() => (copyBtn.textContent = orig), 1800);
      statusEl.textContent = "Copied output to clipboard.";
      statusEl.className = "text-xs font-mono text-emerald-400";
    } catch {
      statusEl.textContent = "Clipboard access is unavailable. Select and copy the output instead.";
      statusEl.className = "text-xs font-mono text-amber-400";
    }
  });

  searchNextBtn.addEventListener("click", () => {
    const query = searchInput.value;
    if (!query) return;
    const source = inputEl.value;
    const haystack = source.toLocaleLowerCase();
    const needle = query.toLocaleLowerCase();
    const startAt = inputEl.selectionEnd || 0;
    let foundAt = haystack.indexOf(needle, startAt);
    if (foundAt < 0) foundAt = haystack.indexOf(needle);
    if (foundAt < 0) {
      statusEl.textContent = "No match found in the input.";
      statusEl.className = "text-xs font-mono text-amber-400";
      return;
    }
    inputEl.focus();
    inputEl.setSelectionRange(foundAt, foundAt + query.length);
    const lineHeight = Number.parseFloat(getComputedStyle(inputEl).lineHeight) || 20;
    inputEl.scrollTop = Math.max(0, source.slice(0, foundAt).split("\n").length - 1) * lineHeight;
    lineNumbersEl.scrollTop = inputEl.scrollTop;
    statusEl.textContent = "Match selected in input.";
    statusEl.className = "text-xs font-mono text-sky-400";
  });

  searchInput.addEventListener("keydown", (event) => { if (event.key === "Enter") searchNextBtn.click(); });

  downloadBtn.addEventListener("click", () => {
    if (!outputEl.value) {
      statusEl.textContent = "Create an output before downloading.";
      statusEl.className = "text-xs font-mono text-amber-400";
      return;
    }
    const format = outputEl.dataset.outputFormat === "csv" ? "csv" : "json";
    const type = format === "csv" ? "text/csv" : "application/json";
    downloadBlob(new Blob([outputEl.value], { type }), `openstacktools-result.${format}`);
    statusEl.textContent = "Download started.";
    statusEl.className = "text-xs font-mono text-emerald-400";
  });
}
