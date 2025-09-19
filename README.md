# Vozila za otpis — v1.2 (RSD, izmena unosa, potvrda brisanja)

Statična offline aplikacija. Podaci u **localStorage**. Valuta je **RSD**.

## Šta je novo u v1.2
- Valuta promenjena u **RSD** (format `sr-RS`, bez decimala).
- **Uredi → Sačuvaj** sada **ažurira postojeće vozilo** (nema duplikata).
- **Potvrda za brisanje** (confirm dijalog).

## CSV/JSON
- CSV uvoz je isti kao u v1.1 (procena je sada u RSD).
- JSON izvoz/uvoz za bekap.

## Kako radi izmena unosa
1. Kliknite **Uredi** na kartici vozila.
2. Polja se popunjavaju u formi.
3. Izmenite šta želite i kliknite **Sačuvaj vozilo** → unos se ažurira.

## GitHub — brzo uputstvo
1. Napravite repo na GitHub-u (npr. `vozila-otpis`).
2. U terminalu uđite u folder i:
   ```bash
   git init
   git add .
   git commit -m "v1.2 RSD"
   git branch -M main
   git remote add origin https://github.com/<username>/vozila-otpis.git
   git push -u origin main
   ```
3. U **Settings → Pages** uključite **Deploy from branch**, `main` / root.
4. Otvorite link koji GitHub prikaže.

> Napomena: Zadržan je isti localStorage ključ (`vozila_otpis_v1`), pa će postojeći podaci ostati vidljivi i u v1.2.
