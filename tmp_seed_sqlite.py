import sqlite3
import datetime

def seed():
    conn = sqlite3.connect('local_database.db')
    cursor = conn.cursor()
    
    timestamp = datetime.datetime.now().isoformat()
    
    # 1. Sequence Memory Data
    sequence_data = [
        { 'game': 'sequence', 'email': 'student.joshua@college.edu', 'name': 'Joshua K.', 'levels': 5, 'fails': 0 },
        { 'game': 'sequence', 'email': 'dean.admissions@college.edu', 'name': 'Dean Wilson', 'levels': 4, 'fails': 1 },
        { 'game': 'sequence', 'email': 'hacker77@cs.edu', 'name': 'Alice G.', 'levels': 4, 'fails': 2 }
    ]
    
    # 2. Number Memory Data
    number_data = [
        { 'game': 'number', 'email': 'prof.alan@college.edu', 'name': 'Prof. Alan', 'levels': 12, 'fails': 1 },
        { 'game': 'number', 'email': 'math.genius@college.edu', 'name': 'Sarah Pi', 'levels': 15, 'fails': 0 },
        { 'game': 'number', 'email': 'student.joshua@college.edu', 'name': 'Joshua K.', 'levels': 8, 'fails': 2 }
    ]
    
    all_data = sequence_data + number_data
    
    for s in all_data:
        cursor.execute('''
            INSERT INTO leaderboard (game_type, email, name, levels_beaten, failures, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (s['game'], s['email'], s['name'], s['levels'], s['fails'], timestamp))
        
    conn.commit()
    conn.close()
    print("Database seeded with Multi-Game data!")

if __name__ == '__main__':
    seed()
