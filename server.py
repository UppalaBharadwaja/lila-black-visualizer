import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")

class NoCacheServer(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Disable caching so changes to style.css and js are reflected immediately
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        # Silence verbose logging
        pass

if __name__ == '__main__':
    port = 8088
    server = ThreadingHTTPServer(('127.0.0.1', port), NoCacheServer)
    print(f"Serving {DIRECTORY} on http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()

