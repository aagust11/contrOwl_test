# ContrOwl — requeriments i límits del mode web directe

Revisió 01/10/2026. Prioritat: **docent i alumnes només obren la web, connexió automàtica amb codi, sense configurar servidor local ni contractar serveis**. GitHub Pages serveix l’aplicació. PeerJS Cloud gratuït fa la senyalització, com a web_block; STUN ajuda a connectar. Pantalles i incidències van per WebRTC directe, sense TURN. Les dades es desen localment amb IndexedDB. Hi ha dependència externa per connectar; no es promet absència total de serveis ni disponibilitat garantida.

IMPLEMENTAT significa present al flux real. PARCIAL indica un límit concret; DEMO només existeix amb dades simulades a `?demo=1`. No es considera implementat un control del sistema que el navegador no pot exercir.

## Matriu dels 40 requisits originals del repositori

| ID | Requeriment | Estat | Evidència i límit actual |
|---|---|---|---|
| REQ-01 | **Logo oficial ContrOwl**: Integració del fitxer d'imatge `contrOwl.png` a la capçalera, favicon, pantalla d'inici i pantalla de bloqueig. | PARCIAL | Logo a la capçalera i favicon; no es replica a totes les pantalles. |
| REQ-02 | **Document de requeriments viu**: Creació i actualització d'un document complet amb coses demanades, fetes, no fetes i comprovades. | IMPLEMENTAT | Aquest document diferencia codi real, límits web i demostració. |
| REQ-03 | **Temporitzador d'examen configurable**: El professor pot definir la durada (ex. 30, 45, 60, 90, 120 min o personalitzat / sense límit). | PENDENT | La sessió es finalitza manualment; no té durada configurable. |
| REQ-04 | **Temporitzador visible a l'alumne**: Compte enrere en directe al client de l'alumne amb format `MM:SS`, barra de progrés i canvi de color (verd, ambre &lt;10m, vermell polsant &lt;3m, temps exhaurit). | DEMO | Temporitzador només a la demostració anterior. |
| REQ-05 | **Temporitzador al panell docent**: Indicador del compte enrere i temps restant de la sessió visible per al professor. | PENDENT | Sense compte enrere al flux directe. |
| REQ-06 | **Creació de sessions**: Formulari de configuració amb nom, assignatura, grup, URL autoritzada i paràmetres de seguretat. | PARCIAL | Nom i URL HTTPS; falta assignatura, grup i configuració avançada. |
| REQ-07 | **Codi de sessió de 6 caràcters**: Codi únic de 6 dígits generat automàticament o manualment. | IMPLEMENTAT | Sis caràcters aleatoris, únics dins el perfil docent. Identifiquen automàticament el docent al servei de connexió; el panell indica si el codi està ocupat. |
| REQ-08 | **Caràcters no ambigus**: Exclusió de caràcters confusibles (`0`, `O`, `1`, `I`, `L`), usant l'alfabet segur `23456789ABCDEFGHJKMNPQRSTUVWXYZ`. | IMPLEMENTAT | Alfabet 23456789ABCDEFGHJKMNPQRSTUVWXYZ, sense 0/O/1/I/L. |
| REQ-09 | **Insensibilitat a majúscules/minúscules**: Normalització automàtica de codis (`k7m4px` = `K7M4PX`). | IMPLEMENTAT | El formulari d’alumne normalitza a majúscules. |
| REQ-10 | **Accés senzill de l'alumnat**: Pantalla minimalista per introduir exclusivament el codi `[ _ _ _ _ _ _ ]` i botó ENTRAR. | PARCIAL | Nom i codi; en prémer Entrar es demana el permís de pantalla i es connecta automàticament. El permís no es pot ometre. |
| REQ-11 | **Identificació obligatòria de l'alumne**: Demanar nom i cognoms abans de carregar la URL. La prova no s'obre sense identificació. | IMPLEMENTAT | Nom obligatori abans de connectar amb el codi. Identitat autodeclarada. |
| REQ-12 | **Associació alumne-dispositiu**: Vincular sessió, nom, dispositiu (ex. *Laia Martínez — PC-23*), IP i hora d'entrada. | PARCIAL | UUID i token de reconnexió vinculats al perfil del navegador; sense verificació institucional ni nom d’equip/IP a la UI. |
| REQ-13 | **Càrrega automàtica de la URL**: L'alumnat no escriu la URL; el codi de sessió determina la pàgina que s'obre automàticament. | PARCIAL | URL enviada pel docent i mostrada després del permís de captura; ha de permetre iframe. |
| REQ-14 | **Panell del docent (Taula)**: Llista de tots els alumnes connectats amb estat (🟢 Actiu, 🟡 Groc, 🔴 Bloc, ⚫ Offline) i incidències. | PARCIAL | Targetes de connexió, bloqueig i incidències reals; sense vista de taula separada. |
| REQ-15 | **Vista en directe de pantalles (Grid)**: Targetes de cada alumne amb miniatura, estat, nom, última actualització (*fa 1 s*) i alertes. | PARCIAL | Miniatures reals rebudes per WebRTC; no hi ha indicador temporal de pantalla desactualitzada. |
| REQ-16 | **Supervisió eficient de pantalla**: Actualització lleugera sense vídeo pesat a 60 FPS, optimitzada per a aules de 24+ dispositius. | PARCIAL | JPEG de fins a 960 px, qualitat 0,45, 1 FPS; pendent validació de 24–30 equips. |
| REQ-17 | **Vista ampliada de l'alumne**: Clic a qualsevol alumne per obrir modal a pantalla completa amb detalls, IP, pantalles i controls. | PARCIAL | Proves i controls a la targeta; falta modal ampliat i informació d’IP. |
| REQ-18 | **Captura manual ("FER CAPTURA")**: Botó al panell docent que genera immediatament una captura vinculada a alumne, sessió i hora. | IMPLEMENTAT | Ordre signada de captura; desat local al docent amb hora i alumne. |
| REQ-19 | **Captures automàtiques per incidència**: Generació automàtica d'evidència visual davant intents d'Alt+Tab o canvi d'app. | PARCIAL | Captures en ocultar la pàgina, aturar compartició o desconnectar. No identifica Alt+Tab ni processos. |
| REQ-20 | **Buffer visual circular (10-15 segons)**: Memòria circular local que enregistra constantment els últims segons de pantalla de cada alumne. | IMPLEMENTAT | Fins a 15 fotogrames/15 segons locals; pot haver-n’hi menys per permisos o limitació del navegador. |
| REQ-21 | **Congelació del buffer davant incidència**: Davant infracció crítica, el buffer es congela i es transmet complet al docent. | IMPLEMENTAT | Es copia el buffer disponible i s’envia directament; les incidències sense connexió queden pendents. |
| REQ-22 | **Revisió interactiva de l'historial visual**: Reproductor amb cursor temporal (`◀─────●─────▶ -15s ... 0s`) per analitzar la causa del bloqueig. | IMPLEMENTAT | Cursor per triar fotogrames de la incidència amb hora. |
| REQ-23 | **Motiu exacte del bloqueig**: Diagnòstic clar en pantalla (`ALT + TAB detectat`, `Tecla Windows detectada`, `Intent d’obrir chrome.exe`, etc.). | PARCIAL | Descriu el senyal observat, sense inventar la tecla o aplicació que l’ha causat. |
| REQ-24 | **Bloqueig net de l'alumne**: Pantalla amb *"CONTROWL — Sessió temporalment bloquejada. Espera que el professor desbloquegi el dispositiu."* | PARCIAL | Bloqueja la pàgina d’examen mantenint l’iframe muntat; no bloqueja el sistema operatiu. |
| REQ-25 | **Absència de contrasenya local al dispositiu de l'alumne**: No existeix camp d'administrador ni contrasenya que el professor hagi de teclejar a l'ordinador de l'alumne. | IMPLEMENTAT | Desbloqueig pel canal del docent, sense contrasenya local d’alumne. |
| REQ-26 | **Desbloqueig remot directe**: El professor prem "DESBLOQUEJAR" des del seu ordinador i el client s'allibera a l'instant per xarxa. | IMPLEMENTAT | Ordre ECDSA dirigida a l’aparellament actual. No allibera una incidència posterior. |
| REQ-27 | **Desbloqueig massiu**: Opcions per desbloquejar l'alumne seleccionat, un grup o **"Desbloquejar tots"** simultàniament. | PENDENT | Desbloqueig individual; falta selecció múltiple/desbloqueig general. |
| REQ-28 | **Registre d'auditoria (Audit Log)**: Traçabilitat de cada bloqueig, acció detectada, revisió del professor i hora de desbloqueig. | PARCIAL | Incidències i captures persistents/exportables; falta registre de totes les accions del docent. |
| REQ-29 | **Mode segur (Restriccions de teclat)**: Bloqueig d'Alt+Tab, Tecla Windows, Win+D, Win+E, Alt+F4, Ctrl+Shift+Esc, PrintScreen. | NO VIABLE EN WEB PURA | El navegador no pot impedir tecles globals del sistema; caldria un entorn gestionat fora d’aquest abast. |
| REQ-30 | **Navegació restringida i llista blanca**: Permetre només la URL autoritzada i dominis de la llista blanca (`insmollet.cat`, `geogebra.org`, etc.). | PARCIAL | URL inicial HTTPS i iframe amb sandbox. No restringeix la navegació d’altres pestanyes ni del sistema. |
| REQ-31 | **Control del porta-retalls**: Opcions de Bloquejat, Intern (recomanat) o Permès. | PENDENT | No hi ha control global del porta-retalls des d’aquesta web. |
| REQ-32 | **Neteja inicial del porta-retalls**: Buidar el porta-retalls en arrencar l'examen per evitar enganxar apunts preparats. | PENDENT | No es buida el porta-retalls del sistema. |
| REQ-33 | **Detecció d'aplicacions externes**: Detectar obertura o intent d'accés a Chrome, Discord, ChatGPT, etc. | NO VIABLE EN WEB PURA | Una pàgina no pot enumerar processos/aplicacions externes. |
| REQ-34 | **Monitorització del focus**: Registrar immediatament pèrdues de focus de la finestra de ContrOwl amb durada en segons. | PARCIAL | visibilitychange detecta pàgina oculta; no totes les pèrdues de focus, durades ni aplicacions. |
| REQ-35 | **Codis de colors d'estat**: Verd (actiu), Groc (incidència menor), Vermell (bloquejat), Gris (offline). | PARCIAL | Verd connectat/gris desconnectat, bloqueig indicat amb text; falta codificació completa de quatre estats. |
| REQ-36 | **Privacitat per disseny**: Monitorització exclusivament durant la sessió; es desactiva en concloure la prova. | PARCIAL | Captura explícita sense àudio i aturada en finalitzar. Alumnes desconnectats reben la finalització en reconnectar. Falta política de retenció automàtica. |
| REQ-37 | **Resiliència davant caiguda de xarxa**: Si cau la connexió, el mode segur continua actiu i no s'allibera l'entorn. | PARCIAL | Bloqueig i incidències locals; recuperació docent i reenviament en reconnectar automàticament. No és control inviolable del sistema. |
| REQ-38 | **Vista Dividida (Dual)**: Manera interactiva per visualitzar i testar el panell docent i el client alumne alhora. | DEMO | La vista dividida anterior es conserva a ?demo=1. |
| REQ-39 | **Contingut d'examen interactiu**: Prova realista d'estructures (Institut Mollet) amb preguntes, navegació i càlculs. | DEMO | L’examen d’estructures és a la demostració; el flux real carrega l’examen del docent. |
| REQ-40 | **Simulador de seguretat docent**: Botons per disparar i provar directament les deteccions (Alt+Tab, Win, Focus, etc.). | DEMO | Simuladors a la demostració. El flux principal utilitza incidències reals del navegador. |

