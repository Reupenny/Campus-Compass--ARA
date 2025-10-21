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
            </div>
            <div id="chat-container">
                <div id="chat-window">
                    {/* <!-- Chat messages will be displayed here --> */}
                    <div className="logo-container">
                        <img src="img/Logo.webp" alt="Campus Compass Logo" />
                    </div>
                    <div className="message bot-message start-chat">
                        <p>Welcome to ARA, <br />
                            My name is A.C.E. and I am here to answer all you questuions.<br />
                            Start chatting with me below of if your up for a challenge I have set up a quest around the Campus help you get familiar.</p>
                    </div>
                    <button onClick='' className="start-button chat-button">START QUEST</button>
                    <div className="ACE_image">
                        <img width={150} src="img/ace_image.webp" alt="A.C.E. Image" />
                    </div>


                </div>
            </div>
            <form id="input-form">
                <div className="input-wrapper">
                    <div className="input-inner" id="input-area">
                        <input type="text" id="user-input" placeholder="Ask me a question?..." />
                        <button id="send-button">Send</button>
                    </div>
                </div>
            </form>
        </>

    );
} export default Chat;