#!/usr/bin/env python3
"""Dev server with no-cache headers so browser always loads fresh files."""
from http.server import SimpleHTTPRequestHandler, HTTPServer

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # silence request logs

if __name__ == "__main__":
    port = 8000
    print(f"Serving at http://localhost:{port}  (no-cache)")
    HTTPServer(("", port), NoCacheHandler).serve_forever()