## Requisits web i recuperació

| ID | Comportament | Estat |
|---|---|---|
| WEB-01 | Portada d’alumnat; docent a `/administration/`, compatible amb recàrrega de GitHub Pages. | Implementat |
| WEB-02 | Accés automàtic per codi amb servei gratuït de senyalització PeerJS. | Implementat; pantalles per WebRTC directe, amb STUN i sense TURN |
| WEB-03 | Sense subscripcions, claus d’API ni servidor a configurar pel docent. | Implementat |
| WEB-04 | Reobrir el panell al mateix navegador/perfil recupera sessions, alumnes, proves i identitat docent. | Implementat amb IndexedDB |
| WEB-05 | Tancar el docent conserva la sessió en curs, però interromp la recepció. | Implementat; reconnexió automàtica dels alumnes amb la web oberta |
| WEB-06 | L’alumne conserva incidències pendents i les reenvia en reconnectar. | Implementat; imatges de les tres més recents, motius/hores de totes |
| WEB-07 | Un únic panell docent actiu per perfil evita escriptures concurrents. | Implementat amb Web Locks |
| WEB-08 | Recuperació després d’esborrar les dades del navegador o en un altre equip. | No implementat; l’informe exportat no restaura claus ni perfil |
| WEB-09 | Funcionar entre xarxes arbitràries o amb aïllament de clients. | No garantit sense relé; cal una xarxa amb connexió directa permesa |
| WEB-10 | Rebre dades amb tots els navegadors del docent tancats. | No possible amb aquest model; dades pendents a l’alumne |

