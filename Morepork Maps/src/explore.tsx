import { useEffect, useRef, useState } from 'react';
import './css/explore.css';
import Marzipano from 'marzipano';
import { useTour } from './TourContext';
import type { SceneData } from './TourContext';

function Explore({ onMenuStateChange }: { onMenuStateChange?: (isOpen: boolean) => void }) {
    const { tourData, loading, error } = useTour();
    const initializationRef = useRef(false);
    const viewerRef = useRef<any>(null);
    const [isViewerProtected, setIsViewerProtected] = useState(false);
    const protectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [currentScene, setCurrentScene] = useState<string>('');

    const initializeViewer = async () => {
        // Don't initialize if already done, loading, has error, or no data
        if (initializationRef.current || loading || error || !tourData) return;

        const panoElement = document.getElementById('pano');
        if (!panoElement) {
            setTimeout(initializeViewer, 100);
            return;
        }

        // Safari height fix - set explicit dimensions
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (isSafari) {
            panoElement.style.width = `${window.innerWidth}px`;
            panoElement.style.height = `${window.innerHeight}px`;
        }

        // Check if element is actually visible and has dimensions
        const rect = panoElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            setTimeout(initializeViewer, 100);
            return;
        }

        // Clear existing viewer completely and protect against external interference
        if (viewerRef.current) {
            try {
                // Clear viewer safely
                panoElement.innerHTML = '';
                viewerRef.current = null;

                // Small delay to ensure cleanup is complete
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
                console.warn('Error clearing viewer:', error);
            }
        }

        try {
            initializationRef.current = true;
            console.log('Creating new Marzipano viewer...');

            // Protect against external modifications during initialization
            setIsViewerProtected(true);

            const newViewer = new Marzipano.Viewer(panoElement);
            viewerRef.current = newViewer;

            // Set up viewer protection timeout
            if (protectionTimeoutRef.current) {
                clearTimeout(protectionTimeoutRef.current);
            }
            protectionTimeoutRef.current = setTimeout(() => {
                setIsViewerProtected(false);
            }, 5000); // Protect for 5 seconds after initialization

            const minZoomInVFOV = 80;
            const maxZoomOutVFOV = 100;
            const zoomLimiter = Marzipano.RectilinearView.limit.traditional(
                minZoomInVFOV * Math.PI / 180,
                maxZoomOutVFOV * Math.PI / 180
            );

            const scenes: { [key: string]: any } = {};
            const highResLayers: { [key: string]: any } = {};
            const highResLoaded: { [key: string]: boolean } = {};

            // Helper function to get low-res URL
            const getLowResUrl = (imageUrl: string) => {
                const pathParts = imageUrl.split('/');
                const filename = pathParts[pathParts.length - 1];
                const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|webp)$/i, '');
                const lowResFilename = `${nameWithoutExt}_lowres.webp`;
                pathParts[pathParts.length - 1] = lowResFilename;
                return pathParts.join('/');
            };

            // Function to switch to a scene
            const switchToScene = (sceneId: string) => {
                if (scenes[sceneId]) {
                    scenes[sceneId].switchTo();
                    setCurrentScene(sceneId);
                    loadHighResWithDelay(sceneId, 1000);
                }
            };

            // Helper function to create hotspots for a scene
            const addHotspotsToScene = (scene: any, sceneData: any) => {
                sceneData.hotspots.forEach((hotspotData: any) => {
                    const hotspotElement = document.createElement('div');
                    hotspotElement.className = `hotspot-${hotspotData.type}`;

                    if (hotspotData.type === 'waypoint' && hotspotData.target) {
                        hotspotElement.innerHTML = '<img class="hotspot-icon" src="/img/link.png" alt="Hotspot Icon" />';
                        hotspotElement.innerHTML += '<div class="hotspot-data"><h5>' + hotspotData.text + '</h5></div>';
                        hotspotElement.addEventListener('click', () => {
                            switchToScene(hotspotData.target!);
                        });
                    } else if (hotspotData.type === 'info') {
                        if (hotspotData.description) {
                            hotspotElement.innerHTML = '<img class="hotspot-icon" src="/img/info.png" alt="Hotspot Icon" />';
                            hotspotElement.innerHTML += '<div class="hotspot-data"><h5>' + hotspotData.text + '</h5><p>' + hotspotData.description + '</p></div>';
                        }
                    }

                    scene.hotspotContainer().createHotspot(hotspotElement, {
                        yaw: hotspotData.yaw,
                        pitch: hotspotData.pitch
                    });
                });
            };

            // Function to check if viewer is still functional
            const isViewerHealthy = () => {
                try {
                    if (!viewerRef.current) return false;
                    // Try to access basic viewer properties
                    viewerRef.current.scene();
                    return true;
                } catch {
                    return false;
                }
            };

            // Function to load high-res layer for a scene with delay
            const loadHighResWithDelay = (sceneId: string, delay: number = 2000) => {
                setTimeout(() => {
                    if (highResLoaded[sceneId] || !viewerRef.current || !isViewerHealthy()) return; // Already loaded or viewer destroyed/corrupted

                    const sceneData = tourData.scenes.find((s: SceneData) => s.id === sceneId);
                    if (!sceneData) return;

                    try {
                        console.log(`Loading high-res layer for scene ${sceneId}`);
                        const scene = scenes[sceneId];
                        if (!scene) return;

                        // Pre-load the high-res image to ensure it's ready
                        const highResImg = new Image();
                        highResImg.onload = () => {
                            if (!viewerRef.current || !scene) return; // Viewer was destroyed

                            console.log(`High-res image loaded for scene ${sceneId}, creating layer`);

                            try {
                                // Create a high-res layer and add it to the existing scene
                                const highResLayer = scene.createLayer({
                                    source: Marzipano.ImageUrlSource.fromString(sceneData.imageUrl),
                                    geometry: new Marzipano.EquirectGeometry([{ width: sceneData.geometry.width }])
                                });

                                // Store the high-res layer reference
                                highResLayers[sceneId] = highResLayer;
                                highResLoaded[sceneId] = true;

                                // If this scene is currently active, the high-res layer will automatically show
                                console.log(`High-res layer created for scene ${sceneId}`);

                            } catch (error) {
                                console.warn(`Failed to create high-res layer for scene ${sceneId}:`, error);
                            }
                        };

                        highResImg.onerror = () => {
                            console.warn(`Failed to load high-res image for scene ${sceneId}`);
                        };

                        // Start loading the high-res image
                        highResImg.src = sceneData.imageUrl;

                    } catch (error) {
                        console.warn(`Failed to load high-res for scene ${sceneId}:`, error);
                    }
                }, delay);
            };

            // Create all scenes with low-res images first
            tourData.scenes.forEach((sceneData: SceneData) => {
                const lowResUrl = getLowResUrl(sceneData.imageUrl);

                const scene = newViewer.createScene({
                    source: Marzipano.ImageUrlSource.fromString(lowResUrl),
                    geometry: new Marzipano.EquirectGeometry([{ width: sceneData.geometry.width }]),
                    view: new Marzipano.RectilinearView(undefined, zoomLimiter)
                });

                scenes[sceneData.id] = scene;
                highResLoaded[sceneData.id] = false;

                // Add hotspots to the scene (only once)
                addHotspotsToScene(scene, sceneData);
            });

            // Expose scenes globally for menu access
            (window as any).tourScenes = scenes;
            (window as any).switchToScene = switchToScene;

            // Start with first scene and load high-res layer after delay
            const firstSceneId = tourData.scenes[0].id;
            scenes[firstSceneId].switchTo();
            setCurrentScene(firstSceneId);
            loadHighResWithDelay(firstSceneId, 1500); // Add high-res layer after 1.5 seconds

        } catch (error) {
            console.error('Error initializing viewer:', error);
            initializationRef.current = false;
            // Retry after a delay
            setTimeout(initializeViewer, 1000);
        }
    };

    // Notify parent component when menu state changes
    useEffect(() => {
        if (onMenuStateChange) {
            onMenuStateChange(isMenuOpen);
        }
    }, [isMenuOpen, onMenuStateChange]);

    useEffect(() => {
        initializeViewer();

        // Safari resize handler
        const handleResize = () => {
            const panoElement = document.getElementById('pano');
            if (panoElement) {
                const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                if (isSafari) {
                    panoElement.style.width = `${window.innerWidth}px`;
                    panoElement.style.height = `${window.innerHeight}px`;
                }
            }
        };

        // Add resize listener for Safari
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        // Cleanup function
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);

            if (viewerRef.current) {
                try {
                    const panoElement = document.getElementById('pano');
                    if (panoElement) {
                        panoElement.innerHTML = '';
                    }
                } catch (error) {
                    console.warn('Error during cleanup:', error);
                }
                viewerRef.current = null;
            }

            if (protectionTimeoutRef.current) {
                clearTimeout(protectionTimeoutRef.current);
            }

            initializationRef.current = false;
        };
    }, [tourData, loading, error]);

    // Handle loading states
    if (loading) return <div className="loading-container">Loading tour...</div>;
    if (error) return <div className="error-container">Error: {error}</div>;
    if (!tourData) return <div className="error-container">No tour data available</div>;

    return (
        <>
            <div id="pano" className="pano-container">
                {/* Tour Title */}
                <div className="tour-header">
                    <p className="tour-title">
                        {currentScene ?
                            tourData.scenes.find(scene => scene.id === currentScene)?.name || 'Unknown Scene'
                            : 'Loading...'}
                    </p>
                </div>
                <button
                    className={`scenes-menu-button ${isMenuOpen ? 'hidden' : ''}`}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Open locations menu"
                >
                    <img src="/img/plus.png" alt="Menu" className="menu-icon" />
                </button>

                {/* Scenes Menu Popup */}
                {isMenuOpen && (
                    <div className="scenes-menu-overlay" onClick={() => setIsMenuOpen(false)}>
                        <div className="scenes-menu" onClick={(e) => e.stopPropagation()}>
                            <button
                                className="scenes-menu-button close-button"
                                onClick={() => setIsMenuOpen(false)}
                                aria-label="Close menu"
                            >
                                <img src="/img/close.png" alt="Close" className="menu-icon" />
                            </button>
                            <div className="scenes-list">
                                {tourData.scenes.map((scene: SceneData) => (
                                    <button
                                        key={scene.id}
                                        className={`scene-item ${currentScene === scene.id ? 'active' : ''}`}
                                        onClick={() => {
                                            const switchToSceneGlobal = (window as any).switchToScene;
                                            if (switchToSceneGlobal) {
                                                switchToSceneGlobal(scene.id);
                                            }
                                            setIsMenuOpen(false);
                                        }}
                                    >
                                        <div className="scene-name">{scene.name}</div>
                                        {currentScene === scene.id && (
                                            <div className="current-indicator">Current</div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export default Explore;