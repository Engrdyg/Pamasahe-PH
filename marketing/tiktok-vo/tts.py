"""Voice-over lines with ElevenLabs (text-to-speech with timestamps).
Writes audio/<id>.mp3 and audio/<id>.json (character alignment)."""
import base64, json, subprocess, sys
from pathlib import Path
VOICE = sys.argv[1] if len(sys.argv) > 1 else 'wfC9TpCSCTGAwxF7hSNi'  # Arcel - Casual Filipino Tech Vlogger
only = set(sys.argv[2:])
for line in json.loads(Path('script.json').read_text()):
    if only and line['id'] not in only:
        continue
    body = json.dumps({
        'text': line['text'],
        'model_id': 'eleven_multilingual_v2',
        'language_code': 'fil',
        'voice_settings': {'stability': 0.45, 'similarity_boost': 0.8, 'style': 0.35, 'use_speaker_boost': True},
    })
    out = subprocess.run(['curl', '-sS', '-X', 'POST', f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128',
                          '-H', 'Content-Type: application/json', '-d', body], capture_output=True, text=True).stdout
    d = json.loads(out)
    if 'audio_base64' not in d:
        print(line['id'], 'ERROR', out[:300]); sys.exit(1)
    Path(f"audio/{line['id']}.mp3").write_bytes(base64.b64decode(d['audio_base64']))
    Path(f"audio/{line['id']}.json").write_text(json.dumps(d['alignment']))
    a = d['alignment']
    print(line['id'], 'ok', round(a['character_end_times_seconds'][-1], 2), 's')
