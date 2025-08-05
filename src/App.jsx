import React, { useState, useEffect, useRef } from 'react';

// --- Helper Components ---

// Header Component
const ChatHeader = () => (
    <div className="p-4 border-b border-gray-700 flex items-center space-x-3 shrink-0">
        <div className="p-2 bg-blue-600 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        </div>
        <div>
            <h1 className="text-xl font-bold text-gray-100">GWS Productivity Pilot</h1>
            <p className="text-sm text-gray-400">Your Smart AI Assistant</p>
        </div>
    </div>
);

// Message Bubble Component
const Message = ({ message }) => {
    const { text, sender } = message;
    const [isCopied, setIsCopied] = useState(false);

    const formatText = (rawText) => {
        // A simple markdown-to-JSX converter
        let html = rawText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code class="bg-gray-900/70 px-1.5 py-0.5 rounded-md">$1</code>')
            .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-900/70 p-3 rounded-md my-2 text-sm overflow-x-auto"><code>$1</code></pre>')
            .replace(/\n/g, '<br />');
        return { __html: html };
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(err => console.error('Failed to copy text: ', err));
    };

    const isUser = sender === 'user';

    return (
        <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'} group`}>
            <div className={`rounded-xl p-4 max-w-lg shadow-md ${isUser ? 'bg-blue-600 rounded-br-none text-white' : 'bg-gray-700 rounded-bl-none text-gray-200'}`}>
                {text ? <p className="text-sm" dangerouslySetInnerHTML={formatText(text)} /> : (
                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                )}
            </div>
            {!isUser && text && (
                <button
                    onClick={handleCopy}
                    title="Copy response"
                    className="copy-btn self-center p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded-md transition-all"
                >
                    {isCopied ? (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    )}
                </button>
            )}
        </div>
    );
};

// Chat Window Component
const ChatWindow = ({ messages }) => {
    const chatContainerRef = useRef(null);

    useEffect(() => {
        // Auto-scroll to the bottom when new messages are added
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div ref={chatContainerRef} id="chat-container" className="flex-1 p-6 overflow-y-auto space-y-6">
            {messages.map((msg, index) => (
                <Message key={index} message={msg} />
            ))}
        </div>
    );
};

// --- Main App Component ---
export default function App() {
    const initialMessage = {
        text: "Hello Solver! I can assist you with any questions about Google Workspace. Ask me anything!",
        sender: 'bot'
    };
    const [messages, setMessages] = useState([initialMessage]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const recognitionRef = useRef(null);

    // --- API and Logic ---
    const getBotResponse = async (userQuery, currentHistory) => {
        setIsLoading(true);
        const apiKey = import.meta.env.VITE_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const systemInstruction = { role: "user", parts: [{ text: "You are a helpful and friendly expert on Google Workspace..." }] };
        const modelInstruction = { role: "model", parts: [{ text: "Okay, I understand. I'm ready to help." }] };
        
        const payload = { 
            contents: [
                systemInstruction,
                modelInstruction,
                ...currentHistory.map(m => ({
                    role: m.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: m.text }]
                })),
                { role: "user", parts: [{ text: userQuery }] }
            ]
        };

        try {
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API request failed: ${response.status}`);
            const result = await response.json();
            
            if (result.candidates?.[0]?.content?.parts?.length > 0) {
                const botText = result.candidates[0].content.parts[0].text;
                setMessages(prev => [...prev, { text: botText, sender: 'bot' }]);
            } else {
                throw new Error("Unexpected API response structure.");
            }
        } catch (error) {
            console.error("Error fetching bot response:", error);
            setMessages(prev => [...prev, { text: "Sorry, I'm having trouble connecting. Please try again.", sender: 'bot' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUserInput = (query) => {
        if (!query.trim()) return;
        const newUserMessage = { text: query, sender: 'user' };
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        getBotResponse(query, updatedMessages);
    };

    // --- Speech Recognition Logic ---
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.log("Speech Recognition not supported.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        recognition.onstart = () => setIsRecognizing(true);
        recognition.onend = () => setIsRecognizing(false);
        recognition.onerror = (event) => console.error("Speech recognition error:", event.error);
        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.trim();
            handleUserInput(transcript);
        };
        
        recognitionRef.current = recognition;
    }, []);

    const handleMicClick = () => {
        if (!recognitionRef.current) return;
        if (isRecognizing) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
    };

    return (
        <div className="bg-gray-900 text-white flex flex-col items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-3xl h-[90vh] bg-gray-800 rounded-2xl shadow-2xl flex flex-col">
                <ChatHeader />
                <ChatWindow messages={isLoading ? [...messages, { text: null, sender: 'bot' }] : messages} />
                
                {/* Input Form Section */}
                <div className="p-4 border-t border-gray-700 shrink-0">
                    <form onSubmit={(e) => { e.preventDefault(); handleUserInput(e.target.elements.userInput.value); e.target.reset(); }} className="flex items-center space-x-3">
                        <div className="flex-1 relative">
                            <input 
                                name="userInput"
                                type="text" 
                                placeholder="Ask a question or click the mic..." 
                                className="w-full bg-gray-700 text-white placeholder-gray-400 rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300"
                                autoComplete="off"
                                disabled={isLoading}
                            />
                            {recognitionRef.current && (
                                <button type="button" onClick={handleMicClick} title="Start voice search" className={`absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white transition-colors ${isRecognizing ? 'mic-listening' : ''}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                </button>
                            )}
                        </div>
                        <button type="submit" disabled={isLoading} className="bg-blue-600 text-white rounded-lg p-3 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
