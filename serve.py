from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
PORT = 5564
ROOT = Path(__file__).resolve().parent
class NoCache(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def end_headers(self):
        self.send_header('Cache-Control','no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma','no-cache')
        super().end_headers()
print(f'[PrivateCord] HTTP server listening on http://127.0.0.1:{PORT}/', flush=True)
server = ThreadingHTTPServer(('127.0.0.1', PORT), NoCache)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
