# Videoherstel en scherpere homepagevideo — 15 oktober 2026

Branch: `fix/video-playback-and-hero-quality`. Preview: https://dainyelonthemove-staging.web.app/. Deze wijziging staat eerst ter beoordeling op staging; het eerdere productieakkoord gold voor de afgeronde redesignrelease.

## Bevinding en backup

Vooraf is OneDrive-backup `website_2026-10-15_13-42-34` gemaakt. De drie gemelde bestanden worden op productie correct aangeboden als H.264/MP4, met HTTP206 byte-range support; geen Git LFS-pointers of corrupte downloads aangetroffen. Bij normale browserinstellingen speelden ze in de reproductie af. Bij reduced motion en databesparing bleef echter alleen `data-src` aanwezig: native controls konden geen nog niet toegewezen bron starten. Dit reproduceerde dezelfde niet-startende spelers; de werkelijke instellingen van de telefoon van de eigenaar zijn niet uit de screenshot vast te stellen.

De oude homepageclip is 960×540, circa 0,89 MB en sterk gecomprimeerd. Het beschikbare bronbestand is 1280×720. Er is geen 1080p/4K-bron aangetroffen in de relevante aangeleverde media.

## Wijzigingen

- `assets/video-autoplay.js`: een echte, benoemde afspeelknop voor lazy filmspelers. De bron wordt bij de bewuste klik toegewezen, ook met databesparing/reduced motion. Native controls verschijnen wanneer er een bron bestaat; normaal automatisch afspelen blijft stil en afhankelijk van zichtbaarheid. Afsluiten/uit beeld pauzeert nog steeds.
- Bronfouten kunnen uitsluitend op `<source>` verschijnen. Die worden nu ook afgevangen. Bij een mislukking verschijnt een werkende probeer-opnieuw-knop met een directe bestandslink. Autoplayblokkades houden de handmatige start bruikbaar; verwachte aborts worden niet als gebruikersfout getoond.
- `assets/design-system.css`: rustige, toegankelijke start-/foutbediening. De zichtbare knoptekst komt overeen met de toegankelijke naam.
- Nieuwe `assets/hero-travel-hd.mp4`: dezelfde eerste tien seconden uit de beschikbare bron, 1280×720, H.264/yuv420p, 30 fps, zonder audiotrack, fast-start en 4.093.479 bytes. De oude clip blijft bewaard. Geen opschaling of claim van 1080p/4K. De homepage houdt zijn poster tot de video daadwerkelijk afspeelt.
- Home-template gebruikt de nieuwe bron; gedeelde HTML opnieuw samengesteld voor assetversies. Overige inhoud, routes, metadata, Q&A, Firebase-config/rules/indexes en publieke tripgegevens blijven behouden.
- De externe YouTube-uploadplaylist geeft in de gewone browser daadwerkelijk “This video is unavailable”; het kanaal toont geen openbare video. Voorlopig verwijst de bestaande YouTube-paneelroute daarom naar een eerlijke kanaalkaart met dezelfde kanaallink en een terugweg naar de lokale films. Geen video-ID verzonnen. Een openbare videolink van de eigenaar is nodig om later weer een werkende YouTube-speler toe te voegen.
- Instagram laadt de bestaande Reel-preview. De preview gebruikt een “Watch on Instagram”-link; inline playback is platformafhankelijk. De directe Reel-link en cookie-informatie blijven nu ook na het laden zichtbaar.

## Lokale controles

- Alle zes gebruikte lokale MP4-bestanden volledig gedecodeerd zonder fouten; H.264/yuv420p en fast-start bevestigd. Nieuwe hero blijft onder 5 MB.
- Alle negen lokale gebruiksplekken getest in drie modi: normaal, reduced motion en gesimuleerde databesparing. Vijf filmspelers, home, About, Filipijnenheader en Bali-inlinevideo tonen werkelijk voortschrijdende frames/tijd: 27 geslaagde controles.
- Extra controles: mislukte bron toont retry/direct link en herstelt zonder paginavernieuwing; gesimuleerde browser-autoplayweigering herstelt via handmatige start. Geen echte databasewrites.
- Native controls worden na laden hersteld, afspelen is stil/inline, sluiten en wegscrollen pauzeren, handmatige pauze/hervatten en voorkeuren blijven werken. Handmatige afspeelbediening slaagt voor automatische axe-controle.
- Bestaande formulier-/panel-/video-/no-JavaScript-regressies slagen met lokale fixtures. JS-syntax, whitespace, lokale verwijzingen/ids in 20 HTML-bestanden en herhaalbare composer slagen. Naast home-videobron/assetversies wordt alleen de gedeelde sociale videokaart aangepast; bestaande verhalen blijven behouden. Geen credentialpatronen in gewijzigde tekstbestanden; `private/` niet gelezen of toegevoegd.

## Gehoste verificatie en grenzen

Functionele stagingrelease: `7d12cea1c21bd624e545e899510c437a6a36ac2d`. [Hosting-publicatie geslaagd](https://github.com/dainyelrooi/DainyelOnTheMove/actions/runs/38732261689); ook de bestaande OneDrive-cloudbackupactie slaagde. Productiebranch blijft `2a2d84cc0ff5f97b089d6bbcfbf687d761c65130`.

- Op de echte staging-URL opnieuw alle negen lokale videoplekken in de drie modi getest: 27 controles met voortschrijdende frames/tijd, plus herstel na een gesimuleerde 404 en autoplayblokkade. Geen JavaScript-fouten. Het nieuwe homebestand decodeert op staging als 1280×720.
- Alle zes gebruikte MP4-bestanden leveren HTTP206, het juiste video/mp4-type, MP4-signatuur en de verwachte bestandsgrootte. De gedeployde controller komt overeen met de lokale bron. Geen Git LFS-pointer als video geserveerd.
- De bestaande niet-destructieve formulier-, panel-, zoek-, filter-, geschiedenis-, toetsenbord-, consent-, pending-moderatie- en no-JavaScript-controles slagen ook tegen staging met lokale servicefixtures; nul echte databasewrites. Owner-login/Firestore-configuratie is hierbij niet opnieuw gewijzigd of gevalideerd.
- YouTube-kanaalkaart en de blijvend zichtbare Instagram-link gecontroleerd. Instagram-preview en de lokale film zijn tevens in de gewone in-appbrowser zichtbaar bevestigd; de lokale film speelde daar werkelijk af.
- Staging blijft noindex via de Hosting-header. De niet-gevoelige bronrapport-URL levert 404. Geen privébestanden gelezen voor deze controle.

Testbestanden, meetresultaten en screenshots staan buiten Hosting in de Codex-outputmap `video-fix-checks`; hosted bewijs staat in de submap `staged`.

De controles gebruiken Edge met mobiele viewport/voorkeursimulatie. Een fysieke Samsung/iPhone en Safari zijn niet beschikbaar voor dit bewijs. Externe platformen blijven afhankelijk van hun eigen beschikbaarheid; Instagram behoudt de toestemming/klikgestuurde integratie. Een bron boven 720p is nodig voor echte 1080p/4K-beeldkwaliteit. Productie wordt pas bijgewerkt na akkoord op deze onderhoudsrelease.

### Eerste gehoste snelheidsmeting

Staging op `53eb7ce`: Lighthouse mobile Performance 93, Accessibility 100, Best Practices 100, SEO 69 (bewuste noindex-testsite), LCP 2,2 s en CLS 0. Dit is één laboratoriummeting, geen praktijk-Core Web Vitals of rankinggarantie. De scherpere clip vergroot het volledige mediaverkeer; poster-first en starten na de eerste leesbare pagina blijven behouden. De latere sociale kanaalkaart verandert geen hero- of videolaadgedrag.
