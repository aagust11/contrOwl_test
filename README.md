# ContrOwl — el PC del docent és el servidor

L’alumnat es connecta directament a l’ordinador del docent. Les imatges de pantalla, els buffers d’incidència i les captures viatgen per WebSocket a aquest ordinador. No s’envien a GitHub ni a Gemini.

La pàgina [GitHub Pages](https://aagust11.github.io/contrOwl_test/) permet introduir l’adreça HTTPS del docent i obrir-la. El codi de sis caràcters identifica una sessió **dins d’aquell servidor**: per si sol no permet descobrir un PC a la xarxa.

## Arrencada al PC del docent (Windows)

1. Descarrega el repositori amb **Code → Download ZIP** i extreu-lo. Alternativament, descarrega l’artefacte **ContrOwl-Docent** de l’últim workflow correcte a Actions.
2. Instal·la **Node.js 22 o superior**.
3. Fes doble clic a **Iniciar-Docent.cmd**. Instal·la dependències si cal, compila i arrenca el servidor.
4. Obre **http://localhost:3000**, prem **Soc docent** i introdueix la contrasenya que apareix a la consola.
5. Crea una sessió amb nom, URL HTTPS i codi opcional. Si deixes el codi buit, es genera automàticament.
6. Mantén oberta la consola. Tancar-la atura el servidor.

Això permet provar-ho al mateix ordinador. Per connectar els PC dels alumnes i capturar pantalla cal la configuració HTTPS següent.

## Configuració de l’aula — una vegada

- Assigna al PC docent una IP estable o un nom DNS accessible des dels alumnes.
- Preferentment, utilitza un certificat de la infraestructura del centre.
- Per a una aula de proves, instal·la [mkcert](https://github.com/FiloSottile/mkcert) al PC docent i executa PowerShell des de la carpeta del projecte:

```powershell
.\scripts\prepare-classroom.ps1 -TeacherAddress "192.168.1.50"
```

Substitueix la IP per la del PC docent. L’script crea `certs/server.pem`, `certs/server-key.pem` i el certificat públic `certs/Confianca-Aula.crt`.

L’administrador del centre ha de desplegar **només Confianca-Aula.crt** com a arrel de confiança als equips participants, o utilitzar la PKI del centre. No distribuïu `server-key.pem` ni `rootCA-key.pem`. No cal ignorar errors del navegador ni desactivar-ne proteccions.

Permet TCP 3000 al tallafoc del PC docent, restringit a la subxarxa de l’aula. No cal obrir ports del router a Internet. La xarxa Wi-Fi ha de permetre comunicació entre alumnes i docent; amb aïllament de clients no funcionarà.

Torna a arrencar **Iniciar-Docent.cmd**. Detectarà els certificats. La consola mostrarà l’adreça per a l’alumnat, per exemple **https://192.168.1.50:3000**.

## Flux dels alumnes

1. Obrir l’adreça HTTPS del PC docent, directament o des de Pages.
2. Introduir el codi, el nom i l’identificador de l’equip.
3. Prémer **Compartir pantalla sencera** i seleccionar el monitor complet.
4. ContrOwl mostra la URL configurada en un marc, i envia una imatge JPEG per segon al docent.

La web d’examen ha de permetre ser incrustada: algunes plataformes ho impedeixen amb CSP o X-Frame-Options. No es poden eludir aquestes restriccions. Les webs que requereixen finestres emergents o cookies de tercers també poden necessitar una integració específica.

## Què funciona en aquesta versió

- Servidor al PC docent, autenticació del docent i credencial diferenciada per alumne.
- Sessions reals amb codi de sis caràcters, sense distingir majúscules, i control de col·lisions.
- JPEG real del monitor autoritzat, fins a 960 píxels d’ample, una vegada per segon, sense àudio.
- Darrer buffer de fins a 15 frames/15 segons; congelació i enviament quan hi ha incidència.
- Captura a petició del docent.
- Pausa de la pàgina en ocultar la pestanya, deixar de compartir o perdre connexió.
- Desbloqueig remot signat amb ECDSA, caducitat, identificador únic i confirmació del client.
- Reconnexió amb la identitat conservada a sessionStorage; el docent ha d’autoritzar continuar.
- Persistència de sessions, bloquejos, evidències i registre en `.controwl/state.json`.
- Exportació JSON i esborrat explícit de sessions finalitzades.
- L’alumne no rep pantalles ni informació dels altres alumnes.

Els frames en directe només es mantenen en memòria. Es desen les captures demanades i els buffers d’incidència: màxim 3 incidències i 3 captures per alumne. Quan les evidències superen 64 MiB, es retiren les imatges més antigues i se’n deixa constància; els registres es conserven. Exporteu abans d’esborrar o de superar la retenció.

## Límit que cal tenir clar

Aquesta és una aplicació de **supervisió web**, no un bloqueig del sistema operatiu. Un navegador no pot impedir de manera fiable Alt+Tab, tancar-se, obrir una altra aplicació, revocar la captura o manipular el client. La pantalla de bloqueig pausa la pàgina, no tot l’ordinador. La pèrdua de visibilitat no prova frau ni identifica una aplicació.

Per a un examen amb restriccions fortes cal un client instal·lat o un entorn de quiosc gestionat. La signatura protegeix l’origen de les ordres per als clients honestos; no converteix JavaScript sota control de l’alumne en un entorn inviolable.

## Variables opcionals

Es pot crear un fitxer `.env` al PC docent:

```dotenv
CONTROWL_ADMIN_PASSWORD=una-contrasenya-llarga-i-privada
PORT=3000
CONTROWL_TLS_CERT=certs/server.pem
CONTROWL_TLS_KEY=certs/server-key.pem
CONTROWL_DATA_DIR=.controwl
```

Sense contrasenya configurada, es genera una de nova en arrencar. Sense TLS, el servidor només escolta a 127.0.0.1. La clau de signatura es conserva al directori de dades i no es distribueix als alumnes.

## Desenvolupament i proves

```sh
bun install --frozen-lockfile
bun run lint
PAGES_BASE_PATH=/ bun run build
bun run test:live
bun start
```

GitHub Actions comprova tipus, build de Pages i del servidor local, transport entre docent i alumnes, aïllament, persistència després de reinici, ordres signades, confirmacions, replay i finalització. La prova de navegador utilitza una captura sintètica determinista per verificar el flux; no substitueix la prova del diàleg de permisos, TLS i tallafoc en els ordinadors del centre.

La demostració anterior es conserva només a `?demo=1`. El flux principal és el servidor del docent.
