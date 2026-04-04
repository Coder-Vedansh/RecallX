import sys
import random
import sqlite3
import os
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QGridLayout, 
                             QPushButton, QVBoxLayout, QHBoxLayout, QLabel, QMessageBox,
                             QSizePolicy, QStackedWidget, QLineEdit)
from PyQt6.QtCore import Qt, QTimer, pyqtSignal
from PyQt6.QtGui import QFont

# ----------------- Database Setup -----------------
DB_FILE = 'players.db'

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

# ----------------- Game Components -----------------

class CardButton(QPushButton):
    def __init__(self, index, game_widget):
        super().__init__()
        self.index = index
        self.game_widget = game_widget
        
        # Sizing
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self.setMinimumSize(80, 100)
        
        self.set_hidden_style()
        self.clicked.connect(self.on_click)

    def set_hidden_style(self):
        self.setStyleSheet("""
            QPushButton {
                background-color: #3b4252;
                border: 2px solid #4c566a;
                border-radius: 12px;
            }
            QPushButton:hover {
                background-color: #434c5e;
                border: 2px solid #88c0d0;
            }
        """)

    def set_highlight_style(self):
        self.setStyleSheet("""
            QPushButton {
                background-color: #88c0d0;
                border: 2px solid #81a1c1;
                border-radius: 12px;
            }
        """)

    def set_success_style(self):
        self.setStyleSheet("""
            QPushButton {
                background-color: #a3be8c;
                border: 2px solid #8fbcbb;
                border-radius: 12px;
            }
        """)

    def set_error_style(self):
        self.setStyleSheet("""
            QPushButton {
                background-color: #bf616a;
                border: 2px solid #d08770;
                border-radius: 12px;
            }
        """)
        
    def on_click(self):
        # Notify the parent widget of click
        self.game_widget.card_clicked(self)

