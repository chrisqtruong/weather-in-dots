#!/usr/bin/env python3
"""Tiny no-cache preview server: python3 serve.py, then open localhost:4322."""
import http.server, os, socketserver

os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", 4322), Handler) as httpd:
    httpd.serve_forever()
