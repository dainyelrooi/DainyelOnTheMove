# Lanceergereedheid — 28 oktober 2026

Beoordeling op25oktober2026. **Oordeel: BLOCKED voor definitieve acceptatie; testwebsite bijgewerkt, productie niet gewijzigd.** De vijf audit-/implementatie-/hertestfasen zijn binnen de beschreven bevoegdheden uitgevoerd. Dit is geen verklaring dat ieder denkbaar pad foutloos is.

## Wat aantoonbaar gereed is

| Onderdeel | Status | Onderbouwing |
|---|---|---|
| Inventaris en herstel | PASS |Bron/architectuur/integraties/routes/admin geïnventariseerd; bronback-ups, private inhoudsback-ups en revisies behouden |
| Behoud identiteit/content | PASS binnen scope |Bestaand journalontwerp, eigen media, hoofdstukken, echte reisgegevens en geheime bestemming behouden; geen herbouw |
| Staging/live-grens | PASS frontend |Exact hostbeleid, zichtbare melding, gedeelde locatie/moderatie alleen-lezen in testbediening; bestaande Rules blijven autoriseren |
| Publieke paginaweergave | PASS gemeten matrix |22 routes telefoon/desktop plus8 kernroutes op3 andere formaten:68 controles, geen gemeten overflow/kapotte zichtbare images/ongelabelde zichtbare velden |
| Dagelijks contentbeheer | PASS met grenzen |Echte stagingconcepten/foto's/cover/banner/hoofdstukken/preview/publicatie/intrekken/download/import, bestaande pagina en kalender doorlopen |
| Contactinname | PASS staging |Validatie, echte privéontvangst en afhandelen; geen mail, openbare PII of nieuwsbriefinschrijving |
| Security-kerncontract | PASS begrensd |Onafhankelijke gedeeltelijke bronreview plus echte lokale Rules-auth/privé/publicatie-negatieven; geen P0 bevestigd |
| Regresstructuur | PASS |48 automatische proeven; schone CI, bron/private back-ups en staging Hosting geslaagd |
| Statische SEO | PASS gecontroleerde bron |Titels/canonical/OG/sitemap/cleanlinks; staging bewust noindex |
| Documentatie | PASS |AUDIT_REPORT, IMPLEMENTATION_LOG, TEST_RESULTS, Nederlandse ADMIN_GUIDE en dit oordeel aanwezig, buiten Hosting |
| Geen onbedoelde productiewijziging | PASS bij readback |Main b338841; actieve named Rules matchen baseline; mailcapability live behouden, staging uit, geen productie-mailjobs of providerwijziging |

## Blokkades en beslispunten vóór een definitieve groene lancering

