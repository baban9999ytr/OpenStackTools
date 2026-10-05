import { t } from "../i18n.js";

let pdfFiles = [];

export function initPdfTool() {
  const dropZone = document.getElementById("pdf-drop-zone");
  const fileInput = document.getElementById("pdf-file-input");
  const fileList = document.getElementById("pdf-file-list");
  const mergeBtn = document.getElementById("pdf-merge-btn");
  const extractBtn = document.getElementById("pdf-extract-btn");
  const clearBtn = document.getElementById("pdf-clear-btn");
  const statusEl = document.getElementById("pdf-status");
  const pageRangeInput = document.getElementById("pdf-page-range");

  if (!dropZone) return;

  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", () =>
    dropZone.classList.remove("dragover"),
  );
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
      fileInput.value = "";
    }
  });

  clearBtn.addEventListener("click", () => {
    pdfFiles = [];
    renderFileList();
    statusEl.textContent = "";
  });

  async function handleFiles(files) {
    const valid = files.filter(
      (f) =>
        f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if (valid.length === 0) return;

    statusEl.textContent = t("processing");
    for (const f of valid) {
      try {
        const arrayBuffer = await f.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, {
          ignoreEncryption: true,
        });
        pdfFiles.push({
          id: Math.random().toString(36).substring(2, 9),
          name: f.name,
          size: f.size,
          pageCount: pdfDoc.getPageCount(),
          bytes: arrayBuffer,
        });
      } catch (err) {
        console.error("PDF Load Error for " + f.name + ":", err);
      }
    }
    renderFileList();
    statusEl.textContent = `${pdfFiles.length} file(s) loaded.`;
  }

  function renderFileList() {
    fileList.innerHTML = "";
    if (pdfFiles.length === 0) {
      fileList.innerHTML = `<div class="text-zinc-500 text-sm text-center py-4">No PDF files loaded yet.</div>`;
      if (mergeBtn) mergeBtn.disabled = true;
      if (extractBtn) extractBtn.disabled = true;
      return;
    }

    if (mergeBtn) mergeBtn.disabled = false;
    if (extractBtn) extractBtn.disabled = false;

    pdfFiles.forEach((file, index) => {
      const item = document.createElement("div");
      item.className =
        "flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-md text-sm my-1";
      item.innerHTML = `
        <div class="flex items-center space-x-3 overflow-hidden">
          <span class="text-zinc-500 font-mono text-xs w-5">${index + 1}.</span>
          <span class="font-medium truncate max-w-xs md:max-w-md text-zinc-200" title="${file.name}">${file.name}</span>
          <span class="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">${file.pageCount} ${t("pdf_pages_count") || "pages"}</span>
          <span class="text-xs text-zinc-500">(${(file.size / 1024).toFixed(1)} KB)</span>
        </div>
        <div class="flex items-center space-x-2">
          <button class="move-up p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-30" ${index === 0 ? "disabled" : ""}>↑</button>
          <button class="move-down p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-30" ${index === pdfFiles.length - 1 ? "disabled" : ""}>↓</button>
          <button class="delete-pdf p-1 text-red-400 hover:text-red-300">✕</button>
        </div>
      `;

      item.querySelector(".move-up").addEventListener("click", (e) => {
        e.stopPropagation();
        if (index > 0) {
          const temp = pdfFiles[index - 1];
          pdfFiles[index - 1] = pdfFiles[index];
          pdfFiles[index] = temp;
          renderFileList();
        }
      });

      item.querySelector(".move-down").addEventListener("click", (e) => {
        e.stopPropagation();
        if (index < pdfFiles.length - 1) {
          const temp = pdfFiles[index + 1];
          pdfFiles[index + 1] = pdfFiles[index];
          pdfFiles[index] = temp;
          renderFileList();
        }
      });

      item.querySelector(".delete-pdf").addEventListener("click", (e) => {
        e.stopPropagation();
        pdfFiles.splice(index, 1);
        renderFileList();
        statusEl.textContent =
          pdfFiles.length > 0 ? `${pdfFiles.length} file(s) remaining.` : "";
      });

      fileList.appendChild(item);
    });
  }

  mergeBtn.addEventListener("click", async () => {
    if (pdfFiles.length < 2) {
      alert("Please add at least 2 PDF files to merge.");
      return;
    }
    try {
      statusEl.textContent = t("processing");
      const mergedPdf = await PDFLib.PDFDocument.create();

      for (const item of pdfFiles) {
        const donorDoc = await PDFLib.PDFDocument.load(item.bytes, {
          ignoreEncryption: true,
        });
        const copiedPages = await mergedPdf.copyPages(
          donorDoc,
          donorDoc.getPageIndices(),
        );
        copiedPages.forEach((p) => mergedPdf.addPage(p));
      }

      const pdfBytes = await mergedPdf.save();
      downloadBlob(
        new Blob([pdfBytes], { type: "application/pdf" }),
        "merged_openstacktools.pdf",
      );
      statusEl.textContent = "Merge complete! Download started.";
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Error merging PDFs: " + err.message;
    }
  });

  extractBtn.addEventListener("click", async () => {
    if (pdfFiles.length === 0) return;
    const rangeStr = pageRangeInput.value.trim();
    if (!rangeStr) {
      alert("Please enter a page range (e.g. 1-3, 5)");
      return;
    }

    try {
      statusEl.textContent = t("processing");
      const target = pdfFiles[0];
      const sourceDoc = await PDFLib.PDFDocument.load(target.bytes, {
        ignoreEncryption: true,
      });
      const totalPages = sourceDoc.getPageCount();
      const pageIndices = parsePageRange(rangeStr, totalPages);

      if (pageIndices.length === 0) {
        alert(
          "Invalid page range for this document (" +
            totalPages +
            " pages total).",
        );
        statusEl.textContent = "";
        return;
      }

      const extractedPdf = await PDFLib.PDFDocument.create();
      const copiedPages = await extractedPdf.copyPages(sourceDoc, pageIndices);
      copiedPages.forEach((p) => extractedPdf.addPage(p));

      const pdfBytes = await extractedPdf.save();
      const baseName = target.name.replace(/\.[^/.]+$/, "");
      downloadBlob(
        new Blob([pdfBytes], { type: "application/pdf" }),
        `extracted_${baseName}.pdf`,
      );
      statusEl.textContent = "Extraction complete! Download started.";
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Extraction error: " + err.message;
    }
  });

  function parsePageRange(str, maxPages) {
    const pages = new Set();
    const parts = str.split(",");
    for (let part of parts) {
      part = part.trim();
      if (part.includes("-")) {
        const [start, end] = part.split("-").map((n) => parseInt(n.trim(), 10));
        if (!isNaN(start) && !isNaN(end)) {
          const from = Math.max(1, Math.min(start, end));
          const to = Math.min(maxPages, Math.max(start, end));
          for (let i = from; i <= to; i++) {
            pages.add(i - 1);
          }
        }
      } else {
        const page = parseInt(part, 10);
        if (!isNaN(page) && page >= 1 && page <= maxPages) {
          pages.add(page - 1);
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
