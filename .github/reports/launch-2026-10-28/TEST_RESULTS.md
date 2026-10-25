# Testresultaten — 25 oktober 2026

Baseline b338841; functionele stagingreleases bd0c8f7 → 7e07532 → 99916b2. Resultaten gelden uitsluitend voor beschreven versie/omgeving/handeling. Geen productie-deployment of echte mailtest. Documentatiecommits veranderen geen applicatielogica.

## Automatische controles

| Controle | Status | Bewijs en grens |
|---|---|---|
| Node | PASS |24 tests:7 journey/datum/DST,13 optionele server/mock/localhost en4 launch-host/paging/zoektests. De optionele /api-server is hiermee niet gedeployed of publiek getest. |
| Python | PASS |16 unittestproeven:15 bestaande worker/notificationfixtures en1 preview-routebeveiliging. Geen providerverzending. |
| Echte Rules-emulator | PASS voor kandidaat |8 tests, Firebase12.19.0/rules-unit-testing5.0.2, Java21/emulator1.22.0. Demo-project op127.0.0.1:8091, uitsluitend lokale fixtures. Standard-emulatie bewijst geen Enterprise Native index/capaciteitsgelijkheid. |
| Twaalf foto's vóór fix | FAIL, bevestigd |Concept opslaan werkt; publiceren loopt tegen1000 expressies. Geen productieproef uitgevoerd. |
| Twaalf foto's na fix | PASS lokaal/CI; cloud BLOCKED |MapDiff-kandidaat werkt met12 IDs/plaatsingen/aparte banner. Niet gedeployed naar de gedeelde live/testdatabase. |
| Syntax/compositie | PASS |Tracked JS/MJS en nieuwe modules met node --check; Composer opnieuw uitgevoerd zonder verdere gegenereerde diff.683 velden/16 paginagroepen behouden. |
| Structuur/trip | PASS |Check-Journey.py en Validate-PublicTrip.py: assets, links, IDs, metadata, sitemap, Hostingexclusies, publiek schema en geen gefingeerde vertrek-/reisgegevens. Zoekuitzondering is beperkt tot de echte dialoog. |
| Werkelijke Hostinggrenzen/redirect | PASS staging |HEAD op auditrapport, test-lockfile, AGENTS, firestore.rules en ontbrekende route geeft404. /atlas.html?place=belgium geeft301 naar /atlas?place=belgium; query blijft behouden. |
| CI40160247836 | FAIL, gerepareerd |Emulator weigerde Rules-pad buiten zijn projectmap. Sourcecopy binnen geïsoleerde testmap lost dit op; geen appfout. |
| CI40160561332 en40172030779 | PASS |Schone Linuxrunner: Node/Python/structuur plus8 Rules-tests; geen authenticatiesecrets. |

Rulesproeven: pending-only create/consent/schema/maxlengte, verboden publieke update/delete, published-filterquery, eigenaar/verified/TOTP-negatieven,123 records in50/50/23, verplichte immutable recovery, beperkte privéqueries, publicatie=concept, summary=publicatie, mediatoegang vervalt bij intrekken, atomische contactpoort/20s en geen publieke contactdata, stagingmailjobs/settings/outboxes denied. Mockclaims zijn geen nieuwe echte Google/TOTP/App Check-aanmelding. Geen floodtest of aanval op productie.

## Echte browser-/beheerhandelingen

