# Vozila za otpis — v1.4 (RSD, XLSX/CSV uvoz, XLSX izvoz, Globalni PDF)

## Novo
- **"Stanje vožnje" → "Stanje vozila"** (UI + podaci); kompatibilnost sa starim zapisima očuvana.
- **Globalni PDF**: jedno dugme koje pravi izveštaj za SVA vozila. Prva strana je **sumarna tabela** (RB, Marka i model, Registracija, Broj šasije, Procenjena vrednost, Stanje vozila), zatim detalji za svako vozilo.
- **Izvoz XLSX** svih vozila (SheetJS, radi kada je app online).
- RSD valuta svuda.

## Kolone za uvoz (CSV/XLSX)
Preferirajte **`stanjeVozila`** (ali podržano je i staro `stanjeVoznje`):  
```
markaModel, godiste, registracija, brojSasije, brojMotora, kilometraza, tehnicko, karoserija, enterijer, napomena, procena, stanjeVozila
```

## GitHub ažuriranje
1. Raspakujte ZIP preko postojećeg foldera.
2. U Git Bash (u root projekta):
   ```bash
   git add .
   git commit -m "Update: v1.4 (global PDF + XLSX export, stanje vozila)"
   git push
   ```
3. GitHub Pages se osvežava automatski (osvežite stranicu posle ~1 min).

## Napomene
- XLSX import/export koristi CDN (potreban internet); CSV radi i offline.
- Podaci ostaju jer se koristi isti localStorage ključ: `vozila_otpis_v1`.
