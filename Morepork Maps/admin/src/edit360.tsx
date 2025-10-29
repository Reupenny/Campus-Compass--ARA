import React, { useState, useEffect, useRef, useImperativeHandle } from 'react';
import './App.css';
import './edit360.css';
import Marzipano from 'marzipano';

interface Hotspot {
    type: 'info' | 'waypoint';
    pitch: number;
    yaw: number;
    text: string;
    description?: string;
    target?: string;
    url?: string;
}

interface Scene {
    id: string;
    name: string;
    imageUrl: string;
    inView?: string; // Description of what's in the scene for chatbot context
    lowResUrl?: string; // Low-res version for fast loading
    dimensions?: {
        width: number;
        height: number;
    };
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

interface SidebarProps {
    tourData: TourData;
    selectedScene: Scene | null;
    currentScene: any;
    onAddNewScene: () => void;
    onSelectScene: (scene: Scene) => void;
    onEditScene: (scene: Scene) => void;
    onDeleteScene: (sceneId: string) => void;
    onSetViewDirection: (yaw: number, pitch: number, fov: number) => void;
    onCreateHotspot: (type: 'info' | 'waypoint') => void;
    onDeleteHotspot: (index: number) => void;
    onSetDefaultView: () => void;
    onSaveTourData: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    tourData,
    selectedScene,
    currentScene,
    onAddNewScene,
    onSelectScene,
    onEditScene,
    onDeleteScene,
    onSetViewDirection,
    onCreateHotspot,
    onDeleteHotspot,
    onSetDefaultView,
    onSaveTourData
}) => {
    return (
        <div className="sidebar">
            {/* Save Button */}
            <button
                onClick={onSaveTourData}
                className="btn btn-primary btn-full"
            >
                Save Tour Data
            </button>
            <div className="sidebar-header">
                <h2>Scenes</h2>
                <button
                    onClick={onAddNewScene}
                    className="btn add-scene-btn"
                >
                    + Add Scene
                </button>
            </div>

            {/* Scene List */}
            <div className="scene-list">
                {tourData.scenes.map((scene) => (
                    <div key={scene.id} className="scene-item">
                        <div
                            onClick={() => onSelectScene(scene)}
                            className={`scene-card ${selectedScene?.id === scene.id ? 'selected' : ''}`}
                        >
                            <div className="scene-name">{scene.name}</div>
                            <div className="scene-actions">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEditScene(scene);
                                    }}
                                    className="btn btn-secondary btn-small"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`Delete scene "${scene.name}"?`)) {
                                            onDeleteScene(scene.id);
                                        }
                                    }}
                                    className="btn btn-danger btn-small"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* View Direction Controls */}
            {selectedScene && currentScene && (
                <div className="view-controls">
                    <div className="view-controls-grid">
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
                                    onSetViewDirection(
                                        parseFloat(e.target.value),
                                        view.pitch() * 180 / Math.PI,
                                        view.fov() * 180 / Math.PI
                                    );
                                }}
                                className="view-controls-input"
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
                                    onSetViewDirection(
                                        view.yaw() * 180 / Math.PI,
                                        parseFloat(e.target.value),
                                        view.fov() * 180 / Math.PI
                                    );
                                }}
                                className="view-controls-input"
                            />
                        </div>
                        <div className="fov-control">
                            <label>FOV (°):</label>
                            <input
                                type="number"
                                min="10"
                                max="150"
                                step="5"
                                defaultValue={Math.round(currentScene.view().fov() * 180 / Math.PI)}
                                onChange={(e) => {
                                    const view = currentScene.view();
                                    onSetViewDirection(
                                        view.yaw() * 180 / Math.PI,
                                        view.pitch() * 180 / Math.PI,
                                        parseFloat(e.target.value)
                                    );
                                }}
                                className="view-controls-input"
                            />
                        </div>
                    </div>
                    <button
                        onClick={onSetDefaultView}
                        className="btn btn-secondary"
                    >
                        Set as Default View
                    </button>
                </div>
            )}

            {/* Hotspot Creation Controls */}
            <div className="hotspot-controls">
                <h3>Add Hotspots</h3>
                <button
                    onClick={() => onCreateHotspot('info')}
                    className="btn btn-primary"
                >
                    Add Info Point
                </button>
                <button
                    onClick={() => onCreateHotspot('waypoint')}
                    className="btn btn-primary"
                >
                    Add Waypoint
                </button>
            </div>
        </div>
    );
};

