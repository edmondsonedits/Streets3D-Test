"""Loopback-only, range-capable server for this isolated demo folder."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import re, json, urllib.parse
ROOT=Path(__file__).resolve().parents[1]/'site'
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
    def log_message(self,fmt,*args):
        if str(args[1]) not in ('200','206','304'):super().log_message(fmt,*args)
    def send_head(self):
        if urllib.parse.urlsplit(self.path).path=='/health':
            data=json.dumps({'app':'streets3d-test'}).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',len(data));self.end_headers();import io;return io.BytesIO(data)
        p=Path(self.translate_path(self.path)).resolve()
        if not p.is_relative_to(ROOT):self.send_error(403);return None
        if p.is_dir():p=p/'index.html'
        if not p.is_file():self.send_error(404);return None
        f=p.open('rb');size=p.stat().st_size;start=0;end=size-1;partial=False
        rng=self.headers.get('Range')
        if rng:
            m=re.fullmatch(r'bytes=(\d*)-(\d*)',rng)
            if m:
                if m[1]:start=int(m[1]);end=min(int(m[2]) if m[2] else size-1,size-1)
                else:start=max(0,size-int(m[2] or '0'))
                partial=True
                if start>=size or end<start:f.close();self.send_error(416);return None
        self._remaining=end-start+1;f.seek(start);self.send_response(206 if partial else 200);self.send_header('Content-Type',self.guess_type(str(p)));self.send_header('Content-Length',self._remaining);self.send_header('Accept-Ranges','bytes');self.send_header('Cache-Control','no-cache');
        if partial:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        self.end_headers();return f
    def copyfile(self,source,outputfile):
        n=getattr(self,'_remaining',None)
        try:
            while n is None or n>0:
                b=source.read(min(n,262144) if n is not None else 262144)
                if not b:break
                outputfile.write(b)
                if n is not None:n-=len(b)
        except (BrokenPipeError,ConnectionResetError,ConnectionAbortedError):pass
if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8855);args=parser.parse_args()
    print(f'Streets3D Test Lab: http://127.0.0.1:{args.port}/',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
