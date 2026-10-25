# Lancering 28 oktober — auditrapport

Status: **vijf fasen uitgevoerd binnen de hieronder beschreven testgrenzen; geen productiegoedkeuring**. Rapportdatum: 25 oktober 2026. Eén functionele P1-oplossing wacht op een expliciet goedgekeurde wijziging van gedeelde beveiligingsregels.

## Opdracht en grenzen

Alle vijf fasen zijn vooraf door de eigenaar toegestaan. Implementatie en schrijfproeven blijven op de testomgeving. Geen push naar main, productie-deployment, gedeelde reisstatuswijziging, echte abonnee/testmail, betaalde dienst, nieuwe providerrechten of permanente verwijdering. Bestaande inhoud, branding, Google/TOTP, App Check en geheimgehouden reisroute blijven behouden.

Bron: `audit/launch-readiness-2026-10-28`, startcommit `b338841`. Herstelpunt: sibling `backups/website_2026-10-24_23-12-50`. Reeds aanwezige, niet bij deze opdracht behorende wijzigingen in AGENTS.md en het quiet-growth-rapport blijven buiten de commits.

## Fase 1 — vastgestelde inventaris

De huidige Git-bron bevat712 bestanden:64 JavaScript-,26 CSS-,86 HTML-,23 Pythonbestanden,13 workflows en bestaande Node/Python-tests.30 HTML-documenten staan aan de root;22 publieke routes staan in de sitemap.55 templates genereren de pagina's met Python-standaardbibliotheek; geen bezoekersframework of verplichte serverbuild.

De parser vond43 formulierinstanties en342 bedieningselementen over de rootdocumenten, inclusief herhaalde navigatiezoekvelden en verborgen homepagepanelen. Dit zijn geen43 verschillende diensten. Geen ontbrekende lokale src/href/mediareferenties of dubbele IDs gevonden.25 `#search`-verwijzingen zijn dynamische dialoogroutes en vereisen browsercontrole; een ontbrekend statisch ID is hier nog geen bewezen kapotte link.51 verschillende externe URLpaden zijn geïnventariseerd; bereikbaarheid wordt apart gecontroleerd.

| Onderdeel | Wat daadwerkelijk bestaat | Opslag/runtime | Testgrens |
|---|---|---|---|
| Publieke routes | Home, Stories/Field Notes, Films, Atlas, About, My kit, Q&A, Contact, Postcards, kosten, Journey, privacy/cookies, echte verhalen/notities | Static Firebase Hosting, HTML/CSS/vanilla JS | Leescontroles live toegestaan; wijzigingen alleen staging |
| Navigatie/media | Gewone paginalinks, hashpanelen, zoekdialoog, maandkalender, native foto-/filmdialogen, handmatige hoofdstukgalerijen en automatische kaartenring | Browser | Toetsenbord, touchformaat, geschiedenis, focus en echte videodecodering controleren |
| Inloggen | Eigenaar via Google/wachtwoord plus Firebase-ondertekende TOTPclaim | Gedeelde Auth en App Check | Eigenaar voert credentials privé in; geen enrollment/recoverywijziging |
| Nieuwe artikelen | Blog, Field Note, feit, privéconcept,12 foto's, cover/banner/plaatsing, hoofdstukken, benaderde leestijd, publicatie/intrekken, herstel | `cmsSpaces/{staging,production}` in Enterprise Native `dainyel-content` | Staging is geïsoleerd; geen ruwe video-upload of automatische websitepublicatiedatum |
| Bestaande pagina's |683 bronafgeleide tekst/link/fotovelden over16 paginagroepen, sectiepreview/publicatie/herstel | `websiteSpaces/{space}` | Layout/navigatie, ruwe video's en statische SEO/socialmetadata zijn niet volledig via deze laag beheerbaar |
| Kalender/Overzicht | Maandrooster, platformiconen, handmatige checklist, opgeslagen revisies en onafhankelijke back-upstatus | Stagingkalender apart; live oorspronkelijke kalender | Geen socialmediapublicatie-API; handmatige checkmark is geen bevestigde platformplanning |
| Q&A/community | Inzenden, pending moderatie, antwoorden, gesprekken en reacties | Bestaande gedeelde collecties | Ook staging gebruikt deze gedeelde gegevens; geen echte inzending/mutatie tijdens test |
| Reisstatus/locatie | Geplande/werkelijke vertrekstatus, breed handmatig gedeeld city/country, bestaande atlas | Statisch publiek tripbestand plus gedeelde `siteStatus/current` | Geen automatische vertrekbevestiging, GPS-publicatie of onthulling; gedeelde wijzigingen uitsluiten |
| Contact | Consent, browsercontrole, privé-inbox, transactie met gedeelde20/dag en20s-poort | `contactSpaces/{space}` | Staging schrijft alleen testinbox; forwarding blijft uit |
| Postcards | Brevo-formulier, eigen redacteur/preview, afzonderlijke reviewed Send/Schedule, vertraagd openbaar archief | Bestaande provider plus owner-only jobs en GitHub-workers | Staging verzending uit; geen echte abonnees, campagne of bevestigingsmail gebruiken |
| Back-ups | Bronkopie en privéinhoud naar bestaande OneDrive, per-save versies, import/export | Bestaande Actions/Firebase/OneDrive | Herstel testen met geïsoleerde kopieën; niets purgen |
| Optionele Node-server | `/api`-servicecode en geïsoleerde tests aanwezig | `journeyApi:false`; geen API Hostingrewrite | Niet actief; mocktests bewijzen geen werkende productieserver |

