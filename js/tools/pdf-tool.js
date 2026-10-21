import { t } from "../i18n.js";
import { downloadBlob, sanitizeFilename } from "../file-utils.js";

const PDFJS_VERSION = "4.10.38";
const PAGE_WINDOW_SIZE = 24;
let pdfJsPromise;
const pdfPreviewDocs = new Map();
let pdfFiles = [];
let pdfPages = [];
let pageWindowStart = 0;
let resultUrl = "";

export function initPdfTool() {
  const dropZone = document.getElementById("pdf-drop-zone");
  const fileInput = document.getElementById("pdf-file-input");
  const fileList = document.getElementById("pdf-file-list");
  const pageWorkspace = document.getElementById("pdf-page-workspace");
  const pageNavigation = document.getElementById("pdf-page-navigation");
  const mergeBtn = document.getElementById("pdf-merge-btn");
  const extractBtn = document.getElementById("pdf-extract-btn");
  const clearBtn = document.getElementById("pdf-clear-btn");
  const statusEl = document.getElementById("pdf-status");
  const resultEl = document.getElementById("pdf-result");
  const resultDetail = document.getElementById("pdf-result-detail");
  const resultDownload = document.getElementById("pdf-result-download");
  const pageRangeInput = document.getElementById("pdf-page-range");

  if (!dropZone) return;

  dropZone.setAttribute("role", "button");
  dropZone.tabIndex = 0;
  dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });
  dropZone.addEventListener("click", (event) => {
    if (event.target !== fileInput) fileInput.click();
  });
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    if (event.dataTransfer.files.length) handleFiles(Array.from(event.dataTransfer.files));
  });

  fileInput.addEventListener("change", (event) => {
    if (event.target.files.length) handleFiles(Array.from(event.target.files));
    fileInput.value = "";
  });

  clearBtn.addEventListener("click", () => {
    pdfFiles.forEach((file) => releasePreviewDoc(file.id));
    pdfFiles = [];
    pdfPages = [];
    pageWindowStart = 0;
    renderWorkspace();
    statusEl.textContent = "";
  });

  window.addEventListener("pagehide", () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
  });

  async function handleFiles(files) {
    const candidates = files.filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
    );
    if (!candidates.length) {
      statusEl.textContent = "Choose a PDF file to continue.";
      return;
    }

    statusEl.textContent = t("processing");
    let added = 0;
    for (const file of candidates) {
      try {
        const bytes = await file.arrayBuffer();
        const document = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
        const entry = {
          id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          size: file.size,
          bytes,
          pageCount: document.getPageCount(),
        };
        pdfFiles.push(entry);
        for (let pageIndex = 0; pageIndex < entry.pageCount; pageIndex += 1) {
          pdfPages.push({
            id: `${entry.id}-${pageIndex}`,
            sourceId: entry.id,
            sourceIndex: pageIndex,
            rotation: 0,
          });
        }
        added += 1;
      } catch {
        statusEl.textContent = "A file could not be opened. Check that it is a valid, unencrypted PDF.";
      }
    }
    renderWorkspace();
    if (added) statusEl.textContent = `${added} PDF${added === 1 ? "" : "s"} added · ${pdfPages.length} pages ready to arrange.`;
  }

  function renderWorkspace() {
    renderFileList();
    renderPages();
    mergeBtn.disabled = pdfPages.length === 0;
    extractBtn.disabled = pdfFiles.length === 0;
  }

  function renderFileList() {
    fileList.replaceChildren();
    if (!pdfFiles.length) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-zinc-500 text-center py-3";
      empty.textContent = "Add a PDF to see its pages here.";
      fileList.append(empty);
      return;
    }

    const heading = document.createElement("h2");
    heading.className = "text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2";
    heading.textContent = "Documents";
    fileList.append(heading);

    for (const file of pdfFiles) {
      const row = document.createElement("div");
      row.className = "flex items-center justify-between gap-3 border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm";
      const info = document.createElement("div");
      info.className = "flex min-w-0 items-center gap-3";
      const filename = document.createElement("span");
      filename.className = "truncate font-medium text-zinc-200";
      filename.textContent = file.name;
      filename.title = file.name;
      const detail = document.createElement("span");
      detail.className = "shrink-0 text-xs text-zinc-500";
      detail.textContent = `${file.pageCount} pages · ${formatBytes(file.size)}`;
      info.append(filename, detail);
      const remove = makeButton("Remove document", "Remove", "text-xs text-zinc-400 hover:text-red-300");
      remove.setAttribute("aria-label", `Remove ${file.name}`);
      remove.addEventListener("click", () => {
        releasePreviewDoc(file.id);
        pdfFiles = pdfFiles.filter((item) => item.id !== file.id);
        pdfPages = pdfPages.filter((page) => page.sourceId !== file.id);
        pageWindowStart = Math.min(pageWindowStart, Math.max(0, pdfPages.length - PAGE_WINDOW_SIZE));
        renderWorkspace();
        statusEl.textContent = `${file.name} removed.`;
      });
      row.append(info, remove);
      fileList.append(row);
    }
  }

  function renderPages() {
    pageWorkspace.replaceChildren();
    pageNavigation.replaceChildren();
    if (!pdfPages.length) {
      pageWorkspace.classList.add("hidden");
      pageNavigation.classList.add("hidden");
      return;
    }

    pageWorkspace.classList.remove("hidden");
    pageNavigation.classList.remove("hidden");
    const end = Math.min(pageWindowStart + PAGE_WINDOW_SIZE, pdfPages.length);
    const label = document.createElement("p");
    label.className = "text-xs text-zinc-400 mr-auto";
    label.textContent = `Pages ${pageWindowStart + 1}–${end} of ${pdfPages.length}`;
    const previous = makeButton("Previous pages", "← Previous", "page-nav-button", pageWindowStart === 0);
    const next = makeButton("Next pages", "Next →", "page-nav-button", end >= pdfPages.length);
    previous.addEventListener("click", () => {
      pageWindowStart = Math.max(0, pageWindowStart - PAGE_WINDOW_SIZE);
      renderPages();
    });
    next.addEventListener("click", () => {
      pageWindowStart = Math.min(pdfPages.length - 1, pageWindowStart + PAGE_WINDOW_SIZE);
      renderPages();
    });
    pageNavigation.append(label, previous, next);

    for (let index = pageWindowStart; index < end; index += 1) {
      const page = pdfPages[index];
      const source = pdfFiles.find((file) => file.id === page.sourceId);
      if (!source) continue;
      const card = document.createElement("article");
      card.className = "pdf-page-card";
      card.draggable = true;
      card.setAttribute("aria-label", `Page ${page.sourceIndex + 1} of ${source.name}`);
      const canvas = document.createElement("canvas");
      canvas.className = "pdf-page-thumbnail";
      canvas.hidden = true;
      canvas.width = 144;
      canvas.height = 190;
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", `Preview of page ${page.sourceIndex + 1}`);
      const fallback = document.createElement("span");
      fallback.className = "pdf-thumbnail-fallback";
      fallback.textContent = "PDF page";
      const caption = document.createElement("p");
      caption.className = "pdf-page-caption";
      caption.textContent = `${index + 1}. ${source.name} · page ${page.sourceIndex + 1}`;
      caption.title = caption.textContent;
      const actions = document.createElement("div");
      actions.className = "pdf-page-actions";
      const up = makeButton(`Move page ${index + 1} earlier`, "↑", "pdf-page-action", index === 0);
      const down = makeButton(`Move page ${index + 1} later`, "↓", "pdf-page-action", index === pdfPages.length - 1);
      const rotate = makeButton(`Rotate page ${index + 1} clockwise`, "↻", "pdf-page-action");
      const remove = makeButton(`Remove page ${index + 1}`, "Remove", "pdf-page-remove");
      card.addEventListener("dragstart", (event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(index));
        card.classList.add("is-dragging");
      });
      card.addEventListener("dragend", () => card.classList.remove("is-dragging"));
      card.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      });
      card.addEventListener("drop", (event) => {
        event.preventDefault();
        const from = Number(event.dataTransfer.getData("text/plain"));
        if (Number.isInteger(from) && from !== index) reorderPage(from, index);
      });
      up.addEventListener("click", () => movePage(index, -1));
      down.addEventListener("click", () => movePage(index, 1));
      rotate.addEventListener("click", () => {
        page.rotation = (page.rotation + 90) % 360;
        renderPages();
        statusEl.textContent = `Page ${index + 1} rotated. Rotation will be applied when you merge.`;
      });
      remove.addEventListener("click", () => {
        pdfPages.splice(index, 1);
        pageWindowStart = Math.min(pageWindowStart, Math.max(0, pdfPages.length - PAGE_WINDOW_SIZE));
        renderWorkspace();
        statusEl.textContent = "Page removed from the output sequence.";
      });
      actions.append(up, down, rotate, remove);
      card.append(canvas, fallback, caption, actions);
      pageWorkspace.append(card);
      queueThumbnail(canvas, fallback, source, page);
    }
  }

  function movePage(index, offset) {
    const target = index + offset;
    if (target < 0 || target >= pdfPages.length) return;
    [pdfPages[index], pdfPages[target]] = [pdfPages[target], pdfPages[index]];
    pageWindowStart = Math.floor(target / PAGE_WINDOW_SIZE) * PAGE_WINDOW_SIZE;
    renderPages();
    statusEl.textContent = `Page moved to position ${target + 1}.`;
  }

  function queueThumbnail(canvas, fallback, source, page) {
    const render = () => {
      canvas.dataset.rendered = "loading";
      getPdfJs()
        .then(async (pdfjs) => {
          const pdf = await getPreviewDocument(pdfjs, source);
          const pdfPage = await pdf.getPage(page.sourceIndex + 1);
          const rotation = (pdfPage.rotate + page.rotation) % 360;
          const initial = pdfPage.getViewport({ scale: 1, rotation });
          const scale = Math.min(132 / initial.width, 176 / initial.height);
          const viewport = pdfPage.getViewport({ scale, rotation });
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await pdfPage.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
          canvas.dataset.rendered = "true";
          canvas.hidden = false;
          fallback.hidden = true;
        })
        .catch(() => {
          canvas.dataset.rendered = "error";
          fallback.textContent = "Preview unavailable";
        });
    };

    if (typeof IntersectionObserver === "function") {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          render();
        }
      }, { rootMargin: "120px" });
      observer.observe(fallback);
    } else {
      render();
    }
  }

  function getPdfJs() {
    if (!pdfJsPromise) {
      pdfJsPromise = import(`https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`)
        .then((pdfjs) => {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;
          return pdfjs;
        });
    }
    return pdfJsPromise;
  }

  function getPreviewDocument(pdfjs, source) {
    const cached = pdfPreviewDocs.get(source.id);
    if (cached) return cached;
    const task = pdfjs.getDocument({ data: new Uint8Array(source.bytes.slice(0)) });
    const promise = task.promise;
    pdfPreviewDocs.set(source.id, promise);
    while (pdfPreviewDocs.size > 3) {
      const [oldestId, oldest] = pdfPreviewDocs.entries().next().value;
      pdfPreviewDocs.delete(oldestId);
      oldest.then((document) => window.setTimeout(() => document.destroy(), 30000)).catch(() => {});
    }
    promise.catch(() => pdfPreviewDocs.delete(source.id));
    return promise;
  }

  function releasePreviewDoc(id) {
    const document = pdfPreviewDocs.get(id);
    pdfPreviewDocs.delete(id);
    if (document) document.then((pdf) => pdf.destroy()).catch(() => {});
  }

  function reorderPage(from, to) {
    if (from < 0 || from >= pdfPages.length || to < 0 || to >= pdfPages.length) return;
    const [page] = pdfPages.splice(from, 1);
    pdfPages.splice(to, 0, page);
    pageWindowStart = Math.floor(to / PAGE_WINDOW_SIZE) * PAGE_WINDOW_SIZE;
    renderPages();
    statusEl.textContent = `Page moved to position ${to + 1}.`;
  }

  mergeBtn.addEventListener("click", async () => {
    if (pdfFiles.length < 2) {
      statusEl.textContent = "Add at least two PDF documents to merge.";
      return;
    }
    try {
      statusEl.textContent = t("processing");
      const mergedPdf = await PDFLib.PDFDocument.create();
      const sourceDocs = new Map();
      for (const page of pdfPages) {
        let donor = sourceDocs.get(page.sourceId);
        if (!donor) {
          const source = pdfFiles.find((file) => file.id === page.sourceId);
          if (!source) continue;
          donor = await PDFLib.PDFDocument.load(source.bytes, { ignoreEncryption: true });
          sourceDocs.set(page.sourceId, donor);
        }
        const [copiedPage] = await mergedPdf.copyPages(donor, [page.sourceIndex]);
        if (page.rotation) {
          copiedPage.setRotation(PDFLib.degrees(copiedPage.getRotation().angle + page.rotation));
        }
        mergedPdf.addPage(copiedPage);
      }
      const bytes = await mergedPdf.save();
      const filename = "merged_openstacktools.pdf";
      const blob = new Blob([bytes], { type: "application/pdf" });
      publishResult(blob, filename);
      downloadBlob(blob, filename);
      statusEl.textContent = `Merged successfully · ${pdfPages.length} pages · download started.`;
    } catch {
      statusEl.textContent = "The PDFs could not be merged. Check that they are valid and not password protected.";
    }
  });

  extractBtn.addEventListener("click", async () => {
    if (!pdfFiles.length) return;
    const range = pageRangeInput.value.trim();
    if (!range) {
      statusEl.textContent = "Enter a page range, such as 1-3, 5.";
      pageRangeInput.focus();
      return;
    }
    try {
      statusEl.textContent = t("processing");
      const source = pdfFiles[0];
      const document = await PDFLib.PDFDocument.load(source.bytes, { ignoreEncryption: true });
      const indices = parsePageRange(range, document.getPageCount());
      if (!indices.length) {
        statusEl.textContent = `That range does not match this document's ${document.getPageCount()} pages.`;
        return;
      }
      const extracted = await PDFLib.PDFDocument.create();
      const pages = await extracted.copyPages(document, indices);
      pages.forEach((page) => extracted.addPage(page));
      const baseName = source.name.replace(/\.[^/.]+$/, "");
      const bytes = await extracted.save();
      const filename = sanitizeFilename(`extracted_${baseName}.pdf`);
      const blob = new Blob([bytes], { type: "application/pdf" });
      publishResult(blob, filename);
      downloadBlob(blob, filename);
      statusEl.textContent = `Extracted ${pages.length} page${pages.length === 1 ? "" : "s"} · download started.`;
    } catch {
      statusEl.textContent = "Those pages could not be extracted from this PDF.";
    }
  });

  renderWorkspace();

  function publishResult(blob, filename) {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = URL.createObjectURL(blob);
    resultDownload.href = resultUrl;
    resultDownload.download = sanitizeFilename(filename);
    resultDetail.textContent = `${sanitizeFilename(filename)} · ${formatBytes(blob.size)}`;
    resultEl.classList.remove("hidden");
  }
}

function makeButton(label, text, className, disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.setAttribute("aria-label", label);
  button.textContent = text;
  button.disabled = disabled;
  return button;
}

function parsePageRange(value, maxPages) {
  const pages = new Set();
  for (const part of value.split(",")) {
    const range = part.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const first = Number(range[1]);
      const last = Number(range[2]);
      if (first < 1 || last < 1 || first > maxPages || last > maxPages) continue;
      for (let page = Math.min(first, last); page <= Math.max(first, last); page += 1) pages.add(page - 1);
      continue;
    }
    if (/^\d+$/.test(part.trim())) {
      const page = Number(part.trim());
      if (page >= 1 && page <= maxPages) pages.add(page - 1);
    }
  }
  return [...pages].sort((a, b) => a - b);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}
