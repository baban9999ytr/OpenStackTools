import { t } from '../i18n.js';

export function initAudioTool() {
  const dropZone = document.getElementById('av-drop-zone');
  const fileInput = document.getElementById('av-file-input');
  const controlPanel = document.getElementById('av-control-panel');
  const canvas = document.getElementById('av-waveform-canvas');
  const startTimeInput = document.getElementById('av-start-time');
  const endTimeInput = document.getElementById('av-end-time');
  const durationEl = document.getElementById('av-duration');
  const playBtn = document.getElementById('av-play-btn');
  const stopBtn = document.getElementById('av-stop-btn');
  const exportBtn = document.getElementById('av-export-btn');
  const statusEl = document.getElementById('av-status');

  if (!dropZone) return;

  let audioCtx = null;
  let audioBuffer = null;
  let currentSource = null;
  let originalFile = null;
  let isPlaying = false;

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) loadAudio(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      loadAudio(e.target.files[0]);
      fileInput.value = '';
    }
  });

  async function loadAudio(file) {
    originalFile = file;
    statusEl.textContent = t('processing');
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const arrayBuffer = await file.arrayBuffer();
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      startTimeInput.value = '0.00';
      endTimeInput.value = audioBuffer.duration.toFixed(2);
      durationEl.textContent = audioBuffer.duration.toFixed(2) + 's';

      controlPanel.classList.remove('hidden');
      drawWaveform();
      statusEl.textContent = 'Audio decoded (' + audioBuffer.numberOfChannels + ' channels, ' + audioBuffer.sampleRate + ' Hz)';
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Error decoding audio file: ' + err.message;
    }
  }

  function drawWaveform() {
    if (!audioBuffer || !canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth || 700;
    const height = canvas.height = 120;

    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);

    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.fillStyle = '#27272a';
    ctx.fillRect(0, amp, width, 1);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.moveTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();

    const totalDuration = audioBuffer.duration;
    const start = parseFloat(startTimeInput.value) || 0;
    const end = parseFloat(endTimeInput.value) || totalDuration;

    const startX = (start / totalDuration) * width;
    const endX = (end / totalDuration) * width;

    ctx.fillStyle = 'rgba(9, 9, 11, 0.7)';
    ctx.fillRect(0, 0, startX, height);
    ctx.fillRect(endX, 0, width - endX, height);

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, 0); ctx.lineTo(startX, height);
    ctx.moveTo(endX, 0); ctx.lineTo(endX, height);
    ctx.stroke();
  }

  startTimeInput.addEventListener('input', drawWaveform);
  endTimeInput.addEventListener('input', drawWaveform);

  playBtn.addEventListener('click', () => {
    if (!audioBuffer) return;
    if (isPlaying) stopPlayback();

    const start = Math.max(0, parseFloat(startTimeInput.value) || 0);
    const end = Math.min(audioBuffer.duration, parseFloat(endTimeInput.value) || audioBuffer.duration);
    const duration = Math.max(0, end - start);

    currentSource = audioCtx.createBufferSource();
    currentSource.buffer = audioBuffer;
    currentSource.connect(audioCtx.destination);
    currentSource.start(0, start, duration);
    isPlaying = true;
    playBtn.classList.add('bg-zinc-800');

    currentSource.onended = () => {
      isPlaying = false;
      playBtn.classList.remove('bg-zinc-800');
    };
  });

  stopBtn.addEventListener('click', stopPlayback);

  function stopPlayback() {
    if (currentSource && isPlaying) {
      try { currentSource.stop(); } catch(e) {}
      isPlaying = false;
      playBtn.classList.remove('bg-zinc-800');
    }
  }

  exportBtn.addEventListener('click', () => {
    if (!audioBuffer) return;
    statusEl.textContent = t('processing');

    const start = Math.max(0, parseFloat(startTimeInput.value) || 0);
    const end = Math.min(audioBuffer.duration, parseFloat(endTimeInput.value) || audioBuffer.duration);
    const duration = end - start;

    if (duration <= 0) {
      alert('End time must be greater than start time.');
      return;
    }

    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor(start * sampleRate);
    const endSample = Math.floor(end * sampleRate);
    const frameCount = endSample - startSample;
    const channels = audioBuffer.numberOfChannels;

    const trimmedBuffer = audioCtx.createBuffer(channels, frameCount, sampleRate);
    for (let c = 0; c < channels; c++) {
      const channelData = audioBuffer.getChannelData(c).subarray(startSample, endSample);
      trimmedBuffer.copyToChannel(channelData, c);
    }

    const wavBlob = bufferToWaveBlob(trimmedBuffer, frameCount);
    const filename = 	rimmed_.wav;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(wavBlob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    statusEl.textContent = 'Audio trimmed and exported successfully!';
  });

  function bufferToWaveBlob(abuffer, len) {
    const numOfChan = abuffer.numberOfChannels;
    const length = len * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    const channels = [];
    let sample = 0;
    let offset = 0;
    let pos = 0;

    function setUint16(data) { out.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { out.setUint32(pos, data, true); pos += 4; }

    setUint32(0x46464952);
    setUint32(length - 8); 
    setUint32(0x45564157); 
    setUint32(0x20746d66); 
    setUint32(16);
    setUint16(1); 
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); 
    setUint16(numOfChan * 2); 
    setUint16(16); 
    setUint32(0x61746164); 
    setUint32(length - pos - 4);

    for (let i = 0; i < abuffer.numberOfChannels; i++) {
      channels.push(abuffer.getChannelData(i));
    }

    while (offset < len) {
      for (let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        out.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([out.buffer], { type: 'audio/wav' });
  }

  window.addEventListener('resize', () => {
    if (audioBuffer) drawWaveform();
  });
}
