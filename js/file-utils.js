export function sanitizeFilename(input, fallback = 'download') {
  const basename = String(input || '')
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F<>:"/\\|?*]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim();

  return basename || fallback;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  try {
    link.href = url;
    link.download = sanitizeFilename(filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }
}
