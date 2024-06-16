import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import QuestGraph from './QuestGraph';
import JsonInputPopup from './JsonInputPopup';

function App() {
  const [jsonText, setJsonText] = useState('');
  const [showLabels, setShowLabels] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [parsedJsonText, setParsedJsonText] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const questGraphRef = useRef(null);
  const searchInputRef = useRef(null);
  const resultRefs = useRef([]);

  useEffect(() => {
    document.title = "OSRS Quest Explorer";
  }, []);

  const handleJsonTextChange = (newJsonText) => {
    setJsonText(newJsonText);
    try {
      const parsedJson = JSON.parse(newJsonText);
      setParsedJsonText(parsedJson);
    } catch (error) {
      // Handle JSON parse error
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

  const handleSearchChange = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    setSelectedResultIndex(-1);

    if (query && questGraphRef.current) {
      const results = questGraphRef.current.getNodes().filter(node => node.id.toLowerCase().includes(query.toLowerCase()));
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleSearchSelect = (node) => {
    if (questGraphRef.current) {
      questGraphRef.current.handleNodeInteraction(node, 'click');
    }
    setSearchQuery(node.id);
    setSearchResults([]);
    setIsSearchFocused(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedResultIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % searchResults.length;
        resultRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return nextIndex;
      });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedResultIndex(prevIndex => {
        const nextIndex = (prevIndex + searchResults.length - 1) % searchResults.length;
        resultRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return nextIndex;
      });
    } else if (event.key === 'Enter' && selectedResultIndex >= 0) {
      event.preventDefault();
      handleSearchSelect(searchResults[selectedResultIndex]);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsSearchFocused(false);
    }, 100);
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
        <div className="top-right-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search quests..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              ref={searchInputRef}
              className="search-input"
            />
            {isSearchFocused && searchResults.length > 0 && (
              <ul className="search-results">
                {searchResults.map((node, index) => (
                  <li
                    key={node.id}
                    onMouseDown={() => handleSearchSelect(node)}
                    className={`search-result-item ${index === selectedResultIndex ? 'selected' : ''}`}
                    ref={el => resultRefs.current[index] = el}
                  >
                    {node.id}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="QuestGraph">
          <QuestGraph
            ref={questGraphRef}
            WikiSync={parsedJsonText}
            showLabels={showLabels}
            searchQuery={searchQuery}
            onSearchResultsChange={setSearchResults}
          />
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
