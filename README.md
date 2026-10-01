# ContrOwl — aplicació web amb recuperació de sessions

## Accés

- **/**: portada d’alumnes. Codi, nom i dispositiu.
- **/administration**: accés docent protegit amb contrasenya.
- La ruta d’administració no és una mesura de seguretat: l’API i el WebSocket verifiquen l’autenticació.

Docent i alumnat utilitzen el navegador. El servei ha d’estar allotjat en un servidor persistent, independent dels seus ordinadors.

## Què passa si el docent tanca la web?

El servidor continua rebent les pantalles i desant les incidències. Les sessions d’examen continuen actives. En tornar a **/administration**, es carreguen sessions, alumnes, estats, incidències i captures. Les imatges en directe es reprenen automàticament.

La identificació docent es conserva fins a 8 hores amb una cookie **HttpOnly, SameSite=Strict i Secure en producció**. No es desa el token docent a localStorage. Després de caducar o de sortir expressament, cal identificar-se de nou, però les dades de l’examen es mantenen.

- **Tancar la pestanya:** no finalitza res.
- **Tancar sessió docent:** revoca l’accés d’aquell navegador; els exàmens continuen.
- **Finalitzar sessió:** acaba expressament l’examen i atura la captura dels alumnes.

Les dades i les credencials temporals es desen al servidor amb escriptura atòmica. També es recuperen després d’un reinici del servei si es conserva el volum de dades i la contrasenya docent. Després d’una caiguda del servidor, els alumnes es reconnecten bloquejats fins a autorització docent.

## Activar l’allotjament

El repositori conté **render.yaml** per desplegar un servei web Node amb disc persistent a Render. No s’ha contractat ni activat cap servei automàticament.

[Obrir la configuració de desplegament](https://render.com/deploy?repo=https://github.com/aagust11/contrOwl_test)

1. Connecta el repositori a Render mitjançant aquest enllaç o New → Blueprint.
2. Revisa i accepta el cost del servei i del disc: aquesta configuració és **de pagament**. L’emmagatzematge efímer no serveix per conservar les sessions.
3. Després del desplegament, copia la URL HTTPS que assigni Render.
4. Obre **URL/administration**. La contrasenya generada és a Environment → CONTROWL_ADMIN_PASSWORD del teu servei; no la publiquis al repositori ni l’enviïs als alumnes.
5. L’alumnat entra a **URL/**. No necessita instal·lar Node, certificats ni scripts.

Els desplegaments automàtics a Render queden desactivats per no interrompre una classe en fer un push. Desplega els canvis manualment fora de les sessions.

El preset és per a una única instància i un únic compte d’administració amb diverses sessions. La capacitat per a una aula de 30 dispositius necessita prova de càrrega real. No escalar a múltiples processos amb el fitxer JSON compartit: caldria una base de dades i distribució de missatges.

També pots allotjar el mateix servei en un servidor del centre amb Node 22+, HTTPS, WebSocket i un volum persistent. [Opció local alternativa](docs/LOCAL_SERVER.md).

## Enllaçar GitHub Pages

Pages presenta la portada d’alumnes i la ruta **/contrOwl_test/administration/**. La compilació genera aquesta ruta com un fitxer real, de manera que es pot obrir i recarregar directament.

Quan existeixi l’allotjament:
1. Al repositori, Settings → Secrets and variables → Actions → Variables.
2. Afegeix **CONTROWL_SERVICE_URL** amb la URL HTTPS pública del servei, sense credencials.
3. Torna a executar el workflow **Pages**.

A partir d’aquí Pages redirigirà automàticament a la portada o a /administration del servei segons la ruta oberta. L’API, les cookies i el WebSocket es mantenen al mateix domini del servei.

Mentre no hi hagi servei configurat, Pages mostra els formularis amb avís de pendent d’activació i no permet connexions fictícies. Pages no executa Node ni desa sessions al servidor.

## Dades i supervisió

- Captura de pantalla sencera amb autorització explícita: JPEG fins a 960 px, 1 frame/s, sense àudio.
- Buffer local dels últims 15 segons; s’envia davant una incidència.
- Captures a petició del docent i desbloquejos remots signats amb confirmació.
- Sessions, bloquejos, captures i incidències al volum persistent del servei.
- Retenció: màxim 3 incidències i 3 captures per alumne; aproximadament 64 MiB d’evidències, retirant les imatges més antigues i registrant la retirada.
- Les imatges ordinàries en directe es mantenen en memòria, no es desa una gravació contínua. Es conserven les evidències i el registre; no es reconstrueixen períodes sense captura.
- Exportació JSON i esborrat exprés de sessions finalitzades.

No s’envien pantalles a GitHub ni a Gemini. En mode allotjat, sí que es processen i desen al proveïdor de servidor que activis.

La prova s’obre en un iframe: la plataforma d’examen ha de permetre incrustació. El bloqueig pausa la pàgina; una web no pot impedir de manera fiable Alt+Tab, tancar el navegador, altres aplicacions o modificar el client.

## Variables del servidor

| Variable | Valor / ús |
|---|---|
| CONTROWL_ADMIN_PASSWORD | Contrasenya privada estable, mínim 12 caràcters; obligatòria en producció. |
| CONTROWL_DATA_DIR | Directori en volum persistent, p. ex. /var/data. |
| CONTROWL_HOST | 0.0.0.0 al servidor allotjat. |
| CONTROWL_TRUST_PROXY | 1 només darrere el proxy de confiança de l’allotjament. |
| NODE_ENV | production, habilita cookies Secure. |
| PORT | Port assignat per l’allotjament. |
| PAGES_BASE_PATH | / per al servei complet; /contrOwl_test/ per a Pages. |

## Comprovacions

El workflow comprova compilació, rutes, autenticació, aïllament d’alumnes, ordres signades, confirmacions i persistència. La prova de navegador tanca el navegador docent, genera una incidència mentre és absent i reobre /administration recuperant-la amb la cookie. També comprova refresc i sortida explícita.

La font de captura de Playwright és sintètica per verificar el transport; no substitueix la prova de permisos reals del navegador ni una prova d’aula.

Consulta [REQUERIMENTS.md](REQUERIMENTS.md) per als límits funcionals pendents.
