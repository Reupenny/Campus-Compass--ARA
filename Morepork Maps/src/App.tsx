import { useState, useEffect } from 'react';
import './App.css';
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
  geometry: { width: number };
  hotspots: HotspotData[];
}

interface TourData {
  scenes: SceneData[];
}

function App() {
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

        data.scenes.forEach(sceneData => {
          const scene = viewer.createScene({
            source: Marzipano.ImageUrlSource.fromString(sceneData.imageUrl),
            geometry: new Marzipano.EquirectGeometry([{ width: sceneData.geometry.width }]),
            view: new Marzipano.RectilinearView(null, zoomLimiter)
          });
          scenes[sceneData.id] = scene;
        });

        data.scenes.forEach(sceneData => {
          const scene = scenes[sceneData.id];
          sceneData.hotspots.forEach(hotspotData => {
            const hotspotElement = document.createElement('div');
            hotspotElement.className = `hotspot-${hotspotData.type}`;
            hotspotElement.innerHTML = hotspotData.text;

            if (hotspotData.type === 'waypoint' && hotspotData.target) {
              hotspotElement.addEventListener('click', () => {
                scenes[hotspotData.target!].switchTo();
              });
            } else if (hotspotData.type === 'info') {
              if (hotspotData.description) {
                hotspotElement.innerHTML += hotspotData.description;
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

export default App;