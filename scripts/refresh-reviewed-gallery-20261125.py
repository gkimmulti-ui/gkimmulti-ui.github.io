"""One-off, reviewed official Play listing refresh for four public catalog apps.
No credentials, private data, or app store writes. Abort on gallery identity drift.
"""
import hashlib, json, re, urllib.parse, runpy
from pathlib import Path
from google_play_scraper import app as play_app
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
helper=runpy.run_path(str(ROOT/'scripts/refresh-store-screenshots.py'))
screenshots=helper['screenshots']
read=lambda p:json.loads((ROOT/p).read_text(encoding='utf-8'))
write=lambda p,x:(ROOT/p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
evidence=read('src/store-gallery-refresh-evidence.json')['apps']
copy=read('src/store-description-refresh-draft.json')['descriptions']
apps=read('data/apps.json'); sources=read('data/store-sources.json')
locales={'ko':('ko','kr'),'en':('en','us'),'ja':('ja','jp'),'zh':('zh-CN','tw'),'ru':('ru','us'),'fil':('fil','ph')}
assert set(copy)=={'snapclean','lightled','slimjoy','chaengkim'}
assert set(evidence)=={'snapclean','lightled','chaengkim'}
def image_identity(url):
    u=urllib.parse.urlsplit(url)
    assert u.scheme=='https' and u.hostname=='play-lh.googleusercontent.com' and not u.query and not u.fragment
    assert re.fullmatch(r'/[A-Za-z0-9_-]+(?:=[A-Za-z0-9_-]+)?',u.path)
    return url.split('=')[0]
proof={}
for entry in apps:
    slug=entry['slug']
    if slug not in copy:continue
    record=next(x for x in sources if x['slug']==slug)
    package=urllib.parse.parse_qs(urllib.parse.urlsplit(entry['playUrl']).query)['id'][0]
    assert package==record['package']
    seen={}
    for locale,(language,country) in locales.items():
        listing=play_app(package,lang=language,country=country)
        assert listing['developer']=='Kenneth App',slug
        assert listing.get('description') and listing.get('summary'),(slug,locale)
        seen[locale]=listing
    current=seen['ko']
    assert set(copy[slug])==set(entry['desc'])
    entry['desc']=copy[slug]
    entry['playDescription']={key:val['description'] for key,val in seen.items()}
    record['localized']={key:{'title':val['title'],'summary':val['summary'],'description':val['description'],'version':val.get('version'),'updated':val.get('updated'),'sourceUrl':entry['playUrl']+'&hl='+locales[key][0]+'&gl='+locales[key][1].upper()} for key,val in seen.items()}
    record['verifiedAt']=helper['TODAY']
    if slug in evidence:
        reviewed=list(dict.fromkeys(image_identity(x) for x in evidence[slug]['observedImageUrls']))
        official=list(dict.fromkeys(image_identity(x) for x in current['screenshots']))
        if reviewed != official:
            raise ValueError(f'Gallery changed or API disagrees for {slug}: reviewed={len(reviewed)} live={len(official)}')
        existing=entry['screenshots']
        new=screenshots(slug,reviewed,'Google Play',existing)
        entry['screenshots']=new+[s for s in existing if s['platform']!='Google Play']
        record['screenshots']=entry['screenshots']
        proof[slug]=[]
        for shot in new:
            row={k:shot[k] for k in ('src','thumb','sourceUrl','width','height')}
            for key in ('src','thumb'):
                p=ROOT/shot[key]
                with Image.open(p) as im:im.verify()
                row[key+'Sha256']=hashlib.sha256(p.read_bytes()).hexdigest()
            proof[slug].append(row)
    else:
        old=[image_identity(s['sourceUrl']) for s in entry['screenshots'] if s['platform']=='Google Play']
        actual=list(dict.fromkeys(image_identity(x) for x in current['screenshots']))
        assert old==actual,f'Unexpected changed gallery {slug}'
    print(slug,'checked',len(entry['screenshots']),'images, 12 summaries, six store descriptions',flush=True)
write('data/apps.json',apps);write('data/store-sources.json',sources)
write('src/store-gallery-verified-20261125.json',proof)
