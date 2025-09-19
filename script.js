const el = (q, ctx=document) => ctx.querySelector(q);
const els = (q, ctx=document) => Array.from(ctx.querySelectorAll(q));
const LS_KEY = 'vozila_otpis_v1'; // ostaje isto radi kompatibilnosti

// --- pomoćne ---
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
    const arr = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    // migracija: stanjeVoznje -> stanjeVozila
    return arr.map(v => ({
      ...v,
      stanjeVozila: v.stanjeVozila ?? v.stanjeVoznje ?? ''
    }));
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
function currency(n){
  if (!n && n!==0) return '';
  try {
    return new Intl.NumberFormat('sr-RS',{style:'currency', currency:'RSD', maximumFractionDigits:0}).format(Number(n));
  } catch(_) {
    return n + ' RSD';
  }
}

// --- forma ---
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
    stanjeVozila: el('#stanjeVozila').value,
    photos: [] // popuni se pri snimanju
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
  el('#stanjeVozila').value = v.stanjeVozila || '';
  renderPreview(v.photos || []);
}
function clearForm() {
  fillForm({photos:[]});
  el('#vehId').value='';
  el('#photos').value='';
}

// --- render liste ---
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
      const passF = !f || v.stanjeVozila === f;
      return passQ && passF;
    })
    .forEach(v => {
      const card = document.createElement('div');
      card.className = 'card';
      const title = v.markaModel || '(bez naziva)';
      const meta = [v.registracija || 'bez registracije', v.godiste || 'god. ?', v.stanjeVozila || 'stanje ?'].join(' · ');
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

// --- preview slika ---
function renderPreview(photos) {
  const prev = el('#photoPreview');
  prev.innerHTML = '';
  (photos||[]).forEach(src => {
    const im = document.createElement('img');
    im.src = src;
    prev.appendChild(im);
  });
}

// --- snimanje ---
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
  if (idx >= 0) list[idx] = base; else list.push(base);
  try {
    saveAll(list);
  } catch(e) {
    alert('Memorija pregledača je puna (slike prevelike). Probaj sa manjim fotografijama.');
    return;
  }
  clearForm();
  renderList();
}

// --- pojedinačan print ---
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
    ['Stanje vozila', v.stanjeVozila || '—'],
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

// --- GLOBALNI PDF: prva strana sumarna tabela + detalji po vozilu ---
function exportAllPDF() {
  const list = loadAll();
  const w = window.open('', '_blank');
  if (!w) { alert('Dozvoli iskačuće prozore za PDF.'); return; }
  w.document.write(`<!doctype html>
  <html><head><meta charset="utf-8"><title>Vozila za otpis — Izveštaj</title>
  <link rel="stylesheet" href="style.css">
  <style>@media print { .page-break{page-break-after:always;} }</style>
  </head><body></body></html>`);

  const container = w.document.body;

  // Naslov + suma
  const h = w.document.createElement('h1');
  h.textContent = 'Vozila za otpis — Izveštaj';
  container.appendChild(h);

  // Sumarna tabela (RB, markaModel, registracija, brojSasije, procena, stanjeVozila)
  const table = w.document.createElement('table');
  table.className = 'summary-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>RB</th>
        <th>Marka i model</th>
        <th>Registracija</th>
        <th>Broj šasije</th>
        <th>Procenjena vrednost</th>
        <th>Stanje vozila</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tb = table.querySelector('tbody');
  let total = 0;
  list.forEach((v, i) => {
    total += Number(v.procena || 0);
    const tr = w.document.createElement('tr');
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${v.markaModel || '—'}</td>
      <td>${v.registracija || '—'}</td>
      <td>${v.brojSasije || '—'}</td>
      <td>${v.procena ? currency(v.procena) : '—'}</td>
      <td>${v.stanjeVozila || '—'}</td>
    `;
    tb.appendChild(tr);
  });
  container.appendChild(table);

  // Ukupna procena
  const p = w.document.createElement('p');
  p.innerHTML = `<strong>Ukupna procenjena vrednost:</strong> ${currency(total)}`;
  container.appendChild(p);

  // Page break posle prve strane
  const br = w.document.createElement('div');
  br.className = 'page-break';
  container.appendChild(br);

  // Detalji po vozilu (koristimo isti layout kao pojedinačni print)
  list.forEach((v, idx) => {
    const art = w.document.createElement('article');
    art.className = 'print-page';
    art.innerHTML = `
      <header>
        <h2>${idx+1}. ${v.markaModel || 'Vozilo'}</h2>
        <p class="muted">Registracija: ${v.registracija || '—'} · Šasija: ${v.brojSasije || '—'} · Procenjena: ${v.procena ? currency(v.procena) : '—'} · Stanje: ${v.stanjeVozila || '—'}</p>
      </header>
      <section>
        <h3>Osnovni podaci</h3>
        <table class="kv">
          <tr><td><strong>Godište</strong></td><td>${v.godiste || '—'}</td></tr>
          <tr><td><strong>Broj motora</strong></td><td>${v.brojMotora || '—'}</td></tr>
          <tr><td><strong>Kilometraža</strong></td><td>${v.kilometraza ? (v.kilometraza + ' km') : '—'}</td></tr>
          <tr><td><strong>Stanje vozila</strong></td><td>${v.stanjeVozila || '—'}</td></tr>
        </table>
      </section>
      <section>
        <h3>Stanje</h3>
        <div class="cols">
          <div><h4>Tehničko</h4><p>${(v.tehnicko||'—').replace(/\n/g,'<br>')}</p></div>
          <div><h4>Karoserija</h4><p>${(v.karoserija||'—').replace(/\n/g,'<br>')}</p></div>
          <div><h4>Enterijer</h4><p>${(v.enterijer||'—').replace(/\n/g,'<br>')}</p></div>
        </div>
        <p><strong>Napomena:</strong> ${(v.napomena||'—').replace(/\n/g,'<br>')}</p>
      </section>
      <section>
        <h3>Fotografije</h3>
        <div class="gallery">
          ${(v.photos||[]).map(src => `<img src="${src}">`).join('')}
        </div>
      </section>
    `;
    container.appendChild(art);
    const pb = w.document.createElement('div');
    pb.className = 'page-break';
    container.appendChild(pb);
  });

  w.document.close();
  setTimeout(() => w.print(), 600);
}

// --- Export XLSX ---
function exportXLSX() {
  if (typeof XLSX === 'undefined') {
    alert('XLSX biblioteka nije učitana. Otvorite aplikaciju preko GitHub Pages (internet).');
    return;
  }
  const list = loadAll();
  // priprema podataka
  const rows = list.map(v => ({
    markaModel: v.markaModel || '',
    godiste: v.godiste || '',
    registracija: v.registracija || '',
    brojSasije: v.brojSasije || '',
    brojMotora: v.brojMotora || '',
    kilometraza: v.kilometraza || '',
    tehnicko: v.tehnicko || '',
    karoserija: v.karoserija || '',
    enterijer: v.enterijer || '',
    napomena: v.napomena || '',
    procena: v.procena || '',
    stanjeVozila: v.stanjeVozila || ''
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'vozila');
  const out = XLSX.write(wb, {bookType:'xlsx', type:'array'});
  const blob = new Blob([out], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'vozila-otpis.xlsx';
  a.click();
  URL.revokeObjectURL(a.href);
}

// --- Import JSON/CSV/XLSX ---
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
el('#btnExportXLSX').onclick = exportXLSX;
el('#btnExportPDF').onclick = exportAllPDF;

el('#importJSON').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const text = await f.text();
  try {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) throw new Error('Invalid format');
    // migracija polja pri uvozu
    const migrated = arr.map(v => ({...v, stanjeVozila: v.stanjeVozila ?? v.stanjeVoznje ?? ''}));
    saveAll(migrated);
    renderList();
    alert('Uvezeno!');
  } catch (err) {
    alert('Neispravan JSON fajl.');
  } finally {
    e.target.value = '';
  }
});

el('#importCSV').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const text = await f.text();
  try {
    const rows = parseCSV(text);
    importRows(rows);
    alert('CSV uvezen! (Fotografije dodajte ručno po vozilu.)');
  } catch (err) {
    console.error(err);
    alert('Neuspešno parsiranje CSV-a. Proverite da je fajl CSV UTF-8 i da prvi red sadrži nazive kolona.');
  } finally {
    e.target.value='';
  }
});

el('#importXLSX').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    if (typeof XLSX === 'undefined') {
      alert('XLSX biblioteka nije učitana. Otvorite aplikaciju preko GitHub Pages (internet), ili koristite CSV uvoz.');
      e.target.value='';
      return;
    }
    const data = await f.arrayBuffer();
    const wb = XLSX.read(data, {type: 'array'});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, {header:1});
    importRows(rows);
    alert('XLSX uvezen!');
  } catch (err) {
    console.error(err);
    alert('Greška pri uvozu XLSX fajla.');
  } finally {
    e.target.value='';
  }
});

function importRows(rows) {
  if (!rows.length) throw new Error('Empty');
  const header = rows[0].map(h => String(h||'').trim());
  // prihvatamo oba naziva zbog kompatibilnosti
  const stanjeKey = header.includes('stanjeVozila') ? 'stanjeVozila' : (header.includes('stanjeVoznje') ? 'stanjeVoznje' : 'stanjeVozila');
  const keys = ["markaModel","godiste","registracija","brojSasije","brojMotora","kilometraza","tehnicko","karoserija","enterijer","napomena","procena", stanjeKey];
  const idx = Object.fromEntries(keys.map(k => [k, header.indexOf(k)]));
  const list = loadAll();
  for (let i=1;i<rows.length;i++){
    const r = rows[i] || [];
    if (r.length===1 && String(r[0]||'').trim()==="") continue;
    const get = (k) => {
      const j = idx[k];
      return j>=0 && r[j]!==undefined ? String(r[j]).trim() : "";
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
      procena: get("procena"),
      stanjeVozila: get(stanjeKey),
      photos: []
    };
    list.push(v);
  }
  saveAll(list);
  renderList();
}

// prost CSV parser
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

// --- dogadjaji ---
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
el('#btnClearAll').onclick = () => {
  if (confirm('Obrisati SVE podatke iz ove aplikacije? (Trajno)')) {
    localStorage.removeItem(LS_KEY);
    renderList();
  }
};

// init
renderList();
