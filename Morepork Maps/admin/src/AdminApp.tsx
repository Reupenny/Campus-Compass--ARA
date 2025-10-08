import React, { useState, useEffect } from 'react';
import './App.css';
import Edit360 from './edit360';
import Chat from './Chat';

function App() {
    const [currentView, setCurrentView] = useState<'chat' | '360-editor'>('chat');

    return (
        <>
            <aside>
                <h1 style={{ margin: 0, marginRight: '20px' }}>Admin Panel</h1>
                <div><button
                    onClick={() => setCurrentView('chat')}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: currentView === 'chat' ? '#007bff' : '#fff',
                        color: currentView === 'chat' ? '#fff' : '#000',
                        border: '1px solid #007bff',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Chat
                </button>
                    <button
                        onClick={() => setCurrentView('360-editor')}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: currentView === '360-editor' ? '#007bff' : '#fff',
                            color: currentView === '360-editor' ? '#fff' : '#000',
                            border: '1px solid #007bff',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Quest Editor
                    </button></div>
                {currentView === 'chat' ? (
                    <> <p>chat</p> </>
                ) : (
                    <> <p>360</p> </>
                )}
            </aside>


            {/* Main Content */}
            <main style={{ flex: 1 }}>
                {currentView === 'chat' ? (
                    <Chat />
                ) : (
                    <Edit360 />
                )}
            </main>
        </>
    );
}

export default App;