| Stroom | Status | Concreet resultaat / beperking |
|---|---|---|
| Eigenaarssessie | PASS |Eigenaar logde privé in; dashboard na refresh toegankelijk. Geen wachtwoord/OTP bekeken. Nieuwe wachtwoordlogin/enrollment/recovery niet getest. |
| Omgevingsgrens | PASS |TEST WEBSITE-melding zichtbaar; gedeelde locatievelden/check-in/clear disabled. Nieuwe verhalen/pagina/contact/kalender staging. Preview/lookalike/unknown-host-matrix offline; geen echte PR-previewdeploy. |
| Verhaal/foto-upload | PASS staging |Nieuwe gelabelde kopie:2 echte geoptimaliseerde eigen foto's, alt, aparte cover/wide-banner/bottomcrop, plaatsingen, save/reopen,3 previewhoofdstukken en Approx.1min. |
| Publiceren/intrekken | PASS staging |Echte /entry/… met banner/tekst; Take offline bevestigd; openbare refresh toont This entry is not available. Privéconcept/foto's blijven behouden. Geen mailjob. |
| Fotofocus | PASS |Foto2 openen → Previous → Escape geeft focus aan de zichtbare foto1-knop; preview blijft open. |
| Download/import/unsaved | PASS |Werkelijke JSON gedownload/import geeft nieuwe onopgeslagen kopie met foto's/banner/plaatsingen. Open andere entry waarschuwt; Cancel behoudt invoer; Confirm heropent opgeslagen origineel. Import niet opgeslagen/gepubliceerd. |
| Versiehistorie | PASS gedeeltelijk |Echte privéversies1/2 geladen. Niet iedere historische restorevariant opnieuw doorlopen. |
| Bestaande pagina | PASS staging |Home-intro privé opslaan → echte iframepreview → review/publicatie → zichtbaar op aparte publieke tab → originele sectie herstellen → oorspronkelijke fieldoverride terugzetten/privé opslaan. Geen openbare testtekst over. |
| Kalender | PASS staging |Maandrooster/volledig bericht; scheduled true→false opgeslagen/heropend, daarna true en Saved privately. Uitgangspunt7 posts/5 scheduled/0 published hersteld. Geen externe socialplanning/remindervoorkeur gewijzigd. |
| Postcard-editor | PASS gedeeltelijk |Bestaand privétemplate heropend; echte shadow-DOM preview zichtbaar met0 actieve links. Send/Schedule disabled, No delivery requested. Geen echte verzending. |
| Contact | PASS staging |Empty required/ongeldig email geweigerd. Gelabeld audit@example.invalid-bericht ontvangen; badge1 → Mark handled → badge0. Referentie1d90c03bb611456f9d3829e2b0ad1fd0. Geen reply of purge. |
| Zoeken | PASS |filipijnen en philipines vinden Philippines eerst; onzinquery0 resultaten met hulptekst. Na fix sluit één Escape en focust zoeklink. Lokale fuzzy/aliaszoeker, geen AI/API. |
| Navigatie | PASS steekproef |Mobiel menu opent, Postcards primair bereikbaar, Escape sluit/aria-expanded=false. |
| Stories/About | PASS steekproef |Alleen Travel Stories/Field Notes-filters, echte wissel; About details allemaal dicht. Geen zichtbare pauze-slideshow. Niet iedere ring/focus/reduced-motioncombinatie opnieuw getest. |
| Atlas | PASS |Recente Philippines-link vóór onthulling, Philippines2025 toont juiste historische inhoud; zoom/reset bediend. Geen GPS of gedeelde write. |
| Films | PASS steekproef |Film-road readyState4/time10.87, native controls en geen error. Boracay readyState4/time22.04; Next pauzeert/verbergt oude film en toont andere. Niet elke MP4 geheel bekeken of ieder fysiek fullscreenplatform getest. |
| Postcard-archief | PASS |3 echte openbare edities na laden, nieuwste23oktober; nieuwste opent met vaste publieke verhaal-/privacylinks, geen persoonlijke emailactie. |
| Q&A | PASS gedeeltelijk |Rustige gesloten formulieren/guidelines; public-read/pendingcontract in bron/emulator. Geen echte inzending omdat deze livecollecties en meldingen deelt. |
| Signup/delivery/unsubscribe | BLOCKED voor E2E |Brevo-ingang en consentverwijzingen beoordeeld; geen gecontroleerde mailbox/verzending toegestaan. Geen nieuw emailadres ingevuld of afmeldcyclus uitgevoerd. |

## Scherm-/routematrix

