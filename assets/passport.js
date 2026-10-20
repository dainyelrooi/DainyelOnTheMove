import {loadJourney} from './journey-model.js';
/* A requested local feature; independent from optional analytics consent. */
export function passportStorage(storage, allowed) {
  const key = 'dotm-passport-v1';
  const clean = value => [...new Set(Array.isArray(value) ? value.filter(id => allowed.has(id)) : [])];
  return {
    read() { try { const raw=storage.getItem(key)||'{"version":1,"ids":[]}';if(raw.length>40000)throw Error();const value=JSON.parse(raw);if(value.version!==1||!Array.isArray(value.ids))throw Error();return {ids:clean(value.ids),ok:true}; } catch { return {ids:[], ok:false}; } },
    write(ids) { try { storage.setItem(key, JSON.stringify({version:1,ids:clean(ids)})); return true; } catch { return false; } },
    clear() { try { storage.removeItem(key); return true; } catch { return false; } }
  };
}
export async function initPassport() {
  const host = document.querySelector('[data-passport]');
  if (!host || host.dataset.ready) return;
  host.dataset.ready = 'true';
  try {
    const model = await loadJourney();
    const entries = [...model.destinations.map(d => ({id:`place:${d.id}`, title:d.name, url:`atlas.html?place=${d.id}#map`, category:`${d.kind.replaceAll('-', ' ')}${d.parent ? ' · ' + d.parent : ''}`})), ...model.stories.map(s => ({...s,id:`story:${s.id}`,category:s.complete ? 'Story' : 'Preview'})), ...model.journal.map(n => ({...n,id:`note:${n.id}`,category:'Field Note'})), ...model.postcards.map(p => ({...p,id:`postcard:${p.id}`,category:'Postcard'}))];
    let storage;
    try { storage = passportStorage(localStorage, new Set(entries.map(e => e.id))); }
    catch { storage = passportStorage({getItem(){throw Error();}, setItem(){throw Error();}, removeItem(){throw Error();}}, new Set()); }
    let saved = storage.read();
    const status = host.querySelector('[data-passport-status]');
    const list = host.querySelector('[data-passport-list]');
    const only = host.querySelector('[data-passport-saved]');
    const render = () => {
      list.replaceChildren();
      for (const entry of entries.filter(e => !only.checked || saved.ids.includes(e.id))) {
        const li=document.createElement('li'), a=document.createElement('a'), small=document.createElement('small'), button=document.createElement('button');
        a.href=entry.url; a.textContent=entry.title; small.textContent=entry.category;
        button.type='button'; button.textContent=saved.ids.includes(entry.id) ? 'Saved ✓' : 'Save'; button.setAttribute('aria-pressed',String(saved.ids.includes(entry.id))); button.setAttribute('aria-label',`${saved.ids.includes(entry.id)?'Remove saved discovery:':'Save'} ${entry.title}`);
        button.addEventListener('click', () => {
          const ids=saved.ids.includes(entry.id) ? saved.ids.filter(id=>id!==entry.id) : [...saved.ids,entry.id];
          if (!storage.write(ids)) { status.textContent='Your browser could not save this. No change was stored.'; return; }
          saved={ids,ok:true}; render();
        });
        li.append(a,small,button); list.append(li);
      }
      status.textContent=saved.ok ? `${saved.ids.length} saved discoveries on this device.${!list.children.length ? ' No saved discoveries yet.' : ''}` : 'Local storage is unavailable. You can still explore every public link.';
    };
    only.addEventListener('change',render);
    host.querySelector('[data-passport-clear]').addEventListener('click',()=> { if (storage.clear()) {saved={ids:[],ok:true};render();status.textContent='Passport cleared from this device.';} else status.textContent='Could not clear browser storage. Use your browser’s site data settings.'; });
    addEventListener('storage',e=> {if(e.key==='dotm-passport-v1'||e.key===null){saved=storage.read();render();}});
    render();
  } catch { host.querySelector('[data-passport-status]').textContent='Your passport could not load. Please reload; the atlas and stories remain available.'; }
}
