# Testresultaten — lancering28oktober

Resultaten gelden alleen voor hun beschreven versie/omgeving. PASS is geen bewijs voor ongeteste paden. Geen productie-inzending, nieuwsbrief of providerwijziging uitvoeren.

| Test | Resultaat | Bewijs en grens |
|---|---|---|
| Inventaris parser | PASS |712 trackedbestanden,30rootHTML/22sitemaproutes, geen ontbrekende lokale verwijzingen of dubbele IDs. Geen runtimebewijs |
| Bestaande Node-tests | PASS |20/20, `node --test .github/tests/journey.test.mjs .github/tests/service.test.mjs`; kalender/DST en geïsoleerde optionele servertests. Laatste is mock/localhost, geen gedeployde server |
| Bestaande Python-tests | PASS |15/15, unittest discover test_question_notifications; fixtures/mockprovider, geen mail |
| Publiek tripbestand | PASS |Validate-PublicTrip.py accepteert schema/verwijzingen. Geen onthulling of actuele reisbevestiging |
| Bestaande Check-Journey.py | FAIL |Meldt dynamische `/#search` als ontbrekend fragment; zoekfunctionaliteit nog apart te testen |
| Beveiligde test-admin | PASS gedeeltelijk |Eigenaar heeft privé ingelogd; dashboard zichtbaar. Werkelijke nieuwe opslag-/upload-/publicatietests volgen |
| Java/Firestore-emulator | Niet beschikbaar |Java niet op PATH, geen bestaande emulatorcache gevonden. Geïsoleerde lokale testmogelijkheid wordt onderzocht |
| Fysieke iPhone/Android/tablet | Niet getest |Browserformaten zijn geen fysiek apparaat of Safari/WebKitbewijs |
| Echte nieuwsbrief/afmelding | BLOCKED voor uitvoering |Geen echte abonnees of mailbox voor nieuwe mailingtest geautoriseerd; bestaande providerflow mag worden gelezen/gecontroleerd |

De testmatrix wordt uitgebreid met concrete browserpaden, foutgevallen, afmetingen en regressie-uitkomsten.
