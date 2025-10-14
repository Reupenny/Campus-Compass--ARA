import { useState, useEffect } from 'react';
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
    const [count, setCount] = useState(0);

    useEffect(() => {
        const panoElement = document.getElementById('pano');
        const viewer = new Marzipano.Viewer(panoElement);

        const minZoomInVFOV = 80;
        const maxZoomOutVFOV = 100;
        const zoomLimiter = Marzipano.RectilinearView.limit.traditional(
            minZoomInVFOV * Math.PI / 180,
            maxZoomOutVFOV * Math.PI / 180
        );
        fetch('/data/tour.json')
            .then(response => response.json())
            .then((data: TourData) => {
                const scenes: { [key: string]: Marzipano.Scene } = {};

                // Create scenes with progressive loading support
                data.scenes.forEach(sceneData => {
                    // Start with low-res version if available, otherwise use main image
                    const initialImageUrl = sceneData.lowResUrl || sceneData.imageUrl;
                    
                    const scene = viewer.createScene({
                        source: Marzipano.ImageUrlSource.fromString(initialImageUrl),
                        geometry: new Marzipano.EquirectGeometry([{ width: sceneData.geometry.width }]),
                        view: new Marzipano.RectilinearView(null, zoomLimiter)
                    });
                    scenes[sceneData.id] = scene;
                    
                    // If we have a low-res version, preload the high-res version
                    if (sceneData.lowResUrl && sceneData.imageUrl !== initialImageUrl) {
                        setTimeout(() => {
                            console.log(`Preloading high-res version for scene ${sceneData.id}`);
                            const highResScene = viewer.createScene({
                                source: Marzipano.ImageUrlSource.fromString(sceneData.imageUrl),
                                geometry: new Marzipano.EquirectGeometry([{ width: sceneData.geometry.width }]),
                                view: new Marzipano.RectilinearView(null, zoomLimiter)
                            });
                            // Replace the scene with high-res version
                            scenes[sceneData.id] = highResScene;
                        }, 1000); // Load high-res after 1 second
                    }
                });

                data.scenes.forEach(sceneData => {
                    const scene = scenes[sceneData.id];
                    sceneData.hotspots.forEach(hotspotData => {
                        const hotspotElement = document.createElement('div');
                        hotspotElement.className = `hotspot-${hotspotData.type}`;

                        if (hotspotData.type === 'waypoint' && hotspotData.target) {
                            hotspotElement.innerHTML = '<img class="hotspot-icon" src="/img/link.png" alt="Hotspot Icon" />';
                            hotspotElement.innerHTML += '<div class="hotspot-data"><h5>' + hotspotData.text + '</h5></div>';
                            hotspotElement.addEventListener('click', () => {
                                scenes[hotspotData.target!].switchTo();
                            });
                        } else if (hotspotData.type === 'info') {
                            if (hotspotData.description) {
                                hotspotElement.innerHTML = '<img class="hotspot-icon" src="/img/info.png" alt="Hotspot Icon" />';
                                hotspotElement.innerHTML += '<div class="hotspot-data"><h5>' + hotspotData.text + '</h5><p>' + hotspotData.description + '</p></div>';
                            }
                            // No interaction as requested
                        }

                        scene.hotspotContainer().createHotspot(hotspotElement, {
                            yaw: hotspotData.yaw,
                            pitch: hotspotData.pitch
                        });
                    });
                });

                scenes[data.scenes[0].id].switchTo();
            });
    }, []);

    return (
        <>
            <div id="pano" style={{ width: '100vw', height: '100vh' }}></div>
        </>
    );
}

export default Explore;