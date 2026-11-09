const ns = 'http://www.w3.org/2000/svg';
const tileWidth = 1000 / 6;
const tileHeight = 500 / 4;

export function initAtlasDetail(map, revision) {
  const border = map.querySelector('.atlas-detail-border');
  const labels = map.querySelector('.atlas-detail-labels');
  const checkin = map.querySelector('#checkin-layer');
  if (!border || !labels || !checkin) return;
  const tiles = new Map();
  let frame = 0;
  let lastBorders = '';

  function queueDraw() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function requestTile(key) {
    if (tiles.has(key)) {
      const retryAt = tiles.get(key)?.retryAt;
      if (!retryAt || retryAt > Date.now()) return;
    }
    tiles.set(key, null);
    const url = new URL('../data/atlas-detail/' + key + '.json' + revision, import.meta.url);
    fetch(url, {signal:AbortSignal.timeout(8000)}).then(response => {
      if (!response.ok) throw new Error('Atlas detail unavailable');
      return response.json();
    }).then(tile => {
      tiles.set(key, tile);
      queueDraw();
    }).catch(() => {
      // Allow a later zoom or pan to retry; keep the rest of the map usable.
      tiles.set(key, {retryAt:Date.now() + 15000});
    });
  }

  function drawLabels(visible, box, zoom) {
    const width = map.clientWidth;
    if (!width) { labels.replaceChildren(); return; }
    const scale = box.width / width;
    const height = box.height / scale;
    const mapRect = map.getBoundingClientRect();
    const occupied = [...checkin.querySelectorAll('.atlas-pin-shape,.atlas-pin-label')].map(node => {
      const rect = node.getBoundingClientRect();
      return [rect.left-mapRect.left-3, rect.top-mapRect.top-3, rect.right-mapRect.left+3, rect.bottom-mapRect.top+3];
    });
    const provinces = [];
    const cities = [];
    const cityDetail = zoom < 6 ? 4 : zoom < 10 ? 5 : zoom < 16 ? 6 : 7;
    for (const tile of visible) {
      provinces.push(...tile.provinces);
      if (zoom >= 4) cities.push(...tile.cities.filter(row => row[3] <= cityDetail));
    }
    provinces.sort((a,b) => a[3] - b[3]);
    cities.sort((a,b) => a[3] - b[3] || b[4] - a[4]);
    const fragment = document.createDocumentFragment();
    function fits([left,top,right,bottom]) {
      return left >= 3 && top >= 3 && right <= width-3 && bottom <= height-3
        && !occupied.some(([l,t,r,b]) => left < r && right > l && top < b && bottom > t);
    }
    function place(row, isCity) {
      const [x,y,name] = row;
      const left = (x - box.x) / scale;
      const top = (y - box.y) / scale;
      const half = name.length * (isCity ? 3.4 : 3.75) + 4;
      const positions = [[0, isCity ? -6 : 4, 'middle', [left-half, top-(isCity ? 19 : 8), left+half, top+8]]];
      if (isCity) positions.push(
        [-6,4,'end',[left-2*half-6,top-8,left+4,top+8]],
        [6,4,'start',[left-4,top-8,left+2*half+6,top+8]]
      );
      const position = positions.find(([, , , bounds]) => fits(bounds));
      if (!position) return;
      const [labelX,labelY,alignment,bounds] = position;
      occupied.push(bounds);
      const group = document.createElementNS(ns,'g');
      group.setAttribute('transform', 'translate(' + x + ' ' + y + ') scale(' + scale + ')');
      if (isCity) {
        const dot = document.createElementNS(ns,'circle');
        dot.setAttribute('r','2.2');
        dot.setAttribute('class','atlas-detail-city-dot');
        group.append(dot);
      }
      const text = document.createElementNS(ns,'text');
      text.setAttribute('class', (isCity ? 'atlas-detail-city' : 'atlas-detail-province') + ' atlas-label-' + alignment);
      text.setAttribute('x', labelX);
      text.setAttribute('y', labelY);
      text.textContent = name;
      group.append(text);
      fragment.append(group);
    }
    // Give the main cities room first. Province labels take the remaining space.
    for (const city of cities) place(city, true);
    for (const province of provinces) place(province, false);
    labels.replaceChildren(fragment);
  }

  function draw() {
    frame = 0;
    const box = map.viewBox.baseVal;
    const zoom = 1000 / box.width;
    const ready = [];
    if (zoom >= 3 - 0.001) {
      const xMin = Math.max(0, Math.floor(box.x / tileWidth));
      const yMin = Math.max(0, Math.floor(box.y / tileHeight));
      const xMax = Math.min(5, Math.floor((box.x + box.width) / tileWidth));
      const yMax = Math.min(3, Math.floor((box.y + box.height) / tileHeight));
      for (let x = xMin; x <= xMax; x++) for (let y = yMin; y <= yMax; y++) {
        const key = x + '-' + y;
        const tile = tiles.get(key);
        if (tile?.provinces && tile?.cities) ready.push([key,tile]);
        else requestTile(key);
      }
    }
    const borderKey = ready.map(([key]) => key).join(',');
    if (borderKey !== lastBorders) {
      lastBorders = borderKey;
      border.setAttribute('d', ready.map(([,tile]) => tile.border).join(''));
    }
    drawLabels(ready.map(([,tile]) => tile), box, zoom);
  }

  new MutationObserver(queueDraw).observe(map, {attributes:true, attributeFilter:['viewBox']});
  new MutationObserver(queueDraw).observe(checkin, {subtree:true, childList:true, attributes:true, attributeFilter:['transform']});
  if ('ResizeObserver' in window) new ResizeObserver(queueDraw).observe(map);
  queueDraw();
}
