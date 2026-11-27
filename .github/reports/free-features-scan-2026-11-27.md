# Gratis uitbreidingen voor DainyelOnTheMove

Onderzoeksdatum: **27 november 2026**. Status: **onderzoek en voorstellen; niets geactiveerd**.

## Uitkomst

De bestaande website kan nog nuttig worden uitgebreid zonder een betaald abonnement, een nieuw Firebase-project of een overstap van CMS. De beste volgende stappen zijn een uitgebreider statusoverzicht voor de beheerder, Postcards-voorkeuren, betrouwbare terugmeldingen van Brevo en een persoonlijke leeslijst voor bezoekers. Offline lezen, browsermeldingen en een eenvoudige agenda-export zijn aanvullende mogelijkheden.

Niet iedere functie met het label “gratis” voldoet aan de eis. Een proefperiode, een betaalpakket met gratis tegoed en een dienst met facturering bij overschrijding zijn hier geen kosteloze basisoplossing. Er is geen reden om alles uit dit rapport tegelijk toe te voegen. Behoud de rustige website en gebruik bestaande voorzieningen waar mogelijk.

## 1. Wat is daadwerkelijk onderzocht?

| Onderdeel | Controle en bewijs | Beperking |
| --- | --- | --- |
| Broncode | Lokale repository, basis `c465e68`; templates, bezoekersscripts, CMS/Postcards-processoren, Cloudflare Worker, databankschema en workflows gelezen. | Dit is een functiescan, geen nieuwe volledige beveiligings- of browserregressietest. |
| Firebase-account | De accountkoppeling bevestigde een actief bestaand project met **facturering uit**. De CMS-database is Firestore Native, **Enterprise**, met `freeTier: true`. | Het resterende dagquotum is niet gemeten; Enterprise-eenheden zijn niet hetzelfde als de documentquota van Standard. |
| Metricool-account | De gekoppelde accountinformatie bevestigt Instagram, Facebook, Pinterest, TikTok en YouTube bij één merk. | Het abonnement en resterende maandbudget staan niet in die accountrespons. Verbinding is geen bewijs van een gratis API-abonnement. |
| Brevo | Bestaande implementatie, projectafspraken en actuele officiële productdocumentatie gecontroleerd. | Het actuele abonnement, gebruik en de complete instellingen in het Brevo-account zijn deze ronde niet rechtstreeks opnieuw uitgelezen. |
| Cloudflare | De bestaande Worker/D1-code, opslagstructuur en officiële gratis voorwaarden onderzocht. | Geen nieuwe onafhankelijke controle van de huidige accountfactuur of resterende quota. |
| GitHub | Via de accountkoppeling bevestigd dat de repository **openbaar** is. De relevante workflows gebruiken normale GitHub-runners. | Gratis rekentijd betekent niet onbeperkte artifact-/cacheopslag of gegarandeerde starttijden. |
| Andere diensten | Officiële documentatie van onder meer Google Data Studio, Microsoft Clarity en WebKit vergeleken met de website. Beschikbare koppelingen onderzocht; geen bruikbare directe Brevo-accountconnector gevonden in deze sessie. | Een koppeling in Codex kan andere voorwaarden hebben dan een blijvende koppeling vanuit de website. |

Een latere Firebase-documentatieaanvraag gaf een verbindings-time-out. Voor die aanvullende onderwerpen zijn de officiële webdocumenten gelezen. Er zijn geen privécontent, abonneerecords, geheime sleutels of ongepubliceerde reisplannen voor deze scan opgehaald.

### Al aanwezig: niet opnieuw bouwen

- Stories, Field Notes, weetjes en Travel tips, gekoppeld aan Atlas en bestaande openbare landencontent.
- Servergestuurde planning, publicatiestatussen, herhaalbeveiliging, retries en opruimen van de actieve conceptlijst na gecontroleerde publicatie.
- Brevo-Postcards, dynamische abonneeselectie, uitschrijvingen, fotoupload, externe knoppen en de volledige openbare Postcards op de verzenddag.
- Beveiligde admin met Google en Authenticator, App Check, gemodereerde vragen en community via Cloudflare/D1.
- Openbare leesbestanden die niet voor iedere bezoeker Firestore nodig hebben, bestaande back-ups en publicatieklokken.
- Zoekfunctie, deelknoppen, fotogalerijen, kaart en gedeelde brede locatie, automatisch bijgewerkte bezochte landen.
- Analytics na toestemming; advertenties staan volgens de huidige broncode uit.
- Donatietotaal, koffiekaart en één begrensde uitnodiging. Hiervoor is geen nieuwe donatiedienst nodig.

De broncodescan vond geen implementatie van FCM, Performance Monitoring, Remote Config, een offline service worker, RSS/Atom, iCalendar-export, een bezoekersleeslijst, Clarity of Turnstile. Dit is bewijs over de beoordeelde websitebron, niet over alle eventuele externe accountinstellingen. `reading-collection.js` filtert verhalen; het is geen persoonlijke leeslijst.

## 2. Wat betekent volledig gratis in dit advies?

- Geen nieuw betaald abonnement, betaalde connector, proefperiode of verbruikstegoed nodig.
- Firebase blijft zonder gekoppelde facturering; Cloudflare-functies moeten binnen Workers Free/D1 Free passen.
- Bij een limiet: veilig pauzeren of terugvallen op de bestaande openbare inhoud. Geen automatische upgrade.
- Een bezoekersfunctie moet bruikbaar blijven als een optionele dienst niet reageert.
- Ook gratis functies hebben onderhoud, privacykeuzes en technische capaciteit nodig. Geen belofte van onbeperkt verkeer of blijvend ongewijzigde leveranciersvoorwaarden.
- De bestaande internet-, domein- en eventuele Codex-kosten worden hiermee niet opgeheven. Het gaat om **geen extra dienstkosten voor de voorgestelde uitbreiding**.

### Relevante gratis grenzen

| Dienst | Huidige officiële gratis grens | Betekenis voor deze website |
| --- | --- | --- |
| Firebase Hosting Spark | 10 GB opslag; 360 MB overdracht per dag. | Grote foto's en video's blijven een aandachtspunt. [Firebase-prijzen](https://firebase.google.com/pricing) |
| Firestore Enterprise | 1 GiB opslag; 50.000 read units, 40.000 write units en 50.000 realtime-update units per dag; 10 GiB uitgaand verkeer per maand. | Geen extra realtime lezers voor iedere paginabezoeker toevoegen. [Firebase-prijzen](https://firebase.google.com/pricing) |
| Remote Config Spark | 100.000 fetches per dag per project. | Met lokale standaardwaarden en caching werken. [Firebase-prijzen](https://firebase.google.com/pricing) |
| Brevo Free | 300 e-mails per dag; maximaal 100.000 opgeslagen contacten. | Contactopslag en het aantal mails dat die dag kan vertrekken zijn verschillende limieten. [Gratis limieten](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan) |
| Brevo-automatiseringen | Maximaal 2.000 unieke contacten binnen actieve automatiseringen; meerdere flows tellen een contact eenmaal. | Geen onbeperkte welkomstseries beloven. [Automatiseringslimiet](https://help.brevo.com/hc/en-us/articles/209465385-Why-have-my-contacts-not-been-added-to-an-automation) |
| Cloudflare Workers Free | 100.000 verzoeken per dag; 10 ms CPU per uitvoering. | Nieuwe interacties delen het bestaande accountbudget. [Workers-limieten](https://developers.cloudflare.com/workers/platform/limits/) |
| Cloudflare D1 Free | 5 miljoen gelezen rijen en 100.000 geschreven rijen per dag; 5 GB totale opslag. | Zoekindexen, korte bewaartermijnen en begrensde verzoeken blijven nodig. [D1-prijzen](https://developers.cloudflare.com/d1/platform/pricing/) |
| Metricool Free | Eén merk; 20 geplaatste plannerposts per maand; 30 dagen analytics. | Bruikbaar voor beperkte sociale planning. [Gratis pakket](https://help.metricool.com/main-differences-between-free-and-paid-plans-bl0v9) |
| GitHub Actions | Normale GitHub-hosted runners voor openbare repositories zijn kosteloos. | De bestaande achtergrondtaken kunnen worden hergebruikt; geen groter type runner of extra constante poller nodig. [GitHub-voorwaarden](https://docs.github.com/en/actions/concepts/billing-and-usage) |

Brevo verstuurt een campagne met meer dan 300 ontvangers op Free niet vanzelf diezelfde dag aan iedereen. De officiële uitleg beschrijft opnieuw in de wachtrij zetten voor de overige ontvangers. Extra welkomst- of servicemails gebruiken ook verzendcapaciteit. Dit rapport controleert niet hoeveel capaciteit vandaag nog beschikbaar is. [Brevo Free](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan)

## 3. Beste uitbreidingen: eerst deze beoordelen

Dit zijn ontwerpvoorstellen, geen reeds geteste implementaties. Omvang: **klein**, **middel** of **groot**, relatief aan de bestaande website.

### 1. Eén overzicht van publicatie, mail en limieten — hoge prioriteit

**Wat:** het bestaande adminstatusoverzicht aanvullen met laatste geslaagde uitvoering, volgende poging, concrete blokkade en de bron van die status. Hosting-, opslag- of verzendruimte alleen als actuele gegevens veilig beschikbaar zijn; anders “niet opgehaald” tonen.

**Nut:** sneller begrijpen waarom iets wacht, zonder verschillende dashboards te openen of een stroom foutmails te krijgen.

**Kostenroute:** bestaande privéstatussen en achtergronduitvoering hergebruiken, met korte cache en samengevatte meetgegevens. Geen nieuwe elke-twee-minutencontrole. Geen publiek toegankelijke accountgegevens of sleutels. Omvang: middel. Dit is een uitbreiding van de huidige statusfuncties.

**Acceptatie:** aantoonbaar falen, herstel en quota-uitstel tonen; één melding per incident, herstelmelding en duidelijke leeftijd van de gegevens. Een geslaagde workflow nooit gelijkstellen aan daadwerkelijke publicatie of inboxontvangst.

### 2. Postcards-voorkeuren — hoge prioriteit

**Wat:** een persoonlijke link in mails waarmee een abonnee bijvoorbeeld verhalen, films of praktische tips kiest, naast de bestaande volledige afmelding. Geen tweede inschrijflijst of automatische herinschrijving.

**Nut:** relevantere inhoud, minder onnodige mails. Het invullen blijft optioneel.

**Kostenroute:** bestaande Brevo-contactvelden, profiel-updateformulier en segmenten. Beschikbaarheid van de gekozen formuliervariant eerst in het huidige account controleren; geen betaald pakket accepteren. Houd het e-mailadres alleen-lezen en publiceer persoonlijke voorkeurslinks nooit in het openbare Postcards-archief. Omvang: middel.

**Acceptatie:** voorkeur wijzigen op een veilig testcontact, de juiste selectie teruglezen en volledige afmelding blijven respecteren. De bestaande doelgroep niet ongemerkt vervangen. [Profiel-updateformulieren](https://help.brevo.com/hc/en-us/articles/360003644360-Update-your-contacts-details-and-preferences-profile-update-form), [segmentbeheer](https://help.brevo.com/hc/en-us/articles/5175058666386-Manage-your-segments)

### 3. Brevo-status automatisch laten terugmelden — hoge prioriteit

**Wat:** een beveiligde terugmeldroute voor gebeurtenissen zoals geaccepteerd, afgeleverd aan ontvangende mailserver, geweigerd of afgemeld. Daarmee kan de admin sneller bijwerken en minder vaak Brevo opvragen.

**Kostenroute:** outbound webhooks zitten in Brevo Free; de ontvanger kan binnen de bestaande Cloudflare Free-ruimte worden gebouwd. Die route is niet aangetroffen in de beoordeelde eigen Worker. De huidige Brevo-accountwebhooks zijn niet uitgelezen. Omvang: middel.

**Acceptatie:** authenticiteit controleren, dubbele en verkeerd geordende meldingen verwerken, minimaal privé opslaan en een beperkte periodieke controle behouden. Brevo vermeldt dat opnieuw afspelen van mislukte outbound gebeurtenissen nog niet beschikbaar is. “Delivered” is geen bewijs dat iemand de mail heeft gelezen. [Gratis functies](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans), [outbound webhooks](https://help.brevo.com/hc/en-us/articles/27824932835474-Create-outbound-webhooks-to-send-real-time-data-from-Brevo-to-an-external-app)

### 4. Persoonlijke leeslijst — hoge prioriteit

**Wat:** een kleine “Save for later”-knop bij verhalen en tips, met één overzicht van bewaarde artikelen.

**Kostenroute:** alleen opslag in de browser; geen nieuw account, database of externe dienst. Omvang: klein tot middel.

**Grens:** geen synchronisatie tussen apparaten; wissen of blokkeren van browseropslag kan de lijst verwijderen. Opslag van een link is nog geen offline kopie.

**Acceptatie:** opslaan, verwijderen, herladen, toetsenbordbediening en geblokkeerde opslag testen. Alleen bestaande openbare URL's bewaren; ingetrokken content niet opnieuw tonen.

### 5. Werkelijke laadsnelheid meten — hoge prioriteit

**Wat:** inzicht in trage pagina's en netwerkverzoeken bij bezoekers die daarvoor toestemming geven, naast bestaande algemene Analytics.

**Kostenroute:** Firebase Performance Monitoring wordt zonder productkosten aangeboden. De web-SDK heeft volgens de huidige documentatie **beta-status**. Daarom eerst een kleine proef op de testsite; geen belofte van foutloze monitoring. Omvang: middel.

**Acceptatie:** SDK pas onder het afgesproken privacybeleid laden, formuliertekst, privé-URL's en admininhoud uitsluiten; extra download en verwerking meten. Het instrument meet problemen en maakt de website niet automatisch sneller. Als de extra SDK te zwaar blijkt, eenvoudige gerichte eigen metingen kiezen. [Prijs](https://firebase.google.com/pricing), [webdocumentatie en beta-beperking](https://firebase.google.com/docs/perf-mon/get-started-web)

### 6. “Zet in mijn agenda” bij een openbare première — goede snelle aanvulling

**Wat:** een klein agendabestand voor een door jou openbaar gemaakte filmpremière of ander publiek moment.

**Kostenroute:** de website maakt een iCalendar-bestand; geen betaalde kalenderconnector nodig. Omvang: klein.

**Grens:** een eenmalig geïmporteerd bestand blijft niet automatisch gesynchroniseerd. Een abonnementsfeed is een aparte stap en agenda-apps verversen niet gegarandeerd onmiddellijk. Dit geeft bezoekers geen toegang tot jouw privé-adminagenda.

**Acceptatie:** juiste datum, tijdzone, stabiele gebeurtenis-ID en openbare link controleren. Geen concepten, geheime plannen of privé-afspraken exporteren.

### 7. Interactieve inpaklijst — goede snelle aanvulling

**Wat:** een compacte afvinklijst gekoppeld aan bestaande Travel tips, met jouw eigen ervaring, waaronder wasstrips. Eventueel ook printbaar.

**Kostenroute:** eigen HTML/JavaScript en lokale browseropslag; geen betaalde formulierdienst. Omvang: klein.

**Acceptatie:** afvinken, herstellen, mobiel gebruik en printweergave testen. Geen verplichte inschrijving en geen verzonnen persoonlijke aanbevelingen. Een download kan gewoon openbaar blijven.

## 4. Interessant als tweede stap

| Nr. | Functie | Concrete toepassing | Gratis route en grenzen | Omvang |
| --- | --- | --- | --- | --- |
| 8 | Offline lezen / webapp | Bezoeker kiest welke openbare verhalen voor onderweg bewaard worden; website kan een eigen beginschermicoon krijgen. | Eigen service worker en browseropslag. Beperk foto's en opslag, toon ouderdom en bied wissen/verversen. Geen admin, formulieren of privécontent cachen. Bestaande openbare-kopie-expiratie en intrekken van content mogen niet worden omzeild. | Groot |
| 9 | Browsermeldingen | Een vrijwillige melding bij een nieuw verhaal; ook bruikbaar voor jouw eigen beheermeldingen. | Firebase Cloud Messaging heeft geen productkosten. Verzenden via een veilige bestaande serverroute binnen diens gratis quota; niet via betaalplichtige Cloud Functions. Toestemming, afmelden en tokenverwijdering noodzakelijk. Op iPhone/iPad geldt de ondersteunde beginscherm-webapproute. | Groot |
| 10 | Gerichte vervolgstap na de welkomstmail | Nieuwe lezers rustig kennis laten maken met bestaande verhalen of uitnodigen een vraag te stellen. | Bestaande welkomstmail uitbreiden, niet dupliceren. Brevo-automatisering, contactlimiet en dagquotum gelden. Past binnen de bestaande rustige mailcadans; geen extra mail voor elke tip. | Middel |
| 11 | RSS/Atom | Nieuwe Stories, Field Notes en tips volgen in een eigen feedreader. | Een statisch bestand bij de bestaande gecontroleerde publicatie bijwerken; geen nieuwe databasepoller. Alleen echt gepubliceerde content, juiste datums/URL's en intrekkingen verwerken. | Middel |
| 12 | Kleine lezerspoll | Bijvoorbeeld kiezen welk al openbaar onderwerp lezers verder uitgewerkt willen zien. | Bestaande Cloudflare/D1 Free; eerst capaciteit controleren. Beperk verzoeken en bewaartijd. Uitslagen alleen uit echte stemmen; anonieme stemmen zijn niet perfect uniek. | Middel |
| 13 | Betere engagementmeting | Begrijpen welke verhalen of knoppen worden gebruikt en waar de inschrijfroute begint. | Bestaande GA4 na toestemming uitbreiden. Alleen vaste veilige gebeurtenisnamen/categorieën, geen vrije zoektekst, mailadressen of privélinks. Een klik is geen bevestigde inschrijving of donatie. | Middel |
| 14 | Eén privé-statistiekdashboard | Analytics, vindbaarheid en YouTube in één overzicht. | Gratis Google Data Studio, voorheen Looker Studio, met beschikbare Google-connectors. Geen betaalde communityconnector, Pro, BigQuery-facturering of Metricool-API in de basisopzet. | Middel |
| 15 | Openbare foto's buiten het Hosting-dagbudget aanbieden | Minder overdracht via Firebase voor geselecteerde bestaande foto's. | Cloudflare Workers Static Assets kan bestanden kosteloos serveren zonder Worker-uitvoering. Het is een publicatieroute, geen onbeperkte uploadbibliotheek; bestands-/aantallimieten en caching gelden. Alleen foto's als eerste proef, geen algemene videomigratie. | Groot |
| 16 | Instellingen op afstand | Eén bestaande uitnodiging tijdelijk aanpassen of uitzetten met veilige lokale standaardwaarden. | Firebase Remote Config binnen de gratis fetchlimiet. Geen geheimen of ongepubliceerde content erin; bestaande CMS-instellingen hebben voorrang als die hetzelfde al oplossen. | Middel |
| 17 | Kleine A/B-proef | Eén formulering of uitnodigingstijd vergelijken op werkelijke resultaten. | Firebase A/B Testing met Remote Config en Analytics ondersteunt volgens de actuele documentatie ook web. Alleen na toestemming en met voldoende bezoekers; geen extra popup. | Middel |
| 18 | Heatmaps en sessie-opnamen | Begrijpen waar mobiele lezers vastlopen. | Microsoft Clarity is een gratis dienst. Dit voegt wel een nieuwe gegevensverwerker toe: toestemming doorgeven, afscherming en uitsluitingen eerst inrichten. Admin, mailvelden en private inhoud uitsluiten. | Middel |
| 19 | Sociale planning met de bestaande koppeling | Een beperkt aantal goedgekeurde socialposts in Metricool klaarzetten. | Free en de assistentkoppeling bieden mogelijkheden; sociale publicatie blijft afhankelijk van netwerk, accounttype en postformaat. Geen gratis permanente website-API aannemen. | Middel |
| 20 | Extra botcontrole waar aantoonbaar nodig | Een nieuwe poll of inzendroute beschermen. | Turnstile heeft een Free-plan. Bestaande App Check en inzendlimieten niet zonder reden vervangen of met een tweede uitdaging overladen. Verificatie op de server blijft nodig. | Middel |
| 21 | Bestaande kwaliteitscontroles uitbreiden | Verlopen openbare externe links of onbereikbare foto's periodiek vinden. | Bestaande GitHub-taken benutten, met beperkte frequentie, hercontrole en één samengevatte melding. Geen bezoekerstracking en geen herstelpogingen tegen rate limits in blijven sturen. | Middel |

Bronnen bij deze voorstellen:

- 9: [FCM voor web](https://firebase.google.com/docs/cloud-messaging/web/get-started), [Firebase-prijzen](https://firebase.google.com/pricing), [WebKit: webpush op iPhone/iPad](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/). Ondersteuning en levering zijn niet voor ieder apparaat gegarandeerd; geen automatisch toestemmingsvenster bij het eerste bezoek.
- 10: [Brevo-automatiseringslimiet](https://help.brevo.com/hc/en-us/articles/209465385-Why-have-my-contacts-not-been-added-to-an-automation). Geen belofte dat verwijderen van contacten de verbruikte toegangslimiet automatisch herstelt.
- 13: [GA4-gebeurtenissen](https://developers.google.com/analytics/devguides/collection/ga4/events), [aanbevolen gebeurtenissen](https://developers.google.com/analytics/devguides/collection/ga4/reference/recommended-events). De bestaande code meet veilige pagina-/panelroutes; dit voorstel voegt specifieke interactiemeting toe.
- 14: [Gratis Data Studio](https://docs.cloud.google.com/data-studio/welcome), [Google-connectors](https://docs.cloud.google.com/data-studio/available-connectors), [kosteloze Google-databronnen](https://docs.cloud.google.com/data-studio/about-data-sources). Geen toegang tot alle sociale netwerken inbegrepen.
- 15: [Static Assets-kosten en beperkingen](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [Worker-bestandslimieten](https://developers.cloudflare.com/workers/platform/limits/). Gratis assetverzoeken vereisen de juiste route; `run_worker_first` kan alsnog het Worker-quotum gebruiken. De documentatie waarschuwt bovendien voor ontbrekende HTTP-range-antwoorden bij video's. Daarom geen onbewezen videostreamingadvies.
- 16–17: [Remote Config-prijs](https://firebase.google.com/pricing), [A/B Testing op web](https://firebase.google.com/docs/ab-testing/abtest-config). De broncode gebruikt Firebase SDK 12.19.0; werkelijk gedrag, toestemming en configuratie moeten alsnog op staging getest worden.
- 18: [Clarity-functies](https://learn.microsoft.com/en-us/clarity/about-clarity), [privacy en toestemming](https://learn.microsoft.com/en-us/clarity/setup-and-installation/cookie-consent). Dit is optioneel; begin met bestaande Analytics als dat de onderzoeksvraag al beantwoordt.
- 19: [Metricool Free](https://help.metricool.com/main-differences-between-free-and-paid-plans-bl0v9), [assistentkoppeling tegenover API](https://help.metricool.com/mcp-vs-api-access-what-is-the-difference-5y3ib). Een AI-client kan eigen kosten of gebruiksgrenzen hebben; maak de normale websitewerking daarvan niet afhankelijk.
- 20: [Turnstile Free](https://developers.cloudflare.com/turnstile/plans/). Een botcontrole maakt Workers of D1 niet onbeperkt beschikbaar.
- 21: [GitHub Actions-gebruik](https://docs.github.com/en/actions/concepts/billing-and-usage). Bestaande controles blijven bestaan; een nieuwe planning is hier niet aangemaakt.

## 5. Niet kiezen als “volledig gratis” de harde eis blijft

| Optie | Waarom niet als kosteloze basis adviseren? |
| --- | --- |
| WhatsApp- of SMS-campagnes via Brevo | WhatsApp gebruikt losse credits. Een gratis account maakt de berichten niet gratis. [WhatsApp-prijzen](https://help.brevo.com/hc/en-us/articles/4416961286674-Supported-countries-and-pricing-for-WhatsApp-messages) |
| Automatische berichten via een willekeurige WhatsApp-omweg | Niet als betrouwbare gratis oplossing bevestigd. Een gewone WhatsApp-contactlink is iets anders dan automatische meldingen en vereist een goedgekeurd openbaar nummer. |
| Metricool-API vanuit de website | Vereist Advanced of Custom. Free-toegang via de assistent verandert die API-voorwaarde niet. Ook Flows vereist aangeschafte uitvoeringen. [API-toegang en add-ons](https://help.metricool.com/plans-add-ons-and-api-access-explained-xux1u) |
| Firebase Cloud Functions | Productie-uitrol vereist Blaze met facturering, ondanks een inbegrepen gebruikslaag. [Functions-voorwaarden](https://firebase.google.com/docs/functions/faq-and-troubleshooting) |
| Firebase Cloud Storage als nieuwe fotobibliotheek | De huidige prijskaart biedt deze opslag niet op Spark. Bestaande uploads hoeven hiervoor niet te worden vervangen. [Firebase-prijskaart](https://firebase.google.com/pricing) |
| Firebase Crashlytics voor web | Er is inmiddels een webpreview, maar juist deze variant vereist Blaze vanwege onderliggende Cloud Logging en Cloud Storage. De algemene aanduiding “Crashlytics gratis” is hiervoor onvoldoende. [Webvereisten](https://firebase.google.com/docs/crashlytics/web/get-started) |
| Cloudflare R2 als risicoloos gratis opslagabonnement | Vereist een R2-abonnement met checkout en maandelijkse verbruiksfacturering. Niet hetzelfde als een harde gratis limiet. [R2-startvoorwaarden](https://developers.cloudflare.com/r2/get-started/) |
| Alle mailabonnees onbeperkt tegelijk bereiken op Brevo Free | Niet haalbaar binnen het dagelijkse verzendmaximum. Geen nieuwe abonnementen of extra accounts aanmaken om dit te omzeilen. [Free-limieten](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan) |
| Een proefabonnement, gratis cloudtegoed of betaalde dashboardconnector | Voldoet niet aan de gekozen definitie. Een advertentiecredit of tijdelijke upgrade is geen permanente gratis websitefunctie. |
| Automatische AI-chat/vertaling van een externe API | Geen onbeperkte, blijvend kosteloze route voor deze website bevestigd. Bestaande zoeken/Q&A en redactionele content eerst benutten. Geen nieuwe afhankelijkheid van een wisselend gratis AI-quotum. |

## 6. Aanbevolen volgorde

1. **Betrouwbaar beheren:** het statusoverzicht uitbreiden en beveiligde Brevo-terugmeldingen toevoegen. Eerst testen zonder echte abonnees te mailen.
2. **Bezoekers helpen:** persoonlijke leeslijst, inpaklijst en agenda-export voor al openbare premières. Dit zijn grotendeels eigen websitefuncties zonder nieuwe dienst.
3. **Gerichter mailen:** Postcards-voorkeuren en eventueel één passende vervolgstap op de bestaande welkomstmail, na controle van accountmogelijkheden en verzendruimte.
4. **Onderbouwd verbeteren:** een beperkte snelheidsmeetproef; bestaande Analytics beter benutten. Clarity alleen als er daarna nog een concrete onbeantwoorde UX-vraag is.
5. **Later, bij aantoonbare behoefte:** offline webapp, vrijwillige browsermeldingen, RSS en eventueel foto-assets apart serveren. Eerst het werkelijke verbruik meten; niet preventief alles migreren.

Iedere uitvoering vraagt eerst een kleine stagingwijziging met acceptatiecontrole. Voor providers moeten beschikbare gratis capaciteit en de benodigde toegangsrechten dan opnieuw worden gecontroleerd. Geen enkele aanbeveling autoriseert nu activering, mails, nieuwe tracking, publicatie of een factureringswijziging.

## 7. Oplevering en controle van dit onderzoek

- Vooraf een herstelkopie gemaakt: `backups/website_2026-11-27_14-05-39` naast de repository.
- Onderzoek opgeslagen op lokale branch `audit/free-features-20261127`.
- Alleen dit rapport toegevoegd; geen websitebron, configuratie, database, campagne, abonneeselectie of planning gewijzigd.
- `.github/**` staat in de ignore-lijsten van beide Hosting-doelen. Dit rapport is geen nieuwe openbare pagina.
- Broncode-aanwezigheid/afwezigheid en officiële voorwaarden gecontroleerd. De voorgestelde nieuwe functies zijn **niet geïmplementeerd of functioneel goedgekeurd**.
- Geen actieve proefperioden, nieuwe credentials, externe berichten of betaalde pakketten aangemaakt. Geen productie-uitrol of push naar main uitgevoerd.
