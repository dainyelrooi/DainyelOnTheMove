# Aan je website werken vanuit de cloud

GitHub bewaart de websitecode en versiegeschiedenis. Firebase serveert de testsite
en de live website. OneDrive kan originele media en afzonderlijke back-ups bewaren;
de OneDrive-koppeling is nog niet ingesteld.

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
Er is nog geen automatische synchronisatie of OneDrive-back-up ingesteld.

### OneDrive-aanmelding in Codespaces

Rclone is geïnstalleerd in de huidige Codespace. De handmatige Microsoft-
terugkeerlink gaf aanmeldfouten. Gebruik de tijdelijke aanmeldhulp om links niet
meer te hoeven aanpassen:

1. Stop oude `rclone config`-opdrachten met **Ctrl+C** en sluit oude aanmeldtabbladen.
2. Haal op `staging` de laatste wijzigingen op met `git pull --ff-only origin staging`.
3. Start `python3 .github/tools/connect-onedrive.py`.
4. Open de getoonde URL in een gewone browser. Voeg zo nodig poort **8765** toe in
   **Ports** en houd die **Private**. Gebruik geen Simple Browser voor aanmelding.
5. Kies **Aanmelden bij Microsoft**. Kopieer na het aanmelden direct de volledige
   adresbalk van de onbereikbare localhost-pagina en plak die in de aanmeldhulp.
   De hulp controleert of de link bij deze poging hoort en stuurt hem uitsluitend
   naar de lokale rclone-authserver. Deel deze link niet in de chat.
6. Wacht op **OneDrive-verbinding opgeslagen**, sluit de hulp met **Ctrl+C** en
   controleer met `rclone lsd "onedrive:DainyelOnTheMove website"`.

De hulp logt geen aanmeldcodes of tokens, leest geen websitebestanden en kopieert
of synchroniseert geen data. Rclone slaat de verbinding in zijn eigen configuratie
buiten de repository op. Die configuratie staat alleen in deze Codespace; toegang
vanuit een andere Codex-omgeving is hiermee niet automatisch ingericht. Bewaar of
deel dit configuratiebestand niet via GitHub of chat.

Microsoft-toestemming geeft rclone toegang tot eigen OneDrive-bestanden; dit is
geen technische beperking tot de twee projectmappen. De hulp vraagt
`Files.ReadWrite offline_access`, zonder SharePoint-toegang. Bestandsacties blijven
beperkt tot de geautoriseerde projectmappen; `private/` wordt niet overgenomen.

Neem `private/`, wachtwoorden, tokens of serviceaccountbestanden nooit op in
GitHub of een cloudwerkplek. Maak geen publieke deelkoppeling voor een volledige
OneDrive-map. Git-geschiedenis bewaart codewijzigingen, maar is geen back-up van
lokale, niet-gecommitte media of privébestanden.

## Gecontroleerd op 14 oktober 2026

- GitHub-toegang tot `dainyelrooi/DainyelOnTheMove` is beschikbaar.
- De bestaande recente Firebase-publicaties op `main` en `staging` zijn geslaagd.
- Zowel de live URL als de staging-URL geeft HTTP 200 terug.
- De staging-URL heeft een `X-Robots-Tag` die indexering uitsluit.
- De Codespaces-configuratie is toegevoegd; het opstarten van een daadwerkelijke
  Codespace moet nog via het GitHub-account worden gecontroleerd.
- OneDrive en rechtstreeks Firebase-beheer zijn niet gekoppeld aan deze Codex-
  cloudomgeving.
