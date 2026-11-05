"""
StudyDeck HCI Local Server
Serves static web files, provides /api/deck and /api/parse-pdf endpoints.
Compatible with Python 3.10+ through 3.14+ (Zero deprecated modules).
"""

import http.server
import socketserver
import os
import json
import urllib.parse
import re
import io

PORT = 8000
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
DECK_PATH = os.path.join(DATA_DIR, 'hci_deck.json')
PDF_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hci lecture.pdf')

def extract_pdf_cards(file_bytes_or_path):
    """Extract structured cards from PDF using pdfminer.six if available"""
    try:
        from pdfminer.high_level import extract_text
        if isinstance(file_bytes_or_path, (bytes, bytearray)):
            fp = io.BytesIO(file_bytes_or_path)
            raw = extract_text(fp)
        else:
            raw = extract_text(file_bytes_or_path)
            
        raw = raw.replace('\x0c', '\n').replace('(cid:127)', '•')
        lines = [l.strip() for l in raw.split('\n')]
        
        cards = []
        current_sec = 'General'
        current_q = None
        current_a = []
        current_opts = []
        card_id = 1
        
        def commit_card():
            nonlocal current_q, current_a, current_opts, card_id
            if current_q and (current_a or current_opts):
                ans_str = '\n'.join(current_a).strip()
                cards.append({
                    'id': card_id,
                    'category': current_sec,
                    'type': 'mcq' if current_sec == 'MCQ' or current_opts else ('long' if current_sec == 'Long Question' else 'short'),
                    'q': current_q,
                    'a': ans_str,
                    'options': current_opts[:] if current_opts else None
                })
                card_id += 1
                current_q = None
                current_a = []
                current_opts = []

        for line in lines:
            if not line:
                continue
                
            if re.search(r'SHORT\s+QUESTIONS', line, re.I):
                commit_card()
                current_sec = 'Short Question'
                continue
            elif re.search(r'LONG\s+QUESTIONS', line, re.I):
                commit_card()
                current_sec = 'Long Question'
                continue
            elif re.search(r'MCQS', line, re.I):
                commit_card()
                current_sec = 'MCQ'
                continue
                
            m_q = re.match(r'^(\d+)[\.\)]\s*(.+)$', line)
            if m_q and not re.match(r'^(Answer|Option|[A-D][\)\.])', line, re.I):
                commit_card()
                current_q = line
                continue
                
            if current_q:
                if re.match(r'^[A-D][\)\.]\s+', line):
                    current_opts.append(line)
                elif re.match(r'^Answer:\s*([A-D])\b', line, re.I):
                    ans_letter = re.match(r'^Answer:\s*([A-D])\b', line, re.I).group(1).upper()
                    opt_text = next((o for o in current_opts if o.startswith(ans_letter)), '')
                    current_a.append(f'Correct Answer: {ans_letter}' + (f' ({opt_text})' if opt_text else ''))
                else:
                    current_a.append(line)
                    
        commit_card()
        return cards
    except Exception as e:
        print("Error in extract_pdf_cards:", e)
        return []

class StudyDeckHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS and disable caching for reliable live development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        # API: Return the HCI deck
        if parsed.path == '/api/deck':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            
            if os.path.exists(DECK_PATH):
                with open(DECK_PATH, 'rb') as f:
                    self.wfile.write(f.read())
            elif os.path.exists(PDF_PATH):
                cards = extract_pdf_cards(PDF_PATH)
                self.wfile.write(json.dumps(cards, ensure_ascii=False).encode('utf-8'))
            else:
                self.wfile.write(b'[]')
            return
            
        # API: Health check / info
        if parsed.path == '/api/info':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            info = {
                'status': 'online',
                'server': 'StudyDeck HCI Server',
                'pdf_exists': os.path.exists(PDF_PATH),
                'deck_exists': os.path.exists(DECK_PATH)
            }
            self.wfile.write(json.dumps(info).encode('utf-8'))
            return
            
        # Serve static files from public/
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        
        if parsed.path == '/api/parse-pdf':
            content_type = self.headers.get('Content-Type', '')
            content_length = int(self.headers.get('Content-Length', 0))
            
            body = self.rfile.read(content_length)
            
            # Simple multipart boundary parsing
            file_bytes = None
            if 'multipart/form-data' in content_type and 'boundary=' in content_type:
                boundary = content_type.split('boundary=')[-1].strip().encode('utf-8')
                parts = body.split(b'--' + boundary)
                for part in parts:
                    if b'filename=' in part:
                        header_end = part.find(b'\r\n\r\n')
                        if header_end != -1:
                            file_bytes = part[header_end + 4:].rstrip(b'\r\n')
                            break
            else:
                file_bytes = body
                
            if not file_bytes and os.path.exists(PDF_PATH):
                with open(PDF_PATH, 'rb') as f:
                    file_bytes = f.read()
                    
            if file_bytes:
                cards = extract_pdf_cards(file_bytes)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'cards': cards, 'total': len(cards)}, ensure_ascii=False).encode('utf-8'))
            else:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': 'No file uploaded'}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

def run_server():
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    with http.server.ThreadingHTTPServer(("", PORT), StudyDeckHandler) as httpd:
        print("=" * 60)
        print(f" StudyDeck HCI Multimodal Server Running!")
        print(f" URL: http://localhost:{PORT}")
        print(f" Multimodal inputs supported: Eye Gaze, Voice, Keyboard/Switch")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")

if __name__ == '__main__':
    run_server()