class MemoryGameWidget(QWidget):
    
    back_to_login_signal = pyqtSignal()

    def __init__(self):
        super().__init__()
        
        # Game State
        self.player_name = "Player"
        self.levels = [8, 14, 20, 26, 36]
        self.current_level = 0
        
        # Sequence State
        self.sequence_length = 0
        self.sequence = []
        self.current_step = 0
        self.is_flashing = False
        self.cards = []
        
        # Flashing Timer logic
        self.flash_timer = QTimer(self)
        self.flash_timer.timeout.connect(self.flash_next)
        self.flash_index = 0

        # Main Layout
        self.main_layout = QVBoxLayout(self)
        self.main_layout.setContentsMargins(40, 40, 40, 40)
        self.main_layout.setSpacing(20)

        # Header Frame
        header_layout = QHBoxLayout()
        self.greeting_label = QLabel("Welcome, Player!")
        self.greeting_label.setFont(QFont("Arial", 16, QFont.Weight.Bold))
        self.greeting_label.setStyleSheet("color: #a3be8c;")

        self.level_label = QLabel(f"Level {self.current_level + 1}")
        self.level_label.setFont(QFont("Arial", 28, QFont.Weight.Bold))
        self.level_label.setStyleSheet("color: #88c0d0;")
        
        self.status_label = QLabel("Watcing Sequence...")
        self.status_label.setFont(QFont("Arial", 20, QFont.Weight.Medium))
        self.status_label.setStyleSheet("color: #ebcb8b;")
        
        self.reset_btn = QPushButton("Logout")
        self.reset_btn.setFont(QFont("Arial", 14, QFont.Weight.Bold))
        self.reset_btn.setStyleSheet("""
            QPushButton {
                background-color: #bf616a;
                color: white;
                border-radius: 8px;
                padding: 10px 20px;
            }
            QPushButton:hover {
                background-color: #d08770;
            }
        """)
        self.reset_btn.clicked.connect(self.logout)

        header_layout.addWidget(self.greeting_label)
        header_layout.addSpacing(20)
        header_layout.addWidget(self.level_label)
        header_layout.addStretch()
        header_layout.addWidget(self.status_label)
        header_layout.addSpacing(30)
        header_layout.addWidget(self.reset_btn)

        self.main_layout.addLayout(header_layout)

        # Card Grid
        self.grid_layout = QGridLayout()
        self.grid_layout.setSpacing(15)
        self.main_layout.addLayout(self.grid_layout)
        
        self.main_layout.setStretchFactor(self.grid_layout, 1)

    def set_player(self, name):
        self.player_name = name
        self.greeting_label.setText(f"Welcome, {self.player_name}!")
        self.reset_game()

    def start_level(self):
        if self.current_level >= len(self.levels):
            QMessageBox.information(self, "Victory!", f"🎉 Incredible, {self.player_name}! You've mastered all 5 levels!\n\nYou have perfect sequence memory.")
            self.reset_game()
            return

        # Clear existing grid
        while self.grid_layout.count():
            item = self.grid_layout.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()
        
        self.cards.clear()
        
        self.level_label.setText(f"Level {self.current_level + 1}")
        
        # Grid Setup
        num_cards = self.levels[self.current_level]
        cols = 4 if num_cards <= 8 else (5 if num_cards <= 20 else 6)
        
        for i in range(num_cards):
            r = i // cols
            c = i % cols
            card = CardButton(i, self)
            self.grid_layout.addWidget(card, r, c)
            self.cards.append(card)
            
        # Configure Sequence
        self.sequence_length = self.current_level + 4 # L1 = 4, L5 = 8
        self.sequence = [random.randint(0, num_cards - 1) for _ in range(self.sequence_length)]
        self.current_step = 0
        self.is_flashing = True
        
        self.status_label.setText("Get Ready...")
        self.status_label.setStyleSheet("color: #ebcb8b;")
        
        # Delay before flashing starts
        QTimer.singleShot(1500, self.begin_playback)

    def begin_playback(self):
        self.status_label.setText("Watch Closely!")
        self.flash_index = 0
        self.flash_timer.start(800) # Every 800ms flash a card

    def flash_next(self):
        if self.flash_index >= len(self.sequence):
            self.flash_timer.stop()
            self.status_label.setText("Your Turn!")
            self.status_label.setStyleSheet("color: #a3be8c;")
            self.is_flashing = False
            return
            
        target_card = self.cards[self.sequence[self.flash_index]]
        target_card.set_highlight_style()
        
        # Fast un-highlight
        QTimer.singleShot(400, target_card.set_hidden_style)
        
        self.flash_index += 1

    def card_clicked(self, card):
        if self.is_flashing:
            return
            
        expected_index = self.sequence[self.current_step]
        
        if card.index == expected_index:
            # Correct Click
            card.set_success_style()
            QTimer.singleShot(250, card.set_hidden_style)
            
            self.current_step += 1
            
            if self.current_step == len(self.sequence):
                self.is_flashing = True # Lock interactions
                self.status_label.setText("Perfect!")
                QTimer.singleShot(1000, self.level_complete)
        else:
            # Wrong Click
            self.is_flashing = True
            card.set_error_style()
            expected_card = self.cards[expected_index]
            expected_card.set_highlight_style() # Show them what they should have clicked
            
            self.status_label.setText("Incorrect!")
            self.status_label.setStyleSheet("color: #bf616a;")
            
            QTimer.singleShot(1500, self.retry_level)
            
    def retry_level(self):
        QMessageBox.warning(self, "Oops!", "That was the wrong tile. Let's try grabbing a new sequence.")
        self.start_level()

    def reset_game(self):
        self.current_level = 0
        self.start_level()

    def logout(self):
        self.flash_timer.stop()
        self.back_to_login_signal.emit()

    def level_complete(self):
        QMessageBox.information(self, "Level Complete", f"Flawless memory! Transitioning to Level {self.current_level + 2}.")
        self.current_level += 1
        self.start_level()


# ----------------- Auth Components -----------------

