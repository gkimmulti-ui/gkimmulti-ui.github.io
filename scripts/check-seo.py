#!/usr/bin/env python3
"""Validate the generated static pages, discoverability and canonical language graph."""
import hashlib,json,re,xml.etree.ElementTree as ET
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit,unquote,urljoin
from urllib.robotparser import RobotFileParser
ROOT=Path(__file__).resolve().parents[1]
SITE=json.loads((ROOT/'data/search-config.json').read_text())['site']
PAGES=json.loads((ROOT/'data/page-manifest.json').read_text())
APPS={a['slug']:a for a in json.loads((ROOT/'data/apps.json').read_text())}
TRANSLATIONS=json.loads((ROOT/'data/translations.json').read_text())
LANGS={l['code']:l['hreflang'] for l in json.loads((ROOT/'data/languages.json').read_text(encoding='utf-8'))}
class Document(HTMLParser):
    def __init__(self,source):
        super().__init__(convert_charrefs=True);self.tags=[];self.feed(source)
    def handle_starttag(self,tag,attrs):self.tags.append((tag,dict(attrs)))
    def find(self,tag,**attrs):return [a for t,a in self.tags if t==tag and all(a.get(k)==v for k,v in attrs.items())]

def ensure(condition,message):
    if not condition:raise AssertionError(message)

def local_file(url):
    pathname=unquote(urlsplit(url).path)
    return ROOT/(pathname.lstrip('/')+('index.html' if pathname.endswith('/') else ''))

def main():
    documents={};titles=[];descriptions=[]
    robot=RobotFileParser();robot.parse((ROOT/'robots.txt').read_text().splitlines())
    for page in PAGES:
        file=ROOT/page['path'];source=file.read_text();d=Document(source);documents[page['url']]=d
        context=page['url']
        ensure(hashlib.sha256(file.read_bytes()).hexdigest()==page['sha256'],context+' manifest hash')
        ensure(len(d.find('h1'))==1,context+' exactly one H1')
        title=re.search(r'<title>(.*?)</title>',source).group(1);titles.append(title)
        desc=d.find('meta',name='description');ensure(len(desc)==1 and desc[0]['content'],context+' description');descriptions.append(desc[0]['content'])
        ensure(d.find('link',rel='canonical')[0]['href']==context,context+' self canonical')
        ensure(d.find('meta',property='og:url')[0]['content']==context,context+' OG URL')
        ensure(d.find('meta',property='og:title')[0]['content']==__import__('html').unescape(title),context+' OG title')
        ensure('noindex' not in d.find('meta',name='robots')[0]['content'],context+' index allowed')
        ensure(d.find('html')[0]['data-locale']==page['lang'],context+' locale')
        selected=[a for a in d.find('option') if 'selected' in a]
        ensure(len(selected)==1 and selected[0]['value']==page['lang'],context+' language selection')
        for crawler in ['Googlebot','Yeti']:ensure(robot.can_fetch(crawler,context),context+' crawl allowed')
        schema=json.loads(re.search(r'<script type="application/ld\+json" id="ld-json">(.*?)</script>',source,re.S).group(1));graph=schema['@graph']
        ensure(next(g for g in graph if g['@type'] in ['WebPage','CollectionPage'])['url']==context,context+' schema URL')
        ensure(len([a for a in d.find('a') if a.get('hreflang')])==len(LANGS),context+' crawlable language links')
        if page['app']:
            app=APPS[page['app']];software=next(g for g in graph if g['@type']=='MobileApplication')
            ensure(software['installUrl']==[u for u in [app['playUrl'],app.get('appStoreUrl')] if u],context+' store destinations')
            ensure(__import__('html').escape(app['desc'][page['lang']],quote=True).replace('&#x27;','&#39;') in source,context+' static translated description')
            ensure(len([a for a in d.find('a') if 'data-shot' in a])==len(app['screenshots']),context+' screenshots')
            ensure('aggregateRating' not in software and 'review' not in software,context+' no invented reviews')
        else:
            ensure(len([a for a in d.find('article') if a.get('id','').startswith('app-')])==len(APPS),context+' full static catalog')
            ensure(len([a for a in d.find('a') if a.get('class')=='hero-screen'])==len(APPS),context+' hero retained')
        ids=[a['id'] for _,a in d.tags if a.get('id')];ensure(len(ids)==len(set(ids)),context+' unique IDs')
        for tag,attrs in d.tags:
            for key in ['src','href']:
                value=attrs.get(key)
                if not value or value.startswith(('mailto:','data:')):continue
                target=urljoin(context,value);parts=urlsplit(target)
                if parts.netloc!=urlsplit(SITE).netloc:continue
                ensure(local_file(target).is_file(),context+' missing local target '+target)
                if parts.fragment and parts.path==urlsplit(context).path:ensure(parts.fragment in ids,context+' missing anchor '+parts.fragment)
            if tag=='img' and attrs.get('src'):ensure('alt' in attrs,context+' image alt')
    ensure(len(titles)==len(set(titles)),'Unique titles across languages/apps')
    ensure(len(descriptions)==len(set(descriptions)),'Unique descriptions across languages/apps')
    for page in PAGES:
        d=documents[page['url']];alternates=[a for a in d.find('link',rel='alternate') if 'hreflang' in a]
        ensure({a['hreflang'] for a in alternates}==set(LANGS.values())|{'x-default'},page['url']+' hreflang codes')
        for alternate in alternates:
            ensure(alternate['href'] in documents,page['url']+' alternate target')
            other=documents[alternate['href']]
            ensure(any(a.get('href')==page['url'] and a.get('hreflang')==LANGS[page['lang']] for a in other.find('link',rel='alternate')),page['url']+' reciprocal hreflang')
    ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9','image':'http://www.google.com/schemas/sitemap-image/1.1'}
    xml=ET.parse(ROOT/'sitemap.xml');urls=[u.find('s:loc',ns).text for u in xml.getroot()]
    ensure(len(urls)==len(set(urls)),'Sitemap URL uniqueness')
    ensure(all(p['url'] in urls for p in PAGES),'Sitemap covers all content pages')
    for url in urls:ensure(local_file(url).is_file(),'Sitemap missing '+url)
    for image in xml.findall('.//image:loc',ns):ensure(local_file(image.text).is_file(),'Sitemap missing image '+image.text)
    feed=ET.parse(ROOT/'feed.xml');items=feed.findall('./channel/item');ensure(len(items)==len(APPS),'RSS contains all apps')
    for item in items:ensure(item.find('link').text in documents,'RSS canonical URL')
    ensure('noindex' in (ROOT/'404.html').read_text(),'404 not indexable')
    print(f'PASS: {len(PAGES)} static pages, {len(urls)} sitemap URLs, {len(items)} RSS items; unique metadata, canonical/hreflang, schemas, links, assets and crawler access.')
if __name__=='__main__':main()

