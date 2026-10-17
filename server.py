"""Run with python server.py; no third-party packages required."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import argparse
from models import simulate

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        routes = {'/': 'index.html', '/index.html': 'index.html', '/lab.html': 'lab.html', '/engine.js': 'engine.js', '/ml.js': 'ml.js', '/advisor.js': 'advisor.js', '/lab.js': 'lab.js', '/lab.css': 'lab.css'}
        if self.path not in routes:
            self.send_error(404); return
        name = routes[self.path]
        body = Path(__file__).with_name(name).read_bytes()
        mime = 'text/javascript' if name.endswith('.js') else 'text/css' if name.endswith('.css') else 'text/html'
        self.send_response(200)
        self.send_header('Content-Type',mime+'; charset=utf-8')
        self.send_header('Content-Length',str(len(body)))
        self.end_headers(); self.wfile.write(body)

    def do_POST(self):
        if self.path != '/simulate':
            self.send_error(404); return
        try:
            length = int(self.headers.get('Content-Length',0))
            if not 0 < length <= 16384:
                raise ValueError('Request must be between 1 and 16384 bytes')
            data = json.loads(self.rfile.read(length))
            result = simulate(data)
            status = 200
        except (ValueError, TypeError, AttributeError, OverflowError) as exc:
            result = {'error':str(exc)}; status=400
        body=json.dumps(result, allow_nan=False).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json')
        self.send_header('Content-Length',str(len(body)))
        self.end_headers(); self.wfile.write(body)

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=8000)
    args=parser.parse_args()
    print(f'LiftLab is running at http://127.0.0.1:{args.port}', flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
