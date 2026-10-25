"""Loopback-only static review. Never serves private, authoring or hidden files."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse
import gzip
import io
import re

ROOT = Path(__file__).resolve().parent.parent

class Preview(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path):
        target = super().translate_path(path)
        relative = unquote(urlsplit(path).path).strip('/')
        if not relative: return str(ROOT / 'index.html')
        if relative == 'studio': return str(ROOT / 'admin.html')
        if re.fullmatch(r'entry/entry-[a-f0-9]{32}/?',relative): return str(ROOT / 'entry.html')
        if re.fullmatch(r'[a-z0-9-]+', relative) and Path(target + '.html').is_file():
            return target + '.html'
        return target

    def allowed(self):
        path = unquote(urlsplit(self.path).path).lstrip('/') or 'index.html'
        parts = Path(path).parts
        target = Path(self.translate_path(self.path)).resolve()
        allowed = bool(re.fullmatch(r'entry/entry-[a-f0-9]{32}/?',path)) or (len(parts) == 1 and target.suffix in {'.html', '.xml', '.txt', '.svg'}) or (parts and parts[0] in {'assets', 'js', 'data'})
        return allowed and not any(part.startswith('.') or part.lower() == 'private' for part in parts) and target.is_relative_to(ROOT) and target.is_file()

    def do_GET(self):
        if not self.allowed(): self.send_error(404); return
        super().do_GET()

    def do_HEAD(self):
        if not self.allowed(): self.send_error(404); return
        super().do_HEAD()

    def send_head(self):
        target=Path(self.translate_path(self.path))
        if COMPRESS and 'gzip' in self.headers.get('Accept-Encoding','') and target.suffix in {'.html','.css','.js','.json','.svg','.xml'}:
            content=gzip.compress(target.read_bytes(),compresslevel=6)
            self.send_response(200)
            self.send_header('Content-Type',self.guess_type(str(target)))
            self.send_header('Content-Encoding','gzip')
            self.send_header('Vary','Accept-Encoding')
            self.send_header('Content-Length',str(len(content)))
            self.end_headers()
            return io.BytesIO(content)
        return super().send_head()

    def end_headers(self):
        self.send_header('X-Robots-Tag', 'noindex, nofollow')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--root',type=Path,default=ROOT)
    parser.add_argument('--gzip',action='store_true')
    args = parser.parse_args()
    ROOT=args.root.resolve()
    COMPRESS=args.gzip
    print(f'Private local review: http://127.0.0.1:{args.port}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), Preview).serve_forever()
