# Fase 0 — audit, 14 oktober 2026

Baseline: `b7a3574`. Canonical source: OneDrive website repository. Alle controles waren read-only; `private/` is niet geopend. De audit is aan de eigenaar gerapporteerd voordat fase 1a startte. Backup: `website_2026-10-14_20-19-23`.

## Structuur en bestaande werking

17 HTML-bestanden, waarvan 15 publieke pagina's, plus admin en 404. Static HTML/CSS/vanilla JS, geen buildstap. Header/footer zijn gekopieerd; site-ui.js groepeert menu-items pas tijdens runtime. Shared CSS plus inline paginastijlen zorgen voor meerdere stijlbronnen.

**Behoud het volledige Thailand exchange-verhaal in blog.html**, inclusief #thailand en hoofdstukankers. Dit is geen lege overzichtspagina. About, kit en Collaborate bevatten echte tekst. De films kunnen later naar een sectie met lightbox: er zijn momenteel minder dan twaalf afzonderlijke films.

Q&A heeft al persoonlijk en community-formulier, topicfilters, zoeken, moderatie, replies en een carrousel (maximaal drie kaarten, zeven seconden). Behoud alle form/feed-ID's en het bestaande backendcontract. Field Notes bewaart expliciet opt-in in Firestore, maar heeft geen verzendprovider, double opt-in of automatische uitschrijving. Collaborate heeft alleen Instagram-contact; geen geverifieerde bereikcijfers, publiek zakelijk mailadres, formulier of PDF-mediakit.

## Stijl en media

Bestaand: dark #101512, ink #141a17, paper #f7f7f3, teal #148b83, yellow #f4c21d. Playfair Display en DM Sans via Google Fonts, display=swap en fallback Georgia/Arial. Breakpoints verspreid over 420/460/480/560/620/700/800/900/901/1100px. Animaties: drone drift 28s, headertransities, hoverzoom en section reveals; reduced-motion bestaat.

Gemeten contrast: teal/paper 3,87:1 en home-muted/paper 4,23:1 falen voor kleine tekst. Shared-muted/paper 4,58:1 slaagt. Goedgekeurd nieuw navy/sand 14,73:1 en navy/coral 6,96:1; coral/ivory 2,40:1 is ongeschikt voor tekst.

road-moments.mp4: 11.550.128 bytes (11,02 MiB); briefdoel <5MB. Hero WebP: 417.428 bytes. 43 geoptimaliseerde afbeeldingen samen 13,65MB. Vier homepage-afbeeldingen missen expliciete afmetingen. Nav-controls zijn deels kleiner dan 44px. Leg media-afmetingen en vaste shellruimte vast bij fase 1b om layoutverschuivingen te beperken.

## Browserbaseline

Lokale Edge, backup via poort 4175, DOMContentLoaded +5s, zonder throttling, een run per formaat. Geen productie-CWV-claim:

| Viewport | LCP lokaal | CLS lokaal | Lokale transfer |
|---|---:|---:|---:|
| Desktop 1440 | 484ms | 0,134 | 1,93MB |
| Tablet 768 | 308ms | 0,138 | 0,90MB |
| Mobiel 390 | 304ms | 0 | 0,90MB |

Geen JS pageerrors of horizontale overflow; een H1; eerste Tab is skip-link. Desktop/tablet layoutshifts hangen samen met body-styling en .wrap. Lighthouse/axe-resultaten worden hieronder toegevoegd zodra de geïsoleerde auditruns klaar zijn. INP vereist echte interactie-/veldmetingen en wordt niet afgeleid uit een laadsimulatie. iOS Safari en echte Android-apparaten zijn hier niet beschikbaar; ook Firefox en desktop Safari zijn niet gemeten.

## Hosting en verrassingsmodel

GitHub-repository publiek (API gecontroleerd). `main` -> productie, `staging` -> noindex testsite. Firebase heeft aparte Hosting-targets en alleen een /studio rewrite; er zijn nog geen consolidatie-redirects. `public: "."` vereist expliciete uitsluiting van operationele docs/tools.

De vorige route staat in huidige HTML, scripts, search-index en handoff. Fase 1a vervangt de routegegevens door alleen publieke onthullingen. De eerder bezochte atlas blijft intact. Oude commits/branches/backups en de bestaande liveversie worden hiermee niet gewist. Geen history rewrite, force-push of productie-deploy zonder opdracht.

## Bevestigde keuzes van de eigenaar

Nieuw Cinematic Explorer-palet; countdown op 28 oktober 2026, 00:00 Europe/Amsterdam; alleen vertrekdatum tonen; bestaande Field Notes-aanmelding hergebruiken. Nieuwsbriefverzending is een afzonderlijke vervolgstap. Nieuw ontwerp blijft eerst op staging. Fasering/goedkeuring volgt het aangeleverde brief.

## Lighthouse en axe — echte nulmeting

Geïsoleerde Lighthouse 13.5- en axe-tooling is tijdelijk buiten de repository geïnstalleerd, zonder website-afhankelijkheden. Meting op de ongewijzigde backup, één labrun per profiel. Lokale server mist Hosting-cacheheaders; dit is geen veldmeting.

| Lighthouse homepage | Mobiel | Desktop |
|---|---:|---:|
| Performance | 69 | 88 |
| Accessibility | 100 | 95 |
| Best practices | 92 | 100 |
| SEO | 100 | 100 |
| LCP | 8,63s | 1,57s |
| CLS | 0,089 | 0,147 |
| TBT | 68ms | 0ms |

Axe AA: home contrast 4 nodes + brand-label mismatch 1; Q&A contrast 5 + label 1; atlas contrast 35 + label 1 + nested interactive SVG 1; Journey contrast 5 + label 1 + prohibited aria attribute 1. Incomplete axe checks zijn geen automatische passes. Mobiele Best practices-waarschuwing kwam van Google reCAPTCHA report-only CSP. INP is niet gemeten.

Volledige labrapporten/schermafbeeldingen staan lokaal buiten het repository in de tijdelijke auditmap; ze worden niet gepubliceerd omdat de nulmeting eerdere contentfragmenten kan bevatten.
