const tabs          = document.querySelectorAll('.tab');
const formPanels    = document.querySelectorAll('.form-panel');
const btnGenerate   = document.getElementById('btn-generate');
const outputSection = document.getElementById('output-section');
const qrWrap        = document.getElementById('qr-canvas-wrap');
const qrDataLabel   = document.getElementById('qr-data-label');
const btnPNG        = document.getElementById('btn-png');
const btnSVG        = document.getElementById('btn-svg');
const errorToast    = document.getElementById('error-toast');

let currentType = 'url';
let qrInstance  = null;

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const type = tab.dataset.type;
    if (type === currentType) return;
    currentType = type;
    tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    formPanels.forEach(p => p.classList.remove('active'));
    document.getElementById('form-' + type).classList.add('active');
    hideError();
    hideOutput();
  });
});

function buildQRString() {
  switch (currentType) {
    case 'url': {
      const val = document.getElementById('input-url').value.trim();
      if (!val) throw new Error('Please enter a URL.');
      return /^https?:\/\//i.test(val) ? val : 'https://' + val;
    }
    case 'text': {
      const val = document.getElementById('input-text').value.trim();
      if (!val) throw new Error('Please enter some text.');
      return val;
    }
    case 'phone': {
      const val = document.getElementById('input-phone').value.trim();
      if (!val) throw new Error('Please enter a phone number.');
      return 'tel:' + val.replace(/\s+/g, '');
    }
    case 'email': {
      const addr = document.getElementById('input-email-addr').value.trim();
      if (!addr) throw new Error('Please enter an email address.');
      const sub  = document.getElementById('input-email-sub').value.trim();
      const body = document.getElementById('input-email-body').value.trim();
      let mailto = 'mailto:' + addr;
      const params = [];
      if (sub)  params.push('subject=' + encodeURIComponent(sub));
      if (body) params.push('body='    + encodeURIComponent(body));
      if (params.length) mailto += '?' + params.join('&');
      return mailto;
    }
    case 'wifi': {
      const ssid = document.getElementById('input-wifi-ssid').value.trim();
      if (!ssid) throw new Error('Please enter a network name (SSID).');
      const pass   = document.getElementById('input-wifi-pass').value;
      const enc    = document.getElementById('input-wifi-enc').value;
      const hidden = document.getElementById('input-wifi-hidden').checked ? 'true' : 'false';
      const escape = s => s.replace(/([\\;",:"])/g, '\\$1');
      return `WIFI:T:${enc};S:${escape(ssid)};P:${escape(pass)};H:${hidden};;`;
    }
    default:
      throw new Error('Unknown type.');
  }
}

const EC_MAP = { L: QRCode.CorrectLevel.L, M: QRCode.CorrectLevel.M, Q: QRCode.CorrectLevel.Q, H: QRCode.CorrectLevel.H };

btnGenerate.addEventListener('click', () => {
  hideError();
  hideOutput();
  let qrString;
  try { qrString = buildQRString(); } catch (e) { showError(e.message); return; }
  const size = parseInt(document.getElementById('qr-size').value, 10);
  const fg   = document.getElementById('qr-fg').value;
  const bg   = document.getElementById('qr-bg').value;
  const ec   = document.getElementById('qr-ec').value;
  qrWrap.innerHTML = '';
  if (qrInstance) { try { qrInstance.clear(); } catch (_) {} }
  try {
    qrInstance = new QRCode(qrWrap, {
      text: qrString, width: size, height: size,
      colorDark: fg, colorLight: bg,
      correctLevel: EC_MAP[ec] ?? QRCode.CorrectLevel.M,
    });
    qrDataLabel.textContent = qrString;
    showOutput();
  } catch (e) {
    showError('Could not generate QR code. The data may be too long.');
    console.error(e);
  }
});

btnPNG.addEventListener('click', () => {
  const canvas = qrWrap.querySelector('canvas');
  if (!canvas) { showError('No QR code to download.'); return; }
  const link = document.createElement('a');
  link.download = 'qrcode.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

btnSVG.addEventListener('click', () => {
  const canvas = qrWrap.querySelector('canvas');
  if (!canvas) { showError('No QR code to download.'); return; }
  const size = canvas.width;
  const ctx  = canvas.getContext('2d');
  const { data } = ctx.getImageData(0, 0, size, size);
  const fg = document.getElementById('qr-fg').value;
  const bg = document.getElementById('qr-bg').value;
  let rects = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const fgR = parseInt(fg.slice(1,3),16), fgG = parseInt(fg.slice(3,5),16), fgB = parseInt(fg.slice(5,7),16);
      if (Math.abs(data[idx]-fgR)+Math.abs(data[idx+1]-fgG)+Math.abs(data[idx+2]-fgB) < 80)
        rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${fg}"/>`;
    }
  }
  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${bg}"/>${rects}</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const link = document.createElement('a');
  link.download = 'qrcode.svg';
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
});

function showOutput() { outputSection.classList.add('visible'); outputSection.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
function hideOutput() { outputSection.classList.remove('visible'); qrWrap.innerHTML = ''; qrDataLabel.textContent = ''; }
function showError(msg) { errorToast.textContent = msg; errorToast.classList.add('visible'); }
function hideError() { errorToast.classList.remove('visible'); }

document.querySelectorAll('.field-input').forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') btnGenerate.click(); });
});
