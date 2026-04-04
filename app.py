from flask import Flask, request, jsonify, render_template
import sqlite3
import random
import os

app = Flask(__name__)
DB_FILE = 'players.db'

# Simple in-memory dict to hold OTPs for this session since we don't have Redis
otp_storage = {}

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS players (
            phone_number TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            highest_level INTEGER DEFAULT 1
        )
    ''')
    conn.commit()
    conn.close()

def get_or_create_user(phone_number, name):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('SELECT name FROM players WHERE phone_number = ?', (phone_number,))
    result = cursor.fetchone()
    
    if result:
        real_name = result[0]
        conn.close()
        return real_name, False # Exists
    else:
        cursor.execute('INSERT INTO players (phone_number, name) VALUES (?, ?)', (phone_number, name))
        conn.commit()
        conn.close()
        return name, True # Newly created

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/send_otp', methods=['POST'])
def send_otp():
    data = request.json
    phone = data.get('phone')
    name = data.get('name')
    
    if not phone or not name:
        return jsonify({"error": "Phone and Name are required"}), 400
        
    # Generate random 4 digit code
    otp_code = str(random.randint(1000, 9999))
    
    # Store it linked to phone number
    otp_storage[phone] = otp_code
    
    # In a real app we would use Twilio here. Since this is a mock:
    # We return the OTP in the response payload *only* so the frontend can mock it.
    return jsonify({
        "success": True, 
        "mock_otp": otp_code,
        "message": "OTP generated."
    })

@app.route('/api/verify_otp', methods=['POST'])
def verify_otp():
    data = request.json
    phone = data.get('phone')
    name = data.get('name')
    otp = data.get('otp')
    
    expected_otp = otp_storage.get(phone)
    
    if not expected_otp or expected_otp != otp:
        return jsonify({"success": False, "error": "Invalid OTP!"}), 401
        
    # Clean up OTP
    del otp_storage[phone]
    
    # Authenticate User
    actual_name, is_new = get_or_create_user(phone, name)
    
    msg = "Phone verified successfully!" if is_new else f"Welcome back, {actual_name}!"
    
    return jsonify({
        "success": True,
        "is_new": is_new,
        "player_name": actual_name,
        "message": msg
    })

if __name__ == '__main__':
    init_db()
    port = 9999
    
    # Automatically open the user's default browser after a split second
    import threading, webbrowser
    threading.Timer(1.0, lambda: webbrowser.open(f"http://127.0.0.1:{port}")).start()
    
    print(f"\n🚀 Launching RecallX... Your browser should open automatically!\nIf it doesn't, click here: http://127.0.0.1:{port}\n")
    
    app.run(debug=False, port=port)
