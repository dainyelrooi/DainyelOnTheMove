"""Retry an interrupted Hosting publish even after its data commit succeeded."""
from pathlib import Path
import json
import sys
import urllib.request
import urllib.error

root=Path(__file__).resolve().parents[2]
hosts={'staging':'https://dainyelonthemove-staging.web.app','main':'https://dainyelonthemove.com'}
host=hosts[sys.argv[1]]
different=False
for path in ['data/postcards/index.json','data/latest-youtube.json','assets/optimized/youtube-latest.jpg']:
    local=(root/path).read_bytes()
    request=urllib.request.Request(host+'/'+path,headers={'Cache-Control':'no-cache','User-Agent':'Dainyel-public-archive-check/1.0'})
    try:
        with urllib.request.urlopen(request,timeout=25) as response:remote=response.read(1000000)
        same=json.loads(local)==json.loads(remote) if path.endswith('.json') else local==remote
        different |= not same
    except urllib.error.HTTPError as error:
        if error.code!=404:raise RuntimeError('Public archive read unavailable') from None
        different=True
print('needs_deploy='+str(different).lower())