interface Edit360Props {
    onReady?: () => void;
}

const Edit360 = React.forwardRef<any, Edit360Props>(({ onReady }, ref) => {
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
                // Notify parent that component is ready
                if (onReady) {
                    onReady();
                }
            } catch (error) {
                console.error('Error loading tour data:', error);
                // Set default tour data if loading fails
                const defaultTour = {
                    scenes: []
                };
                setTourData(defaultTour);
                // Notify parent that component is ready even with default data
                if (onReady) {
                    onReady();
                }
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
                },
                stage: {},
                cursors: {
                    drag: {}
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

    // Expose methods and state to parent component
    useImperativeHandle(ref, () => ({
        tourData,
        selectedScene,
        currentScene,
        addNewScene,
        deleteScene,
        setViewDirection,
        createHotspot,
        deleteHotspot,
        setDefaultView,
        saveTourData,
        handleSelectScene: (scene: Scene) => {
            setPreventSceneReload(false);
            setSelectedScene(scene);
            loadScene(scene);
        },
        handleEditScene: (scene: Scene) => {
            setEditingScene(scene);
            setShowSceneEditor(true);
        }
    }), [tourData, selectedScene, currentScene]);

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

        // Switch to scene
        marzipanoScene.switchTo();
        setCurrentScene(marzipanoScene);

        // Add hotspots to scene
        scene.hotspots.forEach((hotspot, index) => {
            addHotspotToScene(marzipanoScene, hotspot, index);
        });
    };

    const addHotspotToScene = (marzipanoScene: any, hotspot: Hotspot, index: number) => {
        const element = document.createElement('div');
        element.className = `hotspot hotspot-${hotspot.type}`;

        // Create inner content
        const icon = document.createElement('div');
        icon.className = 'hotspot-icon';
        const iconImg = document.createElement('img');
        iconImg.src = hotspot.type === 'info' ? '/img/info.png' : '/img/link.png';
        iconImg.alt = hotspot.type === 'info' ? 'Info' : 'Waypoint';
        icon.appendChild(iconImg);

        // Create action buttons (initially hidden)
        const actionPanel = document.createElement('div');
        actionPanel.className = 'hotspot-action-panel';

        const editBtn = document.createElement('button');
        editBtn.innerHTML = 'Edit';
        editBtn.className = 'btn btn-primary btn-small';

        const dragBtn = document.createElement('button');
        dragBtn.innerHTML = 'Move';
        dragBtn.className = 'btn btn-primary btn-small';

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = 'Delete';
        deleteBtn.className = 'btn btn-danger btn-small';

        actionPanel.appendChild(dragBtn);
        actionPanel.appendChild(editBtn);
        actionPanel.appendChild(deleteBtn);

        element.appendChild(icon);
        element.appendChild(actionPanel);

        element.className = 'hotspot';

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
                        panel.classList.remove('visible');
                    }
                });

                // Toggle this action panel
                if (!actionPanel.classList.contains('visible')) {
                    actionPanel.classList.add('visible');
                    icon.style.transform = 'scale(1.2)';
                    setSelectedHotspotIndex(index);
                } else {
                    actionPanel.classList.remove('visible');
                    icon.style.transform = 'scale(1)';
                    setSelectedHotspotIndex(null);
                }
            }
        });

        // Add hover effects
        element.addEventListener('mouseenter', () => {
            if (!isDragging) {
                icon.style.transform = 'scale(1.1)';
                icon.style.background = hotspot.type === 'info' ? 'var(--primary-light)' : 'var(--secondary-light)';
            }
        });

        element.addEventListener('mouseleave', () => {
            if (!isDragging && !actionPanel.classList.contains('visible')) {
                icon.style.transform = 'scale(1)';
                icon.style.background = hotspot.type === 'info' ? 'var(--primary)' : 'var(--secondary)';
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
                actionPanel.classList.remove('visible');
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

            dragBtn.classList.add('dragging');

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

            dragBtn.classList.remove('dragging');
            actionPanel.classList.remove('visible');
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
                actionPanel.classList.remove('visible');
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

        // For waypoints, find the target scene and use its name
        const targetScene = type === 'waypoint'
            ? tourData.scenes.find(s => s.id !== selectedScene.id) || tourData.scenes[0]
            : null;

        const targetSceneId = targetScene?.id || 'scene1';
        const waypointText = targetScene?.name || 'New Waypoint';

        const newHotspot: Hotspot = {
            type: type,
            pitch: currentPitch,
            yaw: currentYaw,
            text: type === 'info' ? 'New Info Point' : waypointText,
            ...(type === 'info' ? { description: 'Description here' } : { target: targetSceneId })
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

        // For waypoints, automatically sync the text with the target scene name
        let finalHotspot = updatedHotspot;
        if (updatedHotspot.type === 'waypoint' && updatedHotspot.target) {
            const targetScene = tourData.scenes.find(scene => scene.id === updatedHotspot.target);
            if (targetScene) {
                finalHotspot = {
                    ...updatedHotspot,
                    text: targetScene.name
                };
            }
        }

        const updatedHotspots = selectedScene.hotspots.map((h, i) =>
            i === editingHotspot.hotspotIndex ? finalHotspot : h
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
            // Show upload progress
            alert('Uploading and processing image... This may take a moment.');

            const response = await fetch('/admin/api/upload-image', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Image processed:', result);

                // Use the WebP version as the main image
                const imagePath = `tour_images/${result.filename}`;
                const updatedScene = {
                    ...editingScene,
                    imageUrl: imagePath,
                    // Store additional metadata
                    lowResUrl: `tour_images/${result.lowResFilename}`,
                    dimensions: result.dimensions
                };
                setEditingScene(updatedScene);

                // Refresh available images list
                const imagesResponse = await fetch('/admin/api/images');
                if (imagesResponse.ok) {
                    const images = await imagesResponse.json();
                    setAvailableImages(images);
                }

                alert(`Image processed successfully! Converted to WebP format (${result.dimensions.width}x${result.dimensions.height})`);
            } else {
                const errorData = await response.json();
                alert(`Failed to upload image: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Error uploading image. Please try again.');
        }
    };

    if (!tourData) {
        return <div>Loading tour data...</div>;
    }

    // Handler functions for sidebar
    const handleSelectScene = (scene: Scene) => {
        setPreventSceneReload(false); // Allow scene reload for scene switching
        setSelectedScene(scene);
        loadScene(scene);
    };

    const handleEditScene = (scene: Scene) => {
        setEditingScene(scene);
        setShowSceneEditor(true);
    };

    return (
        <div className="edit360-container">
            {/* <Sidebar
                tourData={tourData}
                selectedScene={selectedScene}
                currentScene={currentScene}
                onAddNewScene={addNewScene}
                onSelectScene={handleSelectScene}
                onEditScene={handleEditScene}
                onDeleteScene={deleteScene}
                onSetViewDirection={setViewDirection}
                onCreateHotspot={createHotspot}
                onDeleteHotspot={deleteHotspot}
                onSetDefaultView={setDefaultView}
                onSaveTourData={saveTourData}
            /> */}

            {/* 360 Viewer */}
            <div className="viewer-container">
                <div
                    ref={viewerRef}
                    className="viewer-canvas"
                />

                {/* Scene Info */}
                {selectedScene && (
                    <div className="scene-info">
                        <strong>{selectedScene.name}</strong>
                        <div>{selectedScene.hotspots.length} hotspots</div>
                    </div>
                )}
            </div>

            {/* Hotspot Edit Modal */}
            {editingHotspot && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        {editingHotspot.hotspot.type === 'info' && (
                            <div className="form-group">
                                <label className="form-label">Text:</label>
                                <input
                                    type="text"
                                    defaultValue={editingHotspot.hotspot.text}
                                    onChange={(e) => {
                                        setEditingHotspot({
                                            ...editingHotspot,
                                            hotspot: { ...editingHotspot.hotspot, text: e.target.value }
                                        });
                                    }}
                                    className="form-input"
                                />
                            </div>
                        )}
                        {editingHotspot.hotspot.type === 'info' && (
                            <div className="form-group">
                                <label className="form-label">Description:</label>
                                <textarea
                                    defaultValue={editingHotspot.hotspot.description || ''}
                                    onChange={(e) => {
                                        setEditingHotspot({
                                            ...editingHotspot,
                                            hotspot: { ...editingHotspot.hotspot, description: e.target.value }
                                        });
                                    }}
                                    className="form-textarea"
                                />
                            </div>
                        )}
                        {editingHotspot.hotspot.type === 'info' && (
                            <div className="form-group">
                                <label className="form-label">More information link:</label>
                                <input
                                    type="url"
                                    defaultValue={editingHotspot.hotspot.url || ''}
                                    onChange={(e) => {
                                        setEditingHotspot({
                                            ...editingHotspot,
                                            hotspot: { ...editingHotspot.hotspot, url: e.target.value }
                                        });
                                    }}
                                    className="form-input"
                                    placeholder="https://example.com"
                                />
                            </div>
                        )}
                        {editingHotspot.hotspot.type === 'waypoint' && (
                            <div className="form-group">
                                <label className="form-label">Target Scene:</label>
                                <select
                                    defaultValue={editingHotspot.hotspot.target || ''}
                                    onChange={(e) => {
                                        setEditingHotspot({
                                            ...editingHotspot,
                                            hotspot: { ...editingHotspot.hotspot, target: e.target.value }
                                        });
                                    }}
                                    className="form-select"
                                >
                                    <option value="">Select target scene</option>
                                    {tourData?.scenes.map(scene => (
                                        <option key={scene.id} value={scene.id}>{scene.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="modal-actions">
                            <button
                                onClick={() => setEditingHotspot(null)}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => updateHotspot(editingHotspot.hotspot)}
                                className="btn btn-primary"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scene Edit Modal */}
            {showSceneEditor && editingScene && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="form-group">
                            <label className="form-label">Scene Name:</label>
                            <input
                                type="text"
                                defaultValue={editingScene.name}
                                onChange={(e) => {
                                    setEditingScene({ ...editingScene, name: e.target.value });
                                }}
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Scene Description (for chatbot):</label>
                            <textarea
                                value={editingScene.inView || ''}
                                onChange={(e) => {
                                    setEditingScene({ ...editingScene, inView: e.target.value });
                                }}
                                className="form-textarea"
                                placeholder="Describe what's visible in this scene for the chatbot context..."
                                rows={3}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Image Source:</label>
                            <div className="image-mode-buttons">
                                <button
                                    type="button"
                                    onClick={() => setImageSelectionMode('select')}
                                    className={` btn btn-secondary btn-small ${imageSelectionMode === 'select' ? 'active' : ''}`}
                                >
                                    Select Existing
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImageSelectionMode('upload')}
                                    className={` btn btn-secondary btn-small ${imageSelectionMode === 'upload' ? 'active' : ''}`}
                                >
                                    Upload New
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImageSelectionMode('url')}
                                    className={` btn btn-secondary btn-small ${imageSelectionMode === 'url' ? 'active' : ''}`}
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
                                    className="form-select"
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
                                        className="form-input"
                                    />
                                    <div className="upload-info">
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
                                    className="form-input"
                                    placeholder="e.g., tour_images/pano1.jpg"
                                />
                            )}

                            {editingScene.imageUrl && (
                                <div className="current-image">
                                    Current: {editingScene.imageUrl}
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Image Width:</label>
                            <input
                                type="number"
                                defaultValue={editingScene.geometry.width}
                                onChange={(e) => {
                                    setEditingScene({
                                        ...editingScene,
                                        geometry: { ...editingScene.geometry, width: parseInt(e.target.value) }
                                    });
                                }}
                                className="form-input"
                            />
                        </div>
                        <div className="modal-actions">
                            <button
                                onClick={() => {
                                    setShowSceneEditor(false);
                                    setEditingScene(null);
                                }}
                                className="btn btn-secondary"
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
                                className="btn btn-primary"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

Edit360.displayName = 'Edit360';

export default Edit360;
export { Sidebar };