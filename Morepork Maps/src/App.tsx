import { useState } from 'react';
import './css/App.css';
import Menu from './menu.tsx';
import Chat from './chat';
import Explore from './explore';
import Quest from './quest';
import { TourProvider } from './TourContext';

function App() {
  const [currentPage, setCurrentPage] = useState<'chat' | 'explore' | 'quest'>('chat');
  const [isExploreMenuOpen, setIsExploreMenuOpen] = useState(false);

  return (
    <TourProvider>
      {/* Chat and Explore are always loaded (except when on Quest) to preserve state */}
      {currentPage !== 'quest' && (
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
            <Explore onMenuStateChange={setIsExploreMenuOpen} />
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

      <div style={{ display: isExploreMenuOpen ? 'none' : 'block' }}>
        <Menu currentPage={currentPage} setCurrentPage={setCurrentPage} />
      </div>
    </TourProvider>
  );
}

export default App;