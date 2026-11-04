"""Lay the sound effects (cues.json, written by render.mjs) over the music bed
and mux with the silent video.  Usage: python3 mix.py <ffmpeg> <silent.mp4> <out.mp4>"""
import json, subprocess, sys
from pathlib import Path
ff, video, out = sys.argv[1:4]
cues = json.loads(Path('cues.json').read_text())
args = [ff, '-v', 'error', '-y', '-i', video, '-stream_loop', '3', '-i', 'beat.mp3']
filters = ['[1:a]atrim=0:60,afade=t=in:d=0.3,afade=t=out:st=57.5:d=2.5,volume=-9dB[music]']
labels = ['[music]']
for i, c in enumerate(cues):
    args += ['-i', f"sfx/{c['s']}.mp3"]
    ms = int(round(c['t'] * 1000))
    filters.append(f"[{i + 2}:a]volume={c['g']}dB,adelay={ms}|{ms}[c{i}]")
    labels.append(f'[c{i}]')
filters.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0:dropout_transition=0,atrim=0:60,loudnorm=I=-14:TP=-1.5:LRA=11[aout]")
args += ['-filter_complex', ';'.join(filters), '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-movflags', '+faststart', out]
subprocess.run(args, check=True)
print(len(cues), 'sound cues mixed ->', out)
