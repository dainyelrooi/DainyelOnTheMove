# Negen goedgekeurde gratis functies — uitvoering

De eigenaar heeft op 27 november 2026 de negen geselecteerde voorstellen goedgekeurd. Werk op de testomgeving; geen productie-uitrol, mailings, herplanning of betaalpakket. Bestaande openbare inhoud, campagnes en privé-opslag blijven behouden.

Herstelkopie: `backups/website_2026-11-27_14-29-16`. Branch: `feature/free-tools-20261127`. Actuele main-inhoud wordt meegenomen, inclusief de nieuwste openbare Postcard.

| Functie | Status | Acceptatie |
| --- | --- | --- |
| Beheer-overzicht | In uitvoering | Werkelijke status, oorzaak, retry en ouderdom; geen verzonnen quota. |
| Postcards-voorkeuren | In uitvoering | Beveiligde voorkeuren, echte selectie, afmelden behouden; bestaande campagnes ongewijzigd. |
| Brevo-terugmeldingen | In uitvoering | Authenticatie, begrenzing, deduplicatie en volgorde; geen contactgegevens in logs. |
| Persoonlijke leeslijst | In uitvoering | Bewaren, wissen, browseropslag en toegankelijkheid. |
| Inpaklijst | In uitvoering | Lokale afvinklijst, terugzetten, printen, wasstrips. |
| Première in agenda | In uitvoering | Alleen openbare gegevens, tijdzone en stabiele UID. |
| Offline lezen | In uitvoering | Expiratie, intrekking, leesbare kopie; geen admin of privé-inhoud cachen. |
| Browsermeldingen | In uitvoering | Expliciete keuze, echte serverroute, afmelden, geen dubbele verzending. |
| Snelheidsmetingen | In uitvoering | Alleen na toestemming; uitsluiten van formulieren, previews en admin. |

Dit document wordt bijgewerkt met daadwerkelijke tests en resterende accountblokkades. Een voorbereide functie geldt niet automatisch als aangesloten of bewezen werkzaam.


## Uitvoering en bevestigde grenzen

- Bezoekersfuncties staan op de afgeschermde testsite, via de footer onder Travel tools & saved reading. Geen productie-Hosting of productie-Worker is gewijzigd.
- Bestaande publieke content is meegenomen uit actuele main, inclusief Postcard39. Alle811 eerdere editorvelden blijven behouden.
- Staging D1 is uitsluitend additief uitgebreid; het oorspronkelijke aantal inboxinzendingen is gecontroleerd en bleef gelijk. Laatst bevestigde Worker1920e8da-29e9-4420-8d85-78749676f3e0 is later gevolgd door de categorie-diagnoseversie; er zijn geen credentials in de repository geplaatst.
- De eigenaar gaf afzonderlijk akkoord voor de beperkte optionele Postcard-onderwerpregel. Firebase-validatie: geen fouten. De27 geïsoleerde emulatorgevallen slagen; deployment1795813467261 is bevestigd geslaagd. Bezoekers kregen geen extra rechten, bestaande zevenveldmailjobs blijven geldig.
- Verplichte prototypekwalificatie voor de beperkte regels: "I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for owner-only topic selection, exact saved-draft matching and the existing Google/TOTP boundary. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules."
- Adversariële controle: bezoeker en eigenaar zonder TOTP geweigerd; ontbrekende/afwijkende onderwerpen, onbekende categorie, directe segment-ID en mutatie van een bestaande opdracht geweigerd. Geen wijziging aan de regels nodig om de bestaande afgeschermde admin te omzeilen.

## Echte gebruikerscontroles

PASS: op staging een Thailand-verhaal bewaard; teruggevonden via de footer in de leeslijst. Wasstrips aangevinkt, pagina herladen, vinkje en1/12 bleven bewaard; daarna teruggezet. Een echte eenvoudige offline kopie is via de knop opgeslagen. Geen melding of nieuwsbrief verzonden.

PASS: publieke Worker/features reageert200 met de bestaande publieke VAPID-sleutel; onbevoegde admin/services reageert401. Providerconfiguratie, persoonsgegevens en privésleutels zijn niet publiek beschikbaar.

PASS: de echte Firebase Hosting init-configuratie is op beide bestaande hosts aanwezig. De actuele Performance-SDK is bereikbaar en ondersteunt de ingestelde collection/instrumentation-opties. Meten staat op staging uit; het toestemmingspad is met geïnjecteerde SDK getest, inclusief intrekken tijdens laden en hervatten zonder dubbele trace.

NIET GETEST: echte iOS/Android-installatie, notificatieontvangst op een persoonlijk apparaat, uitgeschakeld internet op een echt apparaat, printdialoog en een nieuwe echte toekomstige première. Voor agenda-import zijn absolute winter/zomerinstanten en veilige inhoud automatisch getest; de verstreken première krijgt geen misleidende downloadknop.

BLOCKED: de beschermde staging-admin vraagt opnieuw Google/TOTP voor echte opslag- en beheeracceptatie. De Brevo-editor in de gekoppelde browser blijft op circa592px, ook na de aangeboden viewportbediening; daardoor ontbreken desktop-bewerkingsknoppen. De browser is tijdens herstel opnieuw gestart; providerformulieren zijn niet als voltooid aangemerkt. De aparte nieuwe profielvorm6b09db90943a4d84bb5daf06 heeft geen bestaand standaardformulier vervangen.

BLOCKED: de eerste serveraansluiting werd door Cloudflare geweigerd voor de standaard Python-afzendernaam. Dit is gereproduceerd: dezelfde onbevoegde aanvraag geeft403 tekst met de standaardnaam en401 JSON met de herkenbare servicenaam. De vaste service-afzendernaam herstelt het bereik van de bestaande beveiligde route; cryptografische toegangscontrole is behouden. Vervolgens weigerde Brevo een nieuwe bewerking metprovider-http-403-permission-denied. De exacte categorie wordt afzonderlijk vastgesteld. Bestaande campagnes zijn niet gewijzigd; er is geen ruimer token aangemaakt.

## Onderhoud en gratis grenzen

Browseropslag: maximaal40 leeslinks,8 offline kopieën,3 foto's per kopie, maximaal900KB per foto en250KB per artikel; opgeslagen CMS-kopieën nooit voorbij de oorspronkelijke24-uursgrens. Intrekking via403/404/410 wist een kopie; een tijdelijke429/5xx mag alleen een nog geldige kopie gebruiken.

Meldingen: alleen expliciete keuze, maximaal1000 registraties,90dagen geldigheid,300 registratieverzoeken per dag en10 per adres, tien geclaimde ontvangers per batch. Alleen nieuwe publieke verhalen/Field Notes vanaf de aansluitdatum; geen historisch archief of na publicatie toegevoegde browsers. Bij onzekere overdracht geen automatische herhaling; expliciete429 krijgt maximaal vier pogingen met minimaal15minuten ertussen. Technische ontvangstgegevens maximaal14dagen; geen contactadres of mailinhoud in terugmeldingen.

Geen nieuwe betaalde dienst, abonnement, facturering, extra cron of bezoekeraccount. Gratis limieten blijven echte grenzen. Een succesvolle workflow is geen bewijs van gekoppelde provider, daadwerkelijke aflevering of inboxontvangst.
