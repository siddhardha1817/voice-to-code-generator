from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db_connection
import sqlite3
from utils.generator import generate_code

app = Flask(__name__)
app.secret_key = 'super_secret_key_voice_to_code'

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

class User(UserMixin):
    def __init__(self, id, username, email, password):
        self.id = id
        self.username = username
        self.email = email
        self.password = password

@login_manager.user_loader
def load_user(user_id):
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    if user_data:
        return User(user_data['id'], user_data['username'], user_data['email'], user_data['password'])
    return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        
        hashed_password = generate_password_hash(password)
        
        conn = get_db_connection()
        try:
            conn.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                         (username, email, hashed_password))
            conn.commit()
            flash('Registration successful! Please login.')
            return redirect(url_for('login'))
        except sqlite3.IntegrityError:
            flash('Username or email already exists.')
        finally:
            conn.close()
            
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = get_db_connection()
        user_data = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()
        
        if user_data and check_password_hash(user_data['password'], password):
            user = User(user_data['id'], user_data['username'], user_data['email'], user_data['password'])
            login_user(user)
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password.')
            
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    conn = get_db_connection()
    # Fetch conversations instead of searches
    conversations = conn.execute(
        'SELECT * FROM conversations WHERE user_id = ? ORDER BY timestamp DESC', 
        (current_user.id,)
    ).fetchall()
    conn.close()
    return render_template('dashboard.html', conversations=conversations)

@app.route('/generate', methods=['POST'])
@login_required
def generate():
    data = request.get_json()
    prompt = data.get('prompt', '')
    language = data.get('language', 'Python')
    conversation_id = data.get('conversation_id')
    
    if not prompt.strip():
        return jsonify({'error': 'Please provide a valid prompt.'}), 400
        
    conn = get_db_connection()
    try:
        # 1. Handle Conversation Initialization
        if not conversation_id:
            title = prompt[:50] + '...' if len(prompt) > 50 else prompt
            cursor = conn.execute(
                'INSERT INTO conversations (user_id, title, language) VALUES (?, ?, ?)',
                (current_user.id, title, language)
            )
            conversation_id = cursor.lastrowid
            conn.commit()
        
        # 2. Fetch Context (Previous messages)
        history_data = conn.execute(
            'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC LIMIT 20',
            (conversation_id,)
        ).fetchall()
        history = [{'role': row['role'], 'content': row['content']} for row in history_data]
        
        # 3. Generate response with AI
        generated_code = generate_code(prompt, language, history=history)
        
        if generated_code.startswith('# Error:'):
            return jsonify({'error': 'Failed to generate code from AI. Please check your API key.'}), 502

        # 4. Save both messages to database
        conn.execute(
            'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)',
            (conversation_id, 'user', prompt)
        )
        conn.execute(
            'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)',
            (conversation_id, 'assistant', generated_code)
        )
        
        # 5. Update conversation timestamp
        conn.execute(
            'UPDATE conversations SET timestamp = CURRENT_TIMESTAMP WHERE id = ?',
            (conversation_id,)
        )
        conn.commit()
        
        return jsonify({
            'code': generated_code,
            'conversation_id': conversation_id
        })
        
    except Exception as e:
        print(f"Execution error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/get_messages/<int:conversation_id>')
@login_required
def get_messages(conversation_id):
    conn = get_db_connection()
    # Check ownership
    conv = conn.execute('SELECT * FROM conversations WHERE id = ? AND user_id = ?', 
                        (conversation_id, current_user.id)).fetchone()
    if not conv:
        conn.close()
        return jsonify({'error': 'Unauthorized'}), 403
        
    messages = conn.execute(
        'SELECT role, content, timestamp FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC',
        (conversation_id,)
    ).fetchall()
    conn.close()
    
    return jsonify({
        'messages': [dict(m) for m in messages],
        'language': conv['language'],
        'title': conv['title']
    })

@app.route('/api/conversations')
@login_required
def api_conversations():
    conn = get_db_connection()
    conversations = conn.execute(
        'SELECT * FROM conversations WHERE user_id = ? ORDER BY timestamp DESC', 
        (current_user.id,)
    ).fetchall()
    conn.close()
    return jsonify([dict(c) for c in conversations])

if __name__ == '__main__':
    app.run(debug=True)
