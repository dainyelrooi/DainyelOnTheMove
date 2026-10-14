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

Wijzigingen die uitsluitend onder `.github/` of `.devcontainer/` vallen starten
geen Firebase Hosting-publicatie. Deze bestanden worden niet gehost. De
OneDrive-back-up blijft wel na iedere push naar `staging` draaien. De filters
voor de productie-workflow gaan pas in nadat ze via een goedgekeurde release
naar `main` zijn overgenomen.

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

### Firebase-kosten

Het door Dainyel gedeelde factureringsrapport toont **Outgoing Bandwidth** voor
Firebase Hosting, SKU `5DF2-5F92-77F0`: 0,08 GiB gefactureerd verkeer voor €0,01.
Dit bedrag betreft downloads naar bezoekers. Live-, test- en previewsites delen
het Hosting-quotum van hetzelfde project. Een budgetwaarschuwing stopt geen
kosten; de Firebase-spend-caps ondersteunen klassiek Hosting niet.

De cloudcontrole bevestigt één Firestore-database. `dainyel-content` heeft
`freeTier: true`, editie `ENTERPRISE` en
`POINT_IN_TIME_RECOVERY_DISABLED`. Dit bevestigt de gratis database-quota,
maar is geen volledige functietest na een verandering van betaalplan.
Controle: https://github.com/dainyelrooi/DainyelOnTheMove/actions/runs/38562357608.

Om nieuwe Firebase-gebruikskosten te vermijden is het gratis **Spark-plan**
de concrete route. Wijzig het projectplan via
https://console.firebase.google.com/project/dainyelonthemove/usage/details.
Bij overschrijding van gratis quota kan Firebase diensten of de Hosting-sites
tijdelijk stoppen. Betaalde Google Cloud-diensten zijn dan niet beschikbaar.
Een overstap verwijdert al gemaakte kosten niet. Het betaalplan is tijdens
deze controle niet gewijzigd.

Officiële uitleg:
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- https://firebase.google.com/docs/hosting/usage-quotas-pricing
- https://firebase.google.com/docs/projects/billing/spend-caps
- https://firebase.google.com/pricing

### Firebase-beheer vanuit de cloud

De aanvullende beheercontrole staat in **Firebase admin access check**. Deze
gebruikt het bestaande GitHub-geheim `FIREBASE_SERVICE_ACCOUNT_DAINYELONTHEMOVE`,
Google Application Default Credentials en de officiële Firebase CLI/MCP-server.
Credentials blijven in de cloudrunner; de afzonderlijke Codex-werkruimte krijgt
hierdoor geen Google-credentialbestand. Beheeracties kunnen vanuit de chat via
de geauthenticeerde GitHub-cloudtaken worden uitgevoerd.

Het serviceaccount is
`github-action-1398626881@dainyelonthemove.iam.gserviceaccount.com`.
Dainyel heeft de rol **Firebase Admin** (`roles/firebase.admin`) aan dit bestaande
account toegevoegd op project `dainyelonthemove`, zonder een nieuwe sleutel te
delen. De herhaalde controle bevestigt nu alle getoetste beheerrechten voor
Hosting, Authentication, Firestore, Rules en App Check. Projectmetadata is via
de officiële Firebase MCP-server opgehaald. De database `dainyel-content` is
vanuit de cloud beschreven en heeft editie **ENTERPRISE**. Raadpleeg bij toekomstige
wijzigingen aan datamodellen, regels of SDK-gebruik de bijbehorende Enterprise-
instructies uit de Firebase Firestore-skill.

Geslaagde controle:
https://github.com/dainyelrooi/DainyelOnTheMove/actions/runs/38558647206.
De serviceaccountrol geeft geen toegang om project-IAM-rollen zelf te wijzigen.
Beheer gebeurt via de geauthenticeerde GitHub-cloudtaken; er zijn geen Google-
credentials direct aan de afzonderlijke Codex-werkruimte gekoppeld.

De controle rapporteert alleen de technische identiteit, permissienamen en
veilige projectmetadata. Gebruikers, Field Notes, tokens en geheime sleutels
worden niet gepubliceerd. Toegang verlenen is geen toestemming om bestaande
gebruikers, gegevens, moderatieregels of productie-instellingen te wijzigen;
die wijzigingen blijven gekoppeld aan een concrete opdracht en release.

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
