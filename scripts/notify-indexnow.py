#!/usr/bin/env python3
"""Notify Naver of changed, published content. Default is a local preview only."""
import argparse, hashlib, json, subprocess
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--since',required=True,help='Commit immediately before the content update')
    parser.add_argument('--submit',action='store_true',help='Send the reviewed changed URLs after verifying publication')
    args=parser.parse_args()
    config=json.loads((ROOT/'data/search-config.json').read_text())
    changed=set(subprocess.check_output(['git','diff','--name-only',args.since,'HEAD','--'],cwd=ROOT,text=True).splitlines())
    pages=json.loads((ROOT/'data/page-manifest.json').read_text())
    urls=[p['url'] for p in pages if p['path'] in changed]
    if not urls:
        print('No changed content pages to notify.');return
    key=config['indexNowKey']
    payload={'host':config['site'].split('://',1)[1],'key':key,'keyLocation':config['site']+'/'+key+'.txt','urlList':urls}
    if not args.submit:
        print(json.dumps(payload,ensure_ascii=False,indent=2));return
    # This protocol requires a public ownership key, not a private account credential.
    with urlopen(payload['keyLocation'],timeout=30) as response:
        if response.read().decode('utf-8').strip()!=key:raise RuntimeError('Published key does not match')
    with urlopen(config['site']+'/sitemap.xml?v='+pages[0]['lastmod'],timeout=30) as response:
        if response.read()!=(ROOT/'sitemap.xml').read_bytes():raise RuntimeError('Sitemap deployment has not completed')
    request=Request(config['indexNowEndpoint'],data=json.dumps(payload).encode(),headers={'Content-Type':'application/json; charset=utf-8','User-Agent':'KennethApp-SitePublisher/1.0'},method='POST')
    try:
        with urlopen(request,timeout=45) as response:
            print(json.dumps({'endpoint':config['indexNowEndpoint'],'status':response.status,'urlCount':len(urls),'body':response.read().decode('utf-8')[:500]},ensure_ascii=False))
    except HTTPError as error:
        print(json.dumps({'status':error.code,'body':error.read().decode('utf-8',errors='replace')[:500]}))
        raise SystemExit(1)

if __name__=='__main__':main()
