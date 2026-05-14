document.addEventListener('DOMContentLoaded', () => {
    let currentConversationId = null;
    const chatThread = document.getElementById('chat-thread');
    const welcomeState = document.getElementById('welcome-state');
    const promptTextarea = document.getElementById('prompt-textarea');
    const generateBtn = document.getElementById('generate-btn');
    const recordBtn = document.getElementById('record-btn');
    const languageSelector = document.getElementById('language-selector');
    const newChatBtn = document.getElementById('new-chat-btn');
    const recordingStatus = document.getElementById('recording-status');

    const sidebarContainer = document.querySelector('aside .chat-container .space-y-2');

    // --- UTILS ---
    
    async function updateSidebar() {
        if (!sidebarContainer) return;
        
        try {
            const response = await fetch('/api/conversations');
            const conversations = await response.json();
            
            sidebarContainer.innerHTML = '';
            
            if (conversations.length === 0) {
                sidebarContainer.innerHTML = '<p class="text-xs text-gray-600 text-center py-10">No chats yet.</p>';
                return;
            }
            
            conversations.forEach(conv => {
                const div = document.createElement('div');
                div.className = `conv-item w-full text-left p-3 rounded-xl hover:bg-[#242b3d]/60 border border-transparent hover:border-gray-700/50 transition-all cursor-pointer group relative ${currentConversationId == conv.id ? 'bg-[#242b3d]/80 border-gray-700/50' : ''}`;
                div.dataset.id = conv.id;
                div.dataset.language = conv.language;
                
                const timestamp = conv.timestamp.split(' ')[0];
                
                div.innerHTML = `
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-[10px] font-bold text-blue-400 group-hover:text-blue-300">${conv.language}</span>
                        <span class="text-[9px] text-gray-600">${timestamp}</span>
                    </div>
                    <p class="truncate text-gray-300 text-xs font-medium group-hover:text-white" title="${conv.title}">${conv.title}</p>
                `;
                
                div.addEventListener('click', () => {
                    loadConversation(conv.id, conv.language);
                });
                
                sidebarContainer.appendChild(div);
            });
        } catch (err) {
            console.error("Failed to update sidebar", err);
        }
    }

    function showError(msg) {
        const toast = document.getElementById('error-toast');
        const msgSpan = document.getElementById('error-toast-msg');
        msgSpan.textContent = msg;
        toast.classList.remove('translate-y-32', 'opacity-0');
        setTimeout(() => toast.classList.add('translate-y-32', 'opacity-0'), 4000);
    }

    function showSuccess(msg) {
        const toast = document.getElementById('toast');
        toast.classList.remove('translate-y-32', 'opacity-0');
        setTimeout(() => toast.classList.add('translate-y-32', 'opacity-0'), 3000);
    }

    function scrollChat() {
        chatThread.scrollTo({ top: chatThread.scrollHeight, behavior: 'smooth' });
    }

    // Auto-resize textarea
    promptTextarea.addEventListener('input', () => {
        promptTextarea.style.height = 'auto';
        promptTextarea.style.height = (promptTextarea.scrollHeight) + 'px';
    });

    // --- MESSAGE RENDERING ---

    function createMessageBubble(role, content, language = 'python') {
        const isUser = role === 'user';
        const div = document.createElement('div');
        div.className = `flex ${isUser ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`;
        
        const bubble = document.createElement('div');
        bubble.className = `message-bubble p-4 rounded-2xl ${
            isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-[#151b2b] border border-gray-800 text-gray-200 rounded-tl-none'
        } shadow-lg`;

        if (isUser) {
            bubble.textContent = content;
        } else {
            // Assistant response
            if (!content.includes('```') && content.trim().length > 0 && !content.includes('\n\n')) {
                // Treat as raw code if no markdown and seems like a block
                const container = document.createElement('div');
                container.className = 'code-block-container';
                const pre = document.createElement('pre');
                pre.className = `language-${language.toLowerCase()} rounded-lg mt-2`;
                const code = document.createElement('code');
                code.textContent = content;
                pre.appendChild(code);
                
                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-code-btn';
                copyBtn.innerHTML = '<i class="fa-regular fa-copy mr-1"></i> Copy';
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(content);
                    showSuccess('Copied!');
                };
                
                container.appendChild(copyBtn);
                container.appendChild(pre);
                bubble.appendChild(container);
            } else {
                // Use Markdown parser
                bubble.className += ' prose prose-invert prose-sm max-w-none';
                bubble.innerHTML = marked.parse(content);
                
                // Add copy buttons to any code blocks in the markdown
                bubble.querySelectorAll('pre').forEach(pre => {
                    pre.style.position = 'relative';
                    const code = pre.querySelector('code');
                    if (code) {
                        const copyBtn = document.createElement('button');
                        copyBtn.className = 'copy-code-btn';
                        copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
                        copyBtn.onclick = () => {
                            navigator.clipboard.writeText(code.textContent);
                            showSuccess('Copied!');
                        };
                        pre.appendChild(copyBtn);
                    }
                });
            }
            
            // Trigger syntax highlighting
            setTimeout(() => {
                if (window.Prism) Prism.highlightAllUnder(bubble);
            }, 0);
        }
        
        div.appendChild(bubble);
        chatThread.appendChild(div);
        scrollChat();
    }

    // --- CORE LOGIC ---

    async function sendMessage() {
        const prompt = promptTextarea.value.trim();
        const language = languageSelector.value;
        
        if (!prompt) return;

        // Hide welcome state
        if (welcomeState) welcomeState.style.display = 'none';

        // Add user message to UI
        createMessageBubble('user', prompt);
        promptTextarea.value = '';
        promptTextarea.style.height = 'auto';

        // Show loading state
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'flex justify-start';
        loadingDiv.innerHTML = '<div class="bg-[#151b2b] border border-gray-800 p-4 rounded-2xl rounded-tl-none text-gray-500 text-xs italic"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Thinking...</div>';
        chatThread.appendChild(loadingDiv);
        scrollChat();

        try {
            const response = await fetch('/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt: prompt, 
                    language: language,
                    conversation_id: currentConversationId
                })
            });

            const data = await response.json();
            chatThread.removeChild(loadingDiv);

            if (data.error) {
                showError(data.error);
                return;
            }

            currentConversationId = data.conversation_id;
            createMessageBubble('assistant', data.code, language);
            updateSidebar(); // Refresh history sidebar
            
        } catch (err) {
            chatThread.removeChild(loadingDiv);
            showError("Server connection failed.");
        }
    }

    async function loadConversation(id, language) {
        currentConversationId = id;
        if (welcomeState) welcomeState.style.display = 'none';
        chatThread.innerHTML = '<div class="text-center py-10 text-gray-600"><i class="fa-solid fa-spinner fa-spin text-2xl"></i></div>';
        
        try {
            const response = await fetch(`/get_messages/${id}`);
            const data = await response.json();
            
            chatThread.innerHTML = '';
            data.messages.forEach(msg => {
                createMessageBubble(msg.role, msg.content, data.language);
            });
            
            languageSelector.value = data.language;
            updateSidebar(); // Update active state in sidebar
            
        } catch (err) {
            showError("Failed to load chat.");
        }
    }

    // --- EVENT LISTENERS ---

    generateBtn.addEventListener('click', sendMessage);
    promptTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    newChatBtn.addEventListener('click', () => {
        currentConversationId = null;
        chatThread.innerHTML = '';
        if (welcomeState) welcomeState.style.display = 'flex';
        promptTextarea.value = '';
        updateSidebar();
    });

    document.querySelectorAll('.conv-item').forEach(item => {
        item.addEventListener('click', () => {
            loadConversation(item.dataset.id, item.dataset.language);
        });
    });

    // Suggestions
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.querySelector('p:last-child').textContent.replace(/"/g, '');
            promptTextarea.value = text;
            promptTextarea.dispatchEvent(new Event('input'));
        });
    });

    // --- VOICE LOGIC ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            recordBtn.classList.add('bg-red-600', 'text-white', 'animate-pulse');
            recordingStatus.classList.remove('hidden');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            promptTextarea.value += transcript;
            promptTextarea.dispatchEvent(new Event('input'));
        };

        recognition.onerror = (e) => showError("Speech Error: " + e.error);
        
        recognition.onend = () => {
            recordBtn.classList.remove('bg-red-600', 'text-white', 'animate-pulse');
            recordingStatus.classList.add('hidden');
        };

        recordBtn.addEventListener('click', () => {
            try { recognition.start(); } catch(e) { recognition.stop(); }
        });
    }
});
