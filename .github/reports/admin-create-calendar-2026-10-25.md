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

- PASS: 28 Node-tests, inclusief vier nieuwe tests voor kanaal-/typevalidatie, winter-/zomertijd, create-only/herhaalveilig opslaan en niet-botsende import-ID's voor verschillende itemtypen.
- PASS: 16 bestaande Python-tests, compositie en structuur/tripcontrole.
- PASS: 9 echte lokale emulator Rules-tests. De nieuwe kalenderproef controleert werkelijke SDK-transacties voor alle drie typen, privacy, status wijzigen, onbekende velden/typen, verkeerde kanalen, ontbrekende MFA en verboden verwijderen.
- PASS: vijf geselecteerde proeven tegen b338841 plus uitsluitend de staging-kalendervalidator. Alle bron buiten die validator is bytegelijk na normalisatie van regeleinden; de eerdere twaalf-fotofix blijft niet-actief.
- PASS: named Enterprise Native Rules-compilatie met CLI dry-run. De standaardemulator bewijst geen Enterprise-capaciteit of kosten.
- De eerste nieuwe Rules-test miste de SDK-import runTransaction; dit testharnas is hersteld en de definitieve volledige run slaagt.
- Browseracceptatie en definitieve stagingrelease worden hieronder na uitvoering vastgelegd. Geen claim over fysieke iPhone/Android, echte mailbezorging of volledige WCAG-conformiteit.

Ruwe lokale uitvoer: C:/Users/dainy/Documents/Codex/2026-10-25/admin-calendar. Deze map wordt niet gehost.

## Eerste stagingrelease en browsercontrole

- Stagingbron 771f8a2: Hosting40192409697, regressie40192409783, bronbackup40192409735 en private inhoud/preflight40192409716 zijn alle PASS. Main blijft b338841.
- De kleine Rules-release op de named database is exact teruggelezen: uitsluitend isValidStagingCalendarPost verschilt van b338841; alle andere functies/matches zijn gelijk. De Rules-bronnaam is na een eerste diagnoseselectiefout terug op firestore.rules gezet en de definitieve readback slaagt. De publieke quota- en twaalf-fotokandidaten zijn niet geactiveerd.
- De eerdere ingelogde browsertab bleek gesloten. Nieuwe test-admin geopend op /admin#admin-new; opnieuw inloggen door de eigenaar is aangevraagd. Echte opgeslagen kalenderitems en de nieuwe schrijfsnelkoppelingen zijn daarom nog niet vanuit een nieuw ingelogde stagingbrowser geaccepteerd.
- PASS in een afzonderlijk, duidelijk gelabeld lokaal componentfixture met de echte kalendercode en gesimuleerde opslag: social post met Instagram én YouTube aanmaken, taak zonder caption/kanaal aanmaken, taak heropenen/Done/notities opslaan, afspraak via plusknop op28oktober aanmaken, onopgeslagen sluitbevestiging annuleren en tekst behouden. Dit is geen cloud-/MFA-bewijs; daarvoor gelden de emulatorproeven en nog benodigde eigenaarstest.
- Die browsercontrole vond een focusprobleem na het opslaan vanuit Add new. Dit is hersteld: na opslaan staat de focus aantoonbaar op de zichtbare kalenderknop, met bevestigde succesmelding. Taak-/afspraaklabels zijn verduidelijkt; de typekeuze blijft bij het openen bovenaan de dialoog zichtbaar.
- Telefooncomponent op ingestelde390×844 (clientbreedte375 door de scrollbar): geen horizontale overflow; afspraakdialoog bleef binnen het scherm. De tijdelijke viewport is teruggezet. Geen fysieke telefoontest geclaimd.

## Definitieve eigenaarstest — geslaagd

Na opnieuw aanmelden met de bestaande Google/Authenticator-beveiliging is de echte staging-admin doorlopen:

