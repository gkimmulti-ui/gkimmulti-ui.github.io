"""Register the six published apps before fetching their official store content."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'data/apps.json'
apps = json.loads(path.read_text(encoding='utf-8'))
releases = [
 ('levelday', 'com.kennethapp.levelday', 'LEVEL DAY', 'life', 'rose'),
 ('littleheroes', 'com.kennethapp.littleheroes', 'Little Heroes: Kingdom Quest', 'play', 'sage'),
 ('nightmarket', 'com.kennethapp.bustlingnightmarket', 'Moonmori: Night Market', 'play', 'peach'),
 ('pocketdino', 'com.kennethapp.pocket_dino', 'Pocket Dino', 'life', 'sage'),
 ('pocketjesus', 'com.kennethapp.pocket_jesus', 'Pocket Jesus', 'faith', 'sand'),
 ('rateshift', 'com.kennethapp.rateshift', 'RateShift: Loan & Savings', 'tools', 'blue'),
]
for slug,package,name,group,tone in reversed(releases):
    if any(a['slug']==slug for a in apps):
        continue
    apps.insert(0, dict(slug=slug,name=name,group=group,tone=tone,category={},headline={},desc={},tags={},
                        playUrl='https://play.google.com/store/apps/details?id='+package,
                        appStoreUrl=None,icon='images/'+slug+'-icon.webp',screenshots=[]))
path.write_text(json.dumps(apps,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