## Bevindingen en afhandeling

| ID | Prioriteit | Locatie | Huidige situatie / probleem | Gewenste controle |
|---|---|---|---|---|
| ENV-01 | P1, opgelost op staging | site-environment.js, publishing/website-model, calendar, admin-live | Hosting-PR-preview kon productienamespace kiezen. Eén exacte hostlijst herkent vaste/preview-testhosts; onbekende host kiest unsupported. Test-admin toont omgeving en blokkeert de gedeelde locatie-/moderatiebediening. | PASS: hostmatrix, live/stage/lookalikes/preview, werkelijke banner en disabled locatievelden. Geen nieuw recht toegekend; Rules blijven de autorisatiegrens. |
| CMS-01 | P1, kandidaat opgelost; activatie BLOCKED | firestore.rules: validCmsPublished | Maximaal12 toegestane foto's met hoofdstukplaatsingen/banner overschrijden bij publicatie de1000-expressielimiet. Twee foto's werkten wel, waardoor dit in een kleine proef onzichtbaar bleef. | Lokale FAIL gereproduceerd; exacte MapDiff-contentvergelijking geeft PASS op12 foto's. Acht echte emulatorproeven en CI slagen. **Niet gedeployed:** dezelfde named database/Rules bedienen staging én productie. |
| SEC-01 | P2, deels gemitigeerd; open | firestore.rules:64–70 en community/legacy-create; admin-live | Geldige bezoekersinzendingen hebben geen vertrouwde afzenderquota; oude beheerlisteners laadden alles. App Check, tekstlimieten en pending status begrenzen geen aantal inzendingen. | Beheer nu50 per pagina, oudere batches bereikbaar, dubbele parent-reads hergebruikt. SDK-stubtest en123-records-emulatorproef PASS. Vertrouwde abuse/quota-oplossing blijft NEEDS REVIEW; geen floodtest uitgevoerd. |
| A11Y-01 | P2, opgelost op staging | publishing-reader.js: show | Na foto2 openen → Previous → Escape verwees terugfocus naar de inmiddels verborgen knop van foto2. | PASS: echte staging-preview geeft focus aan de zichtbare foto1-knop; preview blijft open. |
| A11Y-02 | P2, opgelost op staging | global-search.js | Native zoekveld kon Escape eerst consumeren om alleen de zoektekst te wissen. | PASS: met ingevulde zoekterm sluit één Escape de dialoog en herstelt focus op navigatiezoeklink. |
| OPS-01 | P2, opgelost voor actuele ingang | README en ADMIN_GUIDE.md | README beweerde nog dat contact alleen kopieert, email niet bestaat en antwoorden/slideshows standaard open/pauzebaar zijn. | Actuele beschrijvingen en Nederlandse handleiding toegevoegd; oudere faseverslagen blijven herkenbaar historisch. |
| QA-01 | P2, opgelost | Check-Journey.py |25 bestaande dynamische #search-links golden ten onrechte als ontbrekend fragment. | PASS: alleen de daadwerkelijk aanwezige zoekdialoog krijgt een uitzondering; overige link-/ID-controles blijven actief. Zoekflow echt getest. |
| QA-02 | P3, opgelost | Preview-Site.py | Lokale / vertaalde naar een map terwijl de allowlist alleen bestanden toeliet:404. | PASS: / en clean routes werken; private/.github/padvarianten blijven404 in unitproef. |
| SEO-01 | P2, bestaand; NEEDS REVIEW | entry.html, publishing-public.js, website-public.js | Nieuwe dynamische artikelen krijgen titel/tekst/canonical pas in de browser; niet-JS social crawlers kunnen een generieke kaart zien. Bestaande-pagina-editor vervangt evenmin alle statische SEO/OG-bronmetadata. | Browsermetadata/publicatie PASS, volledige crawlerpariteit niet bewezen. Voor eigen socialkaart/SEO per nieuw artikel is een afzonderlijk beoordeelde statische publicatie-/renderstap nodig; geen verborgen nieuwe backend aangezet. |
| CMS-02 | P2, bekende beheergrenzen | Write/Website/Location, data/trip.json | Geen ingeplande websitepublicatie, ruwe video-transcoding, algemene bestemmings-/navigatiebouwer of vertrekbevestiging via deze editor. | Dagelijks tekst/foto/concept/publicatie/intrekken/herstel werkt; grenzen in handleiding. Niet verwarren met wel bestaande Brevo-mailplanning of brede locatiecheck-in. |
| PERF-01 | P2, meetgrens/restwerk | Beveiligde SDK/reCAPTCHA, alle routes | Lokale mobiele Lighthouse-runs laten veel main-threadtijd en403-netwerkfouten zien; twee melden een trager dan verwachte host-CPU. Dat mag niet worden weggepoetst. | Vier verse lokale runs bewaard; officiële staging-home99 mobiel/100 desktop P,100 A,96 BP. Geen garantie voor alle routes99; geen App Check-verzwakking, auditdetectie of kunstmatige wachttimer. |
| EXT-01 | P2, BLOCKED voor bereikbaarheid |9 van51 externe bronpaden | HEAD kreeg403/418 of verbindingstimeout bij enkele officiële buitenlandse bronnen. Dat bewijst geen kapotte link en ook geen bereikbaarheid voor iedere bezoeker. |42 HEAD200.9 blijven expliciet onbeslist; inhoud/bronnen niet vervangen door een onbewezen alternatief. |
| MAIL-01 | P1 voor volledige email-acceptatie, BLOCKED | Brevo signup/delivery/unsubscribe | Geen gecontroleerde mailbox of echte verzending in deze opdracht toegestaan. | Redacteur/preview, staging-sendblokkade, providerlogica en mock-negatieven gecontroleerd. Werkelijke opt-in/inbox/afmelding niet opnieuw end-to-end getest. |
| PRIV-01 | P2, NEEDS REVIEW | privacy/cookies/providerinstellingen | Technische consent/privéopslag is controleerbaar; bewaartermijnen, verwerkingsafspraken en feitelijke providerinstellingen vragen eigenaarbevestiging. | Geen juridische certificering. Externe spelers blijven een bewuste laadactie; contact schrijft niet in voor Postcards. |

