# Negen goedgekeurde gratis functies — uitvoering

De eigenaar heeft op 27 november 2026 de negen geselecteerde voorstellen goedgekeurd. Werk op de testomgeving; geen productie-uitrol, mailings, herplanning of betaalpakket. Bestaande openbare inhoud, campagnes en privé-opslag blijven behouden.

Herstelkopie: `backups/website_2026-11-27_14-29-16`. Branch: `feature/free-tools-20261127`. Actuele main-inhoud wordt meegenomen, inclusief de nieuwste openbare Postcard.

| Functie | Status | Acceptatie |
| --- | --- | --- |
| Beheer-overzicht | BLOCKED laatste eigenaarstest | Implementatie en beveiligde route getest; echte Google/TOTP-sessie nodig voor zichtbare beheeracceptatie. |
| Postcards-voorkeuren | PASS configuratie; BLOCKED praktijkproef | Drie velden, segmenten en vorm teruggelezen; staging preferencesReady bevestigd. Geen echt contact gewijzigd. |
| Brevo-terugmeldingen | BLOCKED Authenticator | Ontvanger en beveiliging getest. Alleen webhookrecht expliciet goedgekeurd; Brevo vraagt eigenaarbevestiging voor opslaan. |
| Persoonlijke leeslijst | PASS | Echt verhaal bewaard en teruggevonden; capaciteit, wissen en privacygrenzen getest. |
| Inpaklijst | PASS | Wasstrips aangevinkt, herladen en teruggezet. Native printdialoog niet getest. |
| Première in agenda | PASS beleid; niet beschikbaar voor nieuwe première | Winter/zomerinstant, veilige inhoud en UID getest. Verstreken première terecht verborgen; echte toekomstige import niet getest. |
| Offline lezen | PASS opslag en gesimuleerde uitval | Echte kopie bewaard, zes workerproeven slagen. Vliegtuigstand en native installatie op echt apparaat niet getest. |
| Browsermeldingen | BLOCKED persoonlijke apparaatproef | Serverbaseline, inschrijving, afmelding en verzendbeleid getest; echte ontvangst nog niet bewezen. |
| Snelheidsmetingen | PASS toestemmingslogica | Vier gedragstests slagen; staging verzamelt niet. Productieontvangst pas na latere goedgekeurde livegang te testen. |

Dit document wordt bijgewerkt met daadwerkelijke tests en resterende accountblokkades. Een voorbereide functie geldt niet automatisch als aangesloten of bewezen werkzaam.


## Uitvoering en bevestigde grenzen

- Bezoekersfuncties staan op de afgeschermde testsite, via de footer onder Travel tools & saved reading. Geen productie-Hosting of productie-Worker is gewijzigd.
- Bestaande publieke content is meegenomen uit actuele main, inclusief Postcard39. Alle811 eerdere editorvelden blijven behouden.
- Staging D1 is uitsluitend additief uitgebreid; het oorspronkelijke aantal inboxinzendingen is gecontroleerd en bleef gelijk. Laatst bevestigde Worker:24700864-aa63-4a1a-b352-342487356805. Er zijn geen credentials in de repository geplaatst.
- De eigenaar gaf afzonderlijk akkoord voor de beperkte optionele Postcard-onderwerpregel. Firebase-validatie: geen fouten. De27 geïsoleerde emulatorgevallen slagen; deployment1795813467261 is bevestigd geslaagd. Bezoekers kregen geen extra rechten, bestaande zevenveldmailjobs blijven geldig.
- Verplichte prototypekwalificatie voor de beperkte regels: "I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for owner-only topic selection, exact saved-draft matching and the existing Google/TOTP boundary. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules."
- Adversariële controle: bezoeker en eigenaar zonder TOTP geweigerd; ontbrekende/afwijkende onderwerpen, onbekende categorie, directe segment-ID en mutatie van een bestaande opdracht geweigerd. Geen wijziging aan de regels nodig om de bestaande afgeschermde admin te omzeilen.

## Echte gebruikerscontroles

PASS: op staging een Thailand-verhaal bewaard; teruggevonden via de footer in de leeslijst. Wasstrips aangevinkt, pagina herladen, vinkje en1/12 bleven bewaard; daarna teruggezet. Een echte eenvoudige offline kopie is via de knop opgeslagen. Geen melding of nieuwsbrief verzonden.

PASS: publieke Worker/features reageert200 met de bestaande publieke VAPID-sleutel; onbevoegde admin/services reageert401. Providerconfiguratie, persoonsgegevens en privésleutels zijn niet publiek beschikbaar.

PASS: de echte Firebase Hosting init-configuratie is op beide bestaande hosts aanwezig. De actuele Performance-SDK is bereikbaar en ondersteunt de ingestelde collection/instrumentation-opties. Meten staat op staging uit; het toestemmingspad is met geïnjecteerde SDK getest, inclusief intrekken tijdens laden en hervatten zonder dubbele trace.

NIET GETEST: echte iOS/Android-installatie, notificatieontvangst op een persoonlijk apparaat, uitgeschakeld internet op een echt apparaat, printdialoog en een nieuwe echte toekomstige première. Voor agenda-import zijn absolute winter/zomerinstanten en veilige inhoud automatisch getest; de verstreken première krijgt geen misleidende downloadknop.

