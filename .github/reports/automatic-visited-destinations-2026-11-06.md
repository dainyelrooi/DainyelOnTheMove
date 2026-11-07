# Gedeelde locatie werkt de bezochte bestemmingen bij

## Omvang en bediening

In Admin → Location kiest de eigenaar een land; een stad is optioneel. **Share location & update atlas** bewaart de gedeelde locatie en het bezoekjaar in één transactie. De openbare atlas, de kleine homepagekaart en de zichtbare bestemmingentellers gebruiken dezelfde samengevoegde lijst.

Een nieuw gedeeld land voegt één bestemming toe. Een volgende stad in hetzelfde land telt niet dubbel; een later jaar blijft bewaard als herhaalbezoek. De bestaande zeventien bestemmingen, verhalen, jaartallen en foto's blijven behouden. De bestaande groepering van Bali/Indonesië en Schotland/Verenigd Koninkrijk voorkomt dubbeltellingen. Het jaar betekent “gedeeld in”; het is geen berekende aankomstdatum. Engelse en Nederlandse landnamen, diakritische varianten en landcodes worden herkend met een lokale Unicode CLDR-lijst. Er zijn geen locatie-API, abonnement of betaalde dependency toegevoegd.

**Clear location** verbergt alleen de huidige locatie. De al gedeelde landen/jaartallen blijven openbaar in het archief. Er wordt geen stadshistorie, GPS of ongepubliceerde reisroute opgeslagen. Een nieuwe bestemming krijgt niet automatisch een verzonnen verhaal, foto of exacte kaartpositie. Kleine gebieden zonder bestaande kaartvorm blijven via de bestemmingenlijst bereikbaar.

## Opslag en beveiligingsgrens

- Productie: bestaand `siteStatus/current`; testsite: apart `siteStatus/staging`. Andere oudere gedeelde admincollecties blijven op test alleen-lezen.
- V2 heeft uitsluitend version, revision, city, country, countryCode, updatedAt en visits (landcode → unieke jaartallen).
- De bestaande geverifieerde eigenaar én tweede factor blijven verplicht. De transactie bewaart locatie en bezoek samen, met oplopende revisie en servertijd. Regels laten uitsluitend het huidige serverjaar toevoegen; oudere landvermeldingen en jaartallen mogen niet verdwijnen of worden herschreven.
- De eerste V2-save migreert het bestaande locatieformulier. Oudere productieclients blijven vóór migratie compatibel; na migratie kunnen ze de lijst niet overschrijven of verwijderen. Onbekende toekomstige schema's stoppen met een begrijpelijke fout, zonder input te wissen.
- De publieke locatie gebruikt dezelfde bestaande singleton-listener. Alleen door de server bevestigde snapshots worden zichtbaar; er komt geen extra publieke Firestore-listener bij.
- De bestaande zesuurlijkse openbare export krijgt één geprojecteerde documentlezing erbij. `data/public-content/visits.json` bevat alleen landcodes, jaartallen, namespace en revisie. Stad en actuele locatie worden niet aangevraagd of geëxporteerd. Het bestand wordt uitsluitend tijdelijk gehost en blijft uit Git. Hosting behoudt de laatste gevalideerde kopie; een ongeldige kopie kan een goede niet overschrijven. Geen nieuwe workflowfrequentie of externe opslagdienst.
- Bij Firestore-uitval kunnen eerder geëxporteerde bezoeken worden gelezen. Een bezoek dat nog niet in de reservekopie zit, is tijdens zo'n uitval nog niet gegarandeerd zichtbaar. Opslaan vereist beschikbare opslag. Zonder JavaScript blijft de bestaande statische zeventien-bestemmingenfallback staan.

## Bewijs en grenzen

Lokale controle: 219 Node-tests, 115 Python-tests, publieke structuur/route-validator en trip-validator slagen. De wegwerp-Firestore-emulator slaagt voor alle 15 beveiligingstests, waaronder volledige staging-transactie, land zonder stad, herhaling, V1-migratie, behoud/herbezoek, verborgen huidige locatie en afwijzing van onbevoegde writes, ongeldige landen/jaren, private extra velden, oude revisies, verwijderen en overschrijven vanuit oude clients. Geen cloudrecords zijn daarvoor geschreven.

