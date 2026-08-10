"""Lokal udviklingsserver for Bikerbasen.

Siden er ren statisk HTML/CSS/JS, så der skal ikke andet til end at servere
projektmappen. Grunden til at det ikke bare er `python -m http.server` er
porten: den indbygget server tager kun porten som positionsargument, mens
værktøjet omkring os tildeler en ledig port via PORT-miljøvariablen. Uden
det her ville to sessioner slås om 8532.

Kør manuelt med:  python scripts/dev-server.py
eller på en bestemt port:  PORT=8532 python scripts/dev-server.py
"""

import functools
import http.server
import os
import socketserver
import threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get("PORT", "8532"))


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Ingen caching lokalt. Siden versionsstempler js/css i produktion,
        # men under udvikling vil man se sin sidste rettelse med det samme.
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Standardloggen spammer én linje pr. fil; kun fejl er interessante.
        if args and str(args[1]).startswith(("4", "5")):
            super().log_message(fmt, *args)


class Server(socketserver.ThreadingTCPServer):
    """Trådet, fordi en browser holder forbindelser åbne (keep-alive).

    Med den enkelte TCPServer blokerede én åben faneblad alle andre
    forespørgsler — også et curl fra kommandolinjen hang i det uendelige.
    """

    allow_reuse_address = True
    daemon_threads = True


handler = functools.partial(Handler, directory=ROOT)

with Server(("127.0.0.1", PORT), handler) as httpd:
    print(f"Bikerbasen kører på http://127.0.0.1:{PORT}")
    httpd.serve_forever()
