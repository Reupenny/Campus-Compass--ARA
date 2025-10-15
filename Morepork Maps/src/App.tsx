import { useState } from 'react';
import './css/App.css';
import Menu from './menu.tsx';
import Chat from './chat';
import Explore from './explore';
import Quest from './quest';

function App() {
  const [currentPage, setCurrentPage] = useState<'chat' | 'explore' | 'quest'>('chat');

  return (
    <>
      {/* Chat and Explore are always loaded together to preserve state */}
      {(currentPage === 'chat' || currentPage === 'explore') && (
        <>
          {/* Chat preserves state when hidden */}
          <div style={{ 
            display: currentPage === 'chat' ? 'block' : 'none',
            width: '100vw',
            height: '100vh'
          }}>
            <Chat />
          </div>
          
          {/* Explore preserves state when hidden */}
          <div style={{ 
            display: currentPage === 'explore' ? 'block' : 'none',
            width: '100vw',
            height: '100vh'
          }}>
            <Explore />
          </div>
        </>
      )}
      
      {/* Quest reloads on each visit to prevent cheating */}
      {currentPage === 'quest' && (
        <div style={{ 
          width: '100vw',
          height: '100vh'
        }}>
          <Quest />
        </div>
      )}
      
      <Menu currentPage={currentPage} setCurrentPage={setCurrentPage} />
    </>
  );
}

export default App;