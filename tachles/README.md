# Tachles

Een PWA om werk-Engels te trainen voor een Hebreeuwstalige Group Product Manager in fintech. Amerikaans Engels, 30 minuten per dag, met haar eigen fouten, haar eigen mails en haar eigen stem. De app zelf is in het Engels; uitleg staat er in het Engels en Hebreeuws bij.

## Wat erin zit

- **Intake (20 min):** 3 spreekvragen, tot 3 echte mails, een quiz van 16 zinnen en 8 klemtoonwoorden. Daaruit volgt haar foutenprofiel en een nulmeting.
- **Dagelijkse sessie (30 min, of 10 min):**
  1. Herhalen (5 min)
  2. Valkuil van de dag (5 min)
  3. Schrijven (8 min)
  4. Spreken (8 min)
  5. Uitspraak en terugblik (4 min)
- **Mailcheck:** eerst zelf zoeken ("3 dingen: 2 voorzetsels, 1 hoofdletter"), daarna de fixes en een natuurlijke Amerikaanse versie. Er is een optie om namen en bedragen te anonimiseren.
- **Schrijflab:** schrijfopdrachten, fix-it, dictee, en een tekst na een week opnieuw schrijven.
- **Zeg het in het Engels:** 123 oefenzinnen met de typische Hebreeuws-Engelse valkuilen, gericht op werk en fintech.
- **Uitspraaklab:**
  - klemtoon van 45 vakwoorden;
  - 8 sets klankparen;
  - can/can't;
  - -ed-uitgangen;
  - shadowing.
- **Spreken:**
  - 8 werkgesprekken (roadmap-review, kwartaalupdate, feedback, terugduwen, compliance, partnercall, pitch, small talk);
  - "Prepare for something real";
  - 4/3/2 voor vloeiendheid.
- **Logboek:** elke fout wordt een kaart die terugkomt na 1, 3, 7 en 21 dagen. Na 3 keer goed op rij verdwijnt de kaart.
- **Check-in om de 2 weken:** steeds dezelfde vaste vraag (voor oud versus nieuw), een nieuwe vraag en een schrijfopdracht zonder hulp.
- **Voortgang:**
  - fouten per 100 woorden (schrijven en spreken);
  - spreektempo;
  - uitspraakscore;
  - zelfvertrouwen per week;
  - eerste en laatste opname naast elkaar.

## Drie niveaus

| Wat je instelt | Wat werkt |
| --- | --- |
| Niets (offline) | Oefenzinnen, uitspraak, logboek, opnames, dictee, 4/3/2 (zelf terugluisteren) |
| `ANTHROPIC_API_KEY` | + mailcheck, schrijfcorrectie, gesprekken met feedback, voorbereiden, analyse van intake en check-in |
| + `OPENAI_API_KEY` | + letterlijke spraak-naar-tekst (Whisper), zodat haar echte fouten zichtbaar blijven |
| + `AZURE_SPEECH_KEY` en `AZURE_SPEECH_REGION` | + uitspraakscore per woord en per klank |

Zonder Whisper gebruikt de app de spraakherkenning van de browser. Die poetst fouten soms stilletjes weg ("responsible on" wordt dan "responsible for"). Daarom is Whisper aan te raden.

## Online zetten (Netlify)

Netlify Drop (slepen) bouwt geen functions. Gebruik daarom de CLI of GitHub.

```
cd tachles
npx netlify-cli login
npx netlify-cli deploy --prod
```

Zet daarna in Netlify (Site settings > Environment variables):

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY` (optioneel)
- `AZURE_SPEECH_KEY` en `AZURE_SPEECH_REGION`, bijvoorbeeld `westeurope` (optioneel)
- `APP_PASSCODE`: **zet dit wel**. Anders kan iedereen met de link op jouw kosten de AI gebruiken. Vul dezelfde code in de app in bij Settings.
- `CLAUDE_MODEL` (standaard `claude-sonnet-5-5`) en `CLAUDE_MODEL_FAST` (standaard `claude-haiku-5-5`, voor gesprekken)

Deploy opnieuw na het zetten van de variabelen.

**Time-outs:** Netlify-functies stoppen standaard na 10 seconden. Een lange analyse kan daar overheen gaan. Je hebt twee oplossingen:

1. Vraag Netlify om 26 seconden.
2. Vul in de app bij Settings een eigen Claude API-key in ("direct mode"). De browser praat dan rechtstreeks met Anthropic, zonder limiet. De key blijft op het toestel en gaat niet mee in back-ups.

**Op de telefoon:** open de link in Safari (iPhone) of Chrome (Android) en kies "Zet op beginscherm". De microfoon werkt alleen via https.

## Privacy

- Alles (voortgang, logboek, opnames) staat lokaal op het toestel: localStorage en IndexedDB.
- Naar de AI gaan alleen de tekst of audio van de oefening zelf.
- Je kunt opnames wissen in Settings.
- De back-up bevat geen opnames, geen key en geen passcode.

## Kosten

Ik schat dat 30 minuten per dag uitkomt op een paar tientjes per maand of minder voor AI en spraak samen. Dit is niet doorgerekend; kijk na de eerste week naar de echte rekeningen.

## Tests

```
node tools/tests/engine.test.js       # 123 oefenzinnen, checker, logboek, profiel, anonimiseren
node tools/tests/functions.test.mjs   # serverfuncties met nep-API's
MOCK=1 node tools/serve.mjs 8765 &    # lokale server met nep-AI
MOCK=0 node tools/serve.mjs 8766 &    # lokale server zonder AI
python3 tools/flow.py                 # volledige flows: intake, sessie, mailcheck, gesprek, check-in, voortgang
python3 tools/direct.py               # direct mode en lange audio
python3 tools/overflow.py             # geen tekst buiten beeld op 320 tot 768 px
```