Alle22 sitemaproutes op390×844 én1280×900 opnieuw gerenderd: /, stories, thailand, bali, thailand-solo, philippines, privacy, cookies, about, videos, atlas, journey, qa, my-kit, collaborate, field-notes, note-room-to-breathe, note-a-local-place-became-a-ritual, note-more-to-tell-from-the-road, postcard-thailand-photo-journal, postcards, travel-costs.

Extra /, stories, videos, about, qa, collaborate, my-kit en atlas op320×740,768×1024 en844×390: **68 controles na implementatie**, naast44 baselinecontroles. Goede h1/main-aantallen;0 gemeten pagina-overflow, kapotte zichtbare afbeeldingen of ongelabelde zichtbare velden. Offscreen images/verborgen modalinhoud/alle interactiecombinaties zijn hiermee niet automatisch getest. Verwijdering van tijdelijke home-audittekst afzonderlijk bevestigd.

**NIET GETEST:** fysieke Android/iPhone/Safari/WebKit, echte screenreaders, alle zoomcombinaties, tweede echt account, geforceerde uitval tijdens ieder type write, gelijktijdige twee-apparaatwijzigingen en productiebelasting. Fixtures/source dekken een deel van die grenzen, zonder deze praktijkproeven te vervangen. Geen volledige WCAG2.2AA-certificering.

## Performance en SEO

[Officiële staging-home PSI,25oktober08:16](https://pagespeed.web.dev/analysis/https-dainyelonthemove-staging-web-app/toglxxzhgm?form_factor=mobile): mobiel **P99/A100/BP96/SEO69**, desktop **P100/A100/BP96/SEO69**. Mobiel LCP1.8s, TBT90ms, CLS0; geen velddata beschikbaar.

Ook lagere verse lokale Lighthouse-resultaten blijven bewaard:

| Lokale run | P/A/BP/SEO | LCP/TBT | Meetgrens |
|---|---|---|---|
| Home mobile |65/100/73/69|2406/2350ms|Waarschuwing: host-CPU trager dan verwacht |
| Philippines mobile |60/100/73/69|3795/1583ms|Zelfde host-CPUwaarschuwing |
| Stories desktop |99/100/100/69|909/3ms|Geen CPUwaarschuwing |
| Admin login mobile |62/100/73/66|3533/1304ms|Geen ingelogde editorprestatiemeting |

Staging is bewust noindex: SEO69 is geen reden de testsite indexeerbaar te maken. BP daalt mede door automatische netwerkfouten/403. Mobiele lokale proeven tonen veel reCAPTCHA/main-threadwerk. Machines/omstandigheden verschillen; geen100%-claim of actuele44-routePSI-rerun. Productie-INP/veld-CWV en duizenden gelijktijdige bezoekers niet gemeten. Geen App Check-verzwakking of auditdetectie.

Statische metadata/OG/canonical/sitemap via parser/checker gecontroleerd; dynamische CSR/socialpreviewgrens blijft.51 externe HEADs:42 HTTP200,9 timeout/403/418 onbeslist. Onbeslist is geen PASS en geen bewezen kapotte link.

## Release/bewijs

99916b2: staging Hosting40172030788, bronbackup40172030785, private inhoud/preflight40172030774 en regressie40172030779 allemaal PASS.7e07532 was ook volledig groen na CI-padfix. Main bleef b338841; exacte named Rules matchen baseline, niet de niet-geactiveerde kandidaat. Productie-Postcardcapability aan/staging uit, geen productie-mailjobs, contactforwarding uit. App Check-readback: Firestore én Identity Toolkit ENFORCED. Geen providerinstelling/campagne gewijzigd. De lokale emulator is na gebruik gestopt.

Ruwe bewijzen buiten Hosting: C:/Users/dainy/Documents/Codex/2026-10-24/launch-audit/ (inventory, browser-before/after, externe HEADs, Rules-resultaten, CI-log, Lighthouse/PSI). Geen ruwe diagnostiek of publieke SDKconfiguratie naar rapporten gekopieerd. Status en overblijvende besluiten: LAUNCH_READINESS.md.
