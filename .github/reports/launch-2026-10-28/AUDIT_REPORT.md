# Lancering 28 oktober — auditrapport

Status: **in uitvoering**. Dit rapport is geen verklaring dat alles getest is.

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
| Bestaande pagina's |683 bronafgeleide tekst/link/fotovelden over16 paginaonderdelen, sectiepreview/publicatie/herstel | `websiteSpaces/{space}` | Layout/navigatie, ruwe video's en statische SEO/socialmetadata zijn niet volledig via deze laag beheerbaar |
| Kalender/Overzicht | Maandrooster, platformiconen, handmatige checklist, opgeslagen revisies en onafhankelijke back-upstatus | Stagingkalender apart; live oorspronkelijke kalender | Geen socialmediapublicatie-API; handmatige checkmark is geen bevestigde platformplanning |
| Q&A/community | Inzenden, pending moderatie, antwoorden, gesprekken en reacties | Bestaande gedeelde collecties | Ook staging gebruikt deze gedeelde gegevens; geen echte inzending/mutatie tijdens test |
| Reisstatus/locatie | Geplande/werkelijke vertrekstatus, breed handmatig gedeeld city/country, bestaande atlas | Statisch publiek tripbestand plus gedeelde `siteStatus/current` | Geen automatische vertrekbevestiging, GPS-publicatie of onthulling; gedeelde wijzigingen uitsluiten |
| Contact | Consent, browsercontrole, privé-inbox, transactie met gedeelde20/dag en20s-poort | `contactSpaces/{space}` | Staging schrijft alleen testinbox; forwarding blijft uit |
| Postcards | Brevo-formulier, eigen redacteur/preview, afzonderlijke reviewed Send/Schedule, vertraagd openbaar archief | Bestaande provider plus owner-only jobs en GitHub-workers | Staging verzending uit; geen echte abonnees, campagne of bevestigingsmail gebruiken |
| Back-ups | Bronkopie en privéinhoud naar bestaande OneDrive, per-save versies, import/export | Bestaande Actions/Firebase/OneDrive | Herstel testen met geïsoleerde kopieën; niets purgen |
| Optionele Node-server | `/api`-servicecode en geïsoleerde tests aanwezig | `journeyApi:false`; geen API Hostingrewrite | Niet actief; mocktests bewijzen geen werkende productieserver |

## Eerste bevindingen — nog te valideren/oplossen

| ID | Prioriteit | Locatie | Huidige situatie / probleem | Gewenste controle |
|---|---|---|---|---|
| ENV-01 | P1 | publishing-model.js, website-model.js, content-calendar.js; PR-previewworkflow | Alleen vaste staginghosts worden herkend; een Hosting-previewhost kan naar productienamespace vallen | Hostmatrix testen; onbekende host fail-closed en echte stagingpreview geïsoleerd |
| OPS-01 | P2 | README en oudere beheerdershandleidingen | Verouderde uitspraken over contact, nieuwsbrief, MFA en editoractivatie | Nieuwe Nederlandstalige actuele handleiding, oude pagina's ondubbelzinnig corrigeren |
| QA-01 | P2 | tools/Check-Journey.py | Bestaande linkcheck faalt op25 dynamische zoekroutes zonder de echte dialoog te testen | Werkelijke zoekflow en statisch contract controleren; echte kapotte fragmenten blijven detecteren |
| SEC-01 | P2 kandidaat | Firestore public-create + admin wachtrijen | Onafhankelijke broncontrole meldt onbeperkte inzendingen en onbegrensde ownerlisteners | Onafhankelijke validatie; bounded beheer met behoud van bereikbaarheid; gedeelde Rules niet stil wijzigen |

## Fase 2 — benchmarking en normen

Bronnen rechtstreeks bekeken op24oktober2026: [Salt in our Hair](https://www.saltinourhair.com/), [Along Dusty Roads](https://www.alongdustyroads.com/), [Polarsteps](https://www.polarsteps.com/), [WCAG2.2](https://www.w3.org/TR/WCAG22/), [Brevo afmeldvereisten](https://help.brevo.com/hc/en-us/articles/9741388688402-Do-I-need-to-add-an-unsubscribe-link-to-my-emails), [Firebase Enterprise prijs/quota](https://firebase.google.com/docs/firestore/enterprise/pricing).

Waargenomen patronen: een concrete openingsbelofte, direct naar bestemmingen/verhalen, duidelijke identiteit/auteur, herkenbare recente inhoud en afzonderlijke routes/plaatsen/verhalen. Polarsteps maakt de stapgewijze reisupdates zichtbaar. Dit zijn vergelijkingen van aanwezige structuur, geen onafhankelijke gebruikerstests of claim dat het ontwerp beter converteert. DainyelOnTheMove behoudt de eigen rustige reisjournalidentiteit; geen winkel, automatische GPSroute, fictieve statistiek of nieuw sociaal platform toevoegen.

Toepassing: controleer of de bestaande opening het doel uitlegt, of Stories/Field Notes één logisch geheel blijven, of Postcards snel bereikbaar is en of een beheerder dezelfde inhoud zonder code kan aanpassen. Behoud bewuste onthullingen in plaats van de automatische locatietracking van een ander product over te nemen.

## Fase 3–5

Volledige bevindingen, implementatie en regressie worden tijdens het werk aangevuld. Bewijs staat in TEST_RESULTS.md; beperkingen en acceptatie in LAUNCH_READINESS.md. Eerder gemeten PageSpeed-scores gelden als historische onderbouwing, niet als een nieuwe volledige test van deze auditversie.
