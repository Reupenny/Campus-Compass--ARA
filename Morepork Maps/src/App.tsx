import { useState, useEffect } from 'react';
import Marzipano from 'marzipano';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // This code runs after the component has rendered
    // Get the DOM element
    var panoElement = document.getElementById('pano');

    // Create a Marzipano viewer
    var viewer = new Marzipano.Viewer(panoElement);

    // Define the image source
    // Ensure you have a 'pano.jpg' file in your public directory
    var source = Marzipano.ImageUrlSource.fromString("pano.jpg");

    // Define the geometry
    var geometry = new Marzipano.EquirectGeometry([{ width: 4000 }]);

    // Define the initial view
    var view = new Marzipano.RectilinearView();

    // Create the scene
    var scene = viewer.createScene({
      source: source,
      geometry: geometry,
      view: view
    });

    // Display the scene
    scene.switchTo();
    // --- Start of new code to add a hotspot ---

    // 1. Create the HTML element for the hotspot
    var hotspotElement = document.createElement('div');
    hotspotElement.className = 'hotspot-info'; // Use a class for styling
    hotspotElement.innerHTML = '<h2>Info Here</h2>';

    // Optional: Add a click event listener to the hotspot
    hotspotElement.addEventListener('click', function () {
      alert('You clicked the info hotspot!');
    });

    // 2. Create the hotspot in the scene
    // Position it at a specific yaw and pitch (in radians)
    scene.hotspotContainer().createHotspot(hotspotElement, {
      yaw: 0.5,  // Adjust these values to change the position
      pitch: -0.1
    });

    // --- End of new code ---


  }, []); // The empty array ensures this effect runs only once after the initial render

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