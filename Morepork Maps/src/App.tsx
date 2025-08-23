import { useState, useEffect } from 'react';
import './App.css';
import Marzipano from 'marzipano';

function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // This code runs after the component has rendered
    var panoElement = document.getElementById('pano');

    // Create a Marzipano viewer
    var viewer = new Marzipano.Viewer(panoElement);

    // --- Define the zoom limiter once for both scenes ---
    // Set a wider, more noticeable zoom range
    var minZoomInVFOV = 40; // Example: Zoom in to a 40-degree vertical field of view
    var maxZoomOutVFOV = 120; // Example: Zoom out to a 120-degree vertical field of view

    var zoomLimiter = Marzipano.RectilinearView.limit.traditional(
      minZoomInVFOV * Math.PI / 180, // Convert degrees to radians
      maxZoomOutVFOV * Math.PI / 180  // Convert degrees to radians
    );
    // --- Create a separate scene for each image ---

    // Scene 1: Main Panorama
    var scene1 = viewer.createScene({
      source: Marzipano.ImageUrlSource.fromString("pano1.jpg"),
      geometry: new Marzipano.EquirectGeometry([{ width: 4000 }]),
      view: new Marzipano.RectilinearView(null, zoomLimiter) // Apply the limiter here
    });

    // Scene 2: Second Panorama
    var scene2 = viewer.createScene({
      source: Marzipano.ImageUrlSource.fromString("pano2.jpg"),
      geometry: new Marzipano.EquirectGeometry([{ width: 4000 }]),
      view: new Marzipano.RectilinearView(null, zoomLimiter) // Apply the limiter here
    });

    // --- Add the info hotspot to Scene 1 ---
    var infoHotspotElement = document.createElement('div');
    infoHotspotElement.className = 'hotspot-info';
    infoHotspotElement.innerHTML = '<h2>Info Here</h2>';
    infoHotspotElement.addEventListener('click', function () {
      alert('You clicked the info hotspot!');
    });
    scene1.hotspotContainer().createHotspot(infoHotspotElement, {
      yaw: 0.5,
      pitch: -0.1
    });

    // --- Add a WAYPOINT to Scene 1 to go to Scene 2 ---
    var waypoint1Element = document.createElement('div');
    waypoint1Element.className = 'hotspot-waypoint';
    waypoint1Element.innerHTML = '<h2>Go to Scene 2</h2>';
    waypoint1Element.addEventListener('click', function () {
      scene2.switchTo(); // The key to switching scenes!
    });
    scene1.hotspotContainer().createHotspot(waypoint1Element, {
      yaw: 1.5, // Adjust this position
      pitch: 0
    });

    // --- Add a WAYPOINT to Scene 2 to go back to Scene 1 ---
    var waypoint2Element = document.createElement('div');
    waypoint2Element.className = 'hotspot-waypoint';
    waypoint2Element.innerHTML = '<h2>Go Back</h2>';
    waypoint2Element.addEventListener('click', function () {
      scene1.switchTo(); // The key to switching scenes!
    });
    scene2.hotspotContainer().createHotspot(waypoint2Element, {
      yaw: 0.1, // Adjust this position
      pitch: 0
    });

    // Start with the first scene displayed
    scene1.switchTo();

  }, []);

  return (
    <>
      <div id="pano" style={{ width: '100vw', height: '100vh' }}></div>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
    </>
  );
}

export default App;