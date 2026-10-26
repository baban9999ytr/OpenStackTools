import { t } from "../i18n.js?v=crypto-ads-hotfix-20261021";
import { downloadBlob } from "../file-utils.js?v=phase3-closeout";

export function initBgRemoverTool() {
  const dropZone = document.getElementById("bg-drop-zone");
  const fileInput = document.getElementById("bg-file-input");
  const controlPanel = document.getElementById("bg-control-panel");
  const canvas = document.getElementById("bg-canvas");
  const toleranceInput = document.getElementById("bg-tolerance");
  const toleranceVal = document.getElementById("bg-tolerance-val");
  const colorPicker = document.getElementById("bg-color-picker");
  const eraseBtn = document.getElementById("bg-erase-btn");
  const resetBtn = document.getElementById("bg-reset-btn");
  const downloadBtn = document.getElementById("bg-download-btn");
  const cropModeBtn = document.getElementById("bg-crop-mode-btn");
  const cropApplyBtn = document.getElementById("bg-crop-apply-btn");
  const undoBtn = document.getElementById("bg-undo-btn");
  const cropOverlay = document.getElementById("bg-crop-overlay");
  const statusEl = document.getElementById("bg-status");

  if (!dropZone || !canvas) return;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let originalImage = null;
  let originalData = null;
  let initialData = null;
  let pickedColor = { r: 255, g: 255, b: 255 };
  let cropMode = false;
  let cropStart = null;
  let cropSelection = null;
  let suppressNextClick = false;
  const history = [];

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
    if (e.dataTransfer.files.length > 0) loadImage(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      loadImage(e.target.files[0]);
      fileInput.value = "";
    }
  });

  function loadImage(file) {
    if (!file.type.startsWith("image/")) {
      statusEl.textContent = t("img_error_type");
      return;
    }
    statusEl.textContent = t("processing");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        originalImage = img;
        let w = img.width;
        let h = img.height;
        const maxDim = 1200;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        originalData = ctx.getImageData(0, 0, w, h);
        initialData = copyImageData(originalData);
        history.length = 0;
        undoBtn.disabled = true;
        cropApplyBtn.disabled = true;
        cropSelection = null;
        cropOverlay.classList.add("hidden");

        controlPanel.classList.remove("hidden");
        statusEl.textContent =
          "Image loaded (" +
          w +
          "x" +
          h +
          "). Click image or pick color to remove.";
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  toleranceInput.addEventListener("input", () => {
    toleranceVal.textContent = toleranceInput.value;
  });

  cropModeBtn.addEventListener("click", () => {
    cropMode = !cropMode;
    cropModeBtn.setAttribute("aria-pressed", String(cropMode));
    cropModeBtn.textContent = cropMode
      ? "Cancel crop selection"
      : "Select crop";
    canvas.style.cursor = cropMode ? "crosshair" : "pointer";
    if (!cropMode) clearCropSelection();
    statusEl.textContent = cropMode
      ? "Drag across the image to select a crop area."
      : "Crop selection cancelled.";
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (!originalData || !cropMode) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    cropStart = getCanvasPoint(event);
    cropSelection = { x: cropStart.x, y: cropStart.y, width: 0, height: 0 };
    updateCropOverlay();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!cropStart || !cropMode) return;
    const point = getCanvasPoint(event);
    cropSelection = {
      x: Math.min(cropStart.x, point.x),
      y: Math.min(cropStart.y, point.y),
      width: Math.abs(point.x - cropStart.x),
      height: Math.abs(point.y - cropStart.y),
    };
    updateCropOverlay();
  });

  canvas.addEventListener("pointerup", () => {
    if (!cropStart) return;
    cropStart = null;
    suppressNextClick = true;
    const valid =
      cropSelection && cropSelection.width >= 2 && cropSelection.height >= 2;
    cropApplyBtn.disabled = !valid;
    statusEl.textContent = valid
      ? "Crop area selected. Apply crop or adjust the selection."
      : "Select a larger crop area.";
  });

  cropApplyBtn.addEventListener("click", () => {
    if (!cropSelection || cropApplyBtn.disabled) return;
    const x = Math.max(0, Math.floor(cropSelection.x));
    const y = Math.max(0, Math.floor(cropSelection.y));
    const width = Math.min(canvas.width - x, Math.ceil(cropSelection.width));
    const height = Math.min(canvas.height - y, Math.ceil(cropSelection.height));
    if (width < 2 || height < 2) return;
    pushHistory();
    const cropped = ctx.getImageData(x, y, width, height);
    canvas.width = width;
    canvas.height = height;
    ctx.putImageData(cropped, 0, 0);
    originalData = copyImageData(cropped);
    cropMode = false;
    cropModeBtn.setAttribute("aria-pressed", "false");
    cropModeBtn.textContent = "Select crop";
    clearCropSelection();
    statusEl.textContent = `Cropped to ${width} × ${height} px. You can undo or reset the image.`;
  });

  undoBtn.addEventListener("click", () => {
    const previous = history.pop();
    if (!previous) return;
    canvas.width = previous.image.width;
    canvas.height = previous.image.height;
    ctx.putImageData(previous.image, 0, 0);
    originalData = previous.base;
    undoBtn.disabled = history.length === 0;
    clearCropSelection();
    statusEl.textContent = "Last image edit undone.";
  });

  canvas.addEventListener("click", (e) => {
    if (!originalData) return;
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    if (cropMode) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    pickedColor = { r: pixel[0], g: pixel[1], b: pixel[2] };
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    colorPicker.value = hex;
    statusEl.textContent = `Selected color: rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
  });

  colorPicker.addEventListener("input", () => {
    const hex = colorPicker.value;
    const rgb = hexToRgb(hex);
    if (rgb) pickedColor = rgb;
  });

  eraseBtn.addEventListener("click", () => {
    if (!originalData) return;
    statusEl.textContent = t("processing");
    pushHistory();

    const w = canvas.width;
    const h = canvas.height;
    // Clone original data
    const imgData = ctx.createImageData(originalData);
    imgData.data.set(originalData.data);
    const data = imgData.data;

    const tolerance = parseInt(toleranceInput.value, 10);
    const targetR = pickedColor.r;
    const targetG = pickedColor.g;
    const targetB = pickedColor.b;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const diff = Math.sqrt(
        Math.pow(r - targetR, 2) +
          Math.pow(g - targetG, 2) +
          Math.pow(b - targetB, 2),
      );

      if (diff <= tolerance) {
        data[i + 3] = 0; // Transparent
      }
    }

    ctx.putImageData(imgData, 0, 0);
    statusEl.textContent =
      "Transparency applied cleanly! Transparent areas appear checkered.";
  });

  resetBtn.addEventListener("click", () => {
    if (!initialData) return;
    canvas.width = initialData.width;
    canvas.height = initialData.height;
    ctx.putImageData(initialData, 0, 0);
    originalData = copyImageData(initialData);
    history.length = 0;
    undoBtn.disabled = true;
    cropMode = false;
    cropModeBtn.setAttribute("aria-pressed", "false");
    cropModeBtn.textContent = "Select crop";
    clearCropSelection();
    statusEl.textContent = "Reset to the original image.";
  });

  downloadBtn.addEventListener("click", () => {
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, "transparent_openstacktools.png");
    }, "image/png");
  });

  function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(
          canvas.width,
          ((event.clientX - rect.left) * canvas.width) / rect.width,
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          canvas.height,
          ((event.clientY - rect.top) * canvas.height) / rect.height,
        ),
      ),
    };
  }

  function updateCropOverlay() {
    if (!cropSelection || !cropOverlay) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    cropOverlay.style.left = `${cropSelection.x * scaleX}px`;
    cropOverlay.style.top = `${cropSelection.y * scaleY}px`;
    cropOverlay.style.width = `${cropSelection.width * scaleX}px`;
    cropOverlay.style.height = `${cropSelection.height * scaleY}px`;
    cropOverlay.classList.remove("hidden");
  }

  function clearCropSelection() {
    cropSelection = null;
    cropStart = null;
    cropApplyBtn.disabled = true;
    cropOverlay?.classList.add("hidden");
  }

  function copyImageData(imageData) {
    const copy = new ImageData(imageData.width, imageData.height);
    copy.data.set(imageData.data);
    return copy;
  }

  function pushHistory() {
    history.push({
      image: copyImageData(ctx.getImageData(0, 0, canvas.width, canvas.height)),
      base: copyImageData(originalData),
    });
    if (history.length > 10) history.shift();
    undoBtn.disabled = false;
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }
}
