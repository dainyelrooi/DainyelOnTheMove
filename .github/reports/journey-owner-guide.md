# Beheer van de reiservaring

Deze handleiding hoort bij de reisuitbreiding. De nieuwe serverdienst is nog uitgeschakeld. Bestaande Q&A en Brevo blijven hun bestaande diensten gebruiken. Op 21 oktober is het paspoort op verzoek verwijderd en de eerdere kaartweergave hersteld zonder de nieuwe terugblikfilters. Er is geen campagne voor deze websitewijzigingen toegestaan.

## Kort vanaf je telefoon

1. Open `/studio` en meld je aan met het bestaande, geverifieerde eigenaarsaccount.
2. Kies **Journey publishing desk → New entry**.
3. Kies Field Note, gedeelde check-in, bevestiging van vertrek, onthulde stop, verzonden Postcard, echte uitgave of challenge.
4. Vul uitsluitend echte gegevens in. De gebeurtenisdatum staat los van de publicatiedatum; de server bepaalt die laatste bij publicatie.
5. Kies **Preview** en controleer tekst, plaats, datum en bestaande foto. **Save privately** bewaart een concept. **Publish reviewed entry** publiceert expliciet. **Withdraw** trekt de publieke versie in.
6. Bij gelijktijdig bewerken vraagt een conflict om opnieuw laden. De inhoud wordt niet stil overschreven.

Dit werkt pas na configuratie en goedgekeurde ingebruikname van de serverdienst. Tot die tijd meldt de beheerpagina dat niets kan worden opgeslagen. Bestaande Q&A-moderatie blijft daaronder beschikbaar.

## Vertrek en locatie

- De geplande vertrekdatum blijft 28 oktober 2026, 00:00 Nederland. Na die datum verschijnt een neutrale melding zolang je het vertrek niet bevestigt.
- Bevestig alleen een werkelijk vertrek, met datum, tijd en tijdzone. Reisdagen tellen kalenderdagen in Europe/Amsterdam, niet verstreken blokken van 24 uur.
- Een check-in is een gekozen stad en land, met een deelmoment. Het is geen GPS-volgsysteem. Een onthulde stop is een aparte, expliciete publicatie.
- Het bestaande knopje voor het opzoeken van een plaats vult alleen de velden in; je beoordeelt ze zelf voor opslaan. Er is geen automatische check-in meer bij aanmelden.

## Field Notes en foto’s

- De drie bestaande archiefnotities hebben eigen links. Hun oorspronkelijke publicatiedatum is onbekend en wordt daarom niet als vandaag weergegeven.
- Nieuwe notities krijgen een gebeurtenisdatum en een echte publicatietijd. Verbind ze met een al openbare bestemming en een bestaand verhaal.
- De mobiele beheerder kiest uit bestaande, goedgekeurde websitefoto’s. Upload van nieuwe foto’s is niet toegevoegd: die moeten eerst worden verkleind, van privémetadata ontdaan en aan de bestaande mediabibliotheek toegevoegd. De tekstworkflow kan zonder foto worden gebruikt.
- Statische archiefitems worden nog via `data/journey.json` en de composer beheerd. Wijziging of intrekking van zo’n statisch item vereist een nieuwe beoordeelde websiteversie; het serverbeheer doet niet alsof een al gehost statisch bestand daarmee is verwijderd.

## Postcards

- De bestaande uitgeklapte/ingeklapte Brevo-inschrijving blijft behouden, inclusief toestemming, CAPTCHA en single opt-in.
- Het openbare archief begint met de reeds verzonden Thailand-editie van 19 oktober. De tekst komt uit de bestaande editie. Persoonlijke ontvanger-, tracking- en afmeldlinks komen niet in het archief.
- Voeg toekomstige edities pas toe nadat ze zijn verzonden en de openbare kopie is gecontroleerd. De beheerder accepteert geen verzenddatum in de toekomst.
- Publicatie op de website verstuurt geen nieuwsbrief. Brevo blijft de plek voor inschrijvingen, campagnes en afmeldingen.

## Kosten

- €8.000–€10.000 is een **richtbudget**, met de wens om onder budget te blijven. Het is geen geregistreerde uitgave.
- Vul oorspronkelijke valuta, werkelijk betaald bedrag, eigen aandeel, categorie, datum en dekking in. Beschrijf groepsverdeling, inbegrepen posten en ontbrekende posten. Geen boekingscodes, betaalgegevens of verblijfadres.
- Bedragen worden als gehele kleinste valuta-eenheden opgeslagen. Een bedrag met te veel decimalen wordt geweigerd.
- Valuta worden niet opgeteld. Het daggemiddelde is het eigen geregistreerde aandeel gedeeld door de inclusieve kalenderperiode van de selectie; het overzicht blijft als gedeeltelijk aangeduid.
- Zolang er geen echte records zijn, staan er geen bestedingstotalen of daggemiddelden.

## Challenges en vragen

- Suggesties beginnen privé. Alleen de geverifieerde eigenaar kan ze publiceren, afwijzen of intrekken.
- Publicatiestatus en voortgang zijn apart. Een afgeronde challenge heeft een echte beschreven uitkomst nodig.
- Een bezoeker krijgt een persoonlijke bewerksleutel. Wijzigingen halen de publieke versie weg en keren terug naar beoordeling. Die sleutel komt niet in een openbare URL of zoekindex.
- Q&A-antwoorden worden op beantwoordatum gesorteerd en krijgen eigen deellinks. De bijbehorende database-index moet bij de goedgekeurde release worden toegepast.

## Contact

- Het nieuwe formulier vraagt een antwoordadres en toestemming voor behandeling van de aanvraag; het schrijft niemand in voor Postcards.
- Zonder geconfigureerde dienst wordt niets verzonden en verschijnt geen succesmelding.
- De server bewaart een inzending één keer en voorkomt herhaling bij dubbelklikken of opnieuw proberen met dezelfde referentie. Onduidelijke mailuitkomsten worden vastgehouden voor controle, niet automatisch opnieuw verzonden.
- “Received” betekent ontvangst door de dienst, niet bewezen inboxbezorging. Eén gecontroleerde test naar de privé opgegeven eigen mailbox is toegestaan, maar nog niet uitgevoerd wegens de ontbrekende runtime/mailconfiguratie. De privétestontvanger is niet aan publieke bestanden toegevoegd.

## Terugzetten en privacy

- Lokale bronbackup: `backups/website_2026-10-20_21-26-33` in de bovenliggende projectmap. Git-startpunt: staging `9a2b132`.
- De frontend is op 21 oktober gepubliceerd op staging. Daarna heeft de eigenaar livegang goedgekeurd met verwijdering van paspoort en terugblikfilters; zie het bijbehorende releaseverslag voor de geverifieerde publicatiestatus.
- Bij een latere release kan de vorige Hosting-versie worden teruggezet. Schakel ook `data/services.json` terug naar uitgeschakeld als de API niet beschikbaar is. Terugzetten van de website maakt databasepublicaties niet ongedaan; trek die expliciet in via de beheerder.
- Servermailrecords hebben een bewaartermijn van maximaal 90 dagen, abuse-buckets twee uur. `expiresAt` is opgenomen; automatische TTL is niet op afstand aangezet. De eigenaar moet verwijderen conform de privacytekst totdat een echte purge/TTL wordt ingericht.
- Het digitale paspoort is verwijderd. De website leest of schrijft de vroegere lokale paspoortopslag niet meer.