- Een social post zonder kanaal werd geweigerd met een begrijpelijke melding; na Instagram én YouTube kiezen werd het item privé opgeslagen.
- Een taak zonder kanaal/caption en een afspraak via de plusknop van30oktober werden privé opgeslagen. Alle drie zijn na volledig herladen teruggevonden.
- De social post kreeg een gewijzigde caption, TikTok als derde kanaal, een nieuwe tijd14:15 en een expliciet als test gemarkeerde muzieknotitie. De taak kreeg Done en notities. Ook die wijzigingen bleven na herladen bewaard.
- De vier nieuwe schrijfsnelkoppelingen selecteerden aantoonbaar field-note, fact en blog, en openden de Postcard-editor met focus op het juiste invoerveld. Send/Schedule bleven op staging uit. Er is vanuit deze test geen verhaal/Postcard opgeslagen, gepubliceerd, ingepland of verstuurd.
- Bij een onopgeslagen kalenderitem liet Cancel in de sluitbevestiging de tekst en dialoog intact. Daarna is alleen die onopgeslagen testinvoer bewust verworpen; er ontstond geen extra record.
- De drie gemarkeerde kalenderfixtures zijn afzonderlijk via de named database teruggelezen en uitsluitend bij exact gelijk testlabel, remindersEnabled=false en de vastgelegde updateTime verwijderd. De kalender toont weer de oorspronkelijke7 items en nul testkaarten. Geen oorspronkelijk kalenderitem is verwijderd.
- Echte stagingweergave op390×844, clientbreedte375: geen horizontale overflow; afspraakdialoog liep van x19 tot356.2. Caption was bij de afspraak optioneel. De eerste viewportpoging gold voor de nog geselecteerde lokale fixturetab; die is gesloten, waarna de echte admin opnieuw is gemeten. Een volledige mobiele screenshot faalde; de geslaagde DOM-meting is het mobiele bewijs. Viewport is hersteld.
- Screenshot van het echte nieuwe menu: C:/Users/dainy/Documents/Codex/2026-10-25/admin-calendar/new-menu-staging.png. De lokale componentafbeelding is nadrukkelijk geen cloud-/MFA-bewijs.

Functionele stagingrelease827d57c: Hosting40193507844, regressie40193507859, bronbackup40193507868 en private inhoud/preflight40193507976 zijn PASS. De volledige automatische set is53 proeven:28 Node +16 Python +9 lokale Rules-proeven; de vijf baselineproeven overlappen en worden niet extra opgeteld. De laatste kleine tekst/afstandscorrectie en dit verslag volgen als afzonderlijke afrondingscommit. Actieve Rules zijn nog exact het voorbereide b338841-plus-stagingvalidatorbestand; alle andere Rules-functies/matches zijn gelijk, App Check blijft voor beide diensten ENFORCED en main blijft b338841. Geen mail, provider-, facturerings- of planningswijziging.

Definitieve functionele stagingbron **0ae4be0**: Hosting **40195382533**, regressie **40195382624**, bronbackup **40195382618** en private inhoud/preflight **40195382616** zijn alle PASS. Dit omvat de laatste tekst/afstandscorrectie. Het verslag van de eigenaarstest hierboven is daarmee eveneens op stagingbron vastgelegd. De afsluitende hieronder vastgelegde release-readback is alleen documentatie.

Laatste readbacks: productie-Postcardcapability blijft enabled=true, staging=false; bestaande live kalenderremindervoorkeur blijft enabled=true. Geen van die instellingen is door deze taak gewijzigd. Het nieuwe menu telt zeven keuzes. De eigenaarstest is dus voltooid; opnieuw inloggen is geen open blokkade meer. Het normale viewportbeeld van de uiteindelijke test-admin is ook opgeslagen als new-menu-staging-final.jpg in de externe bewijsmap. De verkeerde vroege phone-screenshot is geen geldig mobiel bewijs; de expliciete375px meting na selectie van de juiste admin-tab is dat wel.

De gewijzigde Firestore-regels zijn geteste prototype-regels. De Firebase-regelsworkflow vraagt de volgende beperking te vermelden:

> I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for validating private staging calendar items while preserving signed-owner/TOTP access and all production rules. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.