Dit is een gerichte uitbreiding van bestaande regels, met syntactische en adversariële emulatorvalidatie; geen garantie dat alle denkbare beveiligingsproblemen zijn uitgesloten. Firebase-richtlijnen: [transacties](https://firebase.google.com/docs/firestore/manage-data/transactions) en [veldvalidatie](https://firebase.google.com/docs/firestore/security/rules-fields). Licentie landnamen: `assets/vendor/UNICODE-LICENSE.txt`.

STAGING UI / CLOUD SAVE: PASS. De eigenaar gaf apart akkoord voor de opslagregels en rondde de bestaande Google/TOTP-aanmelding op de testsite af. Native opgeslagen: Peru zonder stad; na reload teruggelezen; opnieuw opgeslagen als PE zonder dubbeltelling; huidige testlocatie verborgen met behoud van alle 17 bestaande bestemmingen; daarna Peru hersteld. Het bevestigingsvenster voor verbergen moest de eigenaar zelf afronden omdat de browserbediening daarin vastliep. Tijdens deze controle bleek de verbergknop na succes geblokkeerd te blijven: de knop wordt nu in finally hersteld, met een regressietest voor succes en fout.

REMOTE RULES: PASS. Eigenaar-goedgekeurde beperkte uitbreiding gecompileerd en geactiveerd voor de bestaande database. Connectorjob 1794008443294 meldde succes; de officiële CLI bevestigde compilatie en Rules-release. De echte staging-save bewijst de betreffende cloudtoegang. Geen Hosting- of Auth-deployment via die stap.

OPENBARE RESERVEKOPIE: PASS op staging. Workflow 42314508907 exporteerde werkelijk de geïsoleerde V2-opslag; de openbare kopie werd teruggelezen als namespace staging, revisie 3, uitsluitend PE → bezoekjaar. Deze revisie tijdens verborgen huidige locatie bewijst dat actuele locatievelden niet nodig zijn voor de bezochte lijst. De broncode en datamodel blijven per omgeving gescheiden.

PRODUCTIEWEBSITE: niet gewijzigd, main bleef 3930f52. De gedeelde Rules-configuratie is wel gewijzigd met afzonderlijk akkoord; oude productieclients blijven vóór migratie compatibel. Geen mail, providerplanning, campagnes, GPS-reveal, betaalde dienst of advertentieactivering.

Volgens AGENTS.md: “Do not deploy Firestore/Auth configuration remotely without user authorisation for that release.” Productiepublicatie vereist eveneens apart akkoord voor deze release.


Skill-verplichte kwalificatie van nieuw geschreven regels: "I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for owner-only atomic current-country/year updates with strict schema and append-only history validation. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules." De daadwerkelijke emulator- en eigenaarstests hierboven zijn uitgevoerd; dit is geen claim van volledige beveiligingsdekking.


## Definitieve staging-acceptatie

- Kandidaat133d9b2: Hosting42314894642, regressie42314894595 en OneDrive-bronbackup42314894583 geslaagd. De regressie omvat219Node/115Python-tests en15wegwerp-Rules-tests.
- Na de laatste reload: huidige testlocatie Peru;17bestemmingen; verbergknop opnieuw bruikbaar. De kleine homepagekaart bevat17bestemmingen plus de lege keuze, alle drie de zichtbare tellers tonen17. Groot atlaspaneel bevat17bezochte bestemmingen én de afzonderlijke revealed-groep. Geen horizontale overloop in de geobserveerde browservensters; geen claim van alle apparaten.
- Bewijs buiten Hosting: ../audit-evidence/automatic-visited-destinations-staging-2026-11-06.png. De rapport-URL op staging geeft404. Productie-js/admin-live.js bevat de nieuwe opslagfunctie nog niet, staging wel; remote main is nog3930f52.
- Geen production Hosting-release voor deze nieuwe functie zonder apart eigenaarakkoord. De eerder goedgekeurde Rules-uitbreiding is al actief en hoeft niet nogmaals te worden goedgekeurd.


## Goedgekeurde productiepublicatie

De eigenaar gaf op6november2026 expliciet akkoord: “ja ga maar live”. Dit keurt uitsluitend deze geteste uitbreiding goed. Herstelkopie vooraf: website_2026-11-06_19-00-35. Hostingpublicatie en controle worden nu uitgevoerd; geen mail, campagneactie, betaalde dienst of nieuwe locatie-onthulling. De eerdere productie-niet-gewijzigdregels hierboven beschrijven de stagingfase.


## Productieresultaat — 6 november 2026

PASS: goedgekeurde release304eaeb is live. Productie-Hosting42315653285 en CodeQL42315653223 zijn geslaagd. De functionele wijzigingen zijn gelijk aan staging-kandidaat133d9b2; latere wijzigingen tot304eaeb bevatten uitsluitend de goedkeuring en het bewijsverslag.

- Alle zes gecontroleerde livebestanden (admin, locatiefeed, bezoekmodel, bezoekdata, atlas en kleine homepagekaart) komen bytegewijs overeen met de geteste bron, na normaliseren van regeleinden.
- De live-admin levert het nieuwe land/stad-formulier en behoudt noindex/nofollow/noarchive. De geheime rapportmap geeft daadwerkelijk404. Geen nieuwe live admin-write of actuele-locatiemigratie uitgevoerd voor de publicatie; de complete schrijf/herlaad/herhaal/verberg/herstelstroom was al op de geïsoleerde testsite bewezen. De toekomstige locatie-save via de normale beveiligde owner-admin is het startpunt van V2.
- De echte homepage toont alle drie de tellers als17. De kleine kaart is geladen met17bestemmingen plus de lege keuze. Peru is via het echte keuzemenu geselecteerd en wordt op de kaart en in het detail zichtbaar. De publieke locatietekst blijft Peru, gedeeld6november2026. Geen horizontale overloop in het geobserveerde venster.
- De onafhankelijke publieke bezoekenreserve is op productie aanwezig als namespace production met uitsluitend revision, space, version en visits. Stagingbezoeken zijn niet gekopieerd naar productie. Nieuwe gedeelde bezoeken komen met de bestaande zesuurlijkse export in de reserve; de realtimeweergave gebruikt de bestaande locatiefeed.
- Bewijs buiten Hosting: ../audit-evidence/automatic-visited-destinations-live-2026-11-06.png.
- Geen release-/testmail, campagneactie, providerplanning, nieuwe betaalde dienst, advertentieactivering of nieuwe locatieonthulling.
