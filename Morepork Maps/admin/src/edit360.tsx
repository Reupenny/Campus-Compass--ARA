import { useState, useEffect, useRef } from 'react';
import './App.css';
import Marzipano from 'marzipano';

interface Hotspot {
    type: 'info' | 'waypoint';
    pitch: number;
    yaw: number;
    text: string;
    description?: string;
    target?: string;
}

interface Scene {
    id: string;
    name: string;
    imageUrl: string;
    geometry: {
        width: number;
    };
    hotspots: Hotspot[];
}

interface TourData {
    scenes: Scene[];
}

const Edit360: React.FC = () => {
    const [tourData, setTourData] = useState<TourData | null>(null);
    const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
    const [viewer, setViewer] = useState<any>(null);
    const [currentScene, setCurrentScene] = useState<any>(null);
    const [placementMode, setPlacementMode] = useState<'info' | 'waypoint' | null>(null);
    const viewerRef = useRef<HTMLDivElement>(null);

    // Load tour data
    useEffect(() => {
        const loadTourData = async () => {
            try {
                const response = await fetch('/data/tour.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const text = await response.text();
                if (!text.trim()) {
                    throw new Error('Empty response from server');
                }
                const data = JSON.parse(text);
                setTourData(data);
                if (data.scenes.length > 0) {
                    setSelectedScene(data.scenes[0]);
                }
            } catch (error) {
                console.error('Error loading tour data:', error);
                // Set default tour data if loading fails
                const defaultTour = {
                    scenes: []
                };
                setTourData(defaultTour);
            }
        };

        loadTourData();
    }, []);

    // Initialize Marzipano viewer
    useEffect(() => {
        if (viewerRef.current && !viewer) {
            const viewerOpts = {
                controls: {
                    mouseViewMode: 'drag' as const
                }
            };
            const newViewer = new Marzipano.Viewer(viewerRef.current, viewerOpts);
            setViewer(newViewer);
        }
    }, [viewerRef.current]);

    // Load scene when selected
    useEffect(() => {
        if (viewer && selectedScene) {
            loadScene(selectedScene);
        }
    }, [viewer, selectedScene]);

    const loadScene = (scene: Scene) => {
        if (!viewer) return;

        // Create geometry for equirectangular panorama
        const geometry = new Marzipano.EquirectGeometry([
            { width: scene.geometry.width }
        ]);

        // Create image source
        const source = Marzipano.ImageUrlSource.fromString(`/${scene.imageUrl}`);

        // Create view
        const initialView = {
            yaw: 0,
            pitch: 0,
            fov: 90 * Math.PI / 180
        };
        const view = new Marzipano.RectilinearView(initialView);

        // Create scene
        const marzipanoScene = viewer.createScene({
            source: source,
            geometry: geometry,
            view: view
        });

        // Add existing hotspots
        scene.hotspots.forEach((hotspot, index) => {
            addHotspotToScene(marzipanoScene, hotspot, index);
        });

        // Switch to scene
        marzipanoScene.switchTo();
        setCurrentScene(marzipanoScene);

        // Add click listener for placing new hotspots
        viewerRef.current?.addEventListener('click', handleViewerClick);

        return () => {
            viewerRef.current?.removeEventListener('click', handleViewerClick);
        };
    };

    const addHotspotToScene = (marzipanoScene: any, hotspot: Hotspot, index: number) => {
        const element = document.createElement('div');
        element.className = `hotspot hotspot-${hotspot.type}`;
        element.innerHTML = hotspot.type === 'info' ? '📍' : '🚪';
        element.style.cssText = `
      width: 30px;
      height: 30px;
      background: ${hotspot.type === 'info' ? '#007bff' : '#28a745'};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 16px;
    `;

        element.addEventListener('click', (e) => {
            e.stopPropagation();
            alert(`${hotspot.type}: ${hotspot.text}`);
        });

        const position = { yaw: hotspot.yaw, pitch: hotspot.pitch };
        marzipanoScene.hotspotContainer().createHotspot(element, position);
    };

    const handleViewerClick = (event: MouseEvent) => {
        if (!placementMode || !currentScene) return;

        const rect = viewerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Convert screen coordinates to yaw/pitch
        const view = currentScene.view();
        const coords = view.screenToCoordinates({ x, y });

        const newHotspot: Hotspot = {
            type: placementMode,
            pitch: coords.pitch,
            yaw: coords.yaw,
            text: placementMode === 'info' ? 'New Info Point' : 'New Waypoint',
            ...(placementMode === 'info' ? { description: 'Description here' } : { target: 'scene1' })
        };

        // Add to selected scene data
        if (selectedScene) {
            const updatedScene = {
                ...selectedScene,
                hotspots: [...selectedScene.hotspots, newHotspot]
            };
            setSelectedScene(updatedScene);

            // Update tour data
            if (tourData) {
                const updatedTourData = {
                    ...tourData,
                    scenes: tourData.scenes.map(scene =>
                        scene.id === selectedScene.id ? updatedScene : scene
                    )
                };
                setTourData(updatedTourData);
            }

            // Add hotspot to current scene
            addHotspotToScene(currentScene, newHotspot, selectedScene.hotspots.length);
        }

        setPlacementMode(null);
    };

    const saveTourData = async () => {
        if (!tourData) return;

        try {
            const response = await fetch('/api/save-tour', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(tourData),
            });

            if (response.ok) {
                alert('Tour data saved successfully!');
            } else {
                alert('Error saving tour data');
            }
        } catch (error) {
            console.error('Error saving tour data:', error);
            alert('Error saving tour data');
        }
    };

    if (!tourData) {
        return <div>Loading tour data...</div>;
    }

    return (
        <div style={{ display: 'flex', height: '100vh' }}>
            {/* Scene List Sidebar */}
            <div style={{
                width: '300px',
                backgroundColor: '#f5f5f5',
                padding: '20px',
                borderRight: '1px solid #ddd',
                overflow: 'auto'
            }}>
                <h2>Scenes</h2>

                {/* Scene List */}
                <div style={{ marginBottom: '20px' }}>
                    {tourData.scenes.map((scene) => (
                        <div
                            key={scene.id}
                            onClick={() => setSelectedScene(scene)}
                            style={{
                                padding: '10px',
                                margin: '5px 0',
                                backgroundColor: selectedScene?.id === scene.id ? '#007bff' : '#fff',
                                color: selectedScene?.id === scene.id ? '#fff' : '#000',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            <strong>{scene.name}</strong>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                {scene.hotspots.length} hotspots
                            </div>
                        </div>
                    ))}
                </div>

                {/* Hotspot Placement Controls */}
                <div style={{ marginBottom: '20px' }}>
                    <h3>Add Hotspots</h3>
                    <button
                        onClick={() => setPlacementMode('info')}
                        style={{
                            display: 'block',
                            width: '100%',
                            margin: '5px 0',
                            padding: '10px',
                            backgroundColor: placementMode === 'info' ? '#007bff' : '#fff',
                            color: placementMode === 'info' ? '#fff' : '#000',
                            border: '1px solid #007bff',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        📍 Place Info Point
                    </button>
                    <button
                        onClick={() => setPlacementMode('waypoint')}
                        style={{
                            display: 'block',
                            width: '100%',
                            margin: '5px 0',
                            padding: '10px',
                            backgroundColor: placementMode === 'waypoint' ? '#28a745' : '#fff',
                            color: placementMode === 'waypoint' ? '#fff' : '#000',
                            border: '1px solid #28a745',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        🚪 Place Waypoint
                    </button>
                    {placementMode && (
                        <button
                            onClick={() => setPlacementMode(null)}
                            style={{
                                display: 'block',
                                width: '100%',
                                margin: '5px 0',
                                padding: '5px',
                                backgroundColor: '#dc3545',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                    )}
                </div>

                {/* Selected Scene Hotspots */}
                {selectedScene && (
                    <div>
                        <h3>Current Hotspots</h3>
                        {selectedScene.hotspots.map((hotspot, index) => (
                            <div
                                key={index}
                                style={{
                                    padding: '8px',
                                    margin: '3px 0',
                                    backgroundColor: '#fff',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                }}
                            >
                                <div style={{ fontWeight: 'bold' }}>
                                    {hotspot.type === 'info' ? '📍' : '🚪'} {hotspot.type}
                                </div>
                                <div>{hotspot.text}</div>
                                <div style={{ opacity: 0.6 }}>
                                    Yaw: {(hotspot.yaw * 180 / Math.PI).toFixed(1)}°,
                                    Pitch: {(hotspot.pitch * 180 / Math.PI).toFixed(1)}°
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Save Button */}
                <button
                    onClick={saveTourData}
                    style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '20px',
                        right: '20px',
                        width: 'calc(100% - 40px)',
                        padding: '15px',
                        backgroundColor: '#007bff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold'
                    }}
                >
                    Save Tour Data
                </button>
            </div>

            {/* 360 Viewer */}
            <div style={{ flex: 1, position: 'relative' }}>
                <div
                    ref={viewerRef}
                    style={{
                        width: '100%',
                        height: '100%',
                        cursor: placementMode ? 'crosshair' : 'grab'
                    }}
                />

                {/* Instructions */}
                {placementMode && (
                    <div style={{
                        position: 'absolute',
                        top: '20px',
                        left: '20px',
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        color: '#fff',
                        padding: '10px 15px',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}>
                        Click on the panorama to place a {placementMode} hotspot
                    </div>
                )}

                {/* Scene Info */}
                {selectedScene && (
                    <div style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        padding: '10px 15px',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}>
                        <strong>{selectedScene.name}</strong>
                        <div>{selectedScene.hotspots.length} hotspots</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Edit360;