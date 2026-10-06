import { t } from "../i18n.js";

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
  const statusEl = document.getElementById("bg-status");

  if (!dropZone || !canvas) return;

  const ctx = canvas.getContext("2d");
  let originalImage = null;
  let originalData = null;
  let pickedColor = { r: 255, g: 255, b: 255 };

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
      alert("Please upload an image file.");
      return;
    }
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

  canvas.addEventListener("click", (e) => {
    if (!originalData) return;
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
    if (!originalData) return;
    ctx.putImageData(originalData, 0, 0);
    statusEl.textContent = "Reset to original.";
  });

  downloadBtn.addEventListener("click", () => {
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "transparent_openstacktools.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });

  function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
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
