# ContrOwl · demostració per a GitHub Pages

Prototip React/Vite procedent de Google AI Studio, adaptat per executar-se com a web estàtica.

**No és encara un entorn segur d’examen.** La demo comparteix estat només entre les vistes dins la mateixa pestanya. No connecta ordinadors, no captura el monitor i no bloqueja el sistema. Es perd tot en recarregar. No introduïu dades reals per fer proves.

## Publicació

1. A Settings → Pages → Build and deployment, trieu **GitHub Actions**.
2. El workflow Pages s’executa amb cada push a main, o manualment des d’Actions.
3. Executa typecheck, build i smoke tests abans de publicar dist.
4. URL prevista: https://aagust11.github.io/contrOwl_test/

PAGES_BASE_PATH es calcula a partir del nom del repositori. Els recursos i el favicon respecten aquesta base. Si es passa a un domini propi, ajusteu la base a /.

## Desenvolupament

Amb Node 22 i Bun:

```sh
bun install --frozen-lockfile
bun run dev
bun run lint
PAGES_BASE_PATH=/contrOwl_test/ bun run build
bun run test:pages
bun run preview
```

No cal cap clau de Gemini ni cap servei d’AI Studio. Es conserva el lockfile i el conjunt de dependències original per no introduir actualitzacions alienes a l’adaptació.

## Com provar la demo

- Obriu Vista Dividida.
- Introduïu el codi visible i un nom de prova.
- Simuleu una incidència i desbloquegeu des del panell docent de la mateixa vista.
- Creeu una nova sessió: comença buida.
- Finalitzeu-la: s’aturen el buffer i els listeners del client.

Les captures són SVG de demostració. El buffer d’una incidència conserva només els frames disponibles, sense inventar historial. Els alumnes inicials són ficticis.

## Producte real

Consulteu [REQUERIMENTS.md](REQUERIMENTS.md). Cal un backend HTTPS/WSS autenticat i un client instal·lat o gestionat per aplicar restriccions del sistema. El fitxer server.ts original es conserva només com a prototip i es pot arrencar amb bun run dev:server; la demo Pages no l’utilitza i no és segur exposar-lo en producció.
