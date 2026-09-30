# ContrOwl — Requeriments revisats

Revisió de codi del 30/09/2026. Font revisada: els 40 requisits REQ-01–REQ-40 del document existent al repositori. L’adjunt extern Requirements.md no s’ha pogut llegir amb les eines disponibles; no s’afirma equivalència entre els dos documents.

## Diagnòstic

El resum anterior deia «50 de 50, 100% comprovat», però la seva taula contenia 40 requisits. Aquesta afirmació no estava sustentada: una interfície o una simulació no acredita una funció de seguretat. Les afirmacions antigues sobre proves d’AI Studio no s’han reproduït en aquesta revisió.

**La versió de GitHub Pages és una demostració local.** No serveix per fer exàmens amb garanties de bloqueig. Dades, sessions i respostes són volàtils i només existeixen a la pestanya. Els SVG mostren una representació de l’examen d’exemple, no el monitor.

Estats: IMPLEMENTAT = lògica present en la demo; PARCIAL = part del requisit; DEMO = simulació visual/local; PENDENT = capacitat real absent. Cap d’aquests estats implica validació de seguretat en ordinadors reals.

## Matriu dels 40 requisits originals del repositori

| ID | Requeriment | Estat | Evidència i límit |
|---|---|---|---|
| REQ-01 | **Logo oficial ContrOwl**: Integració del fitxer d'imatge `contrOwl.png` a la capçalera, favicon, pantalla d'inici i pantalla de bloqueig. | IMPLEMENTAT | Rutes de logo i favicon adaptades al subdirectori Pages; pendent verificació visual del desplegament. |
| REQ-02 | **Document de requeriments viu**: Creació i actualització d'un document complet amb coses demanades, fetes, no fetes i comprovades. | IMPLEMENTAT | Aquest document és també la font del modal, sense percentatges ficticis. |
| REQ-03 | **Temporitzador d'examen configurable**: El professor pot definir la durada (ex. 30, 45, 60, 90, 120 min o personalitzat / sense límit). | PARCIAL | Formulari local; falta validació autoritativa al servidor. |
| REQ-04 | **Temporitzador visible a l'alumne**: Compte enrere en directe al client de l'alumne amb format `MM:SS`, barra de progrés i canvi de color (verd, ambre &lt;10m, vermell polsant &lt;3m, temps exhaurit). | PARCIAL | Compte enrere amb rellotge local; falta hora de servidor i política de venciment. |
| REQ-05 | **Temporitzador al panell docent**: Indicador del compte enrere i temps restant de la sessió visible per al professor. | PARCIAL | Indicador local, no sincronització entre dispositius. |
| REQ-06 | **Creació de sessions**: Formulari de configuració amb nom, assignatura, grup, URL autoritzada i paràmetres de seguretat. | DEMO | Sessions en memòria de la pestanya; no persistència ni servei compartit. |
| REQ-07 | **Codi de sessió de 6 caràcters**: Codi únic de 6 dígits generat automàticament o manualment. | PARCIAL | 6 caràcters; falta garantir unicitat entre sessions al servidor. |
| REQ-08 | **Caràcters no ambigus**: Exclusió de caràcters confusibles (`0`, `O`, `1`, `I`, `L`), usant l'alfabet segur `23456789ABCDEFGHJKMNPQRSTUVWXYZ`. | IMPLEMENTAT | Generació amb alfabet no ambigu; comprovar codis manuals segons política acordada. |
| REQ-09 | **Insensibilitat a majúscules/minúscules**: Normalització automàtica de codis (`k7m4px` = `K7M4PX`). | IMPLEMENTAT | Normalització trim/majúscules; també elimina espais i guions. |
| REQ-10 | **Accés senzill de l'alumnat**: Pantalla minimalista per introduir exclusivament el codi `[ _ _ _ _ _ _ ]` i botó ENTRAR. | DEMO | Entrada local; encara es mostra el codi de prova. |
| REQ-11 | **Identificació obligatòria de l'alumne**: Demanar nom i cognoms abans de carregar la URL. La prova no s'obre sense identificació. | PARCIAL | Nom obligatori, sense verificació d’identitat. |
| REQ-12 | **Associació alumne-dispositiu**: Vincular sessió, nom, dispositiu (ex. *Laia Martínez — PC-23*), IP i hora d'entrada. | DEMO | Identificador local; dispositiu declarat i IP fictícia, no verificats. |
| REQ-13 | **Càrrega automàtica de la URL**: L'alumnat no escriu la URL; el codi de sessió determina la pàgina que s'obre automàticament. | PENDENT | La URL només es mostra; el client renderitza un examen d’estructures fix. |
| REQ-14 | **Panell del docent (Taula)**: Llista de tots els alumnes connectats amb estat (🟢 Actiu, 🟡 Groc, 🔴 Bloc, ⚫ Offline) i incidències. | DEMO | Taula local amb dades inicials fictícies. |
| REQ-15 | **Vista en directe de pantalles (Grid)**: Targetes de cada alumne amb miniatura, estat, nom, última actualització (*fa 1 s*) i alertes. | DEMO | SVG reconstruïts; no captures reals del monitor. |
| REQ-16 | **Supervisió eficient de pantalla**: Actualització lleugera sense vídeo pesat a 60 FPS, optimitzada per a aules de 24+ dispositius. | PENDENT | No hi ha prova de càrrega amb 24 dispositius ni transmissió optimitzada validada. |
| REQ-17 | **Vista ampliada de l'alumne**: Clic a qualsevol alumne per obrir modal a pantalla completa amb detalls, IP, pantalles i controls. | DEMO | Modal amb informació local; IP i imatges de demostració. |
| REQ-18 | **Captura manual ("FER CAPTURA")**: Botó al panell docent que genera immediatament una captura vinculada a alumne, sessió i hora. | DEMO | Copia el darrer SVG, no captura actual de l’ordinador remot. |
| REQ-19 | **Captures automàtiques per incidència**: Generació automàtica d'evidència visual davant intents d'Alt+Tab o canvi d'app. | PARCIAL | Incidència local; captura del sistema i política autoCaptureOnIncident pendents. |
| REQ-20 | **Buffer visual circular (10-15 segons)**: Memòria circular local que enregistra constantment els últims segons de pantalla de cada alumne. | PARCIAL | Buffer de SVG en memòria; durada configurable aplicada, no captura real. |
| REQ-21 | **Congelació del buffer davant incidència**: Davant infracció crítica, el buffer es congela i es transmet complet al docent. | PARCIAL | Congelació local. Eliminat el farciment d’historial amb frames inventats. |
| REQ-22 | **Revisió interactiva de l'historial visual**: Reproductor amb cursor temporal (`◀─────●─────▶ -15s ... 0s`) per analitzar la causa del bloqueig. | DEMO | Reproductor dels frames disponibles; no evidència forense. |
| REQ-23 | **Motiu exacte del bloqueig**: Diagnòstic clar en pantalla (`ALT + TAB detectat`, `Tecla Windows detectada`, `Intent d’obrir chrome.exe`, etc.). | PARCIAL | Blur indica pèrdua de focus, no permet saber quin procés o drecera l’ha causat. |
| REQ-24 | **Bloqueig net de l'alumne**: Pantalla amb *"CONTROWL — Sessió temporalment bloquejada. Espera que el professor desbloquegi el dispositiu."* | DEMO | Superposició HTML; no bloqueig del dispositiu. |
| REQ-25 | **Absència de contrasenya local al dispositiu de l'alumne**: No existeix camp d'administrador ni contrasenya que el professor hagi de teclejar a l'ordinador de l'alumne. | PARCIAL | Sense camp de clau local, però l’alumne també pot obrir la vista de docent. |
| REQ-26 | **Desbloqueig remot directe**: El professor prem "DESBLOQUEJAR" des del seu ordinador i el client s'allibera a l'instant per xarxa. | PENDENT | Només actualització local. Al servidor original falta handler REMOTE_UNLOCK i autenticació. |
| REQ-27 | **Desbloqueig massiu**: Opcions per desbloquejar l'alumne seleccionat, un grup o **"Desbloquejar tots"** simultàniament. | DEMO | Canvi massiu local, sense confirmació dels dispositius. |
| REQ-28 | **Registre d'auditoria (Audit Log)**: Traçabilitat de cada bloqueig, acció detectada, revisió del professor i hora de desbloqueig. | PARCIAL | Registre en memòria; no durable, no immutable, sense identitat verificada. |
| REQ-29 | **Mode segur (Restriccions de teclat)**: Bloqueig d'Alt+Tab, Tecla Windows, Win+D, Win+E, Alt+F4, Ctrl+Shift+Esc, PrintScreen. | PENDENT | El navegador no proporciona control general de dreceres del sistema. |
| REQ-30 | **Navegació restringida i llista blanca**: Permetre només la URL autoritzada i dominis de la llista blanca (`insmollet.cat`, `geogebra.org`, etc.). | PENDENT | allowedDomains és configuració; no s’aplica a la navegació del sistema. |
| REQ-31 | **Control del porta-retalls**: Opcions de Bloquejat, Intern (recomanat) o Permès. | PARCIAL | Botons de còpia interna; enganxar natiu i altres vies no estan controlats. |
| REQ-32 | **Neteja inicial del porta-retalls**: Buidar el porta-retalls en arrencar l'examen per evitar enganxar apunts preparats. | PENDENT | La demo no altera el porta-retalls del sistema. Cal dissenyar el comportament del client segur. |
| REQ-33 | **Detecció d'aplicacions externes**: Detectar obertura o intent d'accés a Chrome, Discord, ChatGPT, etc. | PENDENT | Botons simulats; no es detecten processos externs. |
| REQ-34 | **Monitorització del focus**: Registrar immediatament pèrdues de focus de la finestra de ContrOwl amb durada en segons. | PARCIAL | Listener blur local; falta mesurar durada i evitar atribucions no demostrables. |
| REQ-35 | **Codis de colors d'estat**: Verd (actiu), Groc (incidència menor), Vermell (bloquejat), Gris (offline). | DEMO | Colors implementats; no heartbeat fiable ni detecció real d’offline. |
| REQ-36 | **Privacitat per disseny**: Monitorització exclusivament durant la sessió; es desactiva en concloure la prova. | PARCIAL | La demo atura buffer i listeners en acabar. Falten retenció, esborrat i controls d’accés. |
| REQ-37 | **Resiliència davant caiguda de xarxa**: Si cau la connexió, el mode segur continua actiu i no s'allibera l'entorn. | PENDENT | No existeix client standalone persistent; recarregar perd l’estat. |
| REQ-38 | **Vista Dividida (Dual)**: Manera interactiva per visualitzar i testar el panell docent i el client alumne alhora. | IMPLEMENTAT | Vista dividida per provar docent i alumne dins la mateixa pestanya. |
| REQ-39 | **Contingut d'examen interactiu**: Prova realista d'estructures (Institut Mollet) amb preguntes, navegació i càlculs. | IMPLEMENTAT | Examen local d’exemple, sense desat ni lliurament durable. |
| REQ-40 | **Simulador de seguretat docent**: Botons per disparar i provar directament les deteccions (Alt+Tab, Win, Focus, etc.). | IMPLEMENTAT | Botons etiquetats com a simulació; no proven control del sistema operatiu. |

## Decisions que es mantenen

- El codi de sessió té 6 caràcters, manual o aleatori per defecte, sense distingir majúscules. La generació evita 0/O/1/I/L. No és una credencial d’administrador.
- El desbloqueig de producció ha de ser una ordre remota autenticada i signada des de la sessió docent. Mai una clau escrita a l’equip de l’alumne.
- El buffer és circular i local, dels darrers 10–15 segons; no una gravació completa. No es poden fabricar frames per omplir intervals absents.
- Les incidències són senyals per revisar, no una prova automàtica de frau. Una pèrdua de focus no identifica una aplicació.

## Arquitectura necessària per al producte real

1. **Frontend a GitHub Pages:** interfície docent i documentació; fitxers estàtics.
2. **Backend HTTPS/WSS separat:** autenticació docent, rols, sessions, estat autoritatiu, ordres signades, confirmacions, persistència i auditoria.
3. **Client d’examen instal·lat o entorn gestionat:** restriccions del sistema, llista de navegació, captura de pantalla i verificació del dispositiu. Validar les capacitats per sistema operatiu.

El server.ts conservat és un prototip de desenvolupament, no un backend segur: accepta rols i identitats declarats, exposa estat sense autenticació, difon missatges a tots els clients d’una sessió i desa tot en memòria. No exposar-lo a alumnat real. La versió Pages no el crida.

## Requisits addicionals proposats en aquesta revisió

Aquests 10 punts són nous; no són els «10 requisits» absents del resum antic.

| ID | Prioritat | Criteri d’acceptació |
|---|---|---|
| ADD-01 | P0 | Autenticació docent i autorització al servidor: un alumne no pot crear/finalitzar sessions ni desbloquejar. |
| ADD-02 | P0 | Ordres signades amb sessionId, deviceId, commandId, caducitat i nonce; rebutjar signatures invàlides i replays; confirmar aplicació al client. |
| ADD-03 | P0 | Credencial per dispositiu; el servidor deriva la identitat de la connexió, no del studentId del missatge. |
| ADD-04 | P0 | Validar esquemes, mida de missatges, codi únic, HTTPS de destí i llista de dominis; limitar intents d’accés. |
| ADD-05 | P0 | Aïllar sessions: un alumne no rep pantalles, noms o incidències dels altres; només docents autoritzats. |
| ADD-06 | P0 | Backend persistent i transaccional; reconnectar i reiniciar sense perdre bloquejos ni acceptar estats antics. |
| ADD-07 | P0 | Implementar i provar un client gestionat en els sistemes objectiu; documentar què pot impedir i què només pot detectar. |
| ADD-08 | P1 | Captures reals amb mida/FPS limitats, seqüència, hora i marcatge explícit de buits; prova amb 30 clients. |
| ADD-09 | P1 | Informació visible de monitorització, minimització, permisos de consulta, retenció configurable i esborrat verificat. |
| ADD-10 | P1 | Temporització de servidor, heartbeat, pèrdua de xarxa, finalització i recuperació amb proves d’integració. |

## Validació d’aquesta adaptació

El workflow .github/workflows/pages.yml executa instal·lació des del lockfile, TypeScript, build Vite, comprovació del subdirectori i smoke test de navegador abans de desplegar. El resultat real és el que consta a GitHub Actions; aquest text no pressuposa èxit. No s’han validat múltiples equips ni restriccions del sistema operatiu.

## Fonts tècniques

- [GitHub Pages és allotjament estàtic](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Desplegament estàtic amb Vite](https://vite.dev/guide/static-deploy.html)
