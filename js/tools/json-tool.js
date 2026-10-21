import { t } from "../i18n.js?v=crypto-ads-hotfix-20261021";
import { downloadBlob } from "../file-utils.js?v=phase3-closeout";

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
  const outputModes = Array.from(document.querySelectorAll("[data-json-output-mode]"));
  const outputTextView = document.getElementById("json-output-text-view");
  const highlightedOutput = document.getElementById("json-highlighted-output");
  const treeOutput = document.getElementById("json-tree-output");

  if (!inputEl) return;

  let activeOutputMode = "text";

  function jsonSource() {
    if (outputEl.value.trim()) return outputEl.dataset.outputFormat === "json" ? outputEl.value : "";
    return inputEl.value.trim();
  }

  function appendHighlightedJson(target, source) {
    target.replaceChildren();
    const tokenPattern = /("(?:\\.|[^"\\])*"\s*)(?=:)|("(?:\\.|[^"\\])*")|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|\b(true|false|null)\b|([{}[\],:])/g;
    let lastIndex = 0;
    for (const match of source.matchAll(tokenPattern)) {
      const index = match.index;
      if (index > lastIndex) target.append(document.createTextNode(source.slice(lastIndex, index)));
      const token = match[0];
      const span = document.createElement("span");
      span.className = match[1] ? "json-token-key" : match[2] ? "json-token-string" : match[3] ? "json-token-number" : match[4] ? "json-token-literal" : "json-token-punctuation";
      span.textContent = token;
      target.append(span);
      lastIndex = index + token.length;
    }
    if (lastIndex < source.length) target.append(document.createTextNode(source.slice(lastIndex)));
  }

  function appendTreeValue(parent, value, key, state, depth = 0) {
    if (state.nodes >= 2000 || depth > 40) {
      state.limited = true;
      return false;
    }
    state.nodes += 1;
    const isContainer = value !== null && typeof value === "object";
    if (!isContainer) {
      const row = document.createElement("div");
      row.className = "json-tree-leaf";
      if (key !== undefined) {
        const label = document.createElement("span");
        label.className = "json-token-key json-tree-key";
        label.textContent = `${JSON.stringify(String(key))}: `;
        row.append(label);
      }
      const token = document.createElement("span");
      const raw = JSON.stringify(value);
      token.className = value === null || typeof value === "boolean" ? "json-token-literal" : typeof value === "number" ? "json-token-number" : "json-token-string";
      token.textContent = raw === undefined ? "undefined" : raw;
      row.append(token);
      parent.append(row);
      return true;
    }

    const entries = Array.isArray(value) ? value.map((item, index) => [index, item]) : Object.entries(value);
    const details = document.createElement("details");
    details.className = "json-tree-node";
    details.open = depth === 0;
    const summary = document.createElement("summary");
    summary.className = "json-tree-summary";
    if (key !== undefined) {
      const label = document.createElement("span");
      label.className = "json-token-key json-tree-key";
      label.textContent = `${JSON.stringify(String(key))}: `;
      summary.append(label);
    }
    const kind = Array.isArray(value) ? "Array" : "Object";
    const marker = document.createElement("span");
    marker.className = "json-token-punctuation";
    marker.textContent = Array.isArray(value) ? "[ ]" : "{ }";
    summary.append(marker, document.createTextNode(` ${entries.length} ${entries.length === 1 ? "item" : "items"}`));
    details.append(summary);

    if (entries.length) {
      const children = document.createElement("div");
      children.className = "json-tree-children";
      for (const [childKey, childValue] of entries) {
        if (!appendTreeValue(children, childValue, childKey, state, depth + 1)) break;
      }
      details.append(children);
    } else {
      summary.append(document.createTextNode(` · empty ${kind.toLowerCase()}`));
    }
    parent.append(details);
    return !state.limited;
  }

  function renderOutputMode(mode) {
    activeOutputMode = mode;
    outputTextView.hidden = mode !== "text";
    highlightedOutput.hidden = mode !== "highlight";
    treeOutput.hidden = mode !== "tree";
    outputModes.forEach((button) => {
      const selected = button.dataset.jsonOutputMode === mode;
      button.setAttribute("aria-pressed", String(selected));
    });
    if (mode === "text") return;
    const source = jsonSource();
    try {
      const parsed = JSON.parse(source);
      if (mode === "highlight") {
        appendHighlightedJson(highlightedOutput.querySelector("code"), JSON.stringify(parsed, null, 2));
      } else {
        treeOutput.replaceChildren();
        const state = { nodes: 0, limited: false };
        appendTreeValue(treeOutput, parsed, undefined, state);
        if (state.limited) {
          const note = document.createElement("p");
          note.className = "json-tree-limit";
          note.textContent = t("json_view_limit");
          treeOutput.append(note);
        }
      }
    } catch {
      const message = t("json_view_prompt");
      (mode === "highlight" ? highlightedOutput : treeOutput).textContent = message;
    }
  }

  outputModes.forEach((button) => button.addEventListener("click", () => renderOutputMode(button.dataset.jsonOutputMode)));

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
    if (activeOutputMode !== "text" && outputEl.dataset.outputFormat !== "json") renderOutputMode(activeOutputMode);
  }

  formatBtn.addEventListener("click", () => {
    try {
      const obj = JSON.parse(inputEl.value);
      outputEl.value = JSON.stringify(obj, null, 2);
      outputEl.dataset.outputFormat = "json";
      renderOutputMode(activeOutputMode);
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
      renderOutputMode(activeOutputMode);
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
        renderOutputMode(activeOutputMode);
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
      renderOutputMode(activeOutputMode);
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
      renderOutputMode(activeOutputMode);
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
