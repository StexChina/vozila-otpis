const el = (q, ctx=document) => ctx.querySelector(q);
const els = (q, ctx=document) => Array.from(ctx.querySelectorAll(q));
const LS_KEY = 'vozila_otpis_v1'; // zadržavamo isti ključ da ostanu postojeći podaci

async function fileToDataURLResized(file, maxDim=1280, quality=0.8) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise(res => { img.onload = res; img.src = url; });
  const { width, height } = img;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = canvas.toDataURL('image/jpeg', quality);
  URL.revokeObjectURL(url);
  return data;
}

function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch (e) {
    console.warn('Corrupt LS, resetting', e);
    localStorage.removeItem(LS_KEY);
    return [];
  }
}
function saveAll(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}
function uid() { return 'v_' + Math.random().toString(36).slice(2,10); }

function formToObj() {
  const id = el('#vehId').value || uid();
  return {
    id,
    markaModel: el('#markaModel').value.trim(),
    godiste: el('#godiste').value,
    registracija: el('#registracija').value.trim(),
    brojSasije: el('#brojSasije').value.trim(),
    brojMotora: el('#brojMotora').value.trim(),
    kilometraza: el('#kilometraza').value,
    tehnicko: el('#tehnicko').value.trim(),
    karoserija: el('#karoserija').value.trim(),
    enterijer: el('#enterijer').value.trim(),
    napomena: el('#napomena').value.trim(),
    procena: el('#procena').value,
    stanjeVoznje: el('#stanjeVoznje').value,
    photos: [] // popunjavamo pri snimanju
  };
}

function fillForm(v) {
  el('#vehId').value = v.id || '';
  el('#markaModel').value = v.markaModel || '';
  el('#godiste').value = v.godiste || '';
  el('#registracija').value = v.registracija || '';
  el('#brojSasije').value = v.brojSasije || '';
  el('#brojMotora').value = v.brojMotora || '';
  el('#kilometraza').value = v.kilometraza || '';
  el('#tehnicko').value = v.tehnicko || '';
  el('#karoserija').value = v.karoserija || '';
  el('#enterijer').value = v.enterijer || '';
  el('#napomena').value = v.napomena || '';
  el('#procena').value = v.procena || '';
  el('#stanjeVoznje').value = v.stanjeVoznje || '';
  renderPreview(v.photos || []);
}

function clearForm() {
  fillForm({photos:[]});
  el('#vehId').value='';
  el('#photos').value='';
}

function currency(n){
  if (!n && n!==0) return '';
  try {
    return new Intl.NumberFormat('sr-RS',{style:'currency', currency:'RSD', maximumFractionDigits:0}).format(Number(n));
  } catch(_) {
    return n + ' RSD';
  }
}

function renderList() {
  const list = loadAll();
  const q = el('#q').value.toLowerCase().trim();
  const f = el('#filterStanje').value;
  const box = el('#vehicleList');
  box.innerHTML = '';
  let sum = 0;

  list
    .filter(v => {
      const hay = [v.markaModel, v.registracija, v.brojSasije, v.brojMotora].join(' ').toLowerCase();
      const passQ = !q || hay.includes(q);
      const passF = !f || v.stanjeVoznje === f;
      return passQ && passF;
    })
    .forEach(v => {
      const card = document.createElement('div');
      card.className = 'card';
      const title = v.markaModel || '(bez naziva)';
      const meta = [v.registracija || 'bez registracije', v.godiste || 'god. ?', v.stanjeVoznje || 'stanje ?'].join(' · ');
      if (v.procena) sum += Number(v.procena)||0;

      const thumbs = (v.photos||[]).slice(0,4).map(p => `<img src="${p}" alt="slika">`).join('');

      card.innerHTML = `
        <h3>${title}</h3>
        <div class="meta">${meta}</div>
        <div class="thumb-row">${thumbs}</div>
        <div class="meta">Procena: <strong>${currency(v.procena)}</strong></div>
        <div class="actions">
          <button data-act="edit">Uredi</button>
          <button data-act="print">Print/PDF</button>
          <button data-act="del" class="danger">Obriši</button>
        </div>
      `;

      card.querySelector('[data-act="edit"]').onclick = () => fillForm(v);
      card.querySelector('[data-act="del"]').onclick = () => {
        if (confirm('Da li sigurno želiš da obrišeš ovo vozilo? Ova radnja je trajna.')) {
          const all = loadAll().filter(x => x.id !== v.id);
          saveAll(all);
          renderList();
        }
      };
      card.querySelector('[data-act="print"]').onclick = () => openPrint(v);

      box.appendChild(card);
    });

  const totalCard = document.createElement('div');
  totalCard.className = 'card';
  totalCard.innerHTML = `<h3>Ukupna procenjena vrednost</h3><div class="meta"><strong>${currency(sum)}</strong></div>`;
  box.appendChild(totalCard);
}

function renderPreview(photos) {
  const prev = el('#photoPreview');
  prev.innerHTML = '';
  (photos||[]).forEach(src => {
    const im = document.createElement('img');
    im.src = src;
    prev.appendChild(im);
  });
}

async function handleSave(ev){
  ev.preventDefault();
  const base = formToObj();
  // nove fotografije
  const newFiles = Array.from(el('#photos').files || []);
  const resized = [];
  for (const f of newFiles) {
    try {
      const data = await fileToDataURLResized(f, 1280, 0.85);
      resized.push(data);
    } catch (e) {
      console.warn('Img resize failed', e);
    }
  }
  const existingPreview = Array.from(el('#photoPreview').querySelectorAll('img')).map(i => i.src);
  base.photos = existingPreview.concat(resized);

  const list = loadAll();
  const idx = list.findIndex(x => x.id === base.id);
  if (idx >= 0) {
    // ažuriranje postojećeg
    list[idx] = base;
  } else {
    // novi unos
    list.push(base);
  }
  try {
    saveAll(list);
  } catch(e) {
    alert('Memorija pregledača je puna (slike prevelike). Probaj sa manjim fotografijama.');
    return;
  }
  clearForm();
  renderList();
}

