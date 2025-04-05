// --- Import Dependencies ---
import { NOTES, TYPES, DEFAULT_TYPE, BEAT_WIDTH_PX } from './constants.js';
// *** Import state directly from main ***
import { pageDefinitions, songStructure, selectedPageName, selectedNote, selectedType, setSelectedPageName } from './main.js';
import * as Edit from './edit.js';
// *** Import specific getters from Playback ***
import { getCurrentlyPlayingPageIndex, getSelectedMidiOutputName, isTransportPlaying, getSelectedMidiOutput } from './playback.js';

// --- DOM Element References ---
let noteButtonsContainer, typeButtonsContainer, selectedChordDisplay,
    chordProgressionContainer, chordProgressionTitle, chordProgressionPlaceholder,
    clearPageButton, playButton, stopButton, midiStatusIndicator, messageBox,
    songStructureArea, addChordButton;

// --- Initialization ---
export function initializeUI() { /* ... (Assign elements as before) ... */
    console.log("Initializing UI..."); noteButtonsContainer = document.getElementById('note-buttons'); typeButtonsContainer = document.getElementById('type-buttons'); selectedChordDisplay = document.getElementById('selected-chord-display'); chordProgressionContainer = document.getElementById('chord-progression'); chordProgressionTitle = document.getElementById('chord-progression-title'); chordProgressionPlaceholder = document.getElementById('chord-progression-placeholder'); clearPageButton = document.getElementById('clear-page-button'); playButton = document.getElementById('play-button'); stopButton = document.getElementById('stop-button'); midiStatusIndicator = document.getElementById('midi-status'); messageBox = document.getElementById('message-box'); songStructureArea = document.getElementById('song-structure-area'); addChordButton = document.getElementById('add-chord-button'); if (!noteButtonsContainer || !typeButtonsContainer || !selectedChordDisplay || !chordProgressionContainer || !songStructureArea || !addChordButton || !playButton || !stopButton || !clearPageButton || !midiStatusIndicator || !messageBox || !chordProgressionTitle || !chordProgressionPlaceholder) { console.error("UI Initialization failed: Critical DOM elements not found."); showMessage("Error initializing UI.", true); return false; } createButtons(); console.log("UI Initialized."); return true;
}

// --- UI Creation ---
function createButtons() { /* ... (No changes needed here, listeners call Edit functions) ... */
    noteButtonsContainer.innerHTML = ''; typeButtonsContainer.innerHTML = ''; NOTES.forEach(note => { const button = document.createElement('button'); button.textContent = note; button.dataset.note = note; button.className = 'bg-gray-600 hover:bg-blue-500 text-white font-medium py-2 px-1 rounded-md text-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400'; button.onclick = () => Edit.selectNote(note, button); button.addEventListener('dblclick', () => Edit.handleNoteDoubleClick(note, button)); noteButtonsContainer.appendChild(button); }); Object.entries(TYPES).forEach(([key, value]) => { const button = document.createElement('button'); button.textContent = key; button.dataset.type = value; button.dataset.typeName = key; button.className = 'bg-gray-600 hover:bg-blue-500 text-white font-medium py-2 px-1 rounded-md text-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400'; button.onclick = () => Edit.selectType(value, key, button); button.addEventListener('dblclick', () => Edit.handleTypeDoubleClick(value, key, button)); typeButtonsContainer.appendChild(button); });
}

// --- Rendering Functions ---

