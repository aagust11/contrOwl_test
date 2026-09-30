# ContrOwl — estat del flux connectat

Revisió 30/09/2026. Arquitectura sol·licitada: **tot cap al PC principal del docent**. El servidor docent rep pantalles, captures, incidències i confirmacions; desa dades localment. GitHub Pages és només el punt d’entrada.

Font de la matriu: els 40 requisits originals del repositori. Encara no s’ha pogut contrastar l’adjunt extern Requirements.md amb les eines disponibles.

## Estat actual

IMPLEMENTAT significa codi present en el flux connectat, PARCIAL indica límits pendents, PENDENT és absent i DEMO només existeix a la demostració anterior. Les proves automatitzades de transport i navegador no acrediten bloqueig del sistema ni substitueixen la prova de l’aula.

| ID | Requeriment | Estat | Evidència i límit |
|---|---|---|---|
| REQ-01 | **Logo oficial ContrOwl**: Integració del fitxer d'imatge `contrOwl.png` a la capçalera, favicon, pantalla d'inici i pantalla de bloqueig. | IMPLEMENTAT | Logo tant a Pages com al servidor docent. |
| REQ-02 | **Document de requeriments viu**: Creació i actualització d'un document complet amb coses demanades, fetes, no fetes i comprovades. | IMPLEMENTAT | Document actualitzat amb límits i proves reals. |
| REQ-03 | **Temporitzador d'examen configurable**: El professor pot definir la durada (ex. 30, 45, 60, 90, 120 min o personalitzat / sense límit). | PENDENT | El flux connectat encara no inclou durada configurable. |
| REQ-04 | **Temporitzador visible a l'alumne**: Compte enrere en directe al client de l'alumne amb format `MM:SS`, barra de progrés i canvi de color (verd, ambre &lt;10m, vermell polsant &lt;3m, temps exhaurit). | PENDENT | Temporitzador disponible només a la demo anterior. |
| REQ-05 | **Temporitzador al panell docent**: Indicador del compte enrere i temps restant de la sessió visible per al professor. | PENDENT | Cal temporització autoritativa al servidor. |
| REQ-06 | **Creació de sessions**: Formulari de configuració amb nom, assignatura, grup, URL autoritzada i paràmetres de seguretat. | IMPLEMENTAT | POST autenticat; sessions persistents al PC docent. |
| REQ-07 | **Codi de sessió de 6 caràcters**: Codi únic de 6 dígits generat automàticament o manualment. | IMPLEMENTAT | Generació aleatòria o manual; 6 caràcters i unicitat de sessions actives. |
| REQ-08 | **Caràcters no ambigus**: Exclusió de caràcters confusibles (`0`, `O`, `1`, `I`, `L`), usant l'alfabet segur `23456789ABCDEFGHJKMNPQRSTUVWXYZ`. | IMPLEMENTAT | Alfabet no ambigu per generació; manual admet lletres A-Z i números 2-9. |
| REQ-09 | **Insensibilitat a majúscules/minúscules**: Normalització automàtica de codis (`k7m4px` = `K7M4PX`). | IMPLEMENTAT | Client i servidor normalitzen majúscules. |
| REQ-10 | **Accés senzill de l'alumnat**: Pantalla minimalista per introduir exclusivament el codi `[ _ _ _ _ _ _ ]` i botó ENTRAR. | PARCIAL | Cal conèixer l’adreça del PC docent; després codi i identificació. |
| REQ-11 | **Identificació obligatòria de l'alumne**: Demanar nom i cognoms abans de carregar la URL. La prova no s'obre sense identificació. | IMPLEMENTAT | Nom i dispositiu obligatoris abans de mostrar l’examen. |
| REQ-12 | **Associació alumne-dispositiu**: Vincular sessió, nom, dispositiu (ex. *Laia Martínez — PC-23*), IP i hora d'entrada. | PARCIAL | UUID i credencial separada; nom i equip declarats, no identitat institucional verificada. |
| REQ-13 | **Càrrega automàtica de la URL**: L'alumnat no escriu la URL; el codi de sessió determina la pàgina que s'obre automàticament. | PARCIAL | URL real dins iframe després de compartir pantalla; requereix que el web permeti ser incrustat. |
| REQ-14 | **Panell del docent (Taula)**: Llista de tots els alumnes connectats amb estat (🟢 Actiu, 🟡 Groc, 🔴 Bloc, ⚫ Offline) i incidències. | IMPLEMENTAT | Alumnes reals connectats per WebSocket, sense mocks en el flux principal. |
| REQ-15 | **Vista en directe de pantalles (Grid)**: Targetes de cada alumne amb miniatura, estat, nom, última actualització (*fa 1 s*) i alertes. | IMPLEMENTAT | JPEG de la pantalla autoritzada, amb hora de recepció i avís de desactualització. |
| REQ-16 | **Supervisió eficient de pantalla**: Actualització lleugera sense vídeo pesat a 60 FPS, optimitzada per a aules de 24+ dispositius. | PARCIAL | 960 px, JPEG qualitat 0,45 i 1 FPS; pendent càrrega real de 30 PC. |
| REQ-17 | **Vista ampliada de l'alumne**: Clic a qualsevol alumne per obrir modal a pantalla completa amb detalls, IP, pantalles i controls. | IMPLEMENTAT | Detall, imatge ampliada, incidències i captures des del PC docent. |
| REQ-18 | **Captura manual ("FER CAPTURA")**: Botó al panell docent que genera immediatament una captura vinculada a alumne, sessió i hora. | IMPLEMENTAT | Ordre signada al client; es desa la captura quan es rep. |
| REQ-19 | **Captures automàtiques per incidència**: Generació automàtica d'evidència visual davant intents d'Alt+Tab o canvi d'app. | PARCIAL | Envia buffer en ocultar pestanya o aturar captura; no detecta processos del sistema. |
| REQ-20 | **Buffer visual circular (10-15 segons)**: Memòria circular local que enregistra constantment els últims segons de pantalla de cada alumne. | IMPLEMENTAT | Fins a 15 frames/15 segons en memòria de l’alumne. |
| REQ-21 | **Congelació del buffer davant incidència**: Davant infracció crítica, el buffer es congela i es transmet complet al docent. | IMPLEMENTAT | Congela frames disponibles i els envia al PC docent; sense farciment fictici. |
| REQ-22 | **Revisió interactiva de l'historial visual**: Reproductor amb cursor temporal (`◀─────●─────▶ -15s ... 0s`) per analitzar la causa del bloqueig. | IMPLEMENTAT | Cursor per revisar els frames rebuts; buits explícits. |
| REQ-23 | **Motiu exacte del bloqueig**: Diagnòstic clar en pantalla (`ALT + TAB detectat`, `Tecla Windows detectada`, `Intent d’obrir chrome.exe`, etc.). | PARCIAL | Descriu senyals observats; no afirma saber quin procés ha obert l’alumne. |
| REQ-24 | **Bloqueig net de l'alumne**: Pantalla amb *"CONTROWL — Sessió temporalment bloquejada. Espera que el professor desbloquegi el dispositiu."* | PARCIAL | Pausa la pàgina; no bloqueja el sistema. Manté l’iframe per preservar respostes. |
| REQ-25 | **Absència de contrasenya local al dispositiu de l'alumne**: No existeix camp d'administrador ni contrasenya que el professor hagi de teclejar a l'ordinador de l'alumne. | IMPLEMENTAT | Cap contrasenya de desbloqueig a l’alumne; credencial docent separada. |
| REQ-26 | **Desbloqueig remot directe**: El professor prem "DESBLOQUEJAR" des del seu ordinador i el client s'allibera a l'instant per xarxa. | IMPLEMENTAT | Ordre ECDSA amb sessió/dispositiu, nonce, caducitat i confirmació del client. |
| REQ-27 | **Desbloqueig massiu**: Opcions per desbloquejar l'alumne seleccionat, un grup o **"Desbloquejar tots"** simultàniament. | IMPLEMENTAT | Envia ordres individuals a tots els alumnes connectats bloquejats. |
| REQ-28 | **Registre d'auditoria (Audit Log)**: Traçabilitat de cada bloqueig, acció detectada, revisió del professor i hora de desbloqueig. | PARCIAL | Registre persistent i exportable al PC docent; no és immutable davant administrador local. |
| REQ-29 | **Mode segur (Restriccions de teclat)**: Bloqueig d'Alt+Tab, Tecla Windows, Win+D, Win+E, Alt+F4, Ctrl+Shift+Esc, PrintScreen. | PENDENT | Requereix client natiu/quiosc gestionat. |
| REQ-30 | **Navegació restringida i llista blanca**: Permetre només la URL autoritzada i dominis de la llista blanca (`insmollet.cat`, `geogebra.org`, etc.). | PARCIAL | URL HTTPS inicial i iframe restringit; no és llista blanca del sistema. |
| REQ-31 | **Control del porta-retalls**: Opcions de Bloquejat, Intern (recomanat) o Permès. | PENDENT | Sense control general del porta-retalls en el client web real. |
| REQ-32 | **Neteja inicial del porta-retalls**: Buidar el porta-retalls en arrencar l'examen per evitar enganxar apunts preparats. | PENDENT | No es modifica el porta-retalls del sistema. |
| REQ-33 | **Detecció d'aplicacions externes**: Detectar obertura o intent d'accés a Chrome, Discord, ChatGPT, etc. | PENDENT | El navegador no enumera processos externs. |
| REQ-34 | **Monitorització del focus**: Registrar immediatament pèrdues de focus de la finestra de ContrOwl amb durada en segons. | PARCIAL | visibilitychange detecta pestanya oculta; no identifica totes les pèrdues de focus o aplicacions. |
| REQ-35 | **Codis de colors d'estat**: Verd (actiu), Groc (incidència menor), Vermell (bloquejat), Gris (offline). | IMPLEMENTAT | Estats de connexió, bloqueig i pantalla desactualitzada. |
| REQ-36 | **Privacitat per disseny**: Monitorització exclusivament durant la sessió; es desactiva en concloure la prova. | PARCIAL | Captura visible autoritzada, s’atura en finalitzar; retenció limitada, exportació i esborrat. Pendent validació organitzativa del centre. |
| REQ-37 | **Resiliència davant caiguda de xarxa**: Si cau la connexió, el mode segur continua actiu i no s'allibera l'entorn. | PARCIAL | Reconnexió autenticada i bloqueig conservat al servidor. No hi ha client de sistema inviolable. |
| REQ-38 | **Vista Dividida (Dual)**: Manera interactiva per visualitzar i testar el panell docent i el client alumne alhora. | DEMO | Vista dividida anterior conservada a ?demo=1. |
| REQ-39 | **Contingut d'examen interactiu**: Prova realista d'estructures (Institut Mollet) amb preguntes, navegació i càlculs. | DEMO | Examen d’estructures només a la demo; flux real carrega la URL del docent. |
| REQ-40 | **Simulador de seguretat docent**: Botons per disparar i provar directament les deteccions (Alt+Tab, Win, Focus, etc.). | DEMO | Botons simuladors només a la demo. Proves connectades separades. |

