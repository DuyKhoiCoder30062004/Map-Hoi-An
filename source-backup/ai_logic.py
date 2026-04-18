import sys
import json
import urllib.request
import urllib.error
import os

def call_gemini(payload, api_key):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.URLError as e:
        return {"error": str(e)}

def translate_text(text, api_key):
    payload = {
        "contents": [{"parts": [{"text": f"Translate the following Vietnamese text into English, Chinese, Korean, and Japanese. Return ONLY a JSON object with keys 'en', 'zh', 'ko', 'ja'. Text: {text}"}]}],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    data = call_gemini(payload, api_key)
    if 'error' in data:
        return data
    try:
        content = data['candidates'][0]['content']['parts'][0]['text']
        return json.loads(content)
    except Exception as e:
        return {"error": f"Parse error: {str(e)}", "raw": data}

def generate_tts(text, lang, voice, api_key):
    payload = {
        "contents": [{"parts": [{"text": f"Say in {lang}: {text}"}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": voice}
                }
            }
        }
    }
    data = call_gemini(payload, api_key)
    if 'error' in data:
        return data
    try:
        audio_data = data['candidates'][0]['content']['parts'][0]['inlineData']['data']
        return {"audio_base64": audio_data}
    except Exception as e:
        return {"error": f"TTS Parse error: {str(e)}", "raw": data}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing arguments"}))
        sys.exit(1)
        
    action = sys.argv[1]
    api_key = os.environ.get("GEMINI_API_KEY", "")
    
    if action == "translate":
        text = sys.argv[2]
        result = translate_text(text, api_key)
        print(json.dumps(result))
    elif action == "tts":
        text = sys.argv[2]
        lang = sys.argv[3]
        voice = sys.argv[4]
        result = generate_tts(text, lang, voice, api_key)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "Invalid action"}))
