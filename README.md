# ContrOwl: accés automàtic per codi, 100% web

- **Alumnat:** https://aagust11.github.io/contrOwl_test/
- **Docent:** https://aagust11.github.io/contrOwl_test/administration/

GitHub Pages distribueix l’aplicació estàtica. S’utilitza **PeerJS Cloud gratuït per descobrir els navegadors i negociar la connexió**, com a la versió antiga `aagust11/web_block`. No cal instal·lar res, configurar cap servidor local, crear un compte ni introduir claus d’API.

**Això sí que depèn d’un servei extern de connexió.** No es presenta com una solució sense servidors: PeerJS gestiona la senyalització i un servei STUN ajuda a trobar la ruta de xarxa. Les captures, incidències i ordres viatgen pel canal WebRTC directe; no es desen a PeerJS. No s’utilitza TURN per retransmetre pantalles. El servei gratuït no ofereix aquí cap garantia contractual de disponibilitat.

## Com utilitzar-lo

1. El docent obre `/administration/` amb Chrome o Edge i crea una sessió amb nom i URL HTTPS de l’examen.
2. Quan apareix **Codi actiu**, dona el codi de sis caràcters als alumnes.
3. Cada alumne obre la portada, escriu nom i codi, i prem **Entrar**.
4. El navegador demana compartir pantalla: l’alumne selecciona **pantalla completa**. Aquest permís explícit és obligatori; no es pot eliminar des d’una web.
5. La connexió es fa automàticament, s’obre l’examen i el docent rep la pantalla aproximadament un cop per segon. No hi ha invitacions ni respostes per copiar.

Cada sessió té el seu identificador de connexió, en lloc de l’identificador docent global `contrOwl-admin` de la versió antiga. Els codis s’escriuen indistintament en majúscules o minúscules. Si el codi està ocupat, el panell ho indica; es pot crear una altra sessió amb un altre codi.

Cal accés a Internet per al servei PeerJS i una xarxa que permeti WebRTC entre els equips. L’aïllament de clients, el tallafoc o alguns NAT poden impedir la connexió directa. Un servei de descoberta no elimina aquestes restriccions. No es garanteix la connexió entre xarxes arbitràries sense relé.

La web de l’examen ha de permetre incrustar-se en un iframe. La seva configuració `X-Frame-Options`/CSP pot impedir-ho. Les peticions que faci aquesta web continuen anant al seu proveïdor.

## Tancar i recuperar el panell docent

Les sessions, alumnes, bloquejos, incidències, captures manuals i identitat criptogràfica del docent es desen a **IndexedDB del seu navegador**. En reobrir `/administration/` al mateix navegador i perfil es recupera l’estat, també després de reiniciar el navegador. Només es permet un panell docent actiu per perfil.

**Una web tancada no pot rebre dades ni mantenir una connexió WebRTC.** Els alumnes queden bloquejats dins de la pàgina si es talla la connexió. Conserven localment les incidències pendents i les reenvien quan el docent torna a obrir el panell i els alumnes es reconnecten automàticament. Es conserven les imatges de les tres incidències pendents més recents; de les anteriors es mantenen hora i motiu. El docent confirma la recepció només després de desar les dades. No es finalitza automàticament la sessió quan es tanca el panell.

No hi ha sincronització del perfil amb altres ordinadors. Esborrar les dades del lloc elimina el desat local. El mode privat no és adequat per conservar sessions. **Exportar informe** genera un JSON de lectura amb les proves, sense tokens ni claus privades; no és un fitxer de restauració de la identitat del docent. Si l’emmagatzematge s’omple, es mostra l’error i les incidències no es confirmen com a desades.

## Abast del control

- Pantalla completa autoritzada explícitament, sense àudio: JPEG de fins a 960 px, aproximadament 1 FPS.
- Buffer local de fins a 15 captures / 15 segons; el navegador pot reduir-ne la freqüència en segon pla.
- Incidència i bloqueig de la pàgina en ocultar-la, perdre el docent o aturar la compartició.
- Revisió de fotogrames, captura manual i desbloqueig remot amb signatures ECDSA, identificador d’aparellament, caducitat i protecció contra repeticions.
- L’iframe es manté muntat durant un bloqueig/reconnexió per conservar les respostes mentre la pàgina de l’alumne segueixi oberta.
- Finalitzar una sessió atura la captura als alumnes connectats; els desconnectats reben la finalització quan es reconnecten.

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

La prova `test:peer` utilitza el servei públic real de PeerJS amb dades de prova i comprova transmissió de captures/incidències, desbloqueig, preservació de respostes, reinici complet del navegador docent, reconnexió automàtica, recuperació d’IndexedDB i reenviament pendent. També comprova que no s’enviïn imatges ni el nom de prova pel WebSocket de senyalització. Només la font de captura de pantalla és sintètica: el transport WebRTC és natiu i els navegadors són processos diferents. Cal validar manualment el selector real de pantalla i la connectivitat de la xarxa de l’aula; la prova no acredita rendiment amb 30 equips.

La demostració anterior amb dades simulades es conserva a `?demo=1`; no és el flux principal.

## Identitat i dependències

La primera connexió fixa la clau pública del docent al navegador de l’alumne (confiança en el primer ús). Les reconnexions exigeixen la mateixa clau i una configuració signada abans d’enviar captures o proves. El codi compartit i el servei de descoberta no constitueixen autenticació institucional: un tercer que ocupi un codi abans del docent podria suplantar-lo davant alumnes que encara no l’hagin conegut. El panell avisa si el codi no es pot registrar. No es reutilitza la contrasenya mestra pública de la versió antiga.

Dependències de xarxa: `0.peerjs.com` (HTTPS/WSS, registre d’identificadors i SDP/ICE), `stun.l.google.com:19302` (descoberta de xarxa), GitHub Pages (fitxers estàtics) i la URL d’examen escollida. La biblioteca PeerJS s’inclou a la compilació; no es carrega d’un CDN addicional. No s’envien el nom, token de reconnexió, captures ni incidències com a metadades de senyalització: aquests missatges van pel canal directe.
