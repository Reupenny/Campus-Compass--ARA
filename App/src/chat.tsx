import { useEffect, useRef, useState } from 'react';
import './css/Chat.css';

function Chat({ setCurrentPage }: { setCurrentPage: (page: 'chat' | 'explore' | 'quest') => void }) {
    const isInitialized = useRef(false);
    const [isShow, setIsShow] = useState(true);
    const [hasContent, setHasContent] = useState(false);

    useEffect(() => {
        isInitialized.current = false;

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

        // Initialise chat functionality
        const initChat = async () => {
            if (isInitialized.current) return;

            await loadMarked();

            // Delay to ensure DOM is ready
            setTimeout(() => {
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

    // Check if #ai-show has content
    useEffect(() => {
        const checkContent = () => {
            const aiShow = document.getElementById('ai-show');
            if (aiShow) {
                // Check if there's any content
                const hasDynamicContent = aiShow.innerHTML.trim().length > 0;
                setHasContent(hasDynamicContent);
            }
        };

        // Check immediately and set up observer
        checkContent();
        const observer = new MutationObserver(checkContent);
        const aiShow = document.getElementById('ai-show');
        if (aiShow) {
            observer.observe(aiShow, { childList: true, subtree: true, characterData: true });
        }

        return () => observer.disconnect();
    }, []);

    return (
        <>{hasContent && (<button className='minimize-button show' onClick={() => setIsShow(!isShow)}
            aria-label='Open locations menu'>{isShow ? '-' : '+'}</button>
        )}
            <div id="ai-show" className={`${isShow ? '' : 'hidden'}`}>
                {/* <!-- Chat elements will be displayed here --> */}
            </div >
            <div id="chat-container">
                <div id="chat-window">
                    {/* <!-- Chat messages will be displayed here --> */}
                    <div className="logo-container">
                        <img src="img/Logo.webp" alt="Campus Compass Logo" />
                    </div>
                    <div className="message bot-message start-chat">
                        <p>Welcome to ARA, <br />
                            My name is A.C.E. and I am here to answer all your questions.<br />
                            Start chatting with me below, or if you're up for a challenge I have set up a quest around the Campus to help you get familiar.</p>
                    </div>
                    <button onClick={() => setCurrentPage('quest')} className="start-button chat-button" data-umami-event="In chat Quest button">START QUEST</button>
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