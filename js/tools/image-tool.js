import { t } from "../i18n.js";

export function initImageTool() {
  const dropZone = document.getElementById("img-drop-zone");
  const fileInput = document.getElementById("img-file-input");
  const qualitySlider = document.getElementById("img-quality");
  const qualityVal = document.getElementById("img-quality-val");
  const formatSelect = document.getElementById("img-format");
  const widthInput = document.getElementById("img-width");
  const heightInput = document.getElementById("img-height");
  const keepAspectCheckbox = document.getElementById("img-keep-aspect");
  const originalSizeEl = document.getElementById("img-original-size");
  const newSizeEl = document.getElementById("img-new-size");
  const reductionEl = document.getElementById("img-reduction");
  const downloadBtn = document.getElementById("img-download-btn");
  const previewImg = document.getElementById("img-preview");
  const previewOriginal = document.getElementById("img-original-preview");
  const controlPanel = document.getElementById("img-control-panel");

  if (!dropZone) return;

  let currentSource = null;
  let originalFile = null;
  let originalWidth = 0;
  let originalHeight = 0;
  let aspectRatio = 1;
  let compressedBlob = null;

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
    if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      processFile(e.target.files[0]);
      fileInput.value = "";
    }
  });

  function processFile(file) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPEG, WebP)");
      return;
    }
    originalFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        currentSource = img;
        originalWidth = img.width;
        originalHeight = img.height;
        aspectRatio = img.width / img.height;

        widthInput.value = originalWidth;
        heightInput.value = originalHeight;
        originalSizeEl.textContent = formatBytes(originalFile.size);
        previewOriginal.src = ev.target.result;

        controlPanel.classList.remove("hidden");
        renderOptimization();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  qualitySlider.addEventListener("input", () => {
    qualityVal.textContent = qualitySlider.value + "%";
    renderOptimization();
  });

  formatSelect.addEventListener("change", () => renderOptimization());

  widthInput.addEventListener("input", () => {
    if (keepAspectCheckbox.checked && widthInput.value) {
      heightInput.value = Math.round(widthInput.value / aspectRatio);
    }
    renderOptimization();
  });

  heightInput.addEventListener("input", () => {
    if (keepAspectCheckbox.checked && heightInput.value) {
      widthInput.value = Math.round(heightInput.value * aspectRatio);
    }
    renderOptimization();
  });

  function renderOptimization() {
    if (!currentSource) return;

    const targetWidth = parseInt(widthInput.value, 10) || originalWidth;
    const targetHeight = parseInt(heightInput.value, 10) || originalHeight;
    const quality = parseInt(qualitySlider.value, 10) / 100;
    const format = formatSelect.value;

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");

    if (format === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    ctx.drawImage(currentSource, 0, 0, targetWidth, targetHeight);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        compressedBlob = blob;
        newSizeEl.textContent = formatBytes(blob.size);
        const diff = originalFile.size - blob.size;
        const percent = ((diff / originalFile.size) * 100).toFixed(1);

        if (diff > 0) {
          reductionEl.textContent = `-${percent}%`;
          reductionEl.className =
            "text-xs px-2 py-0.5 rounded font-mono font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/50";
        } else {
          reductionEl.textContent = `+${Math.abs(percent)}%`;
          reductionEl.className =
            "text-xs px-2 py-0.5 rounded font-mono font-medium text-amber-400 bg-amber-950/60 border border-amber-800/50";
        }

        previewImg.src = URL.createObjectURL(blob);
      },
      format,
      quality,
    );
  }

  downloadBtn.addEventListener("click", () => {
    if (!compressedBlob) return;
    const ext =
      formatSelect.value === "image/jpeg"
        ? "jpg"
        : formatSelect.value === "image/webp"
          ? "webp"
          : "png";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(compressedBlob);
    a.download = `optimized_${originalFile.name.split(".")[0]}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(2) + " MB";
  }
}
