import { useEffect, useRef, useState } from 'react';
import './css/explore.css';
import Marzipano from 'marzipano';
import { useTour } from './TourContext';
import type { SceneData } from './TourContext';

function Explore() {
    const { tourData, loading, error } = useTour();
    const initializationRef = useRef(false);
    const viewerRef = useRef<any>(null);
    const [isViewerProtected, setIsViewerProtected] = useState(false);
    const protectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const initializeViewer = async () => {
        // Don't initialize if already done, loading, has error, or no data
        if (initializationRef.current || loading || error || !tourData) return;

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

        // Clear existing viewer completely and protect against external interference
        if (viewerRef.current) {
            try {
                // Create a copy of tourData to prevent external modifications
                const tourDataCopy = JSON.parse(JSON.stringify(tourData));
                
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

            // Function to load high-res version of a scene with delay
            const loadHighResWithDelay = (sceneId: string, delay: number = 2000) => {
                setTimeout(() => {
                    if (highResLoaded[sceneId] || !viewerRef.current || !isViewerHealthy()) return; // Already loaded or viewer destroyed/corrupted

                    const sceneData = tourData.scenes.find((s: SceneData) => s.id === sceneId);
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
            tourData.scenes.forEach((sceneData: SceneData) => {
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
            const firstSceneId = tourData.scenes[0].id;
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
            }
            
            if (protectionTimeoutRef.current) {
                clearTimeout(protectionTimeoutRef.current);
            }
            
            initializationRef.current = false;
        };
    }, [tourData, loading, error]);

    return (
        <>
            <div id="pano" style={{ width: '100vw', height: '100vh' }}></div>
        </>
    );
}

export default Explore;