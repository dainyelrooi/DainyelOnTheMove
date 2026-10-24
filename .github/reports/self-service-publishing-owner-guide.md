# Zelf posten op Dainyel on the Move

## Gebruik

1. Open `/admin#admin-create` en log in met je bestaande Google-/Authenticator-beveiliging.
2. Klik **New entry** en kies Travel story / blog, Field Note of Did you know?.
3. Vul titel, korte introductie en tekst in. Een plaats is optioneel; vul alleen in wat openbaar mag worden.
4. Voeg desgewenst maximaal twaalf foto's toe en beschrijf elke foto. **Use as cover** zet een foto vooraan. De browser verkleint foto's voordat ze worden geüpload. Niet-ondersteunde HEIC-foto's eerst als JPEG exporteren. Grote video's eerst op je eigen YouTube/Vimeo plaatsen en de link invoeren.
5. **Save draft** bewaart privé, ook als de tekst nog niet af is. **Preview** laat de opmaak zien. Controleer alles en vink de publicatiebevestiging aan.
6. **Publish on website** plaatst het bericht in Stories of Field Notes en geeft de eigen link. Op de testsite verschijnt het alleen op de testsite. Publiceren stuurt geen nieuwsbrief.
7. Open een opgeslagen bericht om verder te schrijven. Save draft verandert de publieke versie nog niet. Preview en Publish werken de publieke versie bij. **Take offline** trekt de publieke versie in; je concept blijft bewaard.

## Opmaak

Een lege regel maakt een nieuwe alinea. `## Een kop` wordt een kop; `**woorden**` wordt vet. Begin iedere regel van een opsomming met `- `. Een link kan als `[mijn link](https://example.com)`. Bij weetjes kun je bronlinks onder Sources zetten, één per regel. HTML wordt niet uitgevoerd.

## Ook zonder Codex

Je browser schrijft rechtstreeks naar de bestaande Firebase-opslag. Je hoeft geen chat, lokaal programma, codepublicatie of draaiende computer van Codex te hebben. Je gewone internetverbinding, Firebase-account en websitehosting zijn wel nodig. De bestaande beveiliging en gratis quota blijven van toepassing. Overschrijding van de gratis limieten kan functionaliteit tijdelijk blokkeren; er is geen facturering aangezet.

Gebruik **Download backup** voor een eigen bestand met tekst en verkleinde foto's. **Restore a downloaded backup** zet dit terug als nieuwe privé-kopie. Bewaar deze bestanden zelf veilig. Bij verbindingsproblemen claimt de pagina geen succes; houd je tekst vast en download een back-up. Als een bericht op een ander apparaat is gewijzigd, overschrijft de editor dat niet stilzwijgend.

Deze editor beheert nieuwe eigen berichten. De eerder met de hand opgebouwde oude reisartikelen worden hiermee niet overschreven. Nieuwe berichtinhoud wordt met JavaScript geladen; social previews en zoekmachine-indexering zijn niet hetzelfde als een vooraf gegenereerde statische artikelpagina.

De nieuwe databasebeveiliging is een prototype: privéconcepten vereisen de bestaande eigenaar mét Authenticator; alleen bewust gepubliceerde kopieën en hun geselecteerde foto's zijn openbaar. De normale publicatiecyclus is inmiddels met je ingelogde test-admin gecontroleerd. Dit is geen volledige beveiligingscontrole van alle accounts en foutscenario's; brede ingebruikname vraagt nog een apart goedgekeurde live-release.

## Banner, omslag en hoofdstukken

De eerste foto is de omslag op het overzicht. **Use as cover** zet een andere foto vooraan. Onder **Banner / main photograph** kies je los daarvan de foto bovenaan het artikel. Kies de gesplitste journal-opmaak of een brede banner en bepaal welk deel bij uitsnijden zichtbaar moet blijven.

Bij iedere foto kies je waar hij in je verhaal hoort: na de opening, na een hoofdstuk, of alleen als omslag/banner. Foto's binnen hetzelfde hoofdstuk worden samen een handmatige slideshow met vergroten en vorige/volgende. Wijzig je de hoofdstukvolgorde, controleer dan de foto-posities opnieuw; een verwijzing naar een verwijderd hoofdstuk blokkeert publicatie tot je een nieuwe positie kiest.

