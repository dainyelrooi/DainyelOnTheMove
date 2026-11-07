# Publicatieherstel en gekoppelde inhoud — 7 november 2026

## Bevroren gegevens

Bestaand artikel entry-949ccca4d79948739645d2539a0fd611: behoud /entry/<id>-URL, tekst, twaalf foto's, banner en oorspronkelijke planning7november18:00Europe/Amsterdam. Behoud gekoppelde Postcard8november11:00Europe/Amsterdam, bestaand verzoek en revisiekoppeling. Geen testmail naar echte abonnees. Geen ongepubliceerde reisroute in bron of rapport.

## Vóór wijzigingen vastgesteld

- Verhaalplanning2026-11-07T17:00:00Z, goedgekeurde revisie2: dit is18:00Nederlandse tijd. Geen aangetoonde tijdzonefout.
- De bestaande server is een GitHub Actions-taak met5minutencron, onafhankelijk van de admin. Laatste feitelijke run vóór het tijdstip:42392378167 om16:39:19UTC, job128462468980. De log bevestigt een succesvolle due-check vóór17:00. Geen latere uitvoering rond de gemiste publicatie. De historie bevat urenlange gaten. GitHub documenteert vertraagde/weggelaten schedule-events: https://docs.github.com/en/actions/how-tos/troubleshoot-workflows . Dit is geen betrouwbare enige publicatieklok.
- De eigenaar bevestigt handmatige publicatie om18:05:11UTC/19:05Nederlandse tijd. Publicatie en overzichtskaart bestaan met hetzelfde ID. De openbare directe browserpagina toont titel, tekst, hoofdstukken en foto's. Alle15inhoudsvelden van de oorspronkelijke geplande payload zijn exact gelijk aan de handmatige publicatie; de twaalf mediareferenties zijn gelijk.
- Handmatig publiceren annuleert momenteel onvoorwaardelijk een queued schedule. Het plan staat daarom cancelled terwijl het artikel online is. De bestaande gekoppelde mailjob verwijst nog naar goedgekeurde revisie2 en8november10:00UTC. De verzendbeveiliging blokkeert cancelled plannen: concrete integratiefout. Erken uitsluitend dezelfde gepubliceerde inhoud met dezelfde goedgekeurde revisie en datum; herpubliceer geen ingetrokken/gewijzigde versie.
- De reserve-export faalt bij een legacylocatiedocument waarvan de gemaskeerde V2velden ontbreken. Firestore laat dan fields geheel weg; de strikte validator verwacht een map. Echte gemaskeerde productieread en offline-reproductie bevestigen de mismatch. Onbekende/misvormde schema's blijven geweigerd.

## Uitvoering en grenzen

Herstel eerst deze reproduceerbare fouten en test ze. Bereid een begrensde serverklok op het bestaande gratis Cloudflare-account voor; GitHub blijft fallback/deploy/export. Gebruik dezelfde Firestoreplanning, onveranderlijke payload en atomische versievoorwaarden. Nieuwe servertoegang pas aansluiten na expliciet akkoord voor de concrete rechten. Geen betaald plan of facturering. Logs bevatten alleen technische status, nooit teksten, foto's, ontvangers of tokens. Een onzekere providerverzending wordt eerst met Brevo vergeleken en niet blind herhaald.

Ook binnen scope: foutieve nieuwe bezoeken corrigeren, eigenaar-gedateerde gedeelde reisstops, verhaal/bestemmingskoppelingen en eigen initiële HTML/socialmetadata voor gepubliceerde CMS-artikelen. Veilige geplande publicatie uitsluitend op de testsite, zonder abonnee-mail. Geen CMS-migratie, nieuw verhaal-ID of gewijzigd verzendmoment. Dit verslag wordt aangevuld met feitelijk bewijs; voltooiing is nog niet geclaimd.


## Kandidaat en gecontroleerde wijzigingen

- De exacte handmatige publicatie is met een atomische vergelijking herkend. Het bestaande plan staat nu `published`, met goedgekeurde revisie 2 en dezelfde oorspronkelijke datum. De gekoppelde mailjob is niet gewijzigd. Geen provider-/mailactie bij dit herstel.
- Cloudflare krijgt uitsluitend een repositorygebonden GitHub Actions-sleutel. Het klokprogramma start steeds dezelfde bestaande workflow; Firebase-inhoud, Google-identiteit en Brevo-sleutels blijven in GitHub. Een aparte gratis D1-tabel bevat alleen begrensde technische klokontvangsten. Overlappende kloksignalen worden gededupliceerd. GitHub blijft extra fallback. Providerbevestiging van dispatch is geen publicatiebewijs.
- De bestaande Python-publicatie behoudt onveranderlijke beoordeelde inhoud, atomische versievoorwaarden en de grens van 24 uur voor gemiste taken. Eigenaarstatussen bevatten pogingen, herhaalmomenten en maximaal twaalf technische gebeurtenissen. Tijdelijke fouten kunnen opnieuw worden gecontroleerd; ongeldige/te oude verzoeken vereisen review.
- Postcards gebruikt dezelfde bestaande mailjob en dynamische Brevo-segmentselectie. Alleen nadat het exacte gekoppelde verhaal echt gepubliceerd is kan de onveranderde toekomstige datum native bij Brevo worden ingepland. Onzekere create/send-acties worden vergeleken met de bestaande campagne en nooit blind opnieuw verzonden. Een gedeelde lease voorkomt dat de twee achtergrondtaken dezelfde aanvraag tegelijk uitvoeren. Er worden geen testmails verzonden.
- De volledige openbare reserve-export werkt ook met een legacyprojectie zonder `fields`. Alleen al gepubliceerde inhoud wordt geëxporteerd. Dit levert automatisch artikel-HTML, eigen canonieke metadata, banner/social preview, hoofdstukken, sitemap en een kleine bestemmingscatalogus. Deze inhoud komt alleen op Hosting; nooit als concept of privégegeven in Git.
- De atlas koppelt bestaande bezochte bestemmingen aan het nieuwste gepubliceerde artikel met een herkenbare landnaam. Het noemen van een land in een artikel voegt nooit automatisch een bezoek toe.
- De eigenaar kan één foutief automatisch bezoek verwijderen. Het oorspronkelijke handgeschreven archief en afzonderlijke gedeelde reisupdates blijven behouden. Gedeelde reisupdates hebben een expliciet gekozen datum en alleen een land; geen GPS- of stadsgeschiedenis.
- Bestaande URL, twaalf foto's, inhoud, goedgekeurde revisie en verzendtijd van het getroffen verhaal blijven behouden. De definitief geannuleerde losse oude mail blijft exact geblokkeerd.

## Lokale bewijsvoering vóór staging

PASS: 227 Node-tests, 120 Python-tests en 19 Firestore-emulatortests. Publieke structuur-/link-/metadata-/Hostingcontrole en reisdatavalidatie slagen. Deze aantallen bewijzen geen echte providerverzending. De echte geplande stagingproef en provider-readback worden hieronder afzonderlijk vastgelegd.

De nieuwe regels zijn als prototype ontworpen om uitsluitend de geverifieerde eigenaar met tweede factor de nieuwe handelingen te geven. Publieke schrijfrechten worden niet verruimd. Emulator- en syntaxiscontroles slagen; dit is geen claim dat elke mogelijke beveiligingsaanval is getest.

## Resterende bewijsvoering

Nog te bevestigen: stagingpublicatie via de echte Cloudflare-klok, initiële HTML via Hosting, zichtbare adminstatus en productieactivering na akkoord. De GitHub-kloksleutel is door de eigenaar privé ingevoerd; de inhoud is niet gelezen of vastgelegd. Gekozen verloopdatum: 5 februari 2027; tijdig privé vernieuwen. Gratis services hebben quota en geen gegarandeerde exacte-seconden-SLA. Firebase- of GitHub-uitval kan de publicatie nog vertragen; de beheerstatus maakt dit zichtbaar. Na publicatie is Hostingverversing een afzonderlijk serverproces; workflow-succes alleen telt niet als bewijs.


## Echte stagingproeven — bevestigd

- Kandidaat `0a38d11`, gevolgd door `e6d483e`, is uitsluitend naar staging gepubliceerd. De echte GitHub-regressietaak en de staging-Hostinguitrol slagen.
- De gekoppelde Clock Worker accepteert vaste workflowrequests. De eerste runtime-aanroep had een compatibiliteitsfout; na de correctie naar een veilige handmatige redirectafhandeling zijn echte dispatches bevestigd. Sleutels worden niet gevolgd naar een andere host.
- Verhaal `entry-0bc35cca0b1a47dc9769c9f97b1d9387` is door de echte server gepubliceerd: dezelfde test-ID, publicatierecord, samenvatting en privéreceipt `published`. Workflow `42407609983` startte vanuit de Cloudflare-klok op 19:43:42 UTC. HTTP-controle op Hosting bevestigt eigen initiële HTML, titel, canonieke route, hoofdstuk en foto; staging houdt noindex.
- Nieuwe toekomstproef voor Field Note `entry-2dac3ee70625488c85a1ba4537ceb18f`: gepland 19:50:37.270 UTC, feitelijk gepubliceerd 19:52:14.081 UTC (97 seconden later). De admin was verlaten vóór verwerking. Workflow `42408238475` werd op 19:51:40 UTC gestart. Publicatie, samenvatting, privélog en initiële Hosting-HTML zijn afzonderlijk bevestigd. Dit is een gemeten proef, geen algemene leveringsgarantie.
- Ingelogde echte staging-admin toont privéconcepten, geplande en gepubliceerde versies apart, plus de werkelijke servercontrole en datum van de openbare reservekopie.
- Via normale admin: gedeelde land/datumupdate opgeslagen; openbare Journey toont de apart gelabelde gedeelde datum; dezelfde update daarna verwijderd zonder verlies van bezoeken. Eén automatisch bezoek verwijderd; actuele plaats wordt daarbij verborgen. De exacte oorspronkelijke staginglocatie is vervolgens hersteld via een bewaakte herstelactie. Productielocatie en oorspronkelijke reisgegevens zijn niet veranderd.
- Remote regels van de bestaande benoemde database `dainyel-content` zijn na eigenaarsakkoord teruggelezen en exact gelijk aan de lokaal geteste bron (regelrelease 19:42:00 UTC). Het deployment-resultaat alleen is niet als bewijs gebruikt.
- Productiereadback vóór activering: oorspronkelijke verhaalplanning `published`, goedgekeurde revisie 2, oorspronkelijke datum 7 november 17:00 UTC; mailjob nog `queued`, 8 november 10:00 UTC, dezelfde entry en revisie, nog geen bevestigde providerreferentie. Geen mailactie in deze controles.

## Provider- en kostenbeperkingen

Native Brevo-planning en onzekere acties zijn met een geïsoleerde providerstub getest. De echte gekoppelde mail moet na productieactivering apart worden teruggelezen: voorlopig wordt niet beweerd dat hij bij Brevo ingepland of ontvangen is. Bestaande dynamische segmentselectie blijft identiek; volgens Brevo omvat die nieuwe passende contacten vóór de eerste verzendbatch en sluit geblokkeerde contacten uit. Zie https://help.brevo.com/hc/en-us/articles/4413566705298-Create-and-send-an-email-campaign en https://help.brevo.com/hc/en-us/articles/360021703959-About-segments .

Er is geen betaald abonnement geactiveerd. Het bestaande Firebase-project heeft facturering uit. Nieuwe Cloudflare-resources zijn een kleine Worker en één D1-tabel voor technische klokstatus. De voorgestelde productieklok blijft onder de gratis Cloudflare-grenzen; alle diensten kunnen nog een eigen storing of quotum hebben. De actuele database blijft een noodzakelijke voorwaarde voor publiceren; al goedgekeurde openbare pagina's hebben daarnaast hun Hostingkopie.


De twee door deze reparatie aangemaakte proefartikelen en hun synthetische foto's zijn na bewijsverzameling exact uit staging verwijderd. Hun technische ontvangsten blijven privé voor de audit. Er is geen productieproefartikel aangemaakt. De openbare testkopie wordt daarna door dezelfde wijzigingsdetectie bijgewerkt. Een aanvullende metadata-test voorkomt dat de algemene `/entry`-WebPage JSON-LD achterblijft naast de nieuwe eigen artikel-URL.
