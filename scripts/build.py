"""Build a portable, network-free application from editable source files."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import base64
import json
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'src'
html=(source/'index.html').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+(source/'style.css').read_text(encoding='utf-8')+'</style>')
code='\n'.join((source/name).read_text(encoding='utf-8') for name in ['catalog.js','layouts.js','timeline.js'])
music=ROOT/'public/audio/default-music.mp3'
media={'/public/audio/default-music.mp3':'data:audio/mpeg;base64,'+base64.b64encode(music.read_bytes()).decode('ascii')}
code+='\nwindow.FILM_OFFLINE={project:FilmCatalog.project(),media:'+json.dumps(media,separators=(',',':'))+'};\n'
code+='\n'.join((source/name).read_text(encoding='utf-8') for name in ['offline.js','app.js','composition.js'])
html=html.replace('<script src="app.js"></script>','<script>'+code.replace('</script','<\\/script')+'</script>')
(ROOT/'index.html').write_text(html,encoding='utf-8')
with ZipFile(ROOT.parent/'产品宣传制作_交付包.zip','w',ZIP_DEFLATED) as z:
    for folder in [ROOT]:
        for file in folder.rglob('*'):
            if file.is_file() and '__pycache__' not in file.parts and 'tests' not in file.relative_to(ROOT).parts and file.name!='使用说明.txt' and file.suffix!='.pyc':
                z.write(file,'产品宣传制作/'+file.relative_to(ROOT).as_posix())
print('Built independent product promo studio:',len(html),'characters')