Met **Add a chapter** voeg je een hoofdstuktitel op de tekstcursor in. Een regel met `## ` wordt een hoofdstuk. Het hoofdstukmenu, de actieve hoofdstukmarkering en de geschatte leestijd (200 woorden per minuut) ontstaan automatisch. **Add a Did you know? card** voegt jouw eigen gecontroleerde feit met bronlink in; er wordt niets bedacht.

**Preview** opent een groot voorbeeld met dezelfde artikelopmaak. **Phone view** toont de smalle versie. Bekijk banneruitsnede, tekst, fotoposities en hoofdstukken; sluit het voorbeeld, bevestig en publiceer pas daarna. De galerij behoudt het hele beeld, ook als je banner wordt bijgesneden. Op de testsite blijft dit uitsluitend testcontent.

## Zelf een Postcard maken

Na publicatie kun je **Prepare a Postcard from this published entry** kiezen. Dat opent in Postcards een privé-mailconcept met de titel, introductie en publieke link. Pas onderwerp, inbox-preview, kop, tekst en linkknop aan. Een bestaande publieke websitefoto via /assets/ is optioneel; nieuwe Firestore-foto's worden niet automatisch naar Brevo geüpload.

**Save Postcard draft** bewaart privé. **Preview email** toont de template met je tekst en optionele foto. Links in dit voorbeeld zijn bewust niet aanklikbaar; bewerken verbergt het oude voorbeeld en wist de bevestiging. Na afzonderlijke live-activering kun je na controle de bevestiging aanvinken en **Send to subscribers** of **Schedule in Brevo** kiezen. Kies bij planning Nederlandse tijd, minimaal één uur vooruit. De aanvraag wordt op de achtergrond verwerkt; zodra Brevo de planning accepteert, staat die bij de provider. Dat werkt onafhankelijk van Codex en je computer. Verwerking kan vertragen; “queued” of “accepted” betekent nog niet afgeleverd.

Op de testsite zijn echte subscriber-verzending en planning geblokkeerd. Activering volgt pas bij een apart goedgekeurde productie-release. Publiceren op de website zelf stuurt geen mail. Combineer normale updates in je wekelijkse Postcard en controleer bestaande Brevo-planningen vóór een extra verzending.

Een Postcard kan één keer worden aangevraagd. Zolang de aanvraag nog “queued” is, kun je die annuleren. Na verwerking beheer je de campagne in Brevo. Bij een onduidelijke fout wordt niet automatisch nogmaals verstuurd; controleer eerst de provider. Brevo's gratis quota, uitschrijvingen en blokkades blijven gelden.

### Huidige status van de mailkoppeling

De template staat op de testsite. De door jou goedgekeurde campagne-, accountlees- en contactleesrechten zijn opgeslagen nadat je Brevo's eigen beveiligingscode privé bevestigde. Daarna is met jouw aparte akkoord de API-IP-blokkade uitgeschakeld, zodat de gratis achtergrondserver met wisselende IP-adressen verbinding kan maken. Dit geldt voor alle API-sleutels in je Brevo-account: een geldige sleutel werkt vanaf elk IP-adres. De sleutel blijft uitsluitend in de bestaande beveiligde serveropslag.

De controle van het gratis abonnement, de afzender en het juiste abonneesegment is nu geslaagd. Dit is nog geen bewijs van een echte nieuwsbriefverzending of inboxbezorging. Versturen en plannen blijven op de testsite geblokkeerd; de aparte productie-release en activering zijn nog nodig. Er is bij deze bouw geen nieuwsbrief of testmail verzonden. Brevo stuurde wel zijn eigen beveiligingsmail voor jouw bevestiging.

### Wat op de testsite is gecontroleerd

Met een duidelijk gemarkeerde kopie van je bestaande Filipijnenmateriaal zijn privé bewaren/heropenen, omslag versus banner, hoofdstukken, leestijd, fotogalerij, publiceren, bijwerken en offline halen doorlopen. Ook Field Note en Did you know?, back-up downloaden/terugzetten en het bewaren/heropenen van een Postcard met werkend voorbeeld zijn bekeken. De openbare testkopieën zijn daarna offline gehaald. Er blijven één privébericht en één privé-mailconcept voor deze controle staan; deze zijn herkenbaar aan STAGING CHECK. Een teruggezette back-up werd alleen bekeken en niet opnieuw opgeslagen of gepubliceerd.

De telefoonweergave in het artikelvoorbeeld is op 390px bekeken; dat is geen controle op ieder echt toestel. De mailverzending zelf is bewust niet uitgevoerd. De live website is bij deze afronding niet aangepast.
