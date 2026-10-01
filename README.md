# ContrOwl: web directa, gratuïta i sense servidor de dades

- **Alumnat:** https://aagust11.github.io/contrOwl_test/
- **Docent:** https://aagust11.github.io/contrOwl_test/administration/

GitHub Pages només distribueix els fitxers estàtics de l’aplicació. Les pantalles, les ordres i les incidències viatgen **directament de navegador a navegador**, amb WebRTC DataChannel xifrat. No hi ha API, servidor WebSocket, Google AI Studio, Gemini, Render, base de dades al núvol, STUN, TURN ni servidor de senyalització. No cal contractar res, crear comptes ni instal·lar cap programa als equips de l’aula.

## Com utilitzar-lo

1. El docent obre `/administration/` amb Chrome o Edge, crea una sessió amb nom i URL HTTPS de l’examen i comunica el codi de sis caràcters.
2. Cada alumne obre la portada, escriu el seu nom i el codi i prem **Crear invitació**.
3. L’alumne passa el text o fitxer JSON al docent. El docent l’importa a **Invitació de l’alumne** i prem **Acceptar invitació**.
4. El docent retorna la **Resposta per a l’alumne**. L’alumne l’importa i prem **Connectar amb el docent**.
5. L’alumne prem **Compartir pantalla i continuar** i selecciona **pantalla completa** en el diàleg del navegador. El docent comença a rebre la pantalla, aproximadament una captura per segon.

Els textos es poden transferir com a fitxers amb una memòria USB: no cal cap servei extern per aparellar-se. Caduquen als 15 minuts. El codi identifica la sessió, però **no permet descobrir per si sol un altre navegador**. L’intercanvi manual substitueix el servidor de senyalització i s’ha de fer per un canal de confiança; no publiqueu les invitacions ni les respostes.

Els equips han de tenir comunicació directa entre ells. Habitualment serà la mateixa xarxa local amb el trànsit entre clients permès. Una Wi-Fi de convidats, l’aïllament de clients, el tallafoc o alguns NAT poden impedir-ho. No s’utilitza cap relé extern com a alternativa. En aquests casos cal ajustar la xarxa del centre. No es garanteix la connexió entre dues xarxes d’Internet arbitràries.

La web de l’examen ha de permetre incrustar-se en un iframe. La seva configuració `X-Frame-Options`/CSP pot impedir-ho. Les peticions que faci aquesta web continuen anant al seu proveïdor: la connexió directa es refereix a les dades de supervisió de ContrOwl.

## Tancar i recuperar el panell docent

Les sessions, alumnes, bloquejos, incidències, captures manuals i identitat criptogràfica del docent es desen a **IndexedDB del seu navegador**. En reobrir `/administration/` al mateix navegador i perfil es recupera l’estat, també després de reiniciar el navegador. Només es permet un panell docent actiu per perfil.

**Una web tancada no pot rebre dades ni mantenir una connexió WebRTC.** Els alumnes queden bloquejats dins de la pàgina si es talla la connexió. Conserven localment les incidències pendents i les reenvien quan es torna a aparellar cada alumne amb una invitació i resposta noves. Es conserven les imatges de les tres incidències pendents més recents; de les anteriors es mantenen hora i motiu. El docent confirma la recepció només després de desar les dades. No es finalitza automàticament la sessió quan es tanca el panell.

No hi ha sincronització del perfil amb altres ordinadors. Esborrar les dades del lloc elimina el desat local. El mode privat no és adequat per conservar sessions. **Exportar informe** genera un JSON de lectura amb les proves, sense tokens ni claus privades; no és un fitxer de restauració de la identitat del docent. Si l’emmagatzematge s’omple, es mostra l’error i les incidències no es confirmen com a desades.

## Abast del control

- Pantalla completa autoritzada explícitament, sense àudio: JPEG de fins a 960 px, aproximadament 1 FPS.
- Buffer local de fins a 15 captures / 15 segons; el navegador pot reduir-ne la freqüència en segon pla.
- Incidència i bloqueig de la pàgina en ocultar-la, perdre el docent o aturar la compartició.
- Revisió de fotogrames, captura manual i desbloqueig remot amb signatures ECDSA, identificador d’aparellament, caducitat i protecció contra repeticions.
- L’iframe es manté muntat durant un bloqueig/reconnexió per conservar les respostes mentre la pàgina de l’alumne segueixi oberta.
- Finalitzar una sessió atura la captura als alumnes connectats; els desconnectats reben la finalització quan es tornen a aparellar.

Una web **no pot bloquejar Alt+Tab, la tecla Windows ni altres aplicacions**, ni enumerar processos, ni garantir que un client modificat informi honestament. Detecta senyals observables del navegador. No és un entorn d’examen inviolable. Vegeu [REQUERIMENTS.md](REQUERIMENTS.md) per a l’estat de cada requisit.

## Desenvolupament i publicació

Només per modificar el codi; no són passos que hagin de fer alumnes ni docents:

```sh
bun install --frozen-lockfile
bun run dev
bun run lint
PAGES_BASE_PATH=/contrOwl_test/ bun run build
bun run test:pages
```

El workflow de GitHub Actions compila, comprova les rutes estàtiques, executa proves de dos navegadors amb WebRTC real i publica a GitHub Pages si tot passa. La carpeta `administration/index.html` permet l’accés directe i la recàrrega de la ruta docent. No es necessiten variables de servei ni secrets de pagament.

La prova `test:peer` comprova transmissió de captures/incidències, desbloqueig, preservació de respostes, reinici complet del navegador docent, recuperació d’IndexedDB i reenviament pendent. Només la font de captura de pantalla és sintètica: el transport WebRTC és natiu i els navegadors són processos diferents. Cal validar manualment el selector real de pantalla i la connectivitat de la xarxa de l’aula; la prova no acredita rendiment amb 30 equips.

La demostració anterior amb dades simulades es conserva a `?demo=1`; no és el flux principal.