export function renderSongStructure() {
    songStructureArea.innerHTML = '';
    // *** Use imported state directly ***
    const structure = songStructure;
    const selectedName = selectedPageName;
    const playingIndex = getCurrentlyPlayingPageIndex();

    if (structure.length === 0) { /* ... (placeholder logic unchanged) ... */ const placeholder = document.createElement('span'); placeholder.className = 'text-gray-500 italic text-sm mx-auto'; placeholder.textContent = 'Add pages (A, B, C) to build the song structure'; songStructureArea.appendChild(placeholder); return; }

    let playingPageBlock = null;
    structure.forEach((pageName, index) => { /* ... (Uses imported Edit functions for listeners) ... */ const pageBlock = document.createElement('div'); pageBlock.className = 'page-block'; pageBlock.textContent = pageName; pageBlock.dataset.pageName = pageName; pageBlock.dataset.index = index; pageBlock.title = `Select Page "${pageName}" Definition`; if (pageName === selectedName) { pageBlock.classList.add('selected-page'); } if (index === playingIndex) { pageBlock.classList.add('playing-page'); playingPageBlock = pageBlock; } pageBlock.addEventListener('click', () => Edit.selectPage(pageName, index)); const removeBtn = document.createElement('button'); removeBtn.innerHTML = '&times;'; removeBtn.className = 'remove-page-button'; removeBtn.title = `Remove Page ${pageName} from structure`; removeBtn.onclick = (e) => { e.stopPropagation(); Edit.removePageFromStructure(index); }; pageBlock.appendChild(removeBtn); songStructureArea.appendChild(pageBlock); });
    if (playingPageBlock) { playingPageBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }); }
}

export function renderProgression() {
    chordProgressionContainer.innerHTML = '';
    chordProgressionPlaceholder.style.display = 'none';
    // *** Use imported state directly ***
    const pageName = selectedPageName;

    if (!pageName || !pageDefinitions.hasOwnProperty(pageName)) { /* ... (logic unchanged) ... */ chordProgressionTitle.textContent = "Chord Progression (No Page Selected)"; chordProgressionPlaceholder.style.display = 'block'; clearPageButton.disabled = true; Edit.updateAddButtonState(); updatePlayStopButtons(); return; }

    const chordsToShow = pageDefinitions[pageName];
    chordProgressionTitle.textContent = `Chord Progression (Page "${pageName}")`;
    clearPageButton.disabled = chordsToShow.length === 0;
    Edit.updateAddButtonState();

    if (chordsToShow.length === 0) { /* ... (placeholder logic unchanged) ... */ const placeholder = document.createElement('span'); placeholder.className = 'text-gray-500 italic self-center mx-auto'; placeholder.textContent = `Page "${pageName}" is empty. Add chords using the palette.`; chordProgressionContainer.appendChild(placeholder); updatePlayStopButtons(); return; }

    updatePlayStopButtons();

    chordsToShow.forEach((chord, index) => { /* ... (Uses imported Edit functions for listeners) ... */ const chordBlock = document.createElement('div'); chordBlock.id = chord.id; chordBlock.dataset.chordId = chord.id; chordBlock.className = `chord-block bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 rounded-lg shadow-md h-[80px] flex flex-col justify-center items-center cursor-grab relative transition-colors duration-200`; chordBlock.draggable = true; chordBlock.dataset.index = index; chordBlock.style.width = `${chord.duration * BEAT_WIDTH_PX}px`; const chordText = document.createElement('span'); chordText.className = 'text-2xl font-bold font-mono pointer-events-none'; chordText.textContent = chord.typeName === null ? chord.note : `${chord.note}${chord.typeName}`; chordBlock.appendChild(chordText); const durationDisplay = document.createElement('span'); durationDisplay.className = 'chord-duration-display pointer-events-none'; durationDisplay.textContent = `${chord.duration}b`; chordBlock.appendChild(durationDisplay); const removeBtn = document.createElement('button'); removeBtn.innerHTML = '&times;'; removeBtn.className = 'absolute top-1 right-2 text-lg text-purple-200 hover:text-white font-bold leading-none focus:outline-none z-10'; removeBtn.title = "Remove Chord"; removeBtn.onclick = (e) => { e.stopPropagation(); Edit.removeChord(chord.id); }; chordBlock.appendChild(removeBtn); const resizeHandle = document.createElement('div'); resizeHandle.className = 'resize-handle'; resizeHandle.title = "Resize Duration"; resizeHandle.addEventListener('mousedown', Edit.handleResizeMouseDown); chordBlock.appendChild(resizeHandle); const playingIndicator = document.createElement('div'); playingIndicator.className = 'playing-indicator absolute bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-yellow-400 rounded-full opacity-0 transition-opacity duration-150 pointer-events-none'; chordBlock.appendChild(playingIndicator); chordProgressionContainer.appendChild(chordBlock); });
}

// --- UI Update Functions ---

export function updateSelectedChordDisplay() { /* ... (Uses imported state) ... */
     const displayEl = selectedChordDisplay.querySelector('span'); const note = selectedNote; const type = selectedType; if (note && type) { displayEl.textContent = type.value === '' ? note : `${note}${type.name}`; displayEl.classList.remove('text-gray-500'); } else if (note) { displayEl.textContent = `${note}...`; displayEl.classList.remove('text-gray-500'); } else { displayEl.textContent = '--'; displayEl.classList.add('text-gray-500'); }
}
export function highlightPlayingChord(chordId) { /* ... no changes ... */
    clearHighlights(); const chordBlock = document.getElementById(chordId); if (chordBlock) { const indicator = chordBlock.querySelector('.playing-indicator'); if(indicator) indicator.style.opacity = '1'; }
}
export function clearHighlights(exceptId = null) { /* ... no changes ... */
    document.querySelectorAll('.chord-block').forEach(block => { if (block.id !== exceptId) { const indicator = block.querySelector('.playing-indicator'); if(indicator) indicator.style.opacity = '0'; } });
}
export function highlightPlayingPage(pageIndex) { /* ... no changes ... */
    document.querySelectorAll('#song-structure-area .page-block').forEach((block, index) => { if (index === pageIndex) { block.classList.add('playing-page'); } else { block.classList.remove('playing-page'); } });
}
export function updatePlayStopButtons() { /* ... (Uses imported state/getters) ... */
    const isPlaying = isTransportPlaying(); playButton.disabled = isPlaying || songStructure.length === 0; stopButton.disabled = !isPlaying; if (isPlaying) { playButton.innerHTML = `<span class="lucide mr-1">&#xea16;</span> Playing...`; } else { playButton.innerHTML = `<span class="lucide mr-1">&#xea4a;</span> Play`; }
}
export function updateMidiStatus(status) { /* ... (Uses imported getter) ... */
     midiStatusIndicator.classList.remove('bg-red-500', 'bg-yellow-500', 'bg-green-500', 'active'); midiStatusIndicator.style.animation = 'none'; let title = ''; let colorClass = 'bg-red-500'; const midiOutputName = getSelectedMidiOutputName(); switch(status) { case 'unavailable': title = 'MIDI Status: Unavailable/Denied'; colorClass = 'bg-red-500'; break; case 'available': title = 'MIDI Status: Available, No Output Selected'; colorClass = 'bg-yellow-500'; break; case 'selected': title = `MIDI Status: Output Selected (${midiOutputName})`; colorClass = 'bg-green-500'; break; case 'active': title = `MIDI Status: Playing via ${midiOutputName}`; colorClass = 'bg-green-500'; midiStatusIndicator.classList.add('active'); void midiStatusIndicator.offsetWidth; midiStatusIndicator.style.animation = 'blink 1.5s linear infinite'; break; } midiStatusIndicator.classList.add(colorClass); midiStatusIndicator.title = title;
}
export function showMessage(message, isError = false) { /* ... no changes ... */
    if (!messageBox) return; messageBox.textContent = message; messageBox.className = `mt-2 text-center text-sm h-5 ${isError ? 'text-red-400' : 'text-yellow-400'}`; setTimeout(() => { if (messageBox.textContent === message) { messageBox.textContent = ''; } }, 3000);
}
export function clearDragOverStyles() { /* ... no changes ... */
    const container = document.getElementById('chord-progression'); if (container) { container.classList.remove('drag-over'); container.querySelectorAll('.chord-block').forEach(el => { el.classList.remove('drag-over-before', 'drag-over-after'); }); }
}
export function getDragAfterElement(container, x) { /* ... no changes ... */
    const draggableElements = [...container.querySelectorAll('.chord-block:not(.dragging)')]; return draggableElements.reduce((closest, child) => { const box = child.getBoundingClientRect(); const offset = x - box.left - box.width / 2; if (offset < 0 && offset > closest.offset) { return { offset: offset, element: child }; } else { return closest; } }, { offset: Number.NEGATIVE_INFINITY }).element;
}