function openPrint(v) {
  const tpl = el('#printTemplate').content.cloneNode(true);
  const kv = tpl.querySelector('.kv');
  const rows = [
    ['Marka i model', v.markaModel || '—'],
    ['Godište', v.godiste || '—'],
    ['Registracija', v.registracija || '—'],
    ['Broj šasije', v.brojSasije || '—'],
    ['Broj motora', v.brojMotora || '—'],
    ['Kilometraža', v.kilometraza ? (v.kilometraza + ' km') : '—'],
    ['Stanje vožnje', v.stanjeVoznje || '—'],
  ];
  rows.forEach(([k,val]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><strong>${k}</strong></td><td>${String(val).replace(/\n/g,'<br>')}</td>`;
    kv.appendChild(tr);
  });

  tpl.querySelector('.t.tehnicko').textContent = v.tehnicko || '—';
  tpl.querySelector('.t.karoserija').textContent = v.karoserija || '—';
  tpl.querySelector('.t.enterijer').textContent = v.enterijer || '—';
  tpl.querySelector('.t.napomena').textContent = v.napomena || '—';
  tpl.querySelector('.t.procena').textContent = v.procena ? currency(v.procena) : '—';

  const gal = tpl.querySelector('.gallery');
  (v.photos||[]).forEach(src => {
    const im = document.createElement('img');
    im.src = src;
    gal.appendChild(im);
  });

  const w = window.open('', '_blank');
  if (!w) { alert('Dozvoli iskačuće prozore za print.'); return; }
  w.document.write(`<!doctype html>
  <html><head><meta charset="utf-8"><title>Print — ${v.markaModel||''}</title>
  <link rel="stylesheet" href="style.css">
  </head><body></body></html>`);
  w.document.body.appendChild(tpl);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

// Export / Import JSON
function download(filename, text, type='application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], {type:type}));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
el('#btnExportJSON').onclick = () => {
  download('vozila-otpis.json', JSON.stringify(loadAll(), null, 2), 'application/json');
};
el('#importJSON').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const text = await f.text();
  try {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) throw new Error('Invalid format');
    saveAll(arr);
    renderList();
    alert('Uvezeno!');
  } catch (err) {
    alert('Neispravan JSON fajl.');
  } finally {
    e.target.value = '';
  }
});

// CSV import (isti format kao v1.1; procena je u RSD)
el('#importCSV').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const text = await f.text();
  try {
    const rows = parseCSV(text);
    if (!rows.length) throw new Error('Empty');
    const header = rows[0].map(h => h.trim());
    const required = ["markaModel","godiste","registracija","brojSasije","brojMotora","kilometraza","tehnicko","karoserija","enterijer","napomena","procena","stanjeVoznje"];
    const idx = Object.fromEntries(required.map(k => [k, header.indexOf(k)]));
    const list = loadAll();
    for (let i=1;i<rows.length;i++){
      if (rows[i].length===1 && rows[i][0].trim()==="") continue;
      const get = (k) => {
        const j = idx[k];
        return j>=0 && rows[i][j]!==undefined ? rows[i][j].trim() : "";
      };
      const v = {
        id: uid(),
        markaModel: get("markaModel"),
        godiste: get("godiste"),
        registracija: get("registracija"),
        brojSasije: get("brojSasije"),
        brojMotora: get("brojMotora"),
        kilometraza: get("kilometraza"),
        tehnicko: get("tehnicko"),
        karoserija: get("karoserija"),
        enterijer: get("enterijer"),
        napomena: get("napomena"),
        procena: get("procena"), // RSD broj
        stanjeVoznje: get("stanjeVoznje"),
        photos: []
      };
      list.push(v);
    }
    saveAll(list);
    renderList();
    alert('CSV uvezen! (Fotografije dodajte ručno po vozilu.)');
  } catch (err) {
    console.error(err);
    alert('Neuspešno parsiranje CSV-a. Proverite da je fajl CSV UTF-8 i da prvi red sadrži nazive kolona.');
  } finally {
    e.target.value='';
  }
});

function parseCSV(text) {
  const rows = [];
  let row = [], val = '', inQuotes = false;
  for (let i=0;i<text.length;i++){
    const c = text[i];
    if (c === '"'){
      if (inQuotes && text[i+1] === '"'){ val += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes){
      row.push(val); val='';
    } else if ((c === '\n' || c === '\r') && !inQuotes){
      if (val!=='' || row.length>0){ row.push(val); rows.push(row); row=[]; val=''; }
      if (c === '\r' && text[i+1] === '\n') i++;
    } else {
      val += c;
    }
  }
  if (val!=='' || row.length>0){ row.push(val); rows.push(row); }
  return rows;
}

el('#btnClearAll').onclick = () => {
  if (confirm('Obrisati SVE podatke iz ove aplikacije? (Trajno)')) {
    localStorage.removeItem(LS_KEY);
    renderList();
  }
};

el('#vehicleForm').addEventListener('submit', handleSave);
el('#btnReset').addEventListener('click', clearForm);

el('#photos').addEventListener('change', async () => {
  const files = Array.from(el('#photos').files || []);
  const resized = [];
  for (const f of files) {
    const data = await fileToDataURLResized(f, 640, 0.8);
    resized.push(data);
  }
  renderPreview(resized);
});

el('#q').addEventListener('input', renderList);
el('#filterStanje').addEventListener('change', renderList);

renderList();
