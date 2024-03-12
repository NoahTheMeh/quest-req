// App.jsx
import React, { useState, useEffect } from 'react';
import './App.css';
import QuestGraph from './QuestGraph';
import JsonInputPopup from './JsonInputPopup';

function App() {
  const [jsonText, setJsonText] = useState('');
  const [showLabels, setShowLabels] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [parsedJsonText, setParsedJsonText] = useState({});

  useEffect(() => {
    document.title = "OSRS Quest Explorer";
  }, []);

  const handleJsonTextChange = (newJsonText) => {
    setJsonText(newJsonText);
    try {
      const parsedJson = JSON.parse(newJsonText);
      setParsedJsonText(parsedJson);
    } catch (error) {
    }
  };

  const togglePopup = () => {
    setIsPopupOpen(!isPopupOpen);
  };

  const handlePopupClose = (event) => {
    if (event.target.classList.contains('popup')) {
      setIsPopupOpen(false);
    }
  };

  return (
    <div className="App">
      <div className="graph-container">
        <div className="top-left-controls">
          <div>
            <label>
              <input type="checkbox" checked={showLabels} onChange={() => setShowLabels(!showLabels)} />
              Show Labels
            </label>
          </div>
          <div>
            <button onClick={togglePopup}>Load My Quest Data</button>
          </div>
        </div>
        <div className="QuestGraph">
          <QuestGraph WikiSync={parsedJsonText} showLabels={showLabels} />
        </div>
      </div>
      {isPopupOpen && (
        <div className="popup" onClick={handlePopupClose}>
          <JsonInputPopup
            jsonText={jsonText}
            onClose={togglePopup}
            onChange={handleJsonTextChange}
          />
        </div>
      )}
    </div>
  );
}

export default App;