BLOCKED: de beschermde staging-admin vraagt opnieuw Google/TOTP voor echte opslag- en beheeracceptatie. De eerdere browserbreedteblokkade is verholpen. De aparte nieuwe profielvorm6b09db90943a4d84bb5daf06 is volledig opgeslagen en opnieuw geopend; die heeft geen bestaand standaardformulier vervangen. De labels Travel tips, Stories & Field Notes en Films & new videos zijn correct gekoppeld aan DOTM_TIPS, DOTM_STORIES en DOTM_FILMS. Optionele selectievakken, alleen-lezen e-mailveld, afmeldactie en No confirmation email bevestigd. Eerste/achternaamblokken zijn alleen uit deze nieuwe vorm verwijderd, zonder contactgegevens te verwijderen.

PASS herstel Cloudflare-bereik: dezelfde onbevoegde aanvraag gaf403 tekst met de standaard Python-afzendernaam en401 JSON met de herkenbare servicenaam. De vaste service-afzendernaam herstelt bereik; cryptografische toegangscontrole blijft behouden. De latere Brevo403 is afzonderlijk vastgesteld: de bestaande sleutel heeft Contacts Read en Account Read, maar geen Webhooks. De drie Boolean-attributen zijn daarom via de bestaande normale Brevo-beheeromgeving toegevoegd. Alleen Webhooks lezen/schrijven is nadien expliciet goedgekeurd; opslaan wacht nog op eigenaar-Authenticator. Geen nieuwe sleutel, andere rechten of vervaldatum ingesteld.

PASS: dynamische segmenten Stories#2, Films#3 en Tips#4 zijn opgeslagen en elk teruggelezen. Iedere OR-tak vereist zowel actieve e-mailinschrijving als lidmaatschap van Postcards-lijst#3, plus onderwerp True of Not filled. False wordt uitgesloten. Nieuwe lezers zonder voorkeurwaarden ontvangen standaard alle onderwerpen. Bestaand segment#1 teruggelezen en ongewijzigd. Geen bestaande campagne omgezet.

PASS: echte setup via workflow-dispatch46102255282, plus alleen-lezen D1-bevestiging van vorm en mapping stories2/films3/tips4. Opgeslagen status: preferencesReady true, gratis plan, resterend tegoed onbekend, webhookReady false en feedback-permission. Workflow-succes alleen is niet als providerbewijs gebruikt.

## Laatste regressie en bewijzen

- Broncode c8d028a; daaropvolgende documentatie verandert de werking niet. Staging Hosting46080145968 en OneDrive-back-up46080145980 geslaagd.
- Volledige lokale Node-suite:344/344. Volledige lokale Python-suite:254/254. Een eerdere Windows-rollbacktestfout kwam in de ongewijzigde volledige herhaling niet terug; Linux-CI slaagt ook. De eerdere fout wordt niet als bewezen structureel opgelost bestempeld.
- CI46080146024: regressie geslaagd, waaronder254 Pythongevallen en27/27 geïsoleerde Firestore-regelgevallen. Node omvat zes offline-worker-, vier performance- en twintig Worker/SQLite-proeven.
- Check-Journey.py en Validate-PublicTrip.py: PASS voor routes, links, assets, metadata, sitemap, Hosting-afscherming en public-tripmodel.
- NIET GETEST: echte contactvoorkeurwijziging, eigenaaropslag nieuw onderwerp, persoonlijke notificatieontvangst, native installatie/print en Firebase-consoleontvangst. Geen echte mail gestuurd om deze grenzen te verbergen.
- Beperkte Performance-webmeting blijft bèta. Geen volledige INP-meting of gegarandeerde Core Web Vitals-score geclaimd.
- Werkdatum27november America/Bogota; sommige serverbewijzen dragen al28november UTC. Handleiding:free-tools-guide-2026-11-27.md in deze map.

## Onderhoud en gratis grenzen

Browseropslag: maximaal40 leeslinks,8 offline kopieën,3 foto's per kopie, maximaal900KB per foto en250KB per artikel; opgeslagen CMS-kopieën nooit voorbij de oorspronkelijke24-uursgrens. Intrekking via403/404/410 wist een kopie; een tijdelijke429/5xx mag alleen een nog geldige kopie gebruiken.

Meldingen: alleen expliciete keuze, maximaal1000 registraties,90dagen geldigheid,300 registratieverzoeken per dag en10 per adres, tien geclaimde ontvangers per batch. Alleen nieuwe publieke verhalen/Field Notes vanaf de aansluitdatum; geen historisch archief of na publicatie toegevoegde browsers. Bij onzekere overdracht geen automatische herhaling; expliciete429 krijgt maximaal vier pogingen met minimaal15minuten ertussen. Technische ontvangstgegevens maximaal14dagen; geen contactadres of mailinhoud in terugmeldingen.

Geen nieuwe betaalde dienst, abonnement, facturering, extra cron of bezoekeraccount. Gratis limieten blijven echte grenzen. Een succesvolle workflow is geen bewijs van gekoppelde provider, daadwerkelijke aflevering of inboxontvangst.