class AuthWidget(QWidget):
    login_success_signal = pyqtSignal(str) 

    def __init__(self):
        super().__init__()
        self.current_otp = None
        self.temp_name = ""
        self.temp_phone = ""
        
        self.main_layout = QVBoxLayout(self)
        self.main_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        auth_box = QWidget()
        auth_box.setFixedWidth(500)
        auth_box.setStyleSheet("""
            QWidget {
                background-color: #3b4252;
                border-radius: 15px;
            }
            QLabel {
                color: #eceff4;
                font-size: 16px;
            }
            QLineEdit {
                background-color: #2e3440;
                color: white;
                border: 2px solid #4c566a;
                border-radius: 8px;
                padding: 10px;
                font-size: 16px;
            }
            QLineEdit:focus {
                border: 2px solid #88c0d0;
            }
            QPushButton {
                background-color: #88c0d0;
                color: #2e3440;
                font-weight: bold;
                border-radius: 8px;
                padding: 12px;
                font-size: 16px;
            }
            QPushButton:hover {
                background-color: #81a1c1;
            }
        """)
        
        self.stack = QStackedWidget()
        box_layout = QVBoxLayout(auth_box)
        box_layout.setContentsMargins(40, 40, 40, 40)
        box_layout.addWidget(self.stack)

        self.main_layout.addWidget(auth_box)

        self.build_login_screen()
        self.build_otp_screen()

    def build_login_screen(self):
        login_view = QWidget()
        layout = QVBoxLayout(login_view)
        layout.setSpacing(20)

        title = QLabel("RecallX Login")
        title.setFont(QFont("Arial", 28, QFont.Weight.Bold))
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title.setStyleSheet("color: #88c0d0;")

        desc = QLabel("Enter your details. New users will be automatically signed up!")
        desc.setWordWrap(True)
        desc.setAlignment(Qt.AlignmentFlag.AlignCenter)
        desc.setStyleSheet("color: #d8dee9; font-size: 14px;")

        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("Enter your Name")
        
        self.phone_input = QLineEdit()
        self.phone_input.setPlaceholderText("Enter your Phone Number")

        self.send_otp_btn = QPushButton("Send OTP")
        self.send_otp_btn.clicked.connect(self.request_otp)

        layout.addWidget(title)
        layout.addWidget(desc)
        layout.addWidget(self.name_input)
        layout.addWidget(self.phone_input)
        layout.addSpacing(20)
        layout.addWidget(self.send_otp_btn)

        self.stack.addWidget(login_view)

    def build_otp_screen(self):
        otp_view = QWidget()
        layout = QVBoxLayout(otp_view)
        layout.setSpacing(20)

        title = QLabel("Verify OTP")
        title.setFont(QFont("Arial", 28, QFont.Weight.Bold))
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title.setStyleSheet("color: #88c0d0;")

        self.otp_desc = QLabel("Enter the OTP sent to your phone.")
        self.otp_desc.setWordWrap(True)
        self.otp_desc.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.otp_input = QLineEdit()
        self.otp_input.setPlaceholderText("4-digit OTP Code")
        
        verify_btn = QPushButton("Verify and Start Game")
        verify_btn.setStyleSheet("background-color: #a3be8c;")
        verify_btn.clicked.connect(self.verify_otp)

        back_btn = QPushButton("Go Back")
        back_btn.setStyleSheet("background-color: #bf616a; color: white;")
        back_btn.clicked.connect(lambda: self.stack.setCurrentIndex(0))

        layout.addWidget(title)
        layout.addWidget(self.otp_desc)
        layout.addWidget(self.otp_input)
        layout.addSpacing(20)
        layout.addWidget(verify_btn)
        layout.addWidget(back_btn)

        self.stack.addWidget(otp_view)

    def request_otp(self):
        name = self.name_input.text().strip()
        phone = self.phone_input.text().strip()

        if not name or not phone:
            QMessageBox.warning(self, "Error", "Name and Phone Number are required!")
            return

        self.temp_name = name
        self.temp_phone = phone

        self.current_otp = str(random.randint(1000, 9999))

        QMessageBox.information(
            self, 
            "📱 SIMULATED SMS RECEIVED", 
            f"Hey {name},\n\nYour RecallX verification code is: {self.current_otp}\n\n(Do not share this code)"
        )

        self.otp_desc.setText(f"Enter the OTP sent to {phone}.")
        self.otp_input.clear()
        self.stack.setCurrentIndex(1) 

    def verify_otp(self):
        entered_otp = self.otp_input.text().strip()
        
        if entered_otp == self.current_otp:
            actual_name, is_new = get_or_create_user(self.temp_phone, self.temp_name)
            
            if not is_new and actual_name != self.temp_name:
                QMessageBox.information(self, "Welcome Back!", f"Welcome back, {actual_name}!\nLogging you in.")
            else:
                QMessageBox.information(self, "Success", "Phone verified successfully!")
                
            self.login_success_signal.emit(actual_name)
        else:
            QMessageBox.critical(self, "Access Denied", "Incorrect OTP. Please try again.")


# ----------------- Main Window -----------------

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("RecallX - Premium Sequence Game")
        self.setMinimumSize(950, 750)
        self.setStyleSheet("background-color: #2e3440; color: #eceff4;")

        init_db()

        self.stack = QStackedWidget()
        self.setCentralWidget(self.stack)

        self.auth_screen = AuthWidget()
        self.game_screen = MemoryGameWidget()

        self.stack.addWidget(self.auth_screen)
        self.stack.addWidget(self.game_screen)

        self.auth_screen.login_success_signal.connect(self.switch_to_game)
        self.game_screen.back_to_login_signal.connect(self.switch_to_auth)

    def switch_to_game(self, player_name):
        self.game_screen.set_player(player_name)
        self.stack.setCurrentWidget(self.game_screen)

    def switch_to_auth(self):
        self.auth_screen.stack.setCurrentIndex(0)
        self.auth_screen.name_input.clear()
        self.auth_screen.phone_input.clear()
        self.stack.setCurrentWidget(self.auth_screen)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    app.setFont(QFont("Segoe UI", 10))
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