## Identitat, seguretat i desat

L’accés a `/administration/` obre el perfil local d’aquell navegador: no concedeix accés al perfil d’un altre ordinador. No és un inici de sessió remot. Qui tingui accés al mateix perfil del navegador docent pot veure’n les dades.

La descoberta es delega en el servei públic de PeerJS. La primera configuració signada fixa la clau pública del docent; les reconnexions no accepten una clau diferent ni envien proves abans de verificar-lo. És confiança en el primer ús: no substitueix autenticació institucional ni evita una suplantació del primer accés si un tercer ha ocupat abans el codi. Les ordres van signades amb ECDSA P-256 i inclouen destinatari, aparellament, nonce i caducitat. WebRTC aporta xifrat DTLS al canal. Els noms no acrediten la identitat institucional.

Els missatges grans es fragmenten i hi ha límits de mida i cua. Les proves rebudes només es confirmen després de completar l’escriptura local. En cas de quota insuficient, s’avisa el docent i l’alumne conserva el pendent. No hi ha límit de retenció temporal ni sincronització al núvol: cal conservar el perfil i exportar els informes necessaris. No s’exporten tokens ni claus privades.

## Validació

El workflow exigeix comprovació TypeScript, compilació estàtica, rutes de Pages i una prova de dos processos de navegador amb **WebRTC natiu i PeerJS públic**: entrada només amb codi i permís de pantalla, miniatura, captura manual, incidència, desbloqueig signat, conservació de respostes en iframe, reinici complet del navegador docent, recuperació de sessió i proves, reconnexió automàtica sense intervenció de l’alumne, reenviament pendent i finalització. La font de captura és sintètica per automatitzar la prova; no s’inventa el transport.

Cal provar al centre el diàleg real de compartició, la compatibilitat d’iframe de l’examen, la xarxa sense aïllament, el rendiment de l’aula i la política de retenció. No s’afirma que s’hagin validat 30 ordinadors ni que una web sigui un entorn de bloqueig segur del sistema.

## Adaptació de web_block

S’ha revisat `app.js`, `admin.js` i els punts d’entrada de la versió antiga: utilitzen PeerJS amb descoberta pública, un identificador global de docent i ordres de bloqueig per canal de dades. ContrOwl adopta aquesta descoberta automàtica, però conserva codis per sessió, signatures del docent, desat local, buffer circular, incidències pendents i recuperació. No importa claus mestres públiques ni contrasenyes locals de desbloqueig.
