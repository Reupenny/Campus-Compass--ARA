import { useEffect, useRef, useState } from 'react';
import './css/explore.css';
import './css/quest.css';
import Marzipano from 'marzipano';
import { useTour } from './TourContext';
import type { SceneData } from './TourContext';
import QuestComponent from './QuestComponent';

function Quest() {
    const { tourData, loading, error } = useTour();
    const initializationRef = useRef(false);
    const viewerRef = useRef<any>(null);
    const protectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [currentScene, setCurrentScene] = useState<string>('');
    // Show a centered look-around hint until the user swipes/drags to look around
    const [showLookHint, setShowLookHint] = useState(true);
    const pointerDownRef = useRef(false);
    const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

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

            const newViewer = new Marzipano.Viewer(panoElement);
            viewerRef.current = newViewer;

            // Set up viewer protection timeout
            if (protectionTimeoutRef.current) {
                clearTimeout(protectionTimeoutRef.current);
            }
            protectionTimeoutRef.current = setTimeout(() => {
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
                            hotspotElement.innerHTML += '<div class="hotspot-data"><h5>' + hotspotData.text + '</h5><p>' + hotspotData.description + '</p><a class="hotspot-link" href="' + hotspotData.url + '" target="_blank">More info</a></div>';
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
                                    geometry: new Marzipano.EquirectGeometry([{ width: sceneData.geometry.width }]),
                                    view: new Marzipano.RectilinearView(sceneData.defaultView, zoomLimiter)
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
                    view: new Marzipano.RectilinearView(sceneData.defaultView, zoomLimiter)
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

    // Attach pointer/touch listeners to the pano element so we can hide the look-around hint
    useEffect(() => {
        const panoElement = document.getElementById('pano');
        if (!panoElement) return;

        const THRESHOLD = 10; // pixels moved to consider a swipe/drag

        const onDown = (e: any) => {
            pointerDownRef.current = true;
            const cx = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
            const cy = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;
            pointerStartRef.current = { x: cx, y: cy };
        };

        const onMove = (e: any) => {
            if (!pointerDownRef.current || !pointerStartRef.current) return;
            const cx = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
            const cy = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;
            const dx = Math.abs(cx - pointerStartRef.current.x);
            const dy = Math.abs(cy - pointerStartRef.current.y);
            if (dx > THRESHOLD || dy > THRESHOLD) {
                setShowLookHint(false);
                pointerDownRef.current = false;
                pointerStartRef.current = null;
            }
        };

        const onUp = () => {
            pointerDownRef.current = false;
            pointerStartRef.current = null;
        };

        const onKey = () => {
            // If user interacts with keyboard, hide the hint as well
            setShowLookHint(false);
        };

        panoElement.addEventListener('pointerdown', onDown);
        panoElement.addEventListener('pointermove', onMove);
        panoElement.addEventListener('pointerup', onUp);
        panoElement.addEventListener('touchstart', onDown, { passive: true });
        panoElement.addEventListener('touchmove', onMove, { passive: true });
        window.addEventListener('keyup', onKey);

        return () => {
            panoElement.removeEventListener('pointerdown', onDown);
            panoElement.removeEventListener('pointermove', onMove);
            panoElement.removeEventListener('pointerup', onUp);
            panoElement.removeEventListener('touchstart', onDown as any);
            panoElement.removeEventListener('touchmove', onMove as any);
            window.removeEventListener('keyup', onKey);
        };
    }, [tourData]);

    // Handle loading states
    if (loading) return <div className="loading-container">Loading tour...</div>;
    if (error) return <div className="error-container">Error: {error}</div>;
    if (!tourData) return <div className="error-container">No tour data available</div>;

    return (
        <>
            <QuestComponent />
            <div className="tour-header">
                <p className="tour-title">
                    {currentScene ?
                        tourData.scenes.find(scene => scene.id === currentScene)?.name || 'Unknown Scene'
                        : 'Loading...'}
                </p>
            </div>
            <div id="pano" className="pano-container">
            </div>
            {showLookHint && (
                <div className="look-hint-overlay" role="note" aria-hidden={!showLookHint}>
                    <div className="look-hint">Swipe to look around</div>
                </div>
            )}
        </>
    );
}

export default Quest;