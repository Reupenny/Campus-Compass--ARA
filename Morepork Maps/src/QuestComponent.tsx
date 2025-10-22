import { useState, useEffect } from 'react';

function QuestComponent() {
    const [questData, setQuestData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [started, setStarted] = useState(false);
    const [time, setTime] = useState(0);
    const [answers, setAnswers] = useState<string[]>([]);
    const [completed, setCompleted] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    // Fetch quest data
    useEffect(() => {
        fetch('/data/quest.json')
            .then(res => res.json())
            .then(data => {
                setQuestData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to load quest data:', err);
                setLoading(false);
            });
    }, []);

    // Load history
    useEffect(() => {
        const savedHistory = localStorage.getItem('questHistory');
        if (savedHistory) {
            setHistory(JSON.parse(savedHistory));
        }
    }, []);

    // Load from localStorage (only if not completed)
    useEffect(() => {
        const saved = localStorage.getItem('questProgress');
        if (saved) {
            const { index, ans, t, comp } = JSON.parse(saved);
            if (!comp) {
                setCurrentIndex(index);
                setAnswers(ans);
                setTime(t);
                setStarted(true);
            }
        }
    }, []);

    // Timer
    useEffect(() => {
        if (started && !completed) {
            const interval = setInterval(() => setTime(t => t + 1), 1000);
            return () => clearInterval(interval);
        }
    }, [started, completed]);

    // Save progress only on completion
    useEffect(() => {
        if (completed) {
            const quests = Object.keys(questData);
            const correctAnswers = answers.filter((ans, i) => ans === questData[quests[i]].answer).length;
            const newEntry = {
                time,
                correct: correctAnswers,
                total: quests.length - 1,
                date: new Date().toISOString()
            };
            const updatedHistory = [...history, newEntry];
            if (updatedHistory.length > 5) {
                updatedHistory.splice(0, updatedHistory.length - 5);
            }
            setHistory(updatedHistory);
            localStorage.setItem('questHistory', JSON.stringify(updatedHistory));
            localStorage.removeItem('questProgress'); // Remove progress after completion
        }
    }, [completed]);

    if (loading) {
        return <div className="quest-container">Loading quest...</div>;
    }

    const quests = Object.keys(questData);
    const currentQuest = questData[quests[currentIndex]];

    const handleStart = () => {
        setStarted(true);
        setTime(0);
        setCurrentIndex(0);
        setAnswers([]);
        setCompleted(false);
    };

    const handleAnswer = (answer: string) => {
        setAnswers(prev => [...prev, answer]);
        if (currentIndex < quests.length - 1) {
            setCurrentIndex(i => i + 1);
        } else {
            setCompleted(true);
        }
    };

    const handleReset = () => {
        localStorage.removeItem('questProgress');
        setCurrentIndex(0);
        setAnswers([]);
        setTime(0);
        setCompleted(false);
        setStarted(false);
        setIsMinimized(false);
    };

    const toggleMinimize = () => {
        setIsMinimized(!isMinimized);
    };

    if (!started) {
        return (
            <>
                <button onClick={toggleMinimize} className="minimize-button minimize-quest">
                    {isMinimized ? '+' : '-'}
                </button>
                {!isMinimized && (
                    <div className="quest-container">
                        <h2>Campus Quest</h2>
                        <p>Explore Ara Institute of Canterbury and answer questions along the way!</p>
                        {history.length > 0 && (
                            <div className="quest-history">
                                <h3>Quest History</h3>
                                <ul>
                                    {history.map((entry, i) => (
                                        <li key={i}>
                                            {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {entry.correct}/{entry.total} correct - {Math.floor(entry.time / 60)}:{(entry.time % 60).toString().padStart(2, '0')} mins
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {!history.length && (
                            <div className="quest-history">
                                <br />
                                <p>To hide the quest while you hunt for the answer, press the minimize button in the top left corner.</p>
                            </div>
                        )}
                        <button onClick={handleStart} data-umami-event="Start Quest" className="start-button">START QUEST</button>
                    </div>
                )}
                {isMinimized && (
                    <></>
                )}

            </>
        );
    }

    if (completed) {
        const correctAnswers = answers.filter((ans, i) => ans === questData[quests[i]].answer).length;
        return (
            <div className="quest-container">
                {!isMinimized && (
                    <>
                        <h2>Quest Completed!</h2>
                        <p>Time taken: {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}</p>
                        <p>Correct answers: {correctAnswers} / {quests.length - 1}</p>
                        <div className="completion-message">
                            <div>
                                <img width={150} src="img/ace_image.webp" alt="A.C.E. Image" /></div>
                            <div><p>Huzzah, valiant adventurer! You have conquered the quest, proving your mettle and mastery of the ARA campus. May your newfound knowledge guide you on future escapades – congratulations on a quest well-done!</p>
                                <button onClick={handleReset} className="option-button">START AGAIN</button></div>
                        </div>

                    </>
                )}
                {isMinimized && (
                    <div className="quest-timer">Time: {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}</div>
                )}
            </div>
        );
    }

    return (
        <>

            <button onClick={toggleMinimize} className="minimize-button minimize-quest">
                {isMinimized ? '+' : '-'}
            </button>
            {!isMinimized && (
                <>
                    <div className="quest-container">
                        <div className="quest-timer">Time: {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}</div>
                        <h3>{quests[currentIndex]}</h3>
                        <button onClick={handleReset} className="reset-button">RESET</button>
                        <p>{currentQuest.question}</p>
                        <div className="quest-options">
                            {currentQuest.options.length > 0 ? (
                                currentQuest.options.map((opt: string, i: number) => (
                                    <button key={i} onClick={() => handleAnswer(opt)} className="option-button">{opt}</button>
                                ))
                            ) : (
                                <button onClick={() => handleAnswer('')} className="next-button">NEXT</button>
                            )}
                        </div>
                        <div className="ace-looking-container">
                            <img className='ace-looking' width={150} src="img/ace_looking.webp" alt="A.C.E. Looking" />
                        </div>
                    </div>
                </>
            )}
            {isMinimized && (
                <div className="quest-timer-minimised">Time: {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}</div>
            )}
        </>
    );
}

export default QuestComponent;