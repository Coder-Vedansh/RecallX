from flask import Flask, request, jsonify, render_template
import sqlite3
import datetime
import threading
import webbrowser
import os

app = Flask(__name__, static_folder='.', static_url_path='')
DB_FILE = 'local_database.db'

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    # Create the modern Leaderboard table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS leaderboard (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            name TEXT NOT NULL,
            levels_beaten INTEGER NOT NULL,
            failures INTEGER NOT NULL,
            timestamp TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/')
def home():
    # Serve the main index file from root directory
    return app.send_static_file('index.html')

@app.route('/api/send_email', methods=['POST'])
def send_email():
    """
    Local College Simulator Endpoint:
    Since we are not physically pushing to Cloud NodeMailer SMTP arrays,
    returning success: False seamlessly shifts the Frontend UI into 'Simulated Mode',
    physically rendering the Email payload safely on the UI screen for Academic Testing.
    """
    return jsonify({
        "success": False, 
        "error": "Local Development: Simulating Email Inbox visually."
    })

@app.route('/api/leaderboard', methods=['GET', 'POST'])
def handle_leaderboard():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    if request.method == 'GET':
        try:
            # Query the database sorting strictly by Highest Level, then Fewest Failures
            cursor.execute('''
                SELECT email, name, levels_beaten, failures 
                FROM leaderboard 
                ORDER BY levels_beaten DESC, failures ASC 
                LIMIT 15
            ''')
            rows = cursor.fetchall()
            
            leaderboard_data = []
            for r in rows:
                leaderboard_data.append({
                    "email": r[0],
                    "name": r[1],
                    "levelsBeaten": r[2],
                    "failures": r[3]
                })
                
            return jsonify({"success": True, "leaderboard": leaderboard_data})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
        finally:
            conn.close()

    if request.method == 'POST':
        try:
            data = request.json
            email = data.get('email')
            name = data.get('name')
            levels = int(data.get('levelsBeaten', 0))
            fails = int(data.get('failures', 0))
            timestamp = datetime.datetime.now().isoformat()
            
            cursor.execute('''
                INSERT INTO leaderboard (email, name, levels_beaten, failures, timestamp)
                VALUES (?, ?, ?, ?, ?)
            ''', (email, name, levels, fails, timestamp))
            
            conn.commit()
            return jsonify({"success": True, "message": "Saved to Local SQLite DB"})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
        finally:
            conn.close()

if __name__ == '__main__':
    init_db()
    port = 3000
    
    print("\n" + "="*50)
    print("🚀 INIT: RECALLX LOCAL SQLITE EXECUTING")
    print("Database bound to: local_database.db")
    print("="*50 + "\n")
    
    threading.Timer(1.0, lambda: webbrowser.open(f"http://127.0.0.1:{port}")).start()
    app.run(debug=False, port=port)
