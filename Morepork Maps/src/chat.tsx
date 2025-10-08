import { useEffect, useRef } from 'react';
import './css/Chat.css';

function Chat() {
    const isInitialized = useRef(false);

    useEffect(() => {
        // Clear the initialized flag when component mounts
        isInitialized.current = false;

        // Load the marked library for markdown rendering if not already loaded
        const loadMarked = () => {
            return new Promise<void>((resolve) => {
                if ((window as any).marked) {
                    resolve();
                    return;
                }

                const markedScript = document.createElement('script');
                markedScript.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
                markedScript.onload = () => resolve();
                document.head.appendChild(markedScript);
            });
        };

        // Initialize chat functionality
        const initChat = async () => {
            if (isInitialized.current) return;

            await loadMarked();

            // Small delay to ensure DOM is ready
            setTimeout(() => {
                // Remove and re-add chat script to force re-initialization
                const existingScript = document.querySelector('script[data-chat-script]');
                if (existingScript) {
                    existingScript.remove();
                }

                const chatScript = document.createElement('script');
                chatScript.src = `/chat.js?t=${Date.now()}`;
                chatScript.type = 'module';
                chatScript.setAttribute('data-chat-script', 'true');
                document.body.appendChild(chatScript);

                isInitialized.current = true;
            }, 100);
        };

        initChat();

        // Cleanup function
        return () => {
            const chatScript = document.querySelector('script[data-chat-script]');
            if (chatScript) {
                chatScript.remove();
            }
            isInitialized.current = false;
        };
    }, []);

    return (
        <>
            <div id="ai-show">
                {/* <!-- Chat elements will be displayed here --> */}
                <h1>Get Started</h1>
            </div>
            <div id="chat-container">
                <div id="chat-window">
                    {/* <!-- Chat messages will be displayed here --> */}
                </div>
                <form id="input-form">
                    <div className="input-wrapper">
                        <div className="input-inner" id="input-area">
                            <input type="text" id="user-input" placeholder="Ask me anything..." />
                            <button id="send-button">Send</button>
                        </div>
                    </div>
                </form>
            </div>
        </>

    );
} export default Chat;