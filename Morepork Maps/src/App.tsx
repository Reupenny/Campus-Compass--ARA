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
      {currentPage === 'chat' && <Chat />}
      {currentPage === 'explore' && <Explore />}
      {currentPage === 'quest' && <Quest />}
      <Menu currentPage={currentPage} setCurrentPage={setCurrentPage} />
    </>
  );
}

export default App;