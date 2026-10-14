#!/usr/bin/env python3
"""Private, temporary Codespaces helper for rclone's loopback OAuth callback.

Uses only the Python standard library. Never prints rclone output or callback
values. Tokens are saved by rclone to its own config outside the repository.
"""

import html
import json
import os
import re
import secrets
import shutil
import subprocess
import threading
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = 8765
LOOPBACK = "http://127.0.0.1:53682"
AUTH_LINK = re.compile(r"http://(?:127\.0\.0\.1|localhost):53682/auth\?state=[^\s]+")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


LOCAL_HTTP = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())


class SignIn:
    def __init__(self):
        self.csrf = secrets.token_urlsafe(32)
        self.auth_link = None
        self.expected_state = None
        self.submitted = False
        self.status = "Aanmelding wordt gestart. Wacht even."
        self.lock = threading.Lock()
        self.process = None
        self.finished = False

    def run(self):
        self.process = subprocess.Popen(
            ["rclone", "config", "create", "onedrive", "onedrive",
             "config_auth_no_browser", "true", "config_type", "onedrive",
             "access_scopes", "Files.ReadWrite offline_access"],
            stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT, text=True,
        )
        failure = "Microsoft-aanmelding mislukt. Sluit deze hulp en start opnieuw."
        for line in self.process.stdout:
            # All other output, including rclone's final token dump, is discarded.
            match = AUTH_LINK.search(line)
            if match:
                self.auth_link = match.group(0)
                self.expected_state = urllib.parse.parse_qs(
                    urllib.parse.urlsplit(self.auth_link).query
                ).get("state", [None])[0]
                self.status = "Klaar. Tik op Aanmelden bij Microsoft."
            elif "address already in use" in line.lower():
                failure = "Poort 53682 is bezet. Stop de oude rclone-opdracht met Ctrl+C."
            elif "invalid_grant" in line:
                failure = "Microsoft heeft de code afgewezen. Start opnieuw en plak de terugkeerlink direct."
        result = self.process.wait()
        self.status = "OneDrive-verbinding opgeslagen. Je kunt deze hulp sluiten met Ctrl+C." if result == 0 else failure
        self.finished = True

    def stop(self):
        if self.process is not None and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()

    def callback_url(self, value):
        """Accept only the matching, complete Microsoft loopback callback."""
        parsed = urllib.parse.urlsplit(value.strip())
        if (parsed.scheme != "http" or parsed.netloc not in
                ("localhost:53682", "127.0.0.1:53682") or parsed.path not in ("", "/")):
            raise ValueError("Plak de volledige URL van de onbereikbare localhost-pagina.")
        query = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        if (len(query.get("code", [])) != 1 or not query["code"][0] or
                len(query.get("state", [])) != 1 or not self.expected_state or
                not secrets.compare_digest(query["state"][0], self.expected_state)):
            raise ValueError("Deze link hoort niet bij deze aanmelding. Gebruik de knop hierboven en de nieuwe terugkeerlink.")
        return LOOPBACK + "/?" + urllib.parse.urlencode({
            "code": query["code"][0], "state": query["state"][0],
        })


def page(csrf):
    return """<!doctype html><html lang="nl"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OneDrive verbinden</title>
<style>body{font:18px/1.5 system-ui;max-width:600px;margin:32px auto;padding:0 20px;color:#18291f}
a,button{display:inline-block;padding:12px 18px;background:#145b38;color:white;border:0;border-radius:8px;font:inherit}
textarea{box-sizing:border-box;width:100%;min-height:140px;font:16px system-ui;padding:12px}
label{display:block;margin:16px 0 8px}a:focus,button:focus,textarea:focus{outline:3px solid #ac7900}
#status{padding:12px;background:#eff4ef}button:disabled,a[aria-disabled=true]{opacity:.5}</style>
<h1>OneDrive verbinden</h1><p>Houd deze poort privé. Deze hulp draait in jouw Codespace.</p>
<p id="status" role="status">Aanmelding wordt gestart.</p>
<p>1. Open Microsoft in een nieuw tabblad en meld je aan met je privé-account.</p>
<a id="signin" href="/signin" target="_blank" rel="noopener noreferrer" aria-disabled="true">Aanmelden bij Microsoft</a>
<p>2. Na het aanmelden verschijnt een onbereikbare localhost-pagina. Kopieer direct de <strong>hele adresbalk</strong>, zonder iets te wijzigen.</p>
<form id="callback"><label for="url">3. Plak die volledige terugkeerlink hier</label>
<textarea id="url" name="url" autocomplete="off" spellcheck="false" required></textarea>
<button id="submit" type="submit">Aanmelding afronden</button></form>
<p>De link wordt alleen naar rclone in jouw Codespace gestuurd. Deel hem niet in de chat.</p>
<p>Microsoft vraagt toegang tot je eigen OneDrive-bestanden. Dit beperkt de accounttoegang niet technisch tot één map.
Bestandsacties voor dit project blijven beperkt tot de websitemap en back-ups. Deze hulp kopieert of synchroniseert geen bestanden.</p>
<script>
const statusEl=document.getElementById('status'), signin=document.getElementById('signin');
let finished=false;
async function poll(){try{const r=await fetch('/status',{cache:'no-store'});const s=await r.json();
statusEl.textContent=s.message;signin.setAttribute('aria-disabled',String(!s.ready));finished=s.finished;
document.getElementById('submit').disabled=finished;
}catch(e){statusEl.textContent='Geen verbinding met de hulp. Controleer de Codespaces-terminal.';}
if(!finished)setTimeout(poll,1500);}
signin.addEventListener('click',e=>{if(signin.getAttribute('aria-disabled')==='true')e.preventDefault();});
document.getElementById('callback').addEventListener('submit',async e=>{e.preventDefault();
const input=document.getElementById('url');const values=new URLSearchParams({url:input.value,csrf:'CSRF_VALUE'});
input.value='';document.getElementById('submit').disabled=true;
try{const r=await fetch('/callback',{method:'POST',body:values});const s=await r.json();statusEl.textContent=s.message;
if(!r.ok)alert(s.message);}catch(e){alert('Geen verbinding. Controleer de terminal.');}
document.getElementById('submit').disabled=finished;});poll();
</script></html>""".replace("CSRF_VALUE", html.escape(csrf))


def handler_for(session):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass  # Never log requests, URLs, codes or tokens.

        def respond(self, code, value, content_type="application/json; charset=utf-8", location=None):
            data = value.encode() if isinstance(value, str) else json.dumps(value).encode()
            self.send_response(code)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
            if location:
                self.send_header("Location", location)
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            if self.path == "/":
                self.respond(200, page(session.csrf), "text/html; charset=utf-8")
            elif self.path == "/status":
                self.respond(200, {"message": session.status,
                                   "ready": bool(session.auth_link) and not session.finished and not session.submitted,
                                   "finished": session.finished})
            elif self.path == "/signin":
                if not session.auth_link or session.finished or session.submitted:
                    self.respond(409, {"message": session.status})
                    return
                try:
                    # Get Microsoft's redirect from rclone without visiting it.
                    LOCAL_HTTP.open(session.auth_link, timeout=10)
                except urllib.error.HTTPError as error:
                    location = error.headers.get("Location", "")
                    dest = urllib.parse.urlsplit(location)
                    if error.code in (302, 303, 307, 308) and dest.scheme == "https" and dest.hostname in ("login.microsoftonline.com", "login.live.com"):
                        self.respond(302, "", location=location)
                        return
                except (OSError, ValueError):
                    pass
                self.respond(502, {"message": "De aanmeldpoging is gestopt. Herstart de hulp in de terminal."})
            else:
                self.respond(404, {"message": "Pagina niet gevonden."})

        def do_POST(self):
            if self.path != "/callback":
                self.respond(404, {"message": "Pagina niet gevonden."})
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 131072:
                    raise ValueError("De terugkeerlink is leeg of te lang.")
                form = urllib.parse.parse_qs(self.rfile.read(length).decode("utf-8"))
                if not secrets.compare_digest(form.get("csrf", [""])[0], session.csrf):
                    self.respond(403, {"message": "Open de huidige aanmeldhulp opnieuw."})
                    return
                callback = session.callback_url(form.get("url", [""])[0])
            except (ValueError, UnicodeError) as error:
                # Only our fixed validation messages; never show a malformed URL.
                message = str(error) if str(error).startswith(("Plak ", "Deze ", "De terugkeerlink")) else "De terugkeerlink is ongeldig."
                self.respond(400, {"message": message})
                return
            with session.lock:
                if session.finished or session.submitted:
                    self.respond(409, {"message": "Deze poging is al verwerkt. Bekijk de status hierboven."})
                    return
                session.submitted = True
            try:
                with LOCAL_HTTP.open(callback, timeout=10) as response:
                    response.read()
                if not session.finished:
                    session.status = "Code ontvangen. Rclone slaat de verbinding op; wacht op bevestiging."
                self.respond(200, {"message": session.status})
            except (OSError, ValueError):
                session.status = "De code is niet verwerkt. Sluit deze hulp en start opnieuw."
                self.respond(502, {"message": session.status})
    return Handler


def main():
    if not shutil.which("rclone"):
        print("Installeer eerst rclone: sudo apt-get update && sudo apt-get install -y rclone")
        return 1
    remotes = subprocess.run(["rclone", "listremotes"], capture_output=True, text=True)
    if remotes.returncode != 0:
        print("Rclone kan zijn configuratie niet openen. Controleer de configuratie in deze Codespace.")
        return 1
    if "onedrive:" in remotes.stdout.splitlines():
        print('Er is al een OneDrive-verbinding. Controleer met: rclone lsd "onedrive:DainyelOnTheMove website"')
        return 0
    session = SignIn()
    try:
        server = ThreadingHTTPServer(("127.0.0.1", PORT), handler_for(session))
    except OSError:
        print("Poort 8765 is bezet. Stop een eerder gestarte aanmeldhulp met Ctrl+C.")
        return 1
    thread = threading.Thread(target=session.run, daemon=True)
    thread.start()
    codespace = os.environ.get("CODESPACE_NAME", "")
    domain = os.environ.get("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "app.github.dev")
    link = f"https://{codespace}-{PORT}.{domain}/" if codespace else f"http://localhost:{PORT}/"
    print("Open de aanmeldhulp in je gewone browser (houd poort 8765 privé):", flush=True)
    print(link, flush=True)
    print("Na de aanmelding: sluit deze hulp met Ctrl+C. Deel geen terugkeerlinks of tokens.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        session.stop()
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
