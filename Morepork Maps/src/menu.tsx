import './css/menu.css';

interface MenuProps {
    currentPage: 'chat' | 'explore' | 'quest';
    setCurrentPage: (page: 'chat' | 'explore' | 'quest') => void;
}

function Menu({ currentPage, setCurrentPage }: MenuProps) {
    const handleClick = (page: 'chat' | 'explore' | 'quest', e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        setCurrentPage(page);
    };

    return (
        <div className="menu">
            <nav>
                <a
                    href="#Chat"
                    className={currentPage === 'chat' ? 'active' : ''}
                    onClick={(e) => handleClick('chat', e)}
                >
                    CHAT
                </a>
                <a
                    href="#Explore"
                    className={currentPage === 'explore' ? 'active' : ''}
                    onClick={(e) => handleClick('explore', e)}
                >
                    EXPLORE
                </a>
                <a
                    href="#Quest"
                    className={currentPage === 'quest' ? 'active' : ''}
                    onClick={(e) => handleClick('quest', e)}
                >
                    QUEST
                </a>
            </nav>
        </div>
    );
}

export default Menu;