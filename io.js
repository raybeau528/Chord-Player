// --- Import Dependencies ---
// *** Import state directly from main ***
import { pageDefinitions, songStructure, setPageDefinitions, setSongStructure, setSelectedPageName, updateTimeSignature, updateStyle, updateOutputMode, updateLoopingState } from './main.js';
import * as UI from './ui.js';
import * as Playback from './playback.js';
// *** Removed LOCAL_STORAGE_KEY import, constants imported directly if needed ***
// import { LOCAL_STORAGE_KEY } from './constants.js';

// --- Core Functions ---

export function getSongData() {
    // Gather all relevant state into one object
    const tempoInput = document.getElementById('tempo');
    const timeSignatureSelect = document.getElementById('time-signature');
    const styleSelect = document.getElementById('style');
    const outputModeSelect = document.getElementById('output-mode');
    const loopToggle = document.getElementById('loop-toggle');

    return {
        // *** Use imported state directly ***
        pageDefinitions: pageDefinitions,
        songStructure: songStructure,
        tempo: parseInt(tempoInput.value, 10),
        timeSignature: timeSignatureSelect.value,
        selectedStyle: styleSelect.value,
        outputMode: outputModeSelect.value,
        isLooping: loopToggle.checked
    };
}

export function applyLoadedData(data) {
    // Validate loaded data structure (basic check)
    if (!data || typeof data.pageDefinitions !== 'object' || !Array.isArray(data.songStructure)) {
        throw new Error("Invalid song data format.");
    }

    Playback.stopProgression();

    // Restore state via setters in Main or directly if mutable
    setPageDefinitions(data.pageDefinitions || { 'A': [], 'B': [], 'C': [] });
    setSongStructure(data.songStructure || []);

    // Restore settings to UI controls
    const tempoInput = document.getElementById('tempo');
    const timeSignatureSelect = document.getElementById('time-signature');
    const styleSelect = document.getElementById('style');
    const outputModeSelect = document.getElementById('output-mode');
    const loopToggle = document.getElementById('loop-toggle');

    tempoInput.value = data.tempo || 120;
    timeSignatureSelect.value = data.timeSignature || '4/4';
    styleSelect.value = data.selectedStyle || 'basic';
    outputModeSelect.value = data.outputMode || 'synth';
    loopToggle.checked = data.isLooping || false;

    // Update internal state from UI controls by calling update functions in main
    Playback.setTransportTempo(parseInt(tempoInput.value, 10));
    updateTimeSignature(); // Updates beatsPerMeasure in main
    updateStyle();
    updateOutputMode();
    updateLoopingState();

    // Reset selection and render UI via UI module
    setSelectedPageName(null); // Deselect any page after load

    UI.renderSongStructure();
    UI.renderProgression();
    UI.updatePlayStopButtons();

    UI.showMessage("Song data loaded successfully.");
}

// *** Removed saveToLocalStorage function ***

// *** Removed loadFromLocalStorage function ***
// *** Added stub for loadFromFileOnInit (called from main) ***
export function loadFromFileOnInit() {
    // This function now does nothing, as we removed auto-load from local storage
    // Kept here in case we want to add other init logic later
    console.log("Skipping load from local storage.");
    return false; // Indicate nothing was loaded automatically
}


export function saveToFile() { /* ... no changes ... */
    try { const songData = getSongData(); const jsonData = JSON.stringify(songData, null, 2); const blob = new Blob([jsonData], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'song.cbsong'; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); UI.showMessage("Song saved to file."); console.log("Saved to file:", songData); } catch (error) { console.error("Error saving to file:", error); UI.showMessage("Error saving file.", true); }
}
export function handleFileLoad(event) { /* ... no changes ... */
    const fileInput = event.target; const file = fileInput.files[0]; if (!file) { return; } const reader = new FileReader(); reader.onload = (e) => { const fileContent = e.target.result; try { const loadedData = JSON.parse(fileContent); applyLoadedData(loadedData); console.log("Loaded from file:", loadedData); } catch (error) { console.error("Error parsing loaded file:", error); UI.showMessage("Error parsing file. Invalid format?", true); } finally { fileInput.value = null; } }; reader.onerror = (e) => { console.error("Error reading file:", e); UI.showMessage("Error reading file.", true); fileInput.value = null; }; reader.readAsText(file);
}