## Seguretat i dades

- Autenticació docent, tokens diferenciats, comprovació d’origen, rate limits i límits de missatge.
- L’alumne només rep les seves ordres i confirmacions. Només el docent rep imatges i estat general.
- Desbloqueig signat ECDSA P-256: destinatari, sessió, commandId únic, caducitat de 30 segons i ACK. Una confirmació repetida no desbloqueja una incidència nova.
- Desconnexió/reinici/reconnexió mantenen la pàgina bloquejada fins a autorització del docent.
- Captura explícitament autoritzada de pantalla sencera, sense àudio; 1 JPEG/s i buffer local de 15 s.
- Persistència local atòmica. Fins a 3 incidències i 3 captures per alumne; límit global d’evidències aproximat de 64 MiB, retirant primer les imatges antigues amb registre d’aquesta retirada.
- Exportació sense tokens ni claus; esborrat de sessions finalitzades i neteja del registre general.
- HTTPS de confiança a l’aula; sense TLS només localhost. No s’envien dades a GitHub, Gemini ni serveis externs, excepte les peticions que faci el web d’examen escollit.

## Pendent abans de considerar-ho un producte d’examen segur

1. Client instal·lat o entorn gestionat per restringir sistema operatiu, processos, navegació i porta-retalls.
2. Identitat institucional i vinculació fiable de dispositius; un nom autodeclarat no acredita qui és l’alumne.
3. Validació real de 30 dispositius, HTTPS, tallafoc i xarxa del centre.
4. Integració amb les plataformes d’examen que no admeten iframe i validació de conservació/lliurament de respostes.
5. Temporització autoritativa, inici programat i política de finalització per temps.
6. Auditar resistència a clients manipulats, retenció per dies, registres i gestió d’autoritzacions del centre.

## Proves automatitzades

El workflow comprova TypeScript, compilació, Pages, autenticació, aïllament d’alumnes, transmissió d’imatges, evidències, signatures, confirmacions, replay, persistència i finalització. La prova Playwright simula la font de captura per verificar el transport i els controls; **no valida el diàleg de captura real del sistema**.

Consulteu el resultat efectiu a GitHub Actions. Les instruccions d’arrencada i HTTPS són a [README.md](README.md).
