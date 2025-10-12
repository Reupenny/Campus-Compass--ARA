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
    defaultView?: {
        yaw: number;
        pitch: number;
        fov: number;
    };
    hotspots: Hotspot[];
}

interface TourData {
    scenes: Scene[];
}

interface EditingHotspot {
    sceneId: string;
    hotspotIndex: number;
    hotspot: Hotspot;
}

const Edit360: React.FC = () => {
    const [tourData, setTourData] = useState<TourData | null>(null);
    const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
    const [viewer, setViewer] = useState<any>(null);
    const [currentScene, setCurrentScene] = useState<any>(null);
    const [editingHotspot, setEditingHotspot] = useState<EditingHotspot | null>(null);
    const [selectedHotspotIndex, setSelectedHotspotIndex] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [preventSceneReload, setPreventSceneReload] = useState(false);
    const [showSceneEditor, setShowSceneEditor] = useState(false);
    const [editingScene, setEditingScene] = useState<Scene | null>(null);
    const [availableImages, setAvailableImages] = useState<string[]>([]);
    const [imageSelectionMode, setImageSelectionMode] = useState<'url' | 'select' | 'upload'>('select');
    const viewerRef = useRef<HTMLDivElement>(null);
    const hotspotRefs = useRef<{ [key: string]: any }>({});

    // Load tour data and available images
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

        const loadAvailableImages = async () => {
            try {
                const response = await fetch('/admin/api/images');
                if (response.ok) {
                    const images = await response.json();
                    setAvailableImages(images);
                }
            } catch (error) {
                console.error('Error loading available images:', error);
                // Set some default images if the API fails
                setAvailableImages(['pano1.jpg', 'pano2.jpg']);
            }
        };

        loadTourData();
        loadAvailableImages();
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
        if (viewer && selectedScene && !preventSceneReload) {
            loadScene(selectedScene);
        }
    }, [viewer, selectedScene, preventSceneReload]);

    // Auto-select first scene when tour data is loaded
    useEffect(() => {
        if (tourData && tourData.scenes.length > 0 && !selectedScene) {
            setSelectedScene(tourData.scenes[0]);
        }
    }, [tourData, selectedScene]);

    const loadScene = (scene: Scene) => {
        if (!viewer) return;

        // Clear previous hotspot refs
        hotspotRefs.current = {};

        // Create geometry for equirectangular panorama
        const geometry = new Marzipano.EquirectGeometry([
            { width: scene.geometry.width }
        ]);

        // Create image source
        const source = Marzipano.ImageUrlSource.fromString(`/${scene.imageUrl}`);

        // Create view with default view settings if available
        const initialView = scene.defaultView ? {
            yaw: scene.defaultView.yaw,
            pitch: scene.defaultView.pitch,
            fov: scene.defaultView.fov
        } : {
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
    };

    const addHotspotToScene = (marzipanoScene: any, hotspot: Hotspot, index: number) => {
        const element = document.createElement('div');
        element.className = `hotspot hotspot-${hotspot.type}`;

        // Create inner content
        const icon = document.createElement('div');
        icon.innerHTML = hotspot.type === 'info' ? '📍' : '🚪';
        icon.style.cssText = `
            width: 30px;
            height: 30px;
            background: ${hotspot.type === 'info' ? '#007bff' : '#28a745'};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 16px;
            border: 2px solid #fff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            transition: all 0.2s;
            position: relative;
        `;

        // Create action buttons (initially hidden)
        const actionPanel = document.createElement('div');
        actionPanel.style.cssText = `
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255,255,255,0.95);
            padding: 5px;
            border-radius: 15px;
            display: none;
            gap: 5px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10;
        `;

        const editBtn = document.createElement('button');
        editBtn.innerHTML = '✏️';
        editBtn.style.cssText = `
            width: 25px;
            height: 25px;
            border: none;
            border-radius: 50%;
            background: #ffc107;
            cursor: pointer;
            font-size: 12px;
        `;

        const dragBtn = document.createElement('button');
        dragBtn.innerHTML = '🤏';
        dragBtn.style.cssText = `
            width: 25px;
            height: 25px;
            border: none;
            border-radius: 50%;
            background: #17a2b8;
            cursor: move;
            font-size: 12px;
        `;

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.style.cssText = `
            width: 25px;
            height: 25px;
            border: none;
            border-radius: 50%;
            background: #dc3545;
            color: #fff;
            cursor: pointer;
            font-size: 12px;
        `;

        actionPanel.appendChild(editBtn);
        actionPanel.appendChild(dragBtn);
        actionPanel.appendChild(deleteBtn);

        element.appendChild(icon);
        element.appendChild(actionPanel);

        element.style.cssText = `
            position: relative;
            cursor: pointer;
        `;

        // Click to show/hide action panel
        let clickTimeout: number | undefined;
        element.addEventListener('click', (e) => {
            e.stopPropagation();

            // Clear any existing timeout
            if (clickTimeout) clearTimeout(clickTimeout);

            if (!isDragging) {
                // Hide all other action panels
                document.querySelectorAll('.hotspot').forEach(el => {
                    const panel = el.querySelector('div:last-child') as HTMLElement;
                    if (panel && panel !== actionPanel) {
                        panel.style.display = 'none';
                    }
                });

                // Toggle this action panel
                if (actionPanel.style.display === 'none' || !actionPanel.style.display) {
                    actionPanel.style.display = 'flex';
                    icon.style.transform = 'scale(1.2)';
                    setSelectedHotspotIndex(index);
                } else {
                    actionPanel.style.display = 'none';
                    icon.style.transform = 'scale(1)';
                    setSelectedHotspotIndex(null);
                }
            }
        });

        // Delete button click
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this hotspot?')) {
                deleteHotspot(index);
            }
        });

        // Edit button click
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (selectedScene) {
                setEditingHotspot({
                    sceneId: selectedScene.id,
                    hotspotIndex: index,
                    hotspot: hotspot
                });
                actionPanel.style.display = 'none';
                icon.style.transform = 'scale(1)';
            }
        });

        // Drag functionality
        let isDraggingThis = false;
        let startPos: { x: number, y: number } | null = null;
        let startHotspotPos: { yaw: number, pitch: number } | null = null;
        let startViewParams: any = null; // Store initial view state

        const startDrag = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            isDraggingThis = true;
            setIsDragging(true);

            startPos = { x: e.clientX, y: e.clientY };
            startHotspotPos = { yaw: hotspot.yaw, pitch: hotspot.pitch };

            dragBtn.style.background = '#dc3545'; // Change color while dragging
            element.style.cursor = 'move';

            // Disable viewer controls to prevent scene movement conflicts
            if (viewer) {
                viewer.controls().disable();
            }

            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
        };

        const handleDragMove = (e: MouseEvent) => {
            if (!isDraggingThis || !startPos || !startHotspotPos || !currentScene) return;

            e.preventDefault();
            e.stopPropagation();

            const viewerElement = viewer.domElement();
            const rect = viewerElement.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const view = currentScene.view();

            try {
                const worldCoords = view.screenToCoordinates({ x: mouseX, y: mouseY });
                if (worldCoords && worldCoords.yaw !== undefined && worldCoords.pitch !== undefined) {
                    hotspot.yaw = worldCoords.yaw;
                    hotspot.pitch = worldCoords.pitch;
                    marzipanoHotspot.setPosition({ yaw: worldCoords.yaw, pitch: worldCoords.pitch });

                    if (selectedScene) {
                        const updatedHotspots = selectedScene.hotspots.map((h, i) =>
                            i === index ? { ...h, yaw: worldCoords.yaw, pitch: worldCoords.pitch } : h
                        );
                        // This direct mutation is okay within the Marzipano event handler context
                        selectedScene.hotspots = updatedHotspots;
                    }
                }
            } catch (error) {
                // This can happen if the cursor is outside the viewer canvas during a rapid drag.
                // We can ignore it as the next mousemove event will correct it.
            }
        };

        const handleDragEnd = () => {
            isDraggingThis = false;
            setTimeout(() => setIsDragging(false), 100);

            dragBtn.style.background = '#17a2b8'; // Reset color
            element.style.cursor = 'pointer';
            actionPanel.style.display = 'none';
            icon.style.transform = 'scale(1)';

            // Re-enable viewer controls after hotspot drag
            if (viewer) {
                viewer.controls().enable();
            }

            // Save the final position without scene reload
            if (startHotspotPos && selectedScene && tourData) {
                setPreventSceneReload(true); // Ensure scene reload is prevented

                // Create a fresh updated version of the hotspots array
                const updatedHotspots = selectedScene.hotspots.map((h, i) =>
                    i === index ? { ...h, yaw: hotspot.yaw, pitch: hotspot.pitch } : h
                );

                const updatedScene = {
                    ...selectedScene,
                    hotspots: updatedHotspots
                };

                // Update the state correctly via React's setters
                setSelectedScene(updatedScene);

                const updatedTourData = {
                    ...tourData,
                    scenes: tourData.scenes.map(scene =>
                        scene.id === selectedScene.id ? updatedScene : scene
                    )
                };
                setTourData(updatedTourData);
            }

            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
        }; dragBtn.addEventListener('mousedown', startDrag);

        // Hide action panel when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!element.contains(e.target as Node)) {
                actionPanel.style.display = 'none';
                icon.style.transform = 'scale(1)';
                if (selectedHotspotIndex === index) {
                    setSelectedHotspotIndex(null);
                }
            }
        });

        const position = { yaw: hotspot.yaw, pitch: hotspot.pitch };
        const marzipanoHotspot = marzipanoScene.hotspotContainer().createHotspot(element, position);

        return marzipanoHotspot;
    };

    const createHotspot = (type: 'info' | 'waypoint') => {
        if (!currentScene || !selectedScene || !tourData) return;

        // Prevent scene reload during hotspot creation
        setPreventSceneReload(true);

        // Get the current view center position
        const view = currentScene.view();
        const currentYaw = view.yaw();
        const currentPitch = view.pitch();

        const newHotspot: Hotspot = {
            type: type,
            pitch: currentPitch,
            yaw: currentYaw,
            text: type === 'info' ? 'New Info Point' : 'New Waypoint',
            ...(type === 'info' ? { description: 'Description here' } : { target: tourData.scenes.length > 1 ? tourData.scenes.find(s => s.id !== selectedScene.id)?.id || 'scene1' : 'scene1' })
        };

        // Add to selected scene data - but don't reload the scene
        const updatedScene = {
            ...selectedScene,
            hotspots: [...selectedScene.hotspots, newHotspot]
        };
        setSelectedScene(updatedScene);

        // Update tour data
        const updatedTourData = {
            ...tourData,
            scenes: tourData.scenes.map(scene =>
                scene.id === selectedScene.id ? updatedScene : scene
            )
        };
        setTourData(updatedTourData);

        // Add hotspot to current scene directly without reloading
        addHotspotToScene(currentScene, newHotspot, selectedScene.hotspots.length);

        // Re-enable scene reloads after a short delay
        setTimeout(() => setPreventSceneReload(false), 100);
    };

    const setDefaultView = async () => {
        if (!currentScene || !selectedScene || !tourData) return;

        const view = currentScene.view();
        const defaultView = {
            yaw: view.yaw(),
            pitch: view.pitch(),
            fov: view.fov()
        };

        const updatedScene = {
            ...selectedScene,
            defaultView: defaultView
        };
        setSelectedScene(updatedScene);

        const updatedTourData = {
            ...tourData,
            scenes: tourData.scenes.map(scene =>
                scene.id === selectedScene.id ? updatedScene : scene
            )
        };
        setTourData(updatedTourData);

        // Save the tour data immediately
        try {
            const response = await fetch('/admin/api/tour', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedTourData),
            });

            if (response.ok) {
                alert('Default view saved for this scene!');
            } else {
                alert('Failed to save default view');
            }
        } catch (error) {
            console.error('Error saving default view:', error);
            alert('Error saving default view');
        }
    };

    const updateHotspot = (updatedHotspot: Hotspot) => {
        if (!editingHotspot || !selectedScene || !tourData) return;

        const updatedHotspots = selectedScene.hotspots.map((h, i) =>
            i === editingHotspot.hotspotIndex ? updatedHotspot : h
        );

        const updatedScene = {
            ...selectedScene,
            hotspots: updatedHotspots
        };
        setSelectedScene(updatedScene);

        const updatedTourData = {
            ...tourData,
            scenes: tourData.scenes.map(scene =>
                scene.id === selectedScene.id ? updatedScene : scene
            )
        };
        setTourData(updatedTourData);

        // Don't reload scene - just update the data
        setEditingHotspot(null);
    }; const updateHotspotPosition = (index: number, newYaw: number, newPitch: number, shouldReload = false) => {
        if (!selectedScene || !tourData) return;

        // Prevent scene reload during hotspot updates
        setPreventSceneReload(true);

        const updatedHotspots = selectedScene.hotspots.map((h, i) =>
            i === index ? { ...h, yaw: newYaw, pitch: newPitch } : h
        );

        const updatedScene = {
            ...selectedScene,
            hotspots: updatedHotspots
        };
        setSelectedScene(updatedScene);

        const updatedTourData = {
            ...tourData,
            scenes: tourData.scenes.map(scene =>
                scene.id === selectedScene.id ? updatedScene : scene
            )
        };
        setTourData(updatedTourData);

        // Re-enable scene reloads after a short delay
        setTimeout(() => setPreventSceneReload(false), 100);
    };

    const deleteHotspot = (index: number) => {
        if (!selectedScene || !tourData) return;

        const updatedHotspots = selectedScene.hotspots.filter((_, i) => i !== index);
        const updatedScene = {
            ...selectedScene,
            hotspots: updatedHotspots
        };
        setSelectedScene(updatedScene);

        const updatedTourData = {
            ...tourData,
            scenes: tourData.scenes.map(scene =>
                scene.id === selectedScene.id ? updatedScene : scene
            )
        };
        setTourData(updatedTourData);

        // Reload scene to remove the hotspot visually (this is necessary for deletion)
        loadScene(updatedScene);
    };

    const setViewDirection = (yaw: number, pitch: number, fov: number) => {
        if (!currentScene) return;

        const view = currentScene.view();
        view.setParameters({
            yaw: yaw * Math.PI / 180,
            pitch: pitch * Math.PI / 180,
            fov: fov * Math.PI / 180
        });
    };

    const addNewScene = () => {
        if (!tourData) return;

        const newScene: Scene = {
            id: `scene${Date.now()}`,
            name: 'New Scene',
            imageUrl: 'tour_images/pano1.jpg', // Default image
            geometry: { width: 4000 },
            hotspots: []
        };

        const updatedTourData = {
            ...tourData,
            scenes: [...tourData.scenes, newScene]
        };
        setTourData(updatedTourData);
        setSelectedScene(newScene);
        
        // Automatically open the scene editor for the new scene
        setEditingScene(newScene);
        setShowSceneEditor(true);
    };

    const deleteScene = (sceneId: string) => {
        if (!tourData) return;

        const updatedTourData = {
            ...tourData,
            scenes: tourData.scenes.filter(scene => scene.id !== sceneId)
        };
        setTourData(updatedTourData);

        // If we deleted the selected scene, select the first one
        if (selectedScene?.id === sceneId) {
            setSelectedScene(updatedTourData.scenes.length > 0 ? updatedTourData.scenes[0] : null);
        }
    };

    const updateScene = (updatedScene: Scene) => {
        if (!tourData) return;

        const updatedTourData = {
            ...tourData,
            scenes: tourData.scenes.map(scene =>
                scene.id === updatedScene.id ? updatedScene : scene
            )
        };
        setTourData(updatedTourData);
        setSelectedScene(updatedScene);
        loadScene(updatedScene);
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

    const handleImageUpload = async (file: File) => {
        if (!editingScene) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch('/admin/api/upload-image', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                const imagePath = `tour_images/${result.filename}`;
                setEditingScene({ ...editingScene, imageUrl: imagePath });
                // Refresh available images list
                const imagesResponse = await fetch('/admin/api/images');
                if (imagesResponse.ok) {
                    const images = await imagesResponse.json();
                    setAvailableImages(images);
                }
            } else {
                alert('Failed to upload image');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Error uploading image');
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2>Scenes</h2>
                    <button
                        onClick={addNewScene}
                        style={{
                            padding: '5px 10px',
                            backgroundColor: '#28a745',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        + Add Scene
                    </button>
                </div>

                {/* Scene List */}
                <div style={{ marginBottom: '20px' }}>
                    {tourData.scenes.map((scene) => (
                        <div key={scene.id} style={{ marginBottom: '10px' }}>
                            <div
                                onClick={() => {
                                    setPreventSceneReload(false); // Allow scene reload for scene switching
                                    setSelectedScene(scene);
                                    loadScene(scene);
                                }}
                                style={{
                                    padding: '10px',
                                    backgroundColor: selectedScene?.id === scene.id ? '#007bff' : '#fff',
                                    color: selectedScene?.id === scene.id ? '#fff' : '#000',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    position: 'relative'
                                }}
                            >
                                <strong>{scene.name}</strong>
                                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                    {scene.hotspots.length} hotspots
                                </div>
                                <div style={{ position: 'absolute', top: '5px', right: '5px', display: 'flex', gap: '5px' }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingScene(scene);
                                            setShowSceneEditor(true);
                                        }}
                                        style={{
                                            width: '20px',
                                            height: '20px',
                                            backgroundColor: '#ffc107',
                                            border: 'none',
                                            borderRadius: '50%',
                                            cursor: 'pointer',
                                            fontSize: '10px'
                                        }}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Delete scene "${scene.name}"?`)) {
                                                deleteScene(scene.id);
                                            }
                                        }}
                                        style={{
                                            width: '20px',
                                            height: '20px',
                                            backgroundColor: '#dc3545',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '50%',
                                            cursor: 'pointer',
                                            fontSize: '10px'
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* View Direction Controls */}
                {selectedScene && currentScene && (
                    <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff', borderRadius: '4px' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>View Direction</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                            <div>
                                <label>Yaw (°):</label>
                                <input
                                    type="number"
                                    min="-180"
                                    max="180"
                                    step="5"
                                    defaultValue={Math.round(currentScene.view().yaw() * 180 / Math.PI)}
                                    onChange={(e) => {
                                        const view = currentScene.view();
                                        setViewDirection(
                                            parseFloat(e.target.value),
                                            view.pitch() * 180 / Math.PI,
                                            view.fov() * 180 / Math.PI
                                        );
                                    }}
                                    style={{ width: '100%', padding: '3px', fontSize: '12px' }}
                                />
                            </div>
                            <div>
                                <label>Pitch (°):</label>
                                <input
                                    type="number"
                                    min="-90"
                                    max="90"
                                    step="5"
                                    defaultValue={Math.round(currentScene.view().pitch() * 180 / Math.PI)}
                                    onChange={(e) => {
                                        const view = currentScene.view();
                                        setViewDirection(
                                            view.yaw() * 180 / Math.PI,
                                            parseFloat(e.target.value),
                                            view.fov() * 180 / Math.PI
                                        );
                                    }}
                                    style={{ width: '100%', padding: '3px', fontSize: '12px' }}
                                />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label>FOV (°):</label>
                                <input
                                    type="number"
                                    min="10"
                                    max="150"
                                    step="5"
                                    defaultValue={Math.round(currentScene.view().fov() * 180 / Math.PI)}
                                    onChange={(e) => {
                                        const view = currentScene.view();
                                        setViewDirection(
                                            view.yaw() * 180 / Math.PI,
                                            view.pitch() * 180 / Math.PI,
                                            parseFloat(e.target.value)
                                        );
                                    }}
                                    style={{ width: '100%', padding: '3px', fontSize: '12px' }}
                                />
                            </div>
                        </div>
                        <button
                            onClick={setDefaultView}
                            style={{
                                width: '100%',
                                marginTop: '10px',
                                padding: '8px',
                                backgroundColor: '#ffc107',
                                color: '#000',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}
                        >
                            📌 Set as Default View
                        </button>
                    </div>
                )}

                {/* Hotspot Creation Controls */}
                <div style={{ marginBottom: '20px' }}>
                    <h3>Add Hotspots</h3>
                    <button
                        onClick={() => createHotspot('info')}
                        style={{
                            display: 'block',
                            width: '100%',
                            margin: '5px 0',
                            padding: '10px',
                            backgroundColor: '#007bff',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        📍 Add Info Point
                    </button>
                    <button
                        onClick={() => createHotspot('waypoint')}
                        style={{
                            display: 'block',
                            width: '100%',
                            margin: '5px 0',
                            padding: '10px',
                            backgroundColor: '#28a745',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        🚪 Add Waypoint
                    </button>
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
                                    fontSize: '12px',
                                    position: 'relative'
                                }}
                            >
                                <div style={{ fontWeight: 'bold' }}>
                                    {hotspot.type === 'info' ? '📍' : '🚪'} {hotspot.type}
                                </div>
                                <div style={{ marginRight: '25px' }}>{hotspot.text}</div>
                                <div style={{ opacity: 0.6 }}>
                                    Yaw: {(hotspot.yaw * 180 / Math.PI).toFixed(1)}°,
                                    Pitch: {(hotspot.pitch * 180 / Math.PI).toFixed(1)}°
                                </div>
                                <button
                                    onClick={() => deleteHotspot(index)}
                                    style={{
                                        position: 'absolute',
                                        top: '4px',
                                        right: '4px',
                                        width: '20px',
                                        height: '20px',
                                        backgroundColor: '#dc3545',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Save Button */}
                <button
                    onClick={saveTourData}
                    style={{
                        position: 'relative',
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
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <div
                    ref={viewerRef}
                    style={{
                        width: '100%',
                        height: '100%',
                        cursor: 'grab'
                    }}
                />

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

            {/* Hotspot Edit Modal */}
            {editingHotspot && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#fff',
                        padding: '20px',
                        borderRadius: '8px',
                        width: '400px',
                        maxWidth: '90vw'
                    }}>
                        <h3>Edit {editingHotspot.hotspot.type} Hotspot</h3>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Text:</label>
                            <input
                                type="text"
                                defaultValue={editingHotspot.hotspot.text}
                                onChange={(e) => {
                                    setEditingHotspot({
                                        ...editingHotspot,
                                        hotspot: { ...editingHotspot.hotspot, text: e.target.value }
                                    });
                                }}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                            />
                        </div>
                        {editingHotspot.hotspot.type === 'info' && (
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Description:</label>
                                <textarea
                                    defaultValue={editingHotspot.hotspot.description || ''}
                                    onChange={(e) => {
                                        setEditingHotspot({
                                            ...editingHotspot,
                                            hotspot: { ...editingHotspot.hotspot, description: e.target.value }
                                        });
                                    }}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', height: '80px' }}
                                />
                            </div>
                        )}
                        {editingHotspot.hotspot.type === 'waypoint' && (
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Target Scene:</label>
                                <select
                                    defaultValue={editingHotspot.hotspot.target || ''}
                                    onChange={(e) => {
                                        setEditingHotspot({
                                            ...editingHotspot,
                                            hotspot: { ...editingHotspot.hotspot, target: e.target.value }
                                        });
                                    }}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                >
                                    <option value="">Select target scene</option>
                                    {tourData?.scenes.map(scene => (
                                        <option key={scene.id} value={scene.id}>{scene.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setEditingHotspot(null)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#6c757d',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => updateHotspot(editingHotspot.hotspot)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#007bff',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scene Edit Modal */}
            {showSceneEditor && editingScene && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#fff',
                        padding: '20px',
                        borderRadius: '8px',
                        width: '400px',
                        maxWidth: '90vw'
                    }}>
                        <h3>Edit Scene</h3>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Scene Name:</label>
                            <input
                                type="text"
                                defaultValue={editingScene.name}
                                onChange={(e) => {
                                    setEditingScene({ ...editingScene, name: e.target.value });
                                }}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Image Source:</label>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setImageSelectionMode('select')}
                                    style={{
                                        padding: '5px 10px',
                                        backgroundColor: imageSelectionMode === 'select' ? '#007bff' : '#f8f9fa',
                                        color: imageSelectionMode === 'select' ? '#fff' : '#000',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    Select Existing
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImageSelectionMode('upload')}
                                    style={{
                                        padding: '5px 10px',
                                        backgroundColor: imageSelectionMode === 'upload' ? '#007bff' : '#f8f9fa',
                                        color: imageSelectionMode === 'upload' ? '#fff' : '#000',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    Upload New
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImageSelectionMode('url')}
                                    style={{
                                        padding: '5px 10px',
                                        backgroundColor: imageSelectionMode === 'url' ? '#007bff' : '#f8f9fa',
                                        color: imageSelectionMode === 'url' ? '#fff' : '#000',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    Custom URL
                                </button>
                            </div>
                            
                            {imageSelectionMode === 'select' && (
                                <select
                                    value={editingScene.imageUrl}
                                    onChange={(e) => {
                                        setEditingScene({ ...editingScene, imageUrl: e.target.value });
                                    }}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                >
                                    <option value="">Select an image...</option>
                                    {availableImages.map(image => (
                                        <option key={image} value={`tour_images/${image}`}>
                                            {image}
                                        </option>
                                    ))}
                                </select>
                            )}
                            
                            {imageSelectionMode === 'upload' && (
                                <div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                handleImageUpload(file);
                                            }
                                        }}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                    />
                                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                        Supported formats: JPG, PNG, WebP. Recommended: 4096x2048 or similar 2:1 ratio.
                                    </div>
                                </div>
                            )}
                            
                            {imageSelectionMode === 'url' && (
                                <input
                                    type="text"
                                    value={editingScene.imageUrl}
                                    onChange={(e) => {
                                        setEditingScene({ ...editingScene, imageUrl: e.target.value });
                                    }}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                    placeholder="e.g., tour_images/pano1.jpg"
                                />
                            )}
                            
                            {editingScene.imageUrl && (
                                <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                                    Current: {editingScene.imageUrl}
                                </div>
                            )}
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Image Width:</label>
                            <input
                                type="number"
                                defaultValue={editingScene.geometry.width}
                                onChange={(e) => {
                                    setEditingScene({
                                        ...editingScene,
                                        geometry: { ...editingScene.geometry, width: parseInt(e.target.value) }
                                    });
                                }}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setShowSceneEditor(false);
                                    setEditingScene(null);
                                }}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#6c757d',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (editingScene) {
                                        updateScene(editingScene);
                                        setShowSceneEditor(false);
                                        setEditingScene(null);
                                    }
                                }}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#007bff',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Edit360;