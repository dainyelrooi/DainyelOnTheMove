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

Lokale controle: 218 Node-tests, 114 Python-tests, publieke structuur/route-validator en trip-validator slagen. De wegwerp-Firestore-emulator slaagt voor alle 15 beveiligingstests, waaronder volledige staging-transactie, land zonder stad, herhaling, V1-migratie, behoud/herbezoek, verborgen huidige locatie en afwijzing van onbevoegde writes, ongeldige landen/jaren, private extra velden, oude revisies, verwijderen en overschrijven vanuit oude clients. Geen cloudrecords zijn daarvoor geschreven.

Dit is een gerichte uitbreiding van bestaande regels, met syntactische en adversariële emulatorvalidatie; geen garantie dat alle denkbare beveiligingsproblemen zijn uitgesloten. Firebase-richtlijnen: [transacties](https://firebase.google.com/docs/firestore/manage-data/transactions) en [veldvalidatie](https://firebase.google.com/docs/firestore/security/rules-fields). Licentie landnamen: `assets/vendor/UNICODE-LICENSE.txt`.

STAGING UI / CLOUD SAVE: nog te controleren. REMOTE RULES: nog niet geactiveerd. PRODUCTIE: niet gewijzigd. Native opslaan kan pas worden bewezen na expliciet akkoord voor de beperkte gedeelde Rules-uitbreiding en, indien nodig, eigenaar-login op de testsite. Geen mail, providerplanning, campagnes, GPS-reveal, betaalde dienst of advertentieactivering.

Volgens AGENTS.md: “Do not deploy Firestore/Auth configuration remotely without user authorisation for that release.” Productiepublicatie vereist eveneens apart akkoord voor deze release.
