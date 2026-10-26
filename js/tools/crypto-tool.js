export function initCryptoTool() {
  const passLengthInput = document.getElementById("crypto-pass-length");
  const t = (key) => window.OSTTranslate?.(key) ?? key;
  const incLower = document.getElementById("crypto-inc-lower");
  const passLengthVal = document.getElementById("crypto-pass-length-val");
  const incUpper = document.getElementById("crypto-inc-upper");
  const incNumbers = document.getElementById("crypto-inc-num");
  const incSymbols = document.getElementById("crypto-inc-sym");
  const excludeAmbiguous = document.getElementById("crypto-exclude-ambiguous");
  const genPassBtn = document.getElementById("crypto-gen-pass-btn");
  const passOutput = document.getElementById("crypto-pass-output");
  const copyPassBtn = document.getElementById("crypto-copy-pass-btn");

  const genUuidBtn = document.getElementById("crypto-gen-uuid-btn");
  const uuidOutput = document.getElementById("crypto-uuid-output");
  const copyUuidBtn = document.getElementById("crypto-copy-uuid-btn");

  const hashInput = document.getElementById("crypto-hash-input");
  const sha256Output = document.getElementById("crypto-sha256-output");
  const sha512Output = document.getElementById("crypto-sha512-output");
  const md5Output = document.getElementById("crypto-md5-output");
  const copySha256Btn = document.getElementById("crypto-copy-sha256");
  const copySha512Btn = document.getElementById("crypto-copy-sha512");
  const copyMd5Btn = document.getElementById("crypto-copy-md5");
  const entropyOutput = document.getElementById("crypto-pass-entropy");
  const passStatus = document.getElementById("crypto-pass-status");
  const strengthMeter = document.getElementById("crypto-pass-meter");
  const strengthMeterFill = document.getElementById("crypto-pass-meter-fill");
  const fileInput = document.getElementById("crypto-file-input");
  const fileHashBtn = document.getElementById("crypto-file-hash-btn");
  const fileCopyBtn = document.getElementById("crypto-file-copy-btn");
  const fileStatus = document.getElementById("crypto-file-status");
  const fileOutput = document.getElementById("crypto-file-output");
  const fileDropzone = document.getElementById("crypto-file-dropzone");

  if (!passLengthInput) return;

  passLengthInput.addEventListener("input", () => {
    passLengthVal.textContent = passLengthInput.value;
    generateSecurePassword();
  });

  genPassBtn.addEventListener("click", generateSecurePassword);
  genUuidBtn.addEventListener("click", generateUUID);
  hashInput.addEventListener("input", computeHashes);
  [incLower, incUpper, incNumbers, incSymbols, excludeAmbiguous].forEach(
    (input) => {
      input?.addEventListener("change", generateSecurePassword);
    },
  );
  fileHashBtn?.addEventListener("click", calculateFileChecksum);
  fileCopyBtn?.addEventListener("click", copyFileChecksum);
  fileInput?.addEventListener("change", clearFileChecksum);
  window.addEventListener("languageChanged", () => {
    generateSecurePassword();
    if (fileStatus.dataset.messageKey)
      fileStatus.textContent = t(fileStatus.dataset.messageKey);
  });
  fileDropzone?.addEventListener("dragover", (event) => {
    event.preventDefault();
    fileDropzone.classList.add("border-zinc-400");
  });
  fileDropzone?.addEventListener("dragleave", () =>
    fileDropzone.classList.remove("border-zinc-400"),
  );
  fileDropzone?.addEventListener("drop", (event) => {
    event.preventDefault();
    fileDropzone.classList.remove("border-zinc-400");
    if (event.dataTransfer?.files?.length) {
      fileInput.files = event.dataTransfer.files;
      clearFileChecksum();
    }
  });

  setupCopyBtn(copyPassBtn, passOutput);
  setupCopyBtn(copyUuidBtn, uuidOutput);
  setupCopyBtn(copySha256Btn, sha256Output);
  setupCopyBtn(copySha512Btn, sha512Output);
  setupCopyBtn(copyMd5Btn, md5Output);

  generateSecurePassword();
  generateUUID();
  computeHashes();

  function setupCopyBtn(btn, targetEl) {
    if (!btn || !targetEl) return;
    btn.addEventListener("click", async () => {
      const val = targetEl.value || targetEl.textContent;
      if (!val) return;
      try {
        await navigator.clipboard.writeText(val);
        const orig = btn.textContent;
        btn.textContent = `✓ ${t("copied")}`;
        setTimeout(() => (btn.textContent = orig), 1500);
      } catch {
        btn.setAttribute("aria-label", t("crypto_clipboard_error"));
      }
    });
  }

  function generateSecurePassword() {
    const len = parseInt(passLengthInput.value, 10);
    const groups = [];
    if (incLower.checked) groups.push("abcdefghijklmnopqrstuvwxyz");
    if (incUpper.checked) groups.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    if (incNumbers.checked) groups.push("0123456789");
    if (incSymbols.checked) groups.push("!@#$%^&*()_+~|}{[]:;?><,./-=");
    if (excludeAmbiguous.checked) {
      for (let i = 0; i < groups.length; i++)
        groups[i] = groups[i].replace(/[iIl1O0]/g, "");
    }

    if (
      !groups.length ||
      groups.some((group) => !group.length) ||
      len < groups.length
    ) {
      passOutput.value = "";
      if (passStatus) passStatus.textContent = t("crypto_pass_select_charset");
      if (entropyOutput) entropyOutput.textContent = "—";
      if (strengthMeter) strengthMeter.setAttribute("aria-valuenow", "0");
      if (strengthMeterFill) strengthMeterFill.style.width = "0%";
      return;
    }

    function randomInt(maxExclusive) {
      const range = 0x100000000;
      const limit = range - (range % maxExclusive);
      const word = new Uint32Array(1);
      do {
        window.crypto.getRandomValues(word);
      } while (word[0] >= limit);
      return word[0] % maxExclusive;
    }

    const allCharacters = groups.join("");
    let password;
    do {
      password = Array.from(
        { length: len },
        () => allCharacters[randomInt(allCharacters.length)],
      ).join("");
    } while (
      !groups.every((group) =>
        Array.from(group).some((character) => password.includes(character)),
      )
    );
    passOutput.value = password;
    if (passStatus) passStatus.textContent = "";
    updateStrength(groups, len);
  }

  function updateStrength(groups, len) {
    const poolSize = groups.reduce((sum, group) => sum + group.length, 0);
    let validPasswords = 0;
    for (let mask = 0; mask < 1 << groups.length; mask++) {
      let excludedCharacters = 0;
      let includedGroups = 0;
      for (let index = 0; index < groups.length; index++) {
        if (mask & (1 << index)) {
          excludedCharacters += groups[index].length;
          includedGroups++;
        }
      }
      validPasswords +=
        (includedGroups % 2 ? -1 : 1) *
        Math.pow(poolSize - excludedCharacters, len);
    }
    const bits = Math.log2(Math.max(validPasswords, 1));
    const strengthKey =
      bits < 40
        ? "crypto_strength_weak"
        : bits < 60
          ? "crypto_strength_fair"
          : bits < 80
            ? "crypto_strength_strong"
            : "crypto_strength_very_strong";
    const strength = t(strengthKey);
    if (entropyOutput)
      entropyOutput.textContent = t("crypto_entropy_bits")
        .replace("{bits}", String(Math.round(bits)))
        .replace("{strength}", strength);
    if (strengthMeter) {
      strengthMeter.setAttribute(
        "aria-valuenow",
        String(Math.round(Math.min(bits, 128))),
      );
      strengthMeter.setAttribute(
        "aria-valuetext",
        `${Math.round(bits)} bits, ${strength}`,
      );
      strengthMeter.setAttribute("aria-label", t("crypto_file_strength_label"));
    }
    if (strengthMeterFill) {
      strengthMeterFill.style.width = `${Math.min((bits / 128) * 100, 100)}%`;
      strengthMeterFill.classList.remove(
        "bg-amber-500",
        "bg-sky-500",
        "bg-emerald-500",
      );
      strengthMeterFill.classList.add(
        bits < 40
          ? "bg-amber-500"
          : bits < 60
            ? "bg-amber-500"
            : bits < 80
              ? "bg-sky-500"
              : "bg-emerald-500",
      );
    }
  }

  async function calculateFileChecksum() {
    const file = fileInput?.files?.[0];
    if (!file) {
      setFileStatus("crypto_file_no_file");
      return;
    }
    fileHashBtn.disabled = true;
    fileCopyBtn.disabled = true;
    setFileStatus("crypto_file_processing");
    fileOutput.textContent = "";
    try {
      const digest = await crypto.subtle.digest(
        "SHA-256",
        await file.arrayBuffer(),
      );
      fileOutput.textContent = bufferToHex(digest);
      setFileStatus("crypto_file_done");
      fileCopyBtn.disabled = false;
    } catch {
      setFileStatus("crypto_file_error");
    } finally {
      fileHashBtn.disabled = false;
    }
  }

  function clearFileChecksum() {
    fileOutput.textContent = "";
    const file = fileInput?.files?.[0];
    if (file) {
      fileStatus.dataset.messageKey = "crypto_file_selected";
      fileStatus.textContent = t("crypto_file_selected").replace(
        "{name}",
        file.name,
      );
    } else {
      fileStatus.textContent = "";
      delete fileStatus.dataset.messageKey;
    }
    fileCopyBtn.disabled = true;
  }

  function setFileStatus(key) {
    fileStatus.dataset.messageKey = key;
    fileStatus.textContent = t(key);
  }

  async function copyFileChecksum() {
    if (!fileOutput?.textContent) return;
    try {
      await navigator.clipboard.writeText(fileOutput.textContent);
      setFileStatus("crypto_file_copied");
    } catch {
      setFileStatus("crypto_clipboard_error");
    }
  }

  function generateUUID() {
    if (crypto.randomUUID) {
      uuidOutput.value = crypto.randomUUID();
    } else {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = bufferToHex(bytes);
      uuidOutput.value = [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20),
      ].join("-");
    }
  }

  async function computeHashes() {
    const text = hashInput.value;
    if (!text) {
      sha256Output.textContent = "---";
      sha512Output.textContent = "---";
      md5Output.textContent = "---";
      return;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    const hash256Buffer = await crypto.subtle.digest("SHA-256", data);
    sha256Output.textContent = bufferToHex(hash256Buffer);

    const hash512Buffer = await crypto.subtle.digest("SHA-512", data);
    sha512Output.textContent = bufferToHex(hash512Buffer);

    md5Output.textContent = md5(text);
  }

  function bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function md5(string) {
    function rotateLeft(lValue, iShiftBits) {
      return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    }
    function addUnsigned(lX, lY) {
      const lX8 = lX & 0x80000000;
      const lY8 = lY & 0x80000000;
      const lX4 = lX & 0x40000000;
      const lY4 = lY & 0x40000000;
      const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
      if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
      if (lX4 | lY4) {
        if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
        else return lResult ^ 0x40000000 ^ lX8 ^ lY8;
      } else {
        return lResult ^ lX8 ^ lY8;
      }
    }
    function F(x, y, z) {
      return (x & y) | (~x & z);
    }
    function G(x, y, z) {
      return (x & z) | (y & ~z);
    }
    function H(x, y, z) {
      return x ^ y ^ z;
    }
    function I(x, y, z) {
      return y ^ (x | ~z);
    }
    function FF(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    function GG(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    function HH(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    function II(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    function convertToWordArray(string) {
      let lWordCount;
      const bytes = new TextEncoder().encode(string);
      const lMessageLength = bytes.length;
      const lNumberOfWords_temp1 = lMessageLength + 8;
      const lNumberOfWords_temp2 =
        (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
      const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
      const lWordArray = new Array(lNumberOfWords - 1);
      let lBytePosition = 0;
      let lByteCount = 0;
      while (lByteCount < lMessageLength) {
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] =
          lWordArray[lWordCount] | (bytes[lByteCount] << lBytePosition);
        lByteCount++;
      }
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
      lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
      lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
      return lWordArray;
    }
    function wordToHex(lValue) {
      let WordToHexValue = "",
        WordToHexValue_temp = "",
        lByte,
        lCount;
      for (lCount = 0; lCount <= 3; lCount++) {
        lByte = (lValue >>> (lCount * 8)) & 255;
        WordToHexValue_temp = "0" + lByte.toString(16);
        WordToHexValue =
          WordToHexValue +
          WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
      }
      return WordToHexValue;
    }
    let x = convertToWordArray(string);
    let a = 0x67452301,
      b = 0xefcdab89,
      c = 0x98badcfe,
      d = 0x10325476;
    const S11 = 7,
      S12 = 12,
      S13 = 17,
      S14 = 22;
    const S21 = 5,
      S22 = 9,
      S23 = 14,
      S24 = 20;
    const S31 = 4,
      S32 = 11,
      S33 = 16,
      S34 = 23;
    const S41 = 6,
      S42 = 10,
      S43 = 15,
      S44 = 21;

    for (let k = 0; k < x.length; k += 16) {
      const AA = a,
        BB = b,
        CC = c,
        DD = d;
      a = FF(a, b, c, d, x[k + 0], S11, 0xd76aa478);
      d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
      c = FF(c, d, a, b, x[k + 2], S13, 0x242070db);
      b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
      a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
      d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a);
      c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613);
      b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501);
      a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8);
      d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
      c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
      b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be);
      a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122);
      d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193);
      c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e);
      b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821);

      a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562);
      d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340);
      c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51);
      b = GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
      a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d);
      d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
      c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
      b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
      a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
      d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6);
      c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
      b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed);
      a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
      d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
      c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9);
      b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);

      a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942);
      d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681);
      c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
      b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c);
      a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44);
      d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
      c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
      b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
      a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
      d = HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
      c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
      b = HH(b, c, d, a, x[k + 6], S34, 0x04881d05);
      a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
      d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
      c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
      b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665);

      a = II(a, b, c, d, x[k + 0], S41, 0xf4292244);
      d = II(d, a, b, c, x[k + 7], S42, 0x432aff97);
      c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7);
      b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039);
      a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3);
      d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
      c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d);
      b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1);
      a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
      d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
      c = II(c, d, a, b, x[k + 6], S43, 0xa3014314);
      b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
      a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82);
      d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235);
      c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
      b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391);

      a = addUnsigned(a, AA);
      b = addUnsigned(b, BB);
      c = addUnsigned(c, CC);
      d = addUnsigned(d, DD);
    }
    return (
      wordToHex(a) +
      wordToHex(b) +
      wordToHex(c) +
      wordToHex(d)
    ).toLowerCase();
  }
}
