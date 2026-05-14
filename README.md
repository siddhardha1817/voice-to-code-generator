# Voice2Code AI - Voice-Powered Code Generator

Voice2Code is a modern, conversational AI coding companion that allows developers to generate high-quality code in **Python, Java, C++, and JavaScript** using just their voice. Built with a sleek, futuristic dark-themed UI, it features persistent chat history and multi-turn conversational memory.

![Voice2Code Banner](https://img.shields.io/badge/AI-Coding_Assistant-blueviolet?style=for-the-badge&logo=openai)
![Python](https://img.shields.io/badge/Python-3.8+-blue?style=for-the-badge&logo=python)
![Flask](https://img.shields.io/badge/Flask-2.0+-black?style=for-the-badge&logo=flask)
![Groq](https://img.shields.io/badge/Groq-Inference-orange?style=for-the-badge)

## 🚀 Features

- **Voice-to-Code Recognition**: Integrated Web Speech API for real-time transcription of coding logic.
- **Multi-Turn Conversations**: Powered by **Llama 3.3 on Groq**, the AI remembers previous context, allowing for iterative code improvements.
- **Domain Restricted**: Specifically optimized for Python, Java, C++, and JavaScript.
- **Modern Dashboard**: A clean, chatbot-style interface with glassmorphism and smooth animations.
- **Persistent History**: Conversations are saved to a local SQLite database, allowing you to pick up where you left off.
- **Copy & Download**: One-click copy to clipboard and file downloading with correct extensions.
- **User Authentication**: Secure login and registration system using Flask-Login.

## 🛠️ Tech Stack

- **Backend**: Python, Flask
- **Frontend**: Tailwind CSS, JavaScript (Vanilla), Prism.js (Syntax Highlighting), Marked.js (Markdown)
- **Database**: SQLite3
- **AI Inference**: Groq API (Llama 3.3 70B)
- **Speech**: Web Speech API

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/siddhardha1817/voice-to-code-generator.git
   cd voice-to-code-generator
   ```

2. **Set up a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   GROK_API_KEY=your_groq_api_key_here
   ```

5. **Initialize the Database**:
   ```bash
   python database.py
   ```

6. **Run the Application**:
   ```bash
   python app.py
   ```
   Open `http://127.0.0.1:5000` in your browser.

## 💡 Usage

1. **Register/Login**: Create an account to start saving your sessions.
2. **Start a New Chat**: Click "New Chat" in the sidebar.
3. **Select Language**: Choose between Python, Java, C++, or JavaScript.
4. **Input Logic**: Click the **Microphone** icon to speak your logic or type it in the message bar.
5. **Iterate**: Ask follow-up questions like "Refactor this into a class" or "Add error handling."

## 🔒 Security

- The `.env` file is included in `.gitignore` to prevent API keys from being leaked.
- Passwords are encrypted using `werkzeug.security`.

---
Developed with ❤️ by [Siddhardha](https://github.com/siddhardha1817)