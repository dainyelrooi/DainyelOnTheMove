# Aan je website werken vanuit de cloud

GitHub bewaart de websitecode en versiegeschiedenis. Firebase serveert de testsite
en de live website. OneDrive bewaart de websitemap en bestaande back-ups. De
verbinding op Windows en de cloudtoegang via GitHub zijn gecontroleerd.

## Browserwerkplek

1. Open https://github.com/dainyelrooi/DainyelOnTheMove/tree/staging.
2. Kies **Code → Codespaces → Create codespace on staging**. Controleer dat de
   geselecteerde branch `staging` is. Codespaces-verbruik valt onder je eigen
   GitHub-account; controleer je beschikbare inbegrepen gebruik en bestedingslimiet.
3. Open `index.html` en kies **Open with Live Server**. De vooraf ingestelde
   previewpoort is 5500. Open de doorgestuurde poort via het tabblad **Ports**;
   houd de preview privé.
4. Bewerk HTML, CSS, JavaScript en aangeleverde media. Er is geen npm-installatie
   of buildstap nodig voor deze statische website. Node.js is aanwezig voor
   controles zoals `node --check pad/naar/script.js`.
5. Commit je wijzigingen en synchroniseer naar `staging`. Controleer daarna de
   GitHub Action **Deploy test site to Firebase Hosting** en bekijk
   https://dainyelonthemove-staging.web.app.
6. Bekijk en keur de wijziging op de testsite goed voordat deze naar `main` gaat.
   Een push naar `main` publiceert automatisch op https://dainyelonthemove.com.

De bestaande GitHub Actions gebruiken de Firebase-serviceaccountsecret in GitHub.
Voor gewone websitewijzigingen hoeft die credential niet naar Codespaces of Codex
te worden gekopieerd. Rechtstreeks beheer van Firebase Auth, App Check of Firestore
vereist afzonderlijk geautoriseerde toegang en valt buiten deze browserwerkplek.

## Media en OneDrive

Gebruik GitHub als bron voor de gepubliceerde website. Publiceer alleen bewust
gekozen media; originele bestanden kunnen in OneDrive blijven. MP4-bestanden
worden in deze repository met Git LFS beheerd. Controleer bij het toevoegen van
video's dat Git LFS actief is en dat de upload slaagt.

De Windows-OneDrive-map op een laptop is niet automatisch bereikbaar vanuit
Codespaces of Codex Cloud. Dainyel gebruikt een privé-account en heeft toegang
gevraagd tot `DainyelOnTheMove website/website` en `DainyelOnTheMove website/backups`.
De bestaande OneDrive-back-ups blijven behouden. De GitHub-workflow
**OneDrive cloud backups** controleert beide projectmappen en maakt na een push naar
`staging` een nieuwe ZIP-back-up van de GitHub-versie. Het schrijft geen wijzigingen
naar de OneDrive-websitemap en gebruikt geen synchronisatie met verwijderingen.

### Windows-aanmelding en cloudtoegang

De mobiele Codespaces-route is gestopt en de Codespaces zijn door Dainyel verwijderd.
Op Windows is rclone 1.75.1 aangemeld bij het privé-account. **OneDrive (personal)**
is geselecteerd. De controle van `onedrive:DainyelOnTheMove website` toont onder
andere de mappen `website` en `backups`; overige projectmappen worden niet gekoppeld.

Het configuratiebestand van rclone is als **repository secret** met de naam
`ONEDRIVE_RCLONE_CONFIG` opgeslagen in GitHub. Bij opnieuw aanmelden kan het worden
bijgewerkt via **Settings → Secrets and
variables → Actions → New repository secret**. Plaats de inhoud uitsluitend in
dit geheim. Deel het niet in chat, commits, documenten of issues.

Kopieer het bestand op Windows rechtstreeks naar het klembord, zonder het af te
drukken in PowerShell:

```powershell
$onedriveConfigPath = (rclone config file | Select-Object -Last 1).Trim()
Get-Content -LiteralPath $onedriveConfigPath -Raw | Set-Clipboard
```

Na het bijwerken van het geheim kan de laatste run van **OneDrive cloud backups**
opnieuw worden gestart via **Re-run all jobs**, of kan een nieuwe push naar `staging`
de workflow starten. Zonder geheim worden de verbindings- en back-upstappen
overgeslagen; een groene run zonder die stappen bewijst geen OneDrive-toegang.

De runner gebruikt rclone 1.75.1 en controleert de SHA-256 van het downloadbestand.
De configuratie staat tijdens de run in een tijdelijk bestand buiten de checkout,
met beperkte bestandsrechten. Configuratie en lokale ZIP worden daarna opgeruimd.
Token- en provideruitvoer worden niet gelogd. Alleen gevolgde websitebestanden gaan
in de ZIP; `private/`, credentials, caches, Git-internals en symlinks zijn uitgesloten.
Git LFS-media moeten daadwerkelijk gedownload zijn voordat de back-up kan starten.

Cloudback-ups heten `backups/cloud_website_<tijd>_<commit>_<run>_<poging>.zip`.
Upload gebruikt `copyto --immutable`; bestaande back-ups worden niet verwijderd
of vervangen. Dit bewaart de GitHub-versie, geen niet-gecommitte wijzigingen uit
de Windows-OneDrive-websitemap. Er is geen automatische import van die map.

Microsoft-toestemming is geen technische beperking tot de twee projectmappen.
Bestandsacties in deze workflow blijven beperkt tot `website` en `backups`.
De aanmelding kan opnieuw nodig zijn wanneer Microsoft credentials intrekt of
laat verlopen. Bij een aanmeldfout stopt de workflow en blijven bestaande back-ups
behouden. De GitHub-koppeling geeft de afzonderlijke Codex-cloudomgeving geen
rechtstreekse toegang tot OneDrive-credentials.

Neem `private/`, wachtwoorden, tokens of serviceaccountbestanden nooit op in
Git-bronbestanden of loguitvoer. Gebruik voor de cloudverbinding uitsluitend het
versleutelde GitHub-geheim. Maak geen publieke deelkoppeling voor een volledige
OneDrive-map. Git-geschiedenis bewaart codewijzigingen, maar is geen back-up van
lokale, niet-gecommitte media of privébestanden.

## Gecontroleerd op 14 oktober 2026

- GitHub-toegang tot `dainyelrooi/DainyelOnTheMove` is beschikbaar.
- De bestaande recente Firebase-publicaties op `main` en `staging` zijn geslaagd.
- Zowel de live URL als de staging-URL geeft HTTP 200 terug.
- De staging-URL heeft een `X-Robots-Tag` die indexering uitsluit.
- De Codespaces-configuratie blijft beschikbaar, maar de gemaakte Codespaces zijn
  verwijderd en de OneDrive-aanmelding is via Windows afgerond.
- OneDrive is op Windows en via GitHub Actions bereikbaar. Het geheim is door
  Dainyel opgeslagen. De eerste echte cloudcontrole en upload zijn geslaagd:
  https://github.com/dainyelrooi/DainyelOnTheMove/actions/runs/38554132096.
- Eerste cloudback-up: `backups/cloud_website_2026-10-14_11-14-19_1c29206233de_38554132096_2.zip`,
  met 138 gevolgde websitebestanden. De tijd in bestandsnamen is UTC.
- Rechtstreeks OneDrive- en Firebase-beheer is niet aan deze Codex-cloudomgeving
  gekoppeld.
