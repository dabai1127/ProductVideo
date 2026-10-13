"""Convert a browser-exported video to a widely compatible H.264/AAC MP4."""
from pathlib import Path
import subprocess, shutil, sys
def main():
    if len(sys.argv)<2:
        print('请把编辑器导出的视频拖到「转换为MP4.cmd」上。');return 1
    source=Path(sys.argv[1]).resolve()
    if not source.is_file():print('找不到视频文件。');return 1
    ffmpeg=shutil.which('ffmpeg')
    if not ffmpeg:print('当前电脑未找到 FFmpeg。');return 1
    target=source.with_name(source.stem+'_通用版.mp4')
    i=2
    while target.exists():
        target=source.with_name(source.stem+f'_通用版_{i}.mp4');i+=1
    result=subprocess.run([ffmpeg,'-hide_banner','-i',str(source),'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',str(target)])
    if not result.returncode:print('转换完成：'+str(target))
    return result.returncode
if __name__=='__main__':sys.exit(main())