## Fase 2 — benchmarking en normen

Bronnen rechtstreeks bekeken op24oktober2026: [Salt in our Hair](https://www.saltinourhair.com/), [Along Dusty Roads](https://www.alongdustyroads.com/), [Polarsteps](https://www.polarsteps.com/), [WCAG2.2](https://www.w3.org/TR/WCAG22/), [Brevo afmeldvereisten](https://help.brevo.com/hc/en-us/articles/9741388688402-Do-I-need-to-add-an-unsubscribe-link-to-my-emails), [Firebase Enterprise prijs/quota](https://firebase.google.com/docs/firestore/enterprise/pricing).

Waargenomen patronen: een concrete openingsbelofte, direct naar bestemmingen/verhalen, duidelijke identiteit/auteur, herkenbare recente inhoud en afzonderlijke routes/plaatsen/verhalen. Polarsteps maakt de stapgewijze reisupdates zichtbaar. Dit zijn vergelijkingen van aanwezige structuur, geen onafhankelijke gebruikerstests of claim dat het ontwerp beter converteert. DainyelOnTheMove behoudt de eigen rustige reisjournalidentiteit; geen winkel, automatische GPSroute, fictieve statistiek of nieuw sociaal platform toevoegen.

Toepassing: controleer of de bestaande opening het doel uitlegt, of Stories/Field Notes één logisch geheel blijven, of Postcards snel bereikbaar is en of een beheerder dezelfde inhoud zonder code kan aanpassen. Behoud bewuste onthullingen in plaats van de automatische locatietracking van een ander product over te nemen.

## Fase 3 — onafhankelijke beveiliging en achterliggende functies

Codex Security-brononderzoek op baseline b338841: één onafhankelijk gevalideerd middelzwaar resource-uitputtingsrisico, geen andere bevestigde auth-bypass/privilege-escalatie/XSS/private-lek in de onderzochte runtimepaden. Scope: gedeeltelijke, gerichte bronreview; niet ieder gegenereerd document en ieder mediabestand is individueel beveiligingsgetest. Het gegenereerde rapport staat buiten de publieke repository in `C:/Users/dainy/.codex/state/plugins/codex-security/scans/website/b338841e09880d8bb70e7afe8ef80159bda33358_20261024T211311Z_7boszjco/report.md`. Scan-ID88e21056-1f93-4656-b392-726aa810db4c. Latere mitigaties zijn afzonderlijk getest, niet met terugwerkende kracht onderdeel van die scan.

De Rules-emulator controleert identiteit + geverifieerd emailattribuut + ondertekende tweede-factorclaim, public-filterqueries, pending-only inzendingen, verboden updates/deletes, privéconcepten, verplichte immutable historie, publicatie/summary-koppeling, media-intrekken, atomische contactpoort en verboden testmailjobs. Claims zijn lokale fixtures; dit is geen nieuwe echte Google/TOTP/App Check-aanmelding. De emulator draait Standard Edition; productie gebruikt Enterprise Native. Geen Enterprise-capaciteit/index-/factureringsgelijkheid geclaimd.

Publieke, gedeelde Q&A/locatiegegevens zijn niet gemuteerd. Eén herkenbaar bericht met een gereserveerd onbestelbaar testadres is werkelijk door de staging-contactpoort in de privétestinbox ontvangen en afgehandeld. Er is geen reply geopend of email verzonden. Nooit productieabonnees als proefgroep gebruikt.

## Fase 4 — implementatiekeuzes

Gerichte reparaties aan bestaande onderdelen; geen herbouw, nieuw bezoekersframework, betaalde service, extra providerrecht of gewijzigde branding. Geteste ontwikkelingstestdependencies zijn alleen onder de uitgesloten `.github/tests/rules/` vastgezet. Herstel door Gitbron/back-up, versiehistorie en intrekken van openbare kopieën. Exacte bestanden en stagingreleases staan in IMPLEMENTATION_LOG.md.

Geen nieuwe openbare inzendquota geïmproviseerd op basis van browserflags of onbetrouwbare user IDs: dat zou de gevonden abusegrens niet oplossen. Geen gedeelde Rules-deployment verstopt in de testrelease. De functionaliteitsfix voor twaalf foto's is daarom een geteste maar nog niet geactiveerde kandidaat.

## Fase 5 — regressie en oordeel

68 gerenderde controles na implementatie:22 routes telefoon390 en desktop1280, plus acht kernroutes op320, tablet768 en liggend844. Geen gemeten horizontale pagina-overflow, ontbrekende zichtbare afbeeldingen, ongelabelde zichtbare velden of verkeerde h1/main-aantallen in deze controles. Dit is geen fysieke iOS/Safari-/screenreadercertificering of bewijs voor iedere verborgen knop.

De echte eigenaarstesten doorliepen foto-upload, concept/reopen, banner/plaatsing, preview/hoofdstukken/leestijd, publiceren/intrekken, download/import en annuleren van onopgeslagen invoer; bestaande pagina privé opslaan/preview/publiceren/openbare weergave/origineel herstellen; kalenderstatus wijzigen/heropenen/terugzetten; mailpreview zonder actieve links of verzending; contactontvangst/afhandeling. Tijdelijke openbare testinhoud is teruggetrokken/hersteld, private versies blijven bewaard.

Zie TEST_RESULTS.md voor exact bewijs, grens en niet-geteste paden. **Geen definitieve groene lancering:** CMS-01 en ontbrekend werkelijk email-deliverybewijs verhinderen volledige acceptatie. Geen P0 bevestigd in de onderzochte scope; dit is geen claim dat de gehele website foutloos of uitputtend getest is.
