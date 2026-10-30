# Nieuwe vragen beheren

Deze aparte inbox is bedoeld voor nieuwe vragen aan Dainyel, communityvragen en reacties. Je bestaande vragen blijven in hun huidige onderdelen staan. Verhalen, foto's, agenda en contactformulier blijven hun bestaande opslag gebruiken.

1. Open de admin en log in met je bestaande account en Authenticator.
2. Ga naar **Questions**. Bovenaan staat **New questions & community contributions**.
3. Kies **To review** om nieuwe inzendingen te lezen. Ze zijn nog niet openbaar.
4. Schrijf bij een persoonlijke vraag je antwoord en klik **Publish answer**. Gebruik bij een communityvraag of reactie **Approve contribution**.
5. Kies **Published** om eerdere bijdragen terug te vinden. **Hide and review** haalt een bijdrage uit de openbare verzameling en zet hem terug naar de privéwachtrij.
6. **Archive privately** bewaart de inzending privé. Kies **Archived** en **Return to review** om deze weer te behandelen. Bij een privacyverzoek kun je een gearchiveerde inzending met **Delete permanently** en de bevestiging definitief verwijderen. De tekst kan daarna niet worden teruggehaald; een leeg, willekeurig referentienummer voorkomt dat een vertraagde verzending de verwijderde tekst opnieuw opslaat.
7. Gebruik **Refresh inbox** voor nieuwe inzendingen en **More contributions** voor oudere pagina's.

De teller bij **Questions** telt deze nieuwe inbox ook mee. Een `+` betekent dat meer inzendingen op andere pagina's kunnen staan; een `!` betekent dat de telling niet geladen kon worden. Dat is geen bevestiging dat de inbox leeg is. De teller gebruikt de al geladen privéwachtrij; vernieuw deze om nieuwe inzendingen op te halen.

De openbare website haalt nieuwe goedgekeurde bijdragen op bij het openen van de pagina of via Retry. Een bezoeker die de pagina al open heeft, ziet een wijziging na vernieuwen. Een verwijdering is dus niet onmiddellijk zichtbaar in ieder reeds geopend venster.

Cloudflare biedt op het gratis abonnement zeven dagen databaseherstel via D1 → de database → Time Travel. Dit herstelt de hele database, niet één losse vraag; gebruik het alleen na controle van de gevolgen voor nieuwere bijdragen en eerdere verwijderingen. De bestaande Firebase-inhoudsbackups omvatten deze aparte inbox niet.

Bij een verbindingsfout blijft de tekst van de bezoeker staan. Diezelfde inzending kan opnieuw geprobeerd worden met hetzelfde referentienummer. De tekst blijft daarbij vastgezet om dubbele of verschillende inzendingen onder één referentie te voorkomen. Een bevestiging betekent dat de vraag in de privé-inbox is opgeslagen; deze functie verstuurt geen mail.

Er is geen betaald abonnement ingeschakeld. Zowel Cloudflare als de website hebben limieten om misbruik te beperken. Een storing of bereikt Cloudflare-daglimiet kan ook deze route tijdelijk blokkeren; tekst wordt dan niet als ontvangen bevestigd. Je kunt beheerrechten voor Wrangler terugvinden en intrekken via Cloudflare **My Profile → Access Management → Connected Applications**. Trek ze niet in zolang een goedgekeurde publicatie nog bezig is.
