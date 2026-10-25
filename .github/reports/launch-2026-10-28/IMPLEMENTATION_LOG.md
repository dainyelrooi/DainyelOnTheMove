# Implementatielog — lancering28oktober

## Uitgangspunt

Alleen `audit/launch-readiness-2026-10-28` en staging. Productie-startcommit `b338841`. Bronback-up gemaakt vóór wijzigingen. De vijf auditdocumenten staan bewust onder `.github/reports/`: beide Hostingtargets sluiten deze map uit.

## Uitgevoerde bronwijzigingen (25 oktober, regressie nog in uitvoering)

| ID | Bestanden | Reden en verificatie |
|---|---|---|
| ENV-01 | `assets/site-environment.js`, publishing/website-model, content-calendar, admin-live, admin-template/generated admin | Eén hostbeleid; vaste/PR-testhosts kiezen staging, onbekende hosts falen gesloten. Admin vermeldt omgeving. Gedeelde vragen/locatie zijn alleen-lezen op de testsite. Drie gerichte Node-tests slagen; echte staging-hertest volgt. Dit is een bedieningsbescherming, geen nieuwe database-autorisatiegrens. |
| SEC-01 | `assets/owner-review-pages.js`, admin-live, contact-inbox, admin-review-badges | Moderatie en inbox lezen maximaal50 records per pagina, oudere records blijven bereikbaar, gedeelde parent-reads worden per antwoordpagina hergebruikt. Onvolledige tellers tonen een ondergrens. Offline callback/cleanuptest en geïsoleerde databasepaginering123 records slagen. Geen vertrouwde bezoekersquota toegevoegd; dat resterende risico blijft open. |
| A11Y-01 | `assets/publishing-reader.js` | Escape na navigeren in de vergroting keert terug naar de op dat moment zichtbare fotoknop. Fout echt gereproduceerd; browserhertest volgt na staging-deploy. |
| QA-01/02 | `tools/Check-Journey.py`, `tools/Preview-Site.py`, nieuwe tests | Bestaande zoekdialoog telt als geldige #search-route; lokale previewroot / opent weer. Negatieve private/authoring-routecontroles blijven actief.16 Python-tests en23 Node-tests slagen. |
| CMS-01 | `firestore.rules` (alleen kandidaat) | Twaalf foto's plus banner/plaatsingen veroorzaakten de1000-expressielimiet bij publiceren. Exacte MapDiff-vergelijking vervangt herhaalde veldvergelijkingen zonder contentuitzondering. Acht echte emulatorproeven slagen, inclusief12-fotogrens. **Niet gedeployed:** staging en live gebruiken dezelfde beveiligingsregels; productie mag voor deze opdracht niet worden gewijzigd. |
| QA-03 | `.github/tests/rules/`, `.github/workflows/launch-quality.yml` | Reproduceerbare lokale demo-databaseproeven, vastgezette ontwikkeltest-SDK's, Java21 en automatische regressie op staging/PR. Geen runtimeafhankelijkheid, remote database of authenticatiesecret in de testworkflow. |

Herstelpunt voor applicatieaanpassingen: `backups/website_2026-10-25_04-43-05`. Tijdelijke, duidelijk gelabelde staging-reisverhaalkopie is echt opgeslagen/gepubliceerd en weer ingetrokken; privéconcept/foto's blijven voor herstel. Geen productiepublicatie, gedeelde Q&A-mutatie, providerinstelling of mailopdracht uitgevoerd.
