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
