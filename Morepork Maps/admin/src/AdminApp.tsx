import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import '../../src/css/App.css';
import Edit360, { Sidebar } from './edit360';
import Chat from './Chat';

function App() {
    const [currentView, setCurrentView] = useState<'chat' | '360-editor'>('chat');
    const [edit360Ready, setEdit360Ready] = useState(false);
    const [sidebarData, setSidebarData] = useState<any>({
        tourData: { scenes: [] },
        selectedScene: null,
        currentScene: null
    });
    const edit360Ref = useRef<any>(null);

    // Callback to notify when Edit360 is ready
    const handleEdit360Ready = () => {
        // Add small delay to ensure ref is fully populated
        setTimeout(() => {
            setEdit360Ready(true);
            // Initial data sync
            updateSidebarData();
            // Start periodic sync when in 360-editor mode
            startPeriodicSync();
        }, 100);
    };

    // Periodic sync to keep sidebar data fresh
    const startPeriodicSync = () => {
        const interval = setInterval(() => {
            if (currentView === '360-editor' && edit360Ref.current) {
                updateSidebarData();
            } else if (currentView === 'chat') {
                clearInterval(interval);
            }
        }, 1000); // Sync every second when in 360-editor mode
    };

    // Effect to sync when view changes
    useEffect(() => {
        if (currentView === '360-editor' && edit360Ready) {
            updateSidebarData();
            startPeriodicSync();
        }
    }, [currentView, edit360Ready]);

    // Function to sync sidebar data from Edit360
    const updateSidebarData = () => {
        if (edit360Ref.current) {
            setSidebarData({
                tourData: edit360Ref.current.tourData || { scenes: [] },
                selectedScene: edit360Ref.current.selectedScene,
                currentScene: edit360Ref.current.currentScene
            });
        }
    };

    // Wrapper functions that update sidebar after calling Edit360 methods
    const handleSelectScene = (scene: any) => {
        if (edit360Ref.current) {
            edit360Ref.current.handleSelectScene(scene);
            // Update sidebar data after scene selection
            setTimeout(updateSidebarData, 50);
        }
    };

    const handleAddNewScene = () => {
        if (edit360Ref.current) {
            edit360Ref.current.addNewScene();
            setTimeout(updateSidebarData, 50);
        }
    };

    const handleDeleteScene = (sceneId: string) => {
        if (edit360Ref.current) {
            edit360Ref.current.deleteScene(sceneId);
            setTimeout(updateSidebarData, 50);
        }
    };

    const handleEditScene = (scene: any) => {
        if (edit360Ref.current) {
            edit360Ref.current.handleEditScene(scene);
            setTimeout(updateSidebarData, 50);
        }
    };

    const handleCreateHotspot = (type: 'info' | 'waypoint') => {
        if (edit360Ref.current) {
            edit360Ref.current.createHotspot(type);
            setTimeout(updateSidebarData, 100); // Longer delay for hotspot creation
        }
    };

    const handleDeleteHotspot = (index: number) => {
        if (edit360Ref.current) {
            edit360Ref.current.deleteHotspot(index);
            setTimeout(updateSidebarData, 100);
        }
    };

    const handleSetViewDirection = (yaw: number, pitch: number, fov: number) => {
        if (edit360Ref.current) {
            edit360Ref.current.setViewDirection(yaw, pitch, fov);
        }
    };

    const handleSetDefaultView = () => {
        if (edit360Ref.current) {
            edit360Ref.current.setDefaultView();
        }
    };

    const handleSaveTourData = async () => {
        if (edit360Ref.current) {
            await edit360Ref.current.saveTourData();
            setTimeout(updateSidebarData, 50);
        }
    };

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
                    edit360Ready && edit360Ref.current ? (
                        <Sidebar
                            tourData={sidebarData.tourData}
                            selectedScene={sidebarData.selectedScene}
                            currentScene={sidebarData.currentScene}
                            onAddNewScene={handleAddNewScene}
                            onSelectScene={handleSelectScene}
                            onEditScene={handleEditScene}
                            onDeleteScene={handleDeleteScene}
                            onSetViewDirection={handleSetViewDirection}
                            onCreateHotspot={handleCreateHotspot}
                            onDeleteHotspot={handleDeleteHotspot}
                            onSetDefaultView={handleSetDefaultView}
                            onSaveTourData={handleSaveTourData}
                        />
                    ) : (
                        <div>Loading scenes...</div>
                    )
                )}
            </aside>


            {/* Main Content */}
            <main style={{ flex: 1 }}>
                {currentView === 'chat' ? (
                    <Chat />
                ) : (
                    <Edit360 ref={edit360Ref} onReady={handleEdit360Ready} />
                )}
            </main>
        </>
    );
}

export default App;
