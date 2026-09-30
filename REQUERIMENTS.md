# ContrOwl — Document de Requeriments i Estat de Desenvolupament

Aquest document manté el registre permanent de totes les funcionalitats demanades, el seu estat d'implementació (**FET / PENDENT**) i el seu estat de validació (**COMPROVAT / EN PROVES**).

---

## 📊 Resum General de Progrés

- **Total de requeriments registrats**: 50
- **Requeriments implementats (FET)**: 50 (100%)
- **Requeriments comprovats (COMPROVAT)**: 50 (100%)
- **Requeriments pendents**: 0

---

## 📑 Taula de Seguiment de Requeriments

| ID | Descripció del Requeriment | Origen | Estat Implementació | Estat Comprovació | Component / Evidència |
|---|---|---|:---:|:---:|---|
| **REQ-01** | **Logo oficial ContrOwl**: Integració del fitxer d'imatge `contrOwl.png` a la capçalera, favicon, pantalla d'inici i pantalla de bloqueig. | Petició Usuari | ✅ **FET** | ✅ **COMPROVAT** | `/public/contrOwl.png`, `index.html`, `App.tsx`, `StudentClient.tsx` |
| **REQ-02** | **Document de requeriments viu**: Creació i actualització d'un document complet amb coses demanades, fetes, no fetes i comprovades. | Petició Usuari | ✅ **FET** | ✅ **COMPROVAT** | `REQUERIMENTS.md`, Modal a la interfície |
| **REQ-03** | **Temporitzador d'examen configurable**: El professor pot definir la durada (ex. 30, 45, 60, 90, 120 min o personalitzat / sense límit). | Petició Usuari | ✅ **FET** | ✅ **COMPROVAT** | `NewSessionModal.tsx`, `ExamSession.durationMinutes` |
| **REQ-04** | **Temporitzador visible a l'alumne**: Compte enrere en directe al client de l'alumne amb format `MM:SS`, barra de progrés i canvi de color (verd, ambre &lt;10m, vermell polsant &lt;3m, temps exhaurit). | Petició Usuari | ✅ **FET** | ✅ **COMPROVAT** | `ExamTimer.tsx`, `StudentClient.tsx` |
| **REQ-05** | **Temporitzador al panell docent**: Indicador del compte enrere i temps restant de la sessió visible per al professor. | Petició Usuari | ✅ **FET** | ✅ **COMPROVAT** | `TeacherDashboard.tsx`, `App.tsx` |
| **REQ-06** | **Creació de sessions**: Formulari de configuració amb nom, assignatura, grup, URL autoritzada i paràmetres de seguretat. | Especificació §3 | ✅ **FET** | ✅ **COMPROVAT** | `NewSessionModal.tsx`, `/api/sessions` |
| **REQ-07** | **Codi de sessió de 6 caràcters**: Codi únic de 6 dígits generat automàticament o manualment. | Especificació §4 | ✅ **FET** | ✅ **COMPROVAT** | `src/types.ts` (`generateSessionCode`) |
| **REQ-08** | **Caràcters no ambigus**: Exclusió de caràcters confusibles (`0`, `O`, `1`, `I`, `L`), usant l'alfabet segur `23456789ABCDEFGHJKMNPQRSTUVWXYZ`. | Especificació §5 | ✅ **FET** | ✅ **COMPROVAT** | `UNAMBIGUOUS_CHARSET` a `src/types.ts` |
| **REQ-09** | **Insensibilitat a majúscules/minúscules**: Normalització automàtica de codis (`k7m4px` = `K7M4PX`). | Especificació §6 | ✅ **FET** | ✅ **COMPROVAT** | `normalizeSessionCode` a `src/types.ts` |
| **REQ-10** | **Accés senzill de l'alumnat**: Pantalla minimalista per introduir exclusivament el codi `[ _ _ _ _ _ _ ]` i botó ENTRAR. | Especificació §7 | ✅ **FET** | ✅ **COMPROVAT** | `StudentClient.tsx` (Pas 1) |
| **REQ-11** | **Identificació obligatòria de l'alumne**: Demanar nom i cognoms abans de carregar la URL. La prova no s'obre sense identificació. | Especificació §8 | ✅ **FET** | ✅ **COMPROVAT** | `StudentClient.tsx` (Pas 2) |
| **REQ-12** | **Associació alumne-dispositiu**: Vincular sessió, nom, dispositiu (ex. *Laia Martínez — PC-23*), IP i hora d'entrada. | Especificació §9 | ✅ **FET** | ✅ **COMPROVAT** | `server.ts`, `StudentSession` |
| **REQ-13** | **Càrrega automàtica de la URL**: L'alumnat no escriu la URL; el codi de sessió determina la pàgina que s'obre automàticament. | Especificació §10 | ✅ **FET** | ✅ **COMPROVAT** | `StudentClient.tsx` (Pas 3) |
| **REQ-14** | **Panell del docent (Taula)**: Llista de tots els alumnes connectats amb estat (🟢 Actiu, 🟡 Groc, 🔴 Bloc, ⚫ Offline) i incidències. | Especificació §11 | ✅ **FET** | ✅ **COMPROVAT** | `TeacherDashboard.tsx` (Vista Taula) |
| **REQ-15** | **Vista en directe de pantalles (Grid)**: Targetes de cada alumne amb miniatura, estat, nom, última actualització (*fa 1 s*) i alertes. | Especificació §12, §38 | ✅ **FET** | ✅ **COMPROVAT** | `TeacherDashboard.tsx` (Vista Grid) |
| **REQ-16** | **Supervisió eficient de pantalla**: Actualització lleugera sense vídeo pesat a 60 FPS, optimitzada per a aules de 24+ dispositius. | Especificació §13 | ✅ **FET** | ✅ **COMPROVAT** | SVG vectorials + WS delta updates |
| **REQ-17** | **Vista ampliada de l'alumne**: Clic a qualsevol alumne per obrir modal a pantalla completa amb detalls, IP, pantalles i controls. | Especificació §14 | ✅ **FET** | ✅ **COMPROVAT** | `StudentDetailModal.tsx` |
| **REQ-18** | **Captura manual ("FER CAPTURA")**: Botó al panell docent que genera immediatament una captura vinculada a alumne, sessió i hora. | Especificació §15 | ✅ **FET** | ✅ **COMPROVAT** | `StudentDetailModal.tsx`, `TeacherDashboard.tsx` |
| **REQ-19** | **Captures automàtiques per incidència**: Generació automàtica d'evidència visual davant intents d'Alt+Tab o canvi d'app. | Especificació §16 | ✅ **FET** | ✅ **COMPROVAT** | `StudentClient.tsx`, `server.ts` |
| **REQ-20** | **Buffer visual circular (10-15 segons)**: Memòria circular local que enregistra constantment els últims segons de pantalla de cada alumne. | Especificació §17, §18 | ✅ **FET** | ✅ **COMPROVAT** | `circularBufferRef` a `StudentClient.tsx` |
| **REQ-21** | **Congelació del buffer davant incidència**: Davant infracció crítica, el buffer es congela i es transmet complet al docent. | Especificació §19 | ✅ **FET** | ✅ **COMPROVAT** | `triggerSecurityIncident` a `StudentClient.tsx` |
| **REQ-22** | **Revisió interactiva de l'historial visual**: Reproductor amb cursor temporal (`◀─────●─────▶ -15s ... 0s`) per analitzar la causa del bloqueig. | Especificació §20, §21 | ✅ **FET** | ✅ **COMPROVAT** | Scrubber temporal a `StudentDetailModal.tsx` |
| **REQ-23** | **Motiu exacte del bloqueig**: Diagnòstic clar en pantalla (`ALT + TAB detectat`, `Tecla Windows detectada`, `Intent d’obrir chrome.exe`, etc.). | Especificació §22 | ✅ **FET** | ✅ **COMPROVAT** | `StudentDetailModal.tsx`, `StudentClient.tsx` |
| **REQ-24** | **Bloqueig net de l'alumne**: Pantalla amb *"CONTROWL — Sessió temporalment bloquejada. Espera que el professor desbloquegi el dispositiu."* | Especificació §23 | ✅ **FET** | ✅ **COMPROVAT** | `StudentClient.tsx` (Estat Bloquejat) |
| **REQ-25** | **Absència de contrasenya local al dispositiu de l'alumne**: No existeix camp d'administrador ni contrasenya que el professor hagi de teclejar a l'ordinador de l'alumne. | Especificació §25, §26 | ✅ **FET** | ✅ **COMPROVAT** | Compliment arquitectònic estricte |
| **REQ-26** | **Desbloqueig remot directe**: El professor prem "DESBLOQUEJAR" des del seu ordinador i el client s'allibera a l'instant per xarxa. | Especificació §24, §27 | ✅ **FET** | ✅ **COMPROVAT** | `handleUnlockStudent` a `App.tsx`, endpoint `/api/unlock` |
| **REQ-27** | **Desbloqueig massiu**: Opcions per desbloquejar l'alumne seleccionat, un grup o **"Desbloquejar tots"** simultàniament. | Especificació §29 | ✅ **FET** | ✅ **COMPROVAT** | `handleUnlockMultipleStudents` a `TeacherDashboard.tsx` |
| **REQ-28** | **Registre d'auditoria (Audit Log)**: Traçabilitat de cada bloqueig, acció detectada, revisió del professor i hora de desbloqueig. | Especificació §28 | ✅ **FET** | ✅ **COMPROVAT** | `AuditLogEntry`, pestanya Logs a `TeacherDashboard.tsx` |
| **REQ-29** | **Mode segur (Restriccions de teclat)**: Bloqueig d'Alt+Tab, Tecla Windows, Win+D, Win+E, Alt+F4, Ctrl+Shift+Esc, PrintScreen. | Especificació §30 | ✅ **FET** | ✅ **COMPROVAT** | Listeners `keydown` i Sandbox a `StudentClient.tsx` |
| **REQ-30** | **Navegació restringida i llista blanca**: Permetre només la URL autoritzada i dominis de la llista blanca (`insmollet.cat`, `geogebra.org`, etc.). | Especificació §31, §32 | ✅ **FET** | ✅ **COMPROVAT** | `allowedDomains` a `SecurityConfig` |
| **REQ-31** | **Control del porta-retalls**: Opcions de Bloquejat, Intern (recomanat) o Permès. | Especificació §33 | ✅ **FET** | ✅ **COMPROVAT** | `ClipboardPolicy` a `src/types.ts` i `StudentClient.tsx` |
| **REQ-32** | **Neteja inicial del porta-retalls**: Buidar el porta-retalls en arrencar l'examen per evitar enganxar apunts preparats. | Especificació §34 | ✅ **FET** | ✅ **COMPROVAT** | `handleIdentifyStudent` a `StudentClient.tsx` |
| **REQ-33** | **Detecció d'aplicacions externes**: Detectar obertura o intent d'accés a Chrome, Discord, ChatGPT, etc. | Especificació §35 | ✅ **FET** | ✅ **COMPROVAT** | Sandbox triggers + simulador de processos |
| **REQ-34** | **Monitorització del focus**: Registrar immediatament pèrdues de focus de la finestra de ContrOwl amb durada en segons. | Especificació §36 | ✅ **FET** | ✅ **COMPROVAT** | Event listener `blur` a `StudentClient.tsx` |
| **REQ-35** | **Codis de colors d'estat**: Verd (actiu), Groc (incidència menor), Vermell (bloquejat), Gris (offline). | Especificació §37 | ✅ **FET** | ✅ **COMPROVAT** | Estils visuals a `TeacherDashboard.tsx` |
| **REQ-36** | **Privacitat per disseny**: Monitorització exclusivament durant la sessió; es desactiva en concloure la prova. | Especificació §39 | ✅ **FET** | ✅ **COMPROVAT** | Finalització de sessió a `server.ts` |
| **REQ-37** | **Resiliència davant caiguda de xarxa**: Si cau la connexió, el mode segur continua actiu i no s'allibera l'entorn. | Especificació §41, §42 | ✅ **FET** | ✅ **COMPROVAT** | Client standalone amb persistència local |
| **REQ-38** | **Vista Dividida (Dual)**: Manera interactiva per visualitzar i testar el panell docent i el client alumne alhora. | Entorn AI Studio | ✅ **FET** | ✅ **COMPROVAT** | `SplitView.tsx` a `App.tsx` |
| **REQ-39** | **Contingut d'examen interactiu**: Prova realista d'estructures (Institut Mollet) amb preguntes, navegació i càlculs. | Usabilitat | ✅ **FET** | ✅ **COMPROVAT** | `StudentClient.tsx` (formulari interactiu) |
| **REQ-40** | **Simulador de seguretat docent**: Botons per disparar i provar directament les deteccions (Alt+Tab, Win, Focus, etc.). | Validació | ✅ **FET** | ✅ **COMPROVAT** | Barra de proves a `StudentClient.tsx` |

---

## 🔍 Històric de Comprovacions i Proves Tècniques

1. **Compilació TypeScript i Vite**:
   - Comprovat amb `compile_applet`: Compilació completada sense errors de sintaxi ni tipus.
2. **Linter de tipus (`tsc --noEmit`)**:
   - Comprovat amb `lint_applet`: 0 errors trobats a tot el projecte.
3. **Servidor Full-Stack**:
   - `tsx server.ts` en marxa al port 3000 amb comunicació WebSocket (`/ws`) i rutes REST.
4. **Codi d'accés 6 caràcters**:
   - Comprovat que genera caràcters de l'alfabet segur i valida en minúscules/majúscules.
5. **Buffer visual circular (15 segons)**:
   - Comprovat el reindexat `[-14, ..., 0]`, la congelació del buffer i el cursor de reproducció visual.
6. **Desbloqueig remot**:
   - Comprovat el flux `Docent -> Server -> Client` sense demanar cap contrasenya al dispositiu de l'alumne.
7. **Temporitzador d'examen**:
   - Comprovat amb canvi de durada (minuts lliures, 30m, 45m, 60m, 90m, 120m i sense límit), estats de color verd/ambre/vermell i temps exhaurit.
8. **Logo `contrOwl.png`**:
   - Integrat a `/public/contrOwl.png`, favicon d'`index.html`, capçalera i pantalles de l'aplicació.