| ID / prioriteit | Status | Concreet resterende stap |
|---|---|---|
| CMS-01 / P1 | BLOCKED |Geteste twaalf-fotopublicatiefix in firestore.rules moet nog naar de gedeelde named database. Staging en live gebruiken dezelfde Rules. Deze masteropdracht verbiedt productieaanpassingen; daarom niet geactiveerd. Na apart goedgekeurde gecoördineerde release: exacte Rules-readback en echte12-foto-publicatie/intrekproef. |
| MAIL-01 / P1 voor volledige emailacceptatie | BLOCKED |Opt-in, werkelijk inboxbericht en afmelden met een afzonderlijk goedgekeurde gecontroleerde mailbox uitvoeren. Geen toestemming voor echte testmail/abonneegebruik in deze opdracht; template/emulator/mockbewijs vervangt bezorging niet. |
| SEC-01 / P2 | NEEDS REVIEW |Vertrouwde quota/abusecontrole voor publieke vragen/community/legacyregistraties kiezen en beoordelen. Paginering beperkt beheerbelasting, voorkomt geen onbeperkte geldige inzendingen in opslag. Geen flood uitgevoerd. |
| SEO-01 / P2 | NEEDS REVIEW |Als elk nieuw dynamisch artikel direct een eigen gegarandeerde WhatsApp/socialkaart en crawlermetadata moet hebben: afzonderlijke gratis statische publicatiestap ontwerpen/beoordelen. Huidige browserpagina werkt; volledige socialcrawlerpariteit niet bewezen. |
| PRIV-01 / P2 | NEEDS REVIEW |Eigenaar bevestigt feitelijke bewaartermijnen, privacy/providerafspraken en mailinstellingen. Technische audit is geen juridisch keurmerk. |
| EXT-01 / P2 | BLOCKED |9 officiële externe bronlinks kregen timeout/403/418 bij HEAD; bereikbaarheid voor echte bezoekers blijft onbeslist. Geen bekende404 gemaskeerd. |
| Fysieke devices / P2 | BLOCKED door ontbrekende omgeving |Echte iPhone/Safari, Android, screenreader en tweede apparaat/account testen waar beschikbaar. Browserformaten zijn geen fysieke apparaatgoedkeuring. |
| Capaciteit/performance / P2 | NEEDS REVIEW |Gratis quota blijven eindig. Geen productiebelastingproef/INP-velddata. Home PSI99/100 snelheid is positief, geen bewijs dat alle routes/categorieën99 of duizenden gelijktijdige bezoekers gegarandeerd zijn. |

De dagelijkse beheergrenzen zijn expliciet: geen ruwe video-transcoding, algemene navigatie-/bestemmingenbouwer of ingeplande websitepublicatie; wel handmatige publicatie, bestaande pagina's/foto's, kalenderchecklist en afzonderlijke live Brevo-mailplanning. Er is geen betaalde dienst bijgeplaatst om deze grenzen te verbergen.

## Datum en bekendmaking

Gepland vertrek:28oktober2026 om00:00 Europe/Amsterdam, na de wintertijdwissel. Tests controleren vóór/op/na die grens en DST. Een afgelopen countdown wordt 'wacht op bevestigde vertrekupdate', geen verzonnen werkelijk vertrek. De eerste bestemming blijft geheim tot een bewuste onthulling. De bestaande Buy me a coffee-vrijgave blijft op28oktober. Geen toekomstige check-in, kosten of fictieve reizigersactiviteit toegevoegd.

Op28oktober vóór delen: controleer de actuele vertrek-/onthullingsinformatie en de gekozen openbare supportlink, voer na goedgekeurde release de nog geblokkeerde checks uit en beoordeel resterende P2-beperkingen. Definitieve productiepublicatie, gedeelde Rules-activatie en echte mail zijn **niet** door deze staging-masteraudit uitgevoerd.

## Herstel en oplevering

Functierelease99916b2 op staging: Hosting40172030788; regressie40172030779; bronbackup40172030785; private content/preflight40172030774, alle geslaagd. Eerste CI-padfout is aantoonbaar hersteld. Tijdelijk openbaar testverhaal ingetrokken, home terug naar origineel, kalenderstatus teruggezet; private auditkopieën/historie en afgehandeld testcontact blijven voor herstel. Geen permanente purge.

Oplevering: testsite en de vijf rapporten zijn reviewbaar. Een groene releaseverklaring blijft afhankelijk van CMS-01 en vereiste essentiële integratietests. Geen '100% foutloos', volledige WCAG-conformiteit of volledige beveiligingsgarantie geclaimd.


## Aanvulling25oktober2026—goedgekeurde productie-release

PASS voor de eigenaar-goedgekeurde kalender/foto/verwijder/planning-release op productie (Hosting40216468820). De eerdere twaalf-foto-regelfix is nu actief en hertest. Dit is geen universele lanceer- of99+PageSpeed-goedkeuring. Een echte e-mailafleverproef en fysieke apparaten blijven niet getest; de eigenaar verbood mail in deze release. De publieke inzendlimiet blijft apart/onactief. Zie het actuele releaserapport voor afbakening.
