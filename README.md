# Wörtli üben 🐄

Eine Web-App zum Englisch-Wörtli lernen: anschauen, hören, abschreiben, übersetzen, Sätze, Personen und Test mit Note.
Jedes Kind meldet sich mit eigenem Konto an; der Fortschritt wird in Supabase gespeichert.

## Einrichten

1. **Supabase:** Projekt erstellen, im *SQL Editor* den Inhalt von `supabase-setup.sql` ausführen.
2. **config.js:** *Project URL* und *anon public key* (Project Settings → API) eintragen.
3. **Supabase → Authentication → URL Configuration:** Die Adresse dieser Seite als *Site URL* eintragen
   (z.B. `https://laurinoeler.github.io/woertli/`), damit die Links in den E-Mails stimmen.
4. **GitHub Pages:** Settings → Pages → Branch `main`, Ordner `/ (root)`.

## Dateien

- `index.html` – die App
- `auth.js`, `auth.css` – Anmeldung und Speichern in Supabase
- `config.js` – Supabase-Angaben
- `sw.js`, `manifest.webmanifest`, `icons/` – installierbar und offline nutzbar
- `kuh.jpg` – Hintergrundbild
