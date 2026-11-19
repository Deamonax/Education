# LeesRijk

Elke dag een kwartier lezen oefenen, voor kinderen met dyslexie. Gebouwd op de **Leesroute** (12 weken) die we eerder voor Emmanuel maakten. Zusje van RekenRijk.

## Openen

- **Dubbelklikken op `index.html` werkt.** Je voortgang wordt dan in die browser op die computer bewaard.
- **Online (aanrader, ook op tablet en telefoon):** sleep deze map naar [app.netlify.com/drop](https://app.netlify.com/drop). Daarna kun je de app op het beginscherm zetten en werkt hij ook zonder internet.

## Zo gebruik je het (elke dag ongeveer 15 minuten)

1. **De oefening van vandaag** (kind alleen, ongeveer 10 minuten). De app kijkt alles zelf na.
   - **De regel** van de week, met voorbeelden (kan voorgelezen worden).
   - **Hakken:** tik tussen de letters waar het woord in lettergrepen gaat. Of **zoek het stukje:** tik de lastige klank aan (ui, str, -lijk, ver-).
   - **Lang of kort?** De open-dicht-regel: ma-ken (lang) of mak-ker (kort).
   - **Flitsen:** het woord is heel even te zien, daarna kies je het uit vier woorden die erop lijken (bomen, bommen, bonen). De flitstijd past zich aan: twee keer goed is korter, één keer fout is langer. Zo oefen je steeds net op de rand van wat lukt (ongeveer 70% goed). Ook met onzinwoorden, omdat die alleen lukken als je echt elke letter leest.
   - **Dictee:** de app zegt het woord, het kind schrijft het. Fout? Dan zie je hoe het moet, met de regel erbij, en schrijf je het nog een keer goed over.
2. **Samen lezen** (5 minuten, met ouder). Het kind leest hardop, de ouder tikt fout gelezen woorden aan. Het kan op twee manieren:
   - **Tekst 3 keer lezen** met de klok (herhaald lezen). Bij de groep 6-teksten luister je eerst samen.
   - **Woordenrij:** woorden lezen, 1 minuut.
3. **Leestoets** (1 keer per week, 2 minuten met ouder). Je leest twee kaarten van 1 minuut, een met echte woorden en een met onzinwoorden. Zo zie je week na week de groei.

**Eieren en vriendjes.** Na elke volledige oefening van vandaag krijg je **4 eieren**. In elk ei zit een van de **200 vriendjes uit RekenRijk** (zelfde namen en plaatjes, zelfde kansen: meestal gewoon, soms zeldzaam, heel soms geheim). In het **vriendjesboek** zie je alle 20 groepen en kies je uit welke wereld je volgende eieren komen. Heb je 4 dezelfde? Ruil er 3 voor een vriendje dat je nog niet hebt. Je maatje staat op het beginscherm. Eieren die je nog niet hebt opengemaakt, blijven bewaard.

**Elke dag iets anders.** Per week zijn er nu 4 oefenteksten, zo'n 15 dicteewoorden en tot 90 extra oefenwoorden. De app onthoudt wat er al geweest is en kiest steeds eerst wat het langst niet aan bod was. Op één dag blijft de tekst wel hetzelfde, want die lees je 3 keer (herhaald lezen). De groep 6-teksten rouleren ook. Met "Andere teksten kiezen" pak je zelf een nieuwe. De regel van de week en de leestoets blijven bewust gelijk: de regel oefen je een hele week, en de toets moet elke week hetzelfde zijn om groei te kunnen zien.

Woorden die fout gaan, komen terug na ongeveer 1, 3, 7 en 21 dagen. Gaat een week goed (4 keer geoefend, gemiddeld 80% of meer)? Dan stelt de app voor om naar de volgende week te gaan. In Instellingen kun je de week ook zelf kiezen.

## Niveau (nieuw)

LeesRijk schat het niveau van je kind voor **woorden lezen** en **spelling**, en laat zien hoe zeker die schatting is. Je ziet het als groep, bijvoorbeeld "midden groep 4", met een 80%-zekere marge en het verwachte niveau voor de groep van je kind. **Tekst lezen** (woorden per minuut, nauwkeurigheid, hoe vaak ze zichzelf verbetert) en **begrijpen** (de vragen bij de groep 6-teksten) staan er los bij.

- **Hoe het werkt:** elk woord krijgt een moeilijkheid op basis van zijn bouw. Dat volgt de opbouw van de DMT-kaarten en de leerlijn technisch lezen:
  - groep 3: woorden van één lettergreep, ook met clusters (str, rfst);
  - groep 4: woorden van twee lettergrepen;
  - groep 5: woorden van drie lettergrepen en vaste stukken (be-, -ing);
  - groep 6 en hoger: lange woorden en leenwoorden.

  Ook meegewogen: hoe vaak een woord voorkomt, en of het een onzinwoord is. Elk antwoord (flitsen, hakken, niveaucheck, hardop lezen, dictee) maakt de schatting preciezer. De rekenwijze is dezelfde als in RekenRijk.
- **Niveaucheck (ongeveer 5 minuten, 16 tot 30 woorden):** de check werkt voor elk niveau van de basisschool. Hij kiest steeds het woord dat het meest vertelt, uit een woordenbank die loopt van heel korte woorden (ik, kip) tot woorden voor groep 8 (ontwikkelingssamenwerking, hygiëne). Hij stopt als de schatting zeker genoeg is. Jonge lezers krijgen het woord langer te zien (groep 3: 1 seconde), sterke lezers korter (tot 0,25 seconde), en dat rekent het model mee. De beginschatting is neutraal: de app neemt niet vooraf aan dat een kind achterloopt. Doe de check bij de start en daarna elke maand. Na afloop stelt de app de passende week van de Leesroute voor.
- **Eerlijke grenzen:** leest een kind beter dan de check kan meten, dan staat er "boven het meetbereik". Kan een kind nog geen begin groep 3-woorden lezen, dan staat er "onder het meetbereik", met het advies om eerst letters en klanken te oefenen.
- **Oefenen op niveau:** de oefenwoorden worden gekozen rond het niveau waarop ze ongeveer 80% goed heeft.
- **Gecontroleerd met een simulatie over alle niveaus** (`tools/tests/levels.sim.js`): 200 nagebootste lezers per niveau, van "kan nog niet lezen" tot volwassen.
  - Van midden groep 3 tot begin groep 8 zit de check gemiddeld 2 tot 3 schoolmaanden naast het echte niveau.
  - De 80%-marge bevat het echte niveau in 90 tot 97% van de gevallen. Hij is dus eerder te ruim dan te krap.
  - Een kind dat nog niet leest krijgt altijd "onder het meetbereik".
  - Een volwassene krijgt in 83% van de gevallen "boven het meetbereik" en anders midden of eind groep 8.
  - In midden groep 8 wordt het krap: daar zit hij gemiddeld 4 maanden naast, en vaak staat er dan "boven het meetbereik".
- **Eerlijk:** dit is een schatting op woordstructuur, geen genormeerde toets. De DMT en AVI van school blijven de echte meting.

## Spelling (nieuw)

- Het dictee herkent per woord de **spellingcategorie**: langermaakwoord, klankgroep lang of kort, ei/ij, au/ou, -ig/-lijk, zingwoord, luchtwoord, eer-oor-eur, aai-ooi-oei, eeuw-ieuw, vaste stukjes, leenwoord. Gaat het fout? Dan zegt de app welke regel erbij hoort.
- **Werkwoordspelling** (vanaf groep 5): de tegenwoordige tijd in een zin, zoals "Hij ... (worden) boos", met de lastige gevallen word/wordt, "word jij" en stammen op -t. Een fout krijgt uitleg op maat, bijvoorbeeld: "Je hoort een t, maar de stam is word."
- Het rapport toont welke categorieën het vaakst misgaan.

## Samen lezen (uitgebreid)

- Tik **1 keer** op een woord als het fout gelezen wordt, **2 keer** als je kind het zelf verbetert. Zelf verbeteren is een goed teken (ze controleert of het klopt) en telt niet als fout.
- Bij de groep 6-teksten staan **3 begripsvragen**. Die kunnen ook voorgelezen worden.

## Voor ouders

- **Rapport** (tab Ouders) toont:
  - de toetsscores per week
  - het hardop lezen: woorden per minuut bij keer 1, 2 en 3
  - welke **klankpatronen** het vaakst misgaan (bijvoorbeeld "twee letters, één klank" of "open lettergreep")
  - de woorden die terugkomen
  - tips
- **Instellingen per kind:**
  - extra letterafstand
  - lettergrootte
  - crème of blauwe achtergrond
  - kleurstukjes (lettergrepen in twee kleuren)
  - automatisch voorlezen
  - tempo van de stem
- **Bibliotheek:** alle teksten met "lees voor en lees mee" (het woord dat je hoort, licht op).

## Waar het op gebaseerd is

- Systematisch leren verklanken met regels (open en dichte lettergrepen, klankgroepen, vaste stukjes), zoals in de Nederlandse dyslexiebehandeling (Protocol Leesproblemen en Dyslexie).
- Vlotheid door **flitsen** en **herhaald lezen**. Herhaald lezen is een van de best onderzochte manieren om vlotter te lezen (National Reading Panel, 2000).
- **Extra letterafstand** helpt veel kinderen met dyslexie (Zorzi e.a., 2012).
- **Herhaling verspreid over dagen** (spacing).
- **Trapmethode voor de flitstijd** (Levitt, 1971).

## Wat de app niet kan

- **De app kan niet horen of je kind goed leest.** Spraakherkenning werkt bij kinderen te slecht en zou verkeerde fouten tellen. Daarom tikt de ouder fouten aan. Dat samen lezen is ook het belangrijkste deel.
- **De stem is de stem van je apparaat.** Op iPad, iPhone, Android en Windows is er meestal een goede Nederlandse stem. Is er geen Nederlandse stem? Dan laat het dictee het woord kort zien in plaats van het voor te lezen. Onzinwoorden worden nooit voorgelezen, want een computerstem spreekt die vaak verkeerd uit.
- **De leestoets lijkt op de DMT en de Klepel, maar heeft geen schoolnormen.** Vergelijk alleen met eerdere weken. De echte meting blijft de toets van school.
- **LeesRijk is een oefenprogramma, geen diagnose of behandeling.** Zit je kind in een vergoede dyslexiebehandeling? Laat de behandelaar weten wat je thuis oefent.

## Ontwikkelaars

- Gewone scripts, geen build-stap: `content.js` (data), `engine.js` (logica, zonder DOM), `app.js` (scherm).
- `node tools/tests/engine.test.js` test de lettergrepen, de lijkt-op-woorden, de lang/kort-regel, de flitstrap en de herhaling.
- `python3 tools/refresh-offline.py` maakt de offline-cache opnieuw na een wijziging.
- De data komt uit de Leesroute. Opnieuw maken kan met `tools/export_content.py` (in de werkmap, niet in deze zip).
