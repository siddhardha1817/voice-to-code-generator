import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Initialize Groq client
client = OpenAI(
    api_key=os.getenv('GROQ_API_KEY'), 
    base_url="https://api.groq.com/openai/v1",
)

def generate_code(prompt, language="Python", history=None):
    """
    Generates code using Groq API based on the prompt, language, and conversation history.
    history: list of {'role': 'user'|'assistant', 'content': '...'}
    """
    if not client.api_key or client.api_key == 'your_grok_api_key_here':
        return f"# Error: Groq API key not configured. Please set it in the .env file."

    system_prompt = (
        f"You are a specialized AI Programming Assistant. Your expertise is STRICTLY limited to these 4 domains: Python, Java, C++, and JavaScript. "
        f"1. ONLY answer questions related to programming, software development, or computer science concepts within these domains. "
        f"2. If a user asks a question outside of these 4 domains or asks about non-programming topics (like general knowledge, weather, etc.), "
        f"politely refuse to answer and state that you are a specialized coding assistant for Python, Java, C++, and JavaScript. "
        f"3. Your primary goal is to provide high-quality code in {language}. If the user asks for just code, provide only the code without markdown. "
        f"If the user asks for explanations, dry runs, or test cases, provide them alongside the code in a clear, conversational manner."
    )
    
    messages = [{"role": "system", "content": system_prompt}]
    
    # Add conversation history for context
    if history:
        messages.extend(history)
    
    # Add the current prompt
    messages.append({"role": "user", "content": prompt})
    
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile", 
            messages=messages,
            temperature=0.3,
            max_tokens=2048
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"# Error generating code: {str(e)}"
