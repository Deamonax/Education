# Education

Twee leer-apps voor thuis, elk als eigen Netlify-site:

- `leesrijk/`: LeesRijk, dagelijkse leesoefening (Leesroute, 12 weken).
- `Rekenrijk/`: RekenRijk, rekenavonturen, Kangoeroe-oefening en rekenarena.

Elke speler heeft een code (Instellingen of het tandwieltje bij de speler). Met die code ziet elk apparaat dezelfde voortgang.
Dat loopt via `netlify/functions/sync.mjs` en Netlify Blobs. Zonder internet werken de apps gewoon door.

Na een wijziging: `python3 tools/refresh-offline.py` in de map van de app, zodat de offline-versie wordt bijgewerkt.
