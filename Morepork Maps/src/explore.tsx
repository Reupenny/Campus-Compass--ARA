import { useState, useEffect, useRef } from 'react';
import './css/explore.css';
import Marzipano from 'marzipano';

interface HotspotData {
    type: string;
    pitch: number;
    yaw: number;
    text: string;
    target?: string;
    description?: string;
}

interface SceneData {
    id: string;
    name: string;
    imageUrl: string;
    lowResUrl?: string; // Low-res version for fast loading
    geometry: { width: number };
    hotspots: HotspotData[];
}

interface TourData {
    scenes: SceneData[];
}

function Explore() {
    const [viewer, setViewer] = useState<any>(null);
    const tourDataRef = useRef<TourData | null>(null);
    const initializationRef = useRef(false);
    const viewerRef = useRef<any>(null);

    // Function to load tour data with caching and isolation from chat.js
    const loadTourData = async (): Promise<TourData> => {
        if (tourDataRef.current) {
            return tourDataRef.current;
        }

        try {
            // Use a unique cache buster to avoid conflicts with chat.js
            const response = await fetch('/data/tour.json?explore=' + Date.now());
            const data = await response.json();
            tourDataRef.current = data;
            return data;
        } catch (error) {
            console.error('Error loading tour data:', error);
            throw error;
        }
    };

    const initializeViewer = async () => {
        if (initializationRef.current) return;

        const panoElement = document.getElementById('pano');
        if (!panoElement) {
            setTimeout(initializeViewer, 100);
            return;
        }

        // Check if element is actually visible and has dimensions
        const rect = panoElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            setTimeout(initializeViewer, 100);
            return;
        }

        // Clear existing viewer completely
        if (viewerRef.current) {
            try {
                panoElement.innerHTML = '';
                viewerRef.current = null;
                setViewer(null);
            } catch (error) {
                console.warn('Error clearing viewer:', error);
            }
        }

        try {
            initializationRef.current = true;
            console.log('Creating new Marzipano viewer...');

            const newViewer = new Marzipano.Viewer(panoElement);
            viewerRef.current = newViewer;
            setViewer(newViewer);

            const minZoomInVFOV = 80;
            const maxZoomOutVFOV = 100;
            const zoomLimiter = Marzipano.RectilinearView.limit.traditional(
                minZoomInVFOV * Math.PI / 180,
                maxZoomOutVFOV * Math.PI / 180
            );

            const data = await loadTourData();

            const scenes: { [key: string]: any } = {};
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

            // Helper function to create hotspots for a scene
            const addHotspotsToScene = (scene: any, sceneData: any) => {
                sceneData.hotspots.forEach((hotspotData: any) => {
                    const hotspotElement = document.createElement('div');
                    hotspotElement.className = `hotspot-${hotspotData.type}`;

                    if (hotspotData.type === 'waypoint' && hotspotData.target) {
                        hotspotElement.innerHTML = '<img class="hotspot-icon" src="/img/link.png" alt="Hotspot Icon" />';
                        hotspotElement.innerHTML += '<div class="hotspot-data"><h5>' + hotspotData.text + '</h5></div>';
                        hotspotElement.addEventListener('click', () => {
                            if (scenes[hotspotData.target!]) {
                                scenes[hotspotData.target!].switchTo();
                                // Load high-res for the new scene after a short delay
                                loadHighResWithDelay(hotspotData.target!, 1000);
                            }
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

            // Function to load high-res version of a scene with delay
            const loadHighResWithDelay = (sceneId: string, delay: number = 2000) => {
                setTimeout(() => {
                    if (highResLoaded[sceneId] || !viewerRef.current) return; // Already loaded or viewer destroyed

                    const sceneData = data.scenes.find(s => s.id === sceneId);
                    if (!sceneData) return;

                    try {
                        console.log(`Loading high-res for scene ${sceneId}`);

                        // Check if this scene is currently active before we start
                        const currentScene = viewerRef.current.scene();
                        const isCurrentlyActive = currentScene === scenes[sceneId];

                        // Pre-load the high-res image to ensure it's ready
                        const highResImg = new Image();
                        highResImg.onload = () => {
                            if (!viewerRef.current) return; // Viewer was destroyed

                            console.log(`High-res image loaded for scene ${sceneId}, creating scene`);

                            const highResScene = viewerRef.current.createScene({
                                source: Marzipano.ImageUrlSource.fromString(sceneData.imageUrl),
                                geometry: new Marzipano.EquirectGeometry([{ width: sceneData.geometry.width }]),
                                view: new Marzipano.RectilinearView(undefined, zoomLimiter)
                            });

                            // Replace the scene reference
                            scenes[sceneId] = highResScene;
                            highResLoaded[sceneId] = true;

                            // Add hotspots to high-res scene
                            addHotspotsToScene(highResScene, sceneData);

                            // If this scene was active when we started loading, switch to high-res after ensuring it's fully rendered
                            if (isCurrentlyActive && viewerRef.current) {
                                // Use requestAnimationFrame to ensure scene is fully rendered before switching
                                const waitForSceneReady = () => {
                                    if (!viewerRef.current) return; // Viewer was destroyed

                                    // Check if scene is ready by testing if we can get its view
                                    try {
                                        highResScene.view();
                                        // Scene is ready, now check if still active and switch
                                        const stillActive = viewerRef.current.scene() === scenes[sceneId] || viewerRef.current.scene() === currentScene;
                                        if (stillActive) {
                                            console.log(`Switching to high-res for active scene ${sceneId}`);
                                            highResScene.switchTo();
                                        }
                                    } catch (error) {
                                        // Scene not ready yet, wait another frame
                                        requestAnimationFrame(waitForSceneReady);
                                    }
                                };

                                // Start checking for readiness
                                requestAnimationFrame(waitForSceneReady);
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
            data.scenes.forEach(sceneData => {
                const lowResUrl = getLowResUrl(sceneData.imageUrl);

                const scene = newViewer.createScene({
                    source: Marzipano.ImageUrlSource.fromString(lowResUrl),
                    geometry: new Marzipano.EquirectGeometry([{ width: sceneData.geometry.width }]),
                    view: new Marzipano.RectilinearView(undefined, zoomLimiter)
                });

                scenes[sceneData.id] = scene;
                highResLoaded[sceneData.id] = false;

                // Add hotspots to low-res scene
                addHotspotsToScene(scene, sceneData);
            });

            // Start with first scene (low-res) and upgrade to high-res after delay
            const firstSceneId = data.scenes[0].id;
            scenes[firstSceneId].switchTo();
            loadHighResWithDelay(firstSceneId, 1500); // Upgrade to high-res after 1.5 seconds

        } catch (error) {
            console.error('Error initializing viewer:', error);
            initializationRef.current = false;
            // Retry after a delay
            setTimeout(initializeViewer, 1000);
        }
    };

    useEffect(() => {
        initializeViewer();

        // Cleanup function
        return () => {
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
                setViewer(null);
            }
            initializationRef.current = false;
            tourDataRef.current = null; // Clear cached data
        };
    }, []);

    return (
        <>
            <div id="pano" style={{ width: '100vw', height: '100vh' }}></div>
        </>
    );
}

export default Explore;