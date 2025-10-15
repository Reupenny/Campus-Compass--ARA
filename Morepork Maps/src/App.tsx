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
      <div style={{ display: currentPage === 'chat' ? 'block' : 'none' }}>
        <Chat />
      </div>
      <div style={{ display: currentPage === 'explore' ? 'block' : 'none' }}>
        <Explore />
      </div>
      <div style={{ display: currentPage === 'quest' ? 'block' : 'none' }}>
        <Quest />
      </div>
      <Menu currentPage={currentPage} setCurrentPage={setCurrentPage} />
    </>
  );
}

export default App;