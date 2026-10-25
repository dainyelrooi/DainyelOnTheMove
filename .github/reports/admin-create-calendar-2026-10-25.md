# Zelf toevoegen in de admin — testomgeving, 25 oktober 2026

Deze uitbreiding is bedoeld voor staging. De openbare livewebsite en mailverzending zijn geen onderdeel van deze opdracht.

## Zelf gebruiken

1. Open de test-admin en kies **Add new**. Op Overview staat dezelfde ingang.
2. Kies **Social post**, **Task**, **Appointment**, **Travel story / blog**, **Field Note**, **Did you know?** of **Postcard email**.
3. Kalender: vul titel, datum/tijd en caption/notities in. Social posts hebben één of meer kanalen: Instagram, YouTube, TikTok, Facebook, LinkedIn en Pinterest. Canva-, Metricool-afbeeldings- en muzieklinks zijn optioneel.
4. **Save to calendar** bewaart privé. De kalender opent de gekozen maand, met de filters terug op alle items. Je kunt ook de plusknop op een dag gebruiken.
5. Open een kalenderitem om titel, datum, caption, kanalen, ontwerp-/muzieklinks en checklist aan te passen. Bij taken/afspraken heten de statussen **Planned** en **Done**; bij social posts **Scheduled** en **Published**. Een vinkje voert geen externe publicatie uit.
6. Een nieuw kalenderitem heeft herinneringen standaard uit. In de testkalender blijven alle emails uit; de bestaande live herinneringsvoorkeur blijft ongewijzigd.
7. Nieuwe verhalen, Field Notes en weetjes openen de bestaande editor met het juiste type geselecteerd. Banners, foto's, hoofdstukken, benaderde leestijd, privé opslaan, preview en afzonderlijk publiceren blijven daar beschikbaar.
8. Postcard email opent een nieuw privéconcept in de bestaande Postcard-editor. Er wordt niets verzonden of ingepland door deze snelkoppeling.

Je krijgt bij sluiten van onopgeslagen kalenderinvoer een bevestiging. Bij een mislukte opslag blijft je tekst staan. Dezelfde geopende kalenderinvoer gebruikt bij opnieuw proberen hetzelfde ID, zodat een onzekere bevestiging niet direct een duplicaat maakt. Een ander reeds opgeslagen item wordt nooit overschreven door de aanmaakfunctie.

## Implementatie en grenzen

- Bestaande HTML/CSS/vanilla JS en dezelfde owner/TOTP-autorisatie; geen nieuwe dienst, dependency, betaald account, social API of server.
- Nieuwe aanmaakdialoog, Add new-menu, dagknoppen en hergebruik van de bestaande schrijf-/Postcard-editors. De kalender blijft begrensd op 200 zichtbare items; dit is een beheerdersgrens, geen nieuwe publieke inzendlimiet.
- De bestaande legacy kalender ondersteunt op live nog geen task/appointment-kind. Deze uitbreiding gebruikt de geïsoleerde calendarSpaces/staging/posts. Een latere goedgekeurde live-release moet dat productiecontract bewust meenemen; alleen de frontend kopiëren is onvoldoende.
- De normale pre-change OneDrive-backup staat in backups/website_2026-10-25_09-45-07.
- De aparte inzendquota-commit 9115f06 is op security/public-submission-quota behouden en niet in deze branch of stagingrelease meegenomen.

## Gecontroleerd vóór browseracceptatie

- PASS: 27 Node-tests, inclusief drie nieuwe tests voor kanaal-/typevalidatie, winter-/zomertijd en create-only/herhaalveilig opslaan.
- PASS: 16 bestaande Python-tests, compositie en structuur/tripcontrole.
- PASS: 9 echte lokale emulator Rules-tests. De nieuwe kalenderproef controleert werkelijke SDK-transacties voor alle drie typen, privacy, status wijzigen, onbekende velden/typen, verkeerde kanalen, ontbrekende MFA en verboden verwijderen.
- PASS: vijf geselecteerde proeven tegen b338841 plus uitsluitend de staging-kalendervalidator. Alle bron buiten die validator is bytegelijk na normalisatie van regeleinden; de eerdere twaalf-fotofix blijft niet-actief.
- PASS: named Enterprise Native Rules-compilatie met CLI dry-run. De standaardemulator bewijst geen Enterprise-capaciteit of kosten.
- De eerste nieuwe Rules-test miste de SDK-import runTransaction; dit testharnas is hersteld en de definitieve volledige run slaagt.
- Browseracceptatie en definitieve stagingrelease worden hieronder na uitvoering vastgelegd. Geen claim over fysieke iPhone/Android, echte mailbezorging of volledige WCAG-conformiteit.

Ruwe lokale uitvoer: C:/Users/dainy/Documents/Codex/2026-10-25/admin-calendar. Deze map wordt niet gehost.

De gewijzigde Firestore-regels zijn geteste prototype-regels. De Firebase-regelsworkflow vraagt de volgende beperking te vermelden:

> I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for validating private staging calendar items while preserving signed-owner/TOTP access and all production rules. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.
