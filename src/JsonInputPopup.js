// JsonInputPopup.jsx
import React, { useState } from 'react';

const JsonInputPopup = ({ jsonText, onChange, onClose }) => {
    const [jsonError, setJsonError] = useState(null);
    const [username, setUsername] = useState('Swampletics');

    const handleChange = (e) => {
        e.preventDefault();
        const newJsonText = e.target.value;
        onChange(newJsonText);

        try {
            JSON.parse(newJsonText);
            setJsonError(null);
        } catch (error) {
            const errorMessage = 'Invalid JSON format. Please enter valid JSON data.';
            setJsonError(errorMessage);
        }
    };

    const handleUsernameChange = (e) => {
        setUsername(e.target.value);
    };

    const url = `https://sync.runescape.wiki/runelite/player/${username}/STANDARD`;


    return (
        <div className="popup-content">
            <button className="close-button" onClick={onClose}>
                &times;
            </button>
            <h2>How to Add Your Quest Data</h2>
            <br />
            <ol> 
                <li>
                    <div className="username-input-container">
                        <label htmlFor="username-input">Enter your RuneScape username:</label>
                        <input
                            id="username-input"
                            type="text"
                            value={username}
                            onChange={handleUsernameChange}
                            placeholder="Enter your username"
                        />
                    </div>
                    <br />
                    <p>The URL with your quest data is:</p>
                    <pre><a href={url} target="_blank">{url}</a></pre>
                    <br />
                </li>
                <li>
                    <p>Click the link above to access your WikiSync Data</p>
                    <br />
                </li>
                <li>
                    <p>Copy and paste the JSON information from the webpage and copy and paste in the box below. If it pasted correctly, you should see a green confirmation message below.</p>
                    <br />
                </li>
            </ol>
            <form>
                <textarea
                    value={jsonText}
                    onChange={handleChange}
                    placeholder="Paste your JSON here"
                    rows={10}
                    cols={50}
                />
                {jsonError && <p style={{ color: 'red' }}>{jsonError}</p>}
                {!jsonError && <p style={{ color: 'green' }}>JSON data is valid.</p>}
            </form>
        </div>
    );
};

export default JsonInputPopup;