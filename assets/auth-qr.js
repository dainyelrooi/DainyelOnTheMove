import qrcode from './vendor/qrcode-generator-2.0.4.mjs';

// Render only the module matrix. Do not embed the URI/key in markup or contact a QR API.
export function renderAuthenticatorQr(container, uri) {
  const code = qrcode(0, 'M');
  code.addData(uri, 'Byte');
  code.make();
  const size = code.getModuleCount(), border = 4, ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size + border * 2} ${size + border * 2}`);
  svg.setAttribute('aria-hidden', 'true');
  const background = document.createElementNS(ns, 'rect');
  background.setAttribute('width', '100%');
  background.setAttribute('height', '100%');
  background.setAttribute('fill', '#fff');
  const path = document.createElementNS(ns, 'path');
  let squares = '';
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (code.isDark(row, col)) squares += `M${col + border} ${row + border}h1v1h-1z`;
    }
  }
  path.setAttribute('fill', '#000');
  path.setAttribute('d', squares);
  svg.append(background, path);
  container.replaceChildren(svg);
}
