// --- DOM Elements ---
let noteButtonsContainer, typeButtonsContainer, addChordButton, selectedChordDisplay,
    chordProgressionContainer, chordProgressionTitle, chordProgressionPlaceholder,
    clearPageButton, playButton, stopButton, loopToggle, tempoInput,
    timeSignatureSelect, styleSelect, outputModeSelect, midiOutputSelect,
    midiStatusIndicator, messageBox, songStructureArea,
    newPageNameInput, addNewPageButton,
    saveFileButton, loadFileButton, fileInput,
    contextMenu, contextTargetElement;

// --- State ---
let selectedNote = null;
let selectedType = null;
let pageDefinitions = {};
let songStructure = [];
let selectedPageName = null;
let audioContextStarted = false;

// Playback State
let currentlyPlayingPageIndex = -1;
let currentLoopIteration = 0;
let currentChordIndexInPage = 0;
let currentHalfBeatInChord = 0;

let synth = null;
let transportLoopId = null;
let midiAccess = null;
let selectedMidiOutput = null;
let activeMidiNotes = { piano: [], bass: [], drums: [] };
let outputMode = 'synth';
let selectedStyle = 'basic';
let timeSignature = '4/4';
let beatsPerMeasure = 4;
let beatSubdivision = '4n';
let isLooping = false;

// --- Drag & Drop State --- (Shared between chords and pages)
let draggedItem = null; // Generic reference to the element being dragged

// --- Resizing State ---
let isResizing = false;
let resizingChordId = null;
let resizeStartX = 0;
let resizeStartDuration = 0;
const BEAT_WIDTH_PX = 40;

// --- Constants ---
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const TYPES = { 'maj': '', 'm': 'm', '7': '7', 'M7': 'M7', 'm7': 'm7', 'dim': 'dim', 'aug': 'aug', 'sus4': 'sus4', 'sus2': 'sus2' };
const DEFAULT_TYPE = { value: '', name: 'maj' };
const MIDI_CHANNELS = { PIANO: 0, BASS: 1, DRUMS: 9 };
const DRUM_NOTES = { KICK: 36, SNARE: 38, HIHAT_CLOSED: 42, HIHAT_OPEN: 46, CRASH: 49 };
const MIDI_VELOCITY = 100;
const PIANO_OCTAVE = 4;
const BASS_OCTAVE = 2;
const drumStyles = {
    'basic': [ { note: DRUM_NOTES.KICK, beat: 1 }, { note: DRUM_NOTES.SNARE, beat: 3 } ],
    'pop':   [ { note: DRUM_NOTES.KICK, beat: 1 }, { note: DRUM_NOTES.HIHAT_CLOSED, beat: 1 }, { note: DRUM_NOTES.HIHAT_CLOSED, beat: 2 }, { note: DRUM_NOTES.SNARE, beat: 3 }, { note: DRUM_NOTES.HIHAT_CLOSED, beat: 3 }, { note: DRUM_NOTES.HIHAT_CLOSED, beat: 4 }],
    'rock':  [ { note: DRUM_NOTES.KICK, beat: 1 }, { note: DRUM_NOTES.SNARE, beat: 3 }, { note: DRUM_NOTES.CRASH, beat: 1 } ],
    'latin': [ { note: DRUM_NOTES.KICK, beat: 1 }, { note: DRUM_NOTES.HIHAT_CLOSED, beat: 2.5 }, { note: DRUM_NOTES.SNARE, beat: 3 } ]
};

// --- Initialization ---
function initialize() {
    console.log("Initializing Chord Builder...");
    // Assign DOM elements
    noteButtonsContainer = document.getElementById('note-buttons');
    typeButtonsContainer = document.getElementById('type-buttons');
    addChordButton = document.getElementById('add-chord-button');
    selectedChordDisplay = document.getElementById('selected-chord-display');
    chordProgressionContainer = document.getElementById('chord-progression');
    chordProgressionTitle = document.getElementById('chord-progression-title');
    chordProgressionPlaceholder = document.getElementById('chord-progression-placeholder');
    clearPageButton = document.getElementById('clear-page-button');
    playButton = document.getElementById('play-button');
    stopButton = document.getElementById('stop-button');
    loopToggle = document.getElementById('loop-toggle');
    tempoInput = document.getElementById('tempo');
    timeSignatureSelect = document.getElementById('time-signature');
    styleSelect = document.getElementById('style');
    outputModeSelect = document.getElementById('output-mode');
    midiOutputSelect = document.getElementById('midi-output');
    midiStatusIndicator = document.getElementById('midi-status');
    messageBox = document.getElementById('message-box');
    songStructureArea = document.getElementById('song-structure-area');
    newPageNameInput = document.getElementById('new-page-name-input');
    addNewPageButton = document.getElementById('add-new-page-button');
    saveFileButton = document.getElementById('save-file-button');
    loadFileButton = document.getElementById('load-file-button');
    fileInput = document.getElementById('file-input');

    createContextMenu();
    createButtons();
    addEventListeners();
    initializeSynth();
    initializeMIDI();

    console.log("Applying default settings.");
    updateOutputMode(); updateTimeSignature(); updateStyle(); updateLoopingState();
    updateAddButtonState(); renderSongStructure(); renderProgression(); updatePlayStopButtons();
    document.addEventListener('click', handleGlobalClickForContextMenu);
    console.log("Initialization complete.");
}

// --- Context Menu --- (No changes)
function createContextMenu() { contextMenu = document.createElement('div'); contextMenu.id = 'context-menu'; contextMenu.style.position = 'absolute'; contextMenu.style.display = 'none'; contextMenu.style.zIndex = '1000'; contextMenu.addEventListener('click', handleContextMenuAction); document.body.appendChild(contextMenu); }
function handleGlobalClickForContextMenu(event) { if (contextMenu && contextMenu.style.display === 'block') { if (!contextMenu.contains(event.target)) { hideContextMenu(); } } }
function handleContextMenu(event) { event.preventDefault(); hideContextMenu(); contextTargetElement = event.currentTarget; contextMenu.innerHTML = ''; const deleteItem = document.createElement('div'); deleteItem.className = 'context-menu-item'; deleteItem.textContent = 'Delete'; deleteItem.dataset.action = 'delete'; contextMenu.appendChild(deleteItem); const scrollX = window.scrollX || window.pageXOffset; const scrollY = window.scrollY || window.pageYOffset; contextMenu.style.top = `${event.clientY + scrollY + 2}px`; contextMenu.style.left = `${event.clientX + scrollX + 2}px`; contextMenu.style.display = 'block'; }
function hideContextMenu() { if (contextMenu) { contextMenu.style.display = 'none'; } contextTargetElement = null; }
function handleContextMenuAction(event) { const clickedItem = event.target.closest('.context-menu-item'); if (!clickedItem || !contextTargetElement) { hideContextMenu(); return; } const action = clickedItem.dataset.action; if (action === 'delete') { if (contextTargetElement.classList.contains('page-block')) { const index = parseInt(contextTargetElement.dataset.index, 10); if (!isNaN(index)) { console.log(`Context menu: Deleting page instance at index ${index}`); removePageFromStructure(index); } else { console.error("Could not get index for page block deletion."); } } else if (contextTargetElement.classList.contains('chord-block')) { const chordId = contextTargetElement.dataset.chordId; if (chordId) { console.log(`Context menu: Deleting chord with ID ${chordId}`); removeChord(chordId); } else { console.error("Could not get ID for chord block deletion."); } } } hideContextMenu(); }

// --- Synth & MIDI Initialization --- (No changes)
function initializeSynth() { try { if (typeof Tone === 'undefined') { throw new Error("Tone.js library not loaded."); } synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 } }).toDestination(); console.log("Tone.js synth initialized."); } catch (error) { console.error("Failed to initialize Tone.js synth:", error); showMessage("Internal synth failed to load.", true); synth = null; } }
function initializeMIDI() { if (navigator.requestMIDIAccess) { navigator.requestMIDIAccess({ sysex: false }).then(onMIDISuccess, onMIDIFailure); } else { console.warn("Web MIDI API not supported in this browser."); showMessage("Web MIDI not supported by browser.", true); updateMidiStatus('unavailable'); } }
function onMIDISuccess(access) { console.log("MIDI Access Granted!"); midiAccess = access; populateMIDIOutputs(); updateMidiStatus('available'); midiAccess.onstatechange = (event) => { console.log("MIDI state changed:", event.port.name, event.port.state); populateMIDIOutputs(); if (selectedMidiOutput && selectedMidiOutput.id === event.port.id && event.port.state === 'disconnected') { selectedMidiOutput = null; midiOutputSelect.value = ""; updateMidiStatus('available'); showMessage(`MIDI device ${event.port.name} disconnected.`); stopProgression(); } }; }
function onMIDIFailure(msg) { console.error("Failed to get MIDI access -", msg); showMessage("MIDI Access Denied or Failed.", true); updateMidiStatus('unavailable'); }
function populateMIDIOutputs() { midiOutputSelect.innerHTML = '<option value="">No MIDI Output</option>'; if (midiAccess && midiAccess.outputs.size > 0) { midiAccess.outputs.forEach(output => { const option = document.createElement('option'); option.value = output.id; option.textContent = output.name; midiOutputSelect.appendChild(option); }); if (selectedMidiOutput && midiAccess.outputs.has(selectedMidiOutput.id)) { midiOutputSelect.value = selectedMidiOutput.id; updateMidiStatus('selected'); } else { selectedMidiOutput = null; midiOutputSelect.value = ""; updateMidiStatus('available'); } } else { console.log("No MIDI output devices found."); selectedMidiOutput = null; midiOutputSelect.value = ""; updateMidiStatus(midiAccess ? 'available' : 'unavailable'); } midiOutputSelect.disabled = (outputMode === 'synth'); }
function selectMidiOutput() { const selectedId = midiOutputSelect.value; if (midiAccess && selectedId) { selectedMidiOutput = midiAccess.outputs.get(selectedId); if (selectedMidiOutput) { console.log("Selected MIDI Output:", selectedMidiOutput.name); updateMidiStatus('selected'); showMessage(`MIDI Output set to: ${selectedMidiOutput.name}`); } else { console.warn("Selected MIDI output device not found (ID: " + selectedId + ")."); selectedMidiOutput = null; updateMidiStatus('available'); showMessage("Selected MIDI device error.", true); } } else { selectedMidiOutput = null; console.log("No MIDI Output selected."); updateMidiStatus(midiAccess ? 'available' : 'unavailable'); showMessage("MIDI Output disabled."); stopProgression(); } }
function updateMidiStatus(status) { midiStatusIndicator.classList.remove('bg-red-500', 'bg-yellow-500', 'bg-green-500', 'active'); midiStatusIndicator.style.animation = 'none'; switch(status) { case 'unavailable': midiStatusIndicator.classList.add('bg-red-500'); midiStatusIndicator.title = 'MIDI Status: Unavailable/Denied'; break; case 'available': midiStatusIndicator.classList.add('bg-yellow-500'); midiStatusIndicator.title = 'MIDI Status: Available, No Output Selected'; break; case 'selected': midiStatusIndicator.classList.add('bg-green-500'); midiStatusIndicator.title = `MIDI Status: Output Selected (${selectedMidiOutput?.name || 'Unknown'})`; break; case 'active': midiStatusIndicator.classList.add('bg-green-500', 'active'); midiStatusIndicator.title = `MIDI Status: Playing via ${selectedMidiOutput?.name || 'Unknown'}`; void midiStatusIndicator.offsetWidth; midiStatusIndicator.style.animation = 'blink 1.5s linear infinite'; break; } }

// --- UI Creation --- (No changes)
function createButtons() { noteButtonsContainer.innerHTML = ''; typeButtonsContainer.innerHTML = ''; NOTES.forEach(note => { const button = document.createElement('button'); button.textContent = note; button.dataset.note = note; button.className = 'bg-gray-600 hover:bg-blue-500 text-white font-medium py-2 px-1 rounded-md text-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400'; button.onclick = () => selectNote(note, button); button.addEventListener('dblclick', () => { console.log(`Note DblClick: ${note}`); if (!selectedPageName) { showMessage("Select a page first!", true); return; } selectNote(note, button); selectedType = DEFAULT_TYPE; addChordToProgression(); button.classList.add('ring-green-500'); setTimeout(() => button.classList.remove('ring-green-500'), 200); }); noteButtonsContainer.appendChild(button); }); Object.entries(TYPES).forEach(([key, value]) => { const button = document.createElement('button'); button.textContent = key; button.dataset.type = value; button.dataset.typeName = key; button.className = 'bg-gray-600 hover:bg-blue-500 text-white font-medium py-2 px-1 rounded-md text-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400'; button.onclick = () => selectType(value, key, button); button.addEventListener('dblclick', () => { console.log(`Type DblClick: ${key}`); if (!selectedPageName) { showMessage("Select a page first!", true); return; } if (!selectedNote) { showMessage("Select a root note first!", true); return; } selectType(value, key, button); addChordToProgression(); button.classList.add('ring-green-500'); setTimeout(() => button.classList.remove('ring-green-500'), 200); }); typeButtonsContainer.appendChild(button); }); }

// --- Event Handlers --- (No changes)
function addEventListeners() { addChordButton.addEventListener('click', addChordToProgression); clearPageButton.addEventListener('click', clearSelectedPageChords); playButton.addEventListener('click', playProgression); stopButton.addEventListener('click', stopProgression); loopToggle.addEventListener('change', updateLoopingState); tempoInput.addEventListener('change', updateTempo); timeSignatureSelect.addEventListener('change', updateTimeSignature); styleSelect.addEventListener('change', updateStyle); outputModeSelect.addEventListener('change', updateOutputMode); midiOutputSelect.addEventListener('change', selectMidiOutput); addNewPageButton.addEventListener('click', handleAddNewPage); newPageNameInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') { event.preventDefault(); handleAddNewPage(); } }); saveFileButton.addEventListener('click', saveToFile); loadFileButton.addEventListener('click', () => fileInput.click()); fileInput.addEventListener('change', handleFileLoad); chordProgressionContainer.addEventListener('dragstart', handleChordDragStart); chordProgressionContainer.addEventListener('dragover', handleDragOver); chordProgressionContainer.addEventListener('dragleave', handleDragLeave); chordProgressionContainer.addEventListener('drop', handleChordDrop); chordProgressionContainer.addEventListener('dragend', handleDragEnd); songStructureArea.addEventListener('dragstart', handlePageDragStart); songStructureArea.addEventListener('dragover', handleDragOver); songStructureArea.addEventListener('dragleave', handleDragLeave); songStructureArea.addEventListener('drop', handlePageDrop); songStructureArea.addEventListener('dragend', handleDragEnd); document.addEventListener('mousemove', handleGlobalMouseMove); document.addEventListener('mouseup', handleGlobalMouseUp); }

// --- Settings Handlers --- (No changes)
function updateLoopingState() { isLooping = loopToggle.checked; console.log("Looping set to:", isLooping); }
function updateOutputMode() { outputMode = outputModeSelect.value; console.log("Output mode set to:", outputMode); midiOutputSelect.disabled = (outputMode === 'synth'); if (outputMode === 'synth') { updateMidiStatus('unavailable'); stopProgression(); } else { selectMidiOutput(); } }
function updateTimeSignature() { timeSignature = timeSignatureSelect.value; const parts = timeSignature.split('/'); beatsPerMeasure = parseInt(parts[0], 10); const beatUnit = parseInt(parts[1], 10); beatSubdivision = '4n'; if (beatUnit === 8) { console.warn("Handling for /8 time signatures might be basic. Transport uses '4n'."); } console.log(`Time signature set to: ${timeSignature} (${beatsPerMeasure} beats per measure)`); stopProgression(); }
function updateStyle() { selectedStyle = styleSelect.value; console.log("Style set to:", selectedStyle); stopProgression(); }

// --- Page Structure Logic --- (No changes)
function handleAddNewPage() { const pageName = newPageNameInput.value.trim(); if (!pageName) { showMessage("Please enter a name for the new page.", true); newPageNameInput.focus(); return; } addPageToStructure(pageName); newPageNameInput.value = ''; }
function addPageToStructure(pageName) { if (!pageName) { console.error("Attempted to add page with empty name."); return; } if (!pageDefinitions.hasOwnProperty(pageName)) { pageDefinitions[pageName] = []; console.log(`Created new page definition: "${pageName}"`); } else { console.log(`Using existing page definition: "${pageName}"`); } songStructure.push(pageName); console.log(`Added page "${pageName}" to structure:`, songStructure); renderSongStructure(); selectPage(pageName, songStructure.length - 1); updatePlayStopButtons(); }
function selectPage(pageName, indexInStructure) { console.log(`Selecting page definition "${pageName}" (instance at index ${indexInStructure})`); if (!pageDefinitions.hasOwnProperty(pageName)) { console.error(`Cannot select page definition "${pageName}": Not found in pageDefinitions.`); selectedPageName = null; renderProgression(); renderSongStructure(); return; } selectedPageName = pageName; stopProgression(); renderSongStructure(); renderProgression(); updatePlayStopButtons(); updateAddButtonState(); }
function removePageFromStructure(indexInStructure) { if (indexInStructure < 0 || indexInStructure >= songStructure.length) { console.error("Invalid index for removing page from structure:", indexInStructure); return; } stopProgression(); const removedPageName = songStructure[indexInStructure]; songStructure.splice(indexInStructure, 1); console.log(`Removed page instance "${removedPageName}" at index ${indexInStructure}. Structure:`, songStructure); if (songStructure.length === 0) { selectedPageName = null; } renderSongStructure(); renderProgression(); updatePlayStopButtons(); updateAddButtonState(); }

// --- Chord Editing Logic --- (No changes)
function selectNote(note, button) { selectedNote = note; document.querySelectorAll('#note-buttons button').forEach(btn => btn.classList.remove('bg-blue-600', 'ring-2', 'ring-blue-400')); button.classList.add('bg-blue-600', 'ring-2', 'ring-blue-400'); updateSelectedChordDisplay(); updateAddButtonState(); }
function selectType(typeValue, typeName, button) { selectedType = { value: typeValue, name: typeName }; document.querySelectorAll('#type-buttons button').forEach(btn => btn.classList.remove('bg-blue-600', 'ring-2', 'ring-blue-400')); button.classList.add('bg-blue-600', 'ring-2', 'ring-blue-400'); updateSelectedChordDisplay(); updateAddButtonState(); }
function updateSelectedChordDisplay() { const displayEl = selectedChordDisplay.querySelector('span'); if (selectedNote && selectedType) { displayEl.textContent = selectedType.value === '' ? selectedNote : `${selectedNote}${selectedType.name}`; displayEl.classList.remove('text-gray-500'); } else if (selectedNote) { displayEl.textContent = `${selectedNote}...`; displayEl.classList.remove('text-gray-500'); } else { displayEl.textContent = '--'; displayEl.classList.add('text-gray-500'); } }
function updateAddButtonState() { addChordButton.disabled = !(selectedNote && selectedPageName); addChordButton.title = selectedPageName ? "Add selected chord to current page" : "Select a page first"; }
function addChordToProgression() { if (!selectedPageName || !pageDefinitions.hasOwnProperty(selectedPageName)) { showMessage("Please select a page from the structure above first.", true); return; } if (selectedNote) { const typeInfo = selectedType || DEFAULT_TYPE; const storeTypeName = (typeInfo.value === '') ? null : typeInfo.name; const defaultDuration = beatsPerMeasure; console.log(`Adding chord to page "${selectedPageName}", default duration: ${defaultDuration} beats`); const newChord = { id: `chord-${Date.now()}-${Math.random().toString(16).slice(2)}`, note: selectedNote, typeValue: typeInfo.value, typeName: storeTypeName, duration: defaultDuration }; pageDefinitions[selectedPageName].push(newChord); renderProgression(); updatePlayStopButtons(); selectedNote = null; selectedType = null; document.querySelectorAll('#note-buttons button, #type-buttons button').forEach(btn => btn.classList.remove('bg-blue-600', 'ring-2', 'ring-blue-400')); updateSelectedChordDisplay(); updateAddButtonState(); } else { showMessage("Please select a root note first.", true); } }
function removeChord(chordIdToRemove) { if (!selectedPageName || !pageDefinitions.hasOwnProperty(selectedPageName)) { console.warn("Cannot remove chord: No page selected."); return; } stopProgression(); const initialLength = pageDefinitions[selectedPageName].length; pageDefinitions[selectedPageName] = pageDefinitions[selectedPageName].filter(chord => chord.id !== chordIdToRemove); if (pageDefinitions[selectedPageName].length < initialLength) { console.log(`Removed chord ${chordIdToRemove} from page "${selectedPageName}"`); renderProgression(); updatePlayStopButtons(); } else { console.warn(`Chord with ID ${chordIdToRemove} not found on page "${selectedPageName}".`); } }
function clearSelectedPageChords() { if (!selectedPageName || !pageDefinitions.hasOwnProperty(selectedPageName)) { showMessage("Select a page first to clear its chords.", true); return; } stopProgression(); console.log(`Clearing all chords from page "${selectedPageName}"`); pageDefinitions[selectedPageName] = []; renderProgression(); updatePlayStopButtons(); }

// --- Rendering --- (No changes)
function renderSongStructure() { songStructureArea.innerHTML = ''; const structurePlaceholder = songStructureArea.querySelector('.placeholder-text'); if (structurePlaceholder) structurePlaceholder.remove(); if (songStructure.length === 0) { const placeholder = document.createElement('span'); placeholder.className = 'placeholder-text text-gray-500 italic text-sm mx-auto'; placeholder.textContent = 'Add pages using the input above to build the song structure'; songStructureArea.appendChild(placeholder); return; } let playingPageBlock = null; songStructure.forEach((pageName, index) => { const pageBlock = document.createElement('div'); pageBlock.className = 'page-block'; pageBlock.textContent = pageName; pageBlock.dataset.pageName = pageName; pageBlock.dataset.index = index; pageBlock.title = `Select Page Definition: "${pageName}"`; pageBlock.draggable = true; if (pageName === selectedPageName) { pageBlock.classList.add('selected-page'); } if (index === currentlyPlayingPageIndex) { pageBlock.classList.add('playing-page'); playingPageBlock = pageBlock; } pageBlock.addEventListener('click', () => selectPage(pageName, index)); pageBlock.addEventListener('contextmenu', handleContextMenu); songStructureArea.appendChild(pageBlock); }); if (playingPageBlock) { playingPageBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }); } }
function renderProgression() { chordProgressionContainer.innerHTML = ''; chordProgressionPlaceholder.style.display = 'none'; if (!selectedPageName || !pageDefinitions.hasOwnProperty(selectedPageName)) { chordProgressionTitle.textContent = "Chord Progression (No Page Selected)"; chordProgressionPlaceholder.style.display = 'block'; chordProgressionPlaceholder.textContent = "Select or add a page above to view/edit its chords"; clearPageButton.disabled = true; updateAddButtonState(); updatePlayStopButtons(); return; } const chordsToShow = pageDefinitions[selectedPageName]; chordProgressionTitle.textContent = `Chord Progression (Page "${selectedPageName}")`; clearPageButton.disabled = chordsToShow.length === 0; updateAddButtonState(); if (chordsToShow.length === 0) { chordProgressionPlaceholder.style.display = 'block'; chordProgressionPlaceholder.textContent = `Page "${selectedPageName}" is empty. Add chords using the palette.`; updatePlayStopButtons(); return; } updatePlayStopButtons(); chordsToShow.forEach((chord, index) => { const chordBlock = document.createElement('div'); chordBlock.id = chord.id; chordBlock.dataset.chordId = chord.id; chordBlock.className = `chord-block bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 rounded-lg shadow-md h-[80px] flex flex-col justify-center items-center cursor-grab relative transition-colors duration-200`; chordBlock.draggable = true; chordBlock.dataset.index = index; chordBlock.style.width = `${chord.duration * BEAT_WIDTH_PX}px`; const chordText = document.createElement('span'); chordText.className = 'text-2xl font-bold font-mono pointer-events-none'; chordText.textContent = chord.typeName === null ? chord.note : `${chord.note}${chord.typeName}`; chordBlock.appendChild(chordText); const durationDisplay = document.createElement('span'); durationDisplay.className = 'chord-duration-display pointer-events-none'; durationDisplay.textContent = `${chord.duration}b`; chordBlock.appendChild(durationDisplay); const resizeHandle = document.createElement('div'); resizeHandle.className = 'resize-handle'; resizeHandle.title = "Resize Duration"; resizeHandle.addEventListener('mousedown', handleResizeMouseDown); chordBlock.appendChild(resizeHandle); const playingIndicator = document.createElement('div'); playingIndicator.className = 'playing-indicator absolute bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-yellow-400 rounded-full opacity-0 transition-opacity duration-150 pointer-events-none'; chordBlock.appendChild(playingIndicator); chordBlock.addEventListener('contextmenu', handleContextMenu); chordProgressionContainer.appendChild(chordBlock); }); }

// --- Drag and Drop Logic --- (UPDATED - Syntax Error Fix in handlePageDrop)

function handleDragStart(event, itemSelector) { const target = event.target.closest(itemSelector); if (target && !target.classList.contains('resizing')) { draggedItem = target; setTimeout(() => target.classList.add('dragging'), 0); event.dataTransfer.effectAllowed = 'move'; if (target.classList.contains('chord-block')) { event.dataTransfer.setData('text/plain', target.dataset.chordId); event.dataTransfer.setData('text/type', 'chord'); } else if (target.classList.contains('page-block')) { event.dataTransfer.setData('text/plain', target.dataset.index); event.dataTransfer.setData('text/type', 'page'); } else { event.preventDefault(); } } else { event.preventDefault(); } }
function handleChordDragStart(event) { handleDragStart(event, '.chord-block'); }
function handlePageDragStart(event) { handleDragStart(event, '.page-block'); }
function handleDragOver(event) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; const container = event.currentTarget; const itemSelector = container === chordProgressionContainer ? '.chord-block' : '.page-block'; const afterElement = getDragAfterElement(container, event.clientX, itemSelector); const draggableElements = [...container.querySelectorAll(`${itemSelector}:not(.dragging)`)]; draggableElements.forEach(el => el.classList.remove('drag-over-before', 'drag-over-after')); container.classList.remove('drag-over'); if (afterElement == null) { if (draggableElements.length > 0) { draggableElements[draggableElements.length - 1].classList.add('drag-over-after'); } else { container.classList.add('drag-over'); } } else { afterElement.classList.add('drag-over-before'); } }
function handleDragLeave(event) { const container = event.currentTarget; const relatedTarget = event.relatedTarget; const itemSelector = container === chordProgressionContainer ? '.chord-block' : '.page-block'; if (!container.contains(relatedTarget) || !relatedTarget?.closest(itemSelector)) { clearDragOverStyles(container, itemSelector); } }
function handleChordDrop(event) { event.preventDefault(); const container = chordProgressionContainer; clearDragOverStyles(container, '.chord-block'); const type = event.dataTransfer.getData('text/type'); if (!draggedItem || type !== 'chord' || !selectedPageName || !pageDefinitions.hasOwnProperty(selectedPageName)) { draggedItem = null; return; } stopProgression(); const id = event.dataTransfer.getData('text/plain'); const afterElement = getDragAfterElement(container, event.clientX, '.chord-block'); const currentPageChords = pageDefinitions[selectedPageName]; const draggedIndex = currentPageChords.findIndex(c => c.id === id); if (draggedIndex === -1) { draggedItem = null; return; } const draggedChord = currentPageChords.splice(draggedIndex, 1)[0]; if (afterElement == null) { currentPageChords.push(draggedChord); } else { const dropTargetId = afterElement.dataset.chordId; const dropTargetIndex = currentPageChords.findIndex(c => c.id === dropTargetId); if (dropTargetIndex !== -1) { currentPageChords.splice(dropTargetIndex, 0, draggedChord); } else { currentPageChords.push(draggedChord); } } draggedItem = null; renderProgression(); updatePlayStopButtons(); }

function handlePageDrop(event) {
    event.preventDefault();
    const container = songStructureArea;
    clearDragOverStyles(container, '.page-block');

    const type = event.dataTransfer.getData('text/type');
    if (!draggedItem || type !== 'page') {
         draggedItem = null; return;
    }
    stopProgression();

    const draggedIndex = parseInt(event.dataTransfer.getData('text/plain'), 10);
    if (isNaN(draggedIndex) || draggedIndex < 0 || draggedIndex >= songStructure.length) {
        console.error("Invalid dragged page index:", draggedIndex);
        draggedItem = null; return;
    }

    const afterElement = getDragAfterElement(container, event.clientX, '.page-block');
    const pageName = songStructure.splice(draggedIndex, 1)[0]; // Remove page name from original position

    // Calculate new position and insert
    if (afterElement == null) {
        // Dropping at the end
        songStructure.push(pageName);
    } else {
        // Dropping before 'afterElement'
        // Find the *current* DOM elements excluding the one being dragged
        const currentElements = Array.from(container.querySelectorAll('.page-block:not(.dragging)'));
        // Find the index of the element we are dropping before, within that current DOM list
        const dropBeforeIndexInDOM = currentElements.indexOf(afterElement);

        if (dropBeforeIndexInDOM !== -1) {
             // We need to insert into the songStructure array at the same logical position
             // This requires mapping the DOM index back to the array index *after* the splice
             // Let's try a simpler mapping: get the original index of the element we drop before
             const dropTargetOriginalIndex = parseInt(afterElement.dataset.index, 10);

             // Find where this original index currently sits in the *modified* songStructure array
             // This is complex. Let's simplify: Assume dropBeforeIndexInDOM corresponds
             // reasonably well to the desired insertion point in the modified array.
             songStructure.splice(dropBeforeIndexInDOM, 0, pageName);

        } else {
             // Fallback if target element not found in current DOM list (shouldn't happen)
             songStructure.push(pageName);
        }
         // *** SYNTAX ERROR FIX: Removed the orphaned 'else' block that was here ***
    }

    draggedItem = null; // Clear reference
    renderSongStructure(); // Re-render pages with new order
    updatePlayStopButtons();
    console.log("Updated song structure:", songStructure);
}

function handleDragEnd(event) { clearDragOverStyles(chordProgressionContainer, '.chord-block'); clearDragOverStyles(songStructureArea, '.page-block'); if (event.target.classList.contains('chord-block') || event.target.classList.contains('page-block')) { event.target.classList.remove('dragging'); } draggedItem = null; }
function getDragAfterElement(container, x, itemSelector) { const draggableElements = [...container.querySelectorAll(`${itemSelector}:not(.dragging)`)]; return draggableElements.reduce((closest, child) => { const box = child.getBoundingClientRect(); const offset = x - box.left - box.width / 2; if (offset < 0 && offset > closest.offset) { return { offset: offset, element: child }; } else { return closest; } }, { offset: Number.NEGATIVE_INFINITY }).element; }
function clearDragOverStyles(container, itemSelector) { container.querySelectorAll(itemSelector).forEach(el => { el.classList.remove('drag-over-before', 'drag-over-after'); }); container.classList.remove('drag-over'); }

// --- Resize Logic --- (No changes)
function handleResizeMouseDown(e) { e.preventDefault(); e.stopPropagation(); isResizing = true; const chordBlock = e.target.closest('.chord-block'); resizingChordId = chordBlock.dataset.chordId; const chordData = pageDefinitions[selectedPageName]?.find(c => c.id === resizingChordId); if (!chordData) { isResizing = false; return; } resizeStartX = e.clientX; resizeStartDuration = chordData.duration; document.body.classList.add('resizing'); chordBlock.classList.add('resizing'); console.log(`Start resize for ${resizingChordId}, start duration: ${resizeStartDuration}`); }
function handleGlobalMouseMove(e) { if (!isResizing || !resizingChordId || !selectedPageName) return; const currentX = e.clientX; const deltaX = currentX - resizeStartX; const deltaBeats = deltaX / BEAT_WIDTH_PX; const roundedDeltaBeats = Math.round(deltaBeats); let newDuration = resizeStartDuration + roundedDeltaBeats; newDuration = Math.max(1, newDuration); const pageChords = pageDefinitions[selectedPageName]; const chordIndex = pageChords?.findIndex(c => c.id === resizingChordId); if (chordIndex !== -1 && pageChords[chordIndex].duration !== newDuration) { pageChords[chordIndex].duration = newDuration; console.log(`Resizing ${resizingChordId} in page "${selectedPageName}" to duration: ${newDuration}`); const chordBlock = document.getElementById(resizingChordId); if (chordBlock) { chordBlock.style.width = `${newDuration * BEAT_WIDTH_PX}px`; const durationDisplay = chordBlock.querySelector('.chord-duration-display'); if(durationDisplay) durationDisplay.textContent = `${newDuration}b`; } stopProgression(); } }
function handleGlobalMouseUp(e) { if (isResizing) { console.log(`End resize for ${resizingChordId}`); const chordBlock = document.getElementById(resizingChordId); if (chordBlock) { chordBlock.classList.remove('resizing'); } isResizing = false; resizingChordId = null; document.body.classList.remove('resizing'); updatePlayStopButtons(); } }

// --- Audio & MIDI Playback --- (No changes)
function playProgression() { if (songStructure.length === 0 || Tone.Transport.state === 'started') { if (songStructure.length === 0) showMessage("Add pages to the song structure first.", true); return; } Tone.start().then(() => { audioContextStarted = true; console.log("AudioContext started successfully."); showMessage("Starting playback..."); currentLoopIteration = 0; currentChordIndexInPage = 0; currentHalfBeatInChord = 0; currentlyPlayingPageIndex = 0; clearActiveMidiNotes(); if (transportLoopId !== null) { Tone.Transport.clear(transportLoopId); transportLoopId = null; } if (songStructure.length > 0) { selectedPageName = songStructure[currentlyPlayingPageIndex]; renderProgression(); renderSongStructure(); } else { stopProgression(); return; } const currentTempo = parseInt(tempoInput.value, 10); setTransportTempo(currentTempo); transportLoopId = Tone.Transport.scheduleRepeat(time => { if (currentlyPlayingPageIndex < 0 || currentlyPlayingPageIndex >= songStructure.length) { if (isLooping && songStructure.length > 0) { console.log("Looping back to start."); currentlyPlayingPageIndex = 0; currentLoopIteration = 0; currentChordIndexInPage = 0; currentHalfBeatInChord = 0; selectedPageName = songStructure[currentlyPlayingPageIndex]; Tone.Draw.schedule(() => { renderProgression(); renderSongStructure(); }, time); } else { console.log("End of song structure reached."); stopProgression(); return; } } const currentPageName = songStructure[currentlyPlayingPageIndex]; const currentPageChords = pageDefinitions[currentPageName] || []; if (currentPageChords.length === 0) { console.log(`Page "${currentPageName}" (Index ${currentlyPlayingPageIndex}) is empty, skipping.`); currentlyPlayingPageIndex++; currentChordIndexInPage = 0; currentHalfBeatInChord = 0; if (currentlyPlayingPageIndex < songStructure.length) { selectedPageName = songStructure[currentlyPlayingPageIndex]; Tone.Draw.schedule(() => { renderProgression(); renderSongStructure(); }, time); } else { Tone.Draw.schedule(() => { renderSongStructure(); }, time); } return; } if (currentChordIndexInPage >= currentPageChords.length) { console.warn(`Chord index ${currentChordIndexInPage} out of bounds for page "${currentPageName}", advancing page.`); currentlyPlayingPageIndex++; currentChordIndexInPage = 0; currentHalfBeatInChord = 0; if (currentlyPlayingPageIndex < songStructure.length) { selectedPageName = songStructure[currentlyPlayingPageIndex]; Tone.Draw.schedule(() => { renderProgression(); renderSongStructure(); }, time); } else { Tone.Draw.schedule(() => { renderSongStructure(); }, time); } return; } const currentChord = currentPageChords[currentChordIndexInPage]; const currentFullBeat = Math.floor(currentLoopIteration / 2); const currentMeasureBeat = (currentFullBeat % beatsPerMeasure) + 1; const isDownBeat = currentLoopIteration % 2 === 0; const isFirstHalfBeatOfChord = (currentHalfBeatInChord === 0); if (outputMode === 'midi' && selectedMidiOutput) { sendMidiNoteOffs(time); } if (isFirstHalfBeatOfChord) { console.log(`Time: ${time.toFixed(2)}, PageIdx: ${currentlyPlayingPageIndex}, ChordIdx: ${currentChordIndexInPage}, Chord: ${currentChord.note}${currentChord.typeName ?? ''} (Dur: ${currentChord.duration})`); Tone.Draw.schedule(() => { highlightPlayingPage(currentlyPlayingPageIndex); highlightPlayingChord(currentChord.id); }, time); triggerChordAndBass(currentChord, time); } if (isDownBeat) { triggerDrums(currentMeasureBeat, time); } currentLoopIteration++; currentHalfBeatInChord++; if (currentHalfBeatInChord >= currentChord.duration * 2) { currentChordIndexInPage++; currentHalfBeatInChord = 0; const halfBeatDurationSecs = Tone.Time(beatSubdivision).toSeconds(); Tone.Draw.schedule(() => { clearHighlights(currentChord.id); }, time + halfBeatDurationSecs - 0.01); if (currentChordIndexInPage >= currentPageChords.length) { console.log(`Finished page ${currentlyPlayingPageIndex} ("${currentPageName}")`); currentlyPlayingPageIndex++; currentChordIndexInPage = 0; if (currentlyPlayingPageIndex < songStructure.length) { selectedPageName = songStructure[currentlyPlayingPageIndex]; console.log(`Advancing to page ${currentlyPlayingPageIndex} ("${selectedPageName}")`); Tone.Draw.schedule(() => { renderProgression(); renderSongStructure(); }, time + halfBeatDurationSecs); } else { console.log("Reached end after finishing last page's chords."); Tone.Draw.schedule(() => { renderSongStructure(); }, time + halfBeatDurationSecs); } } } }, beatSubdivision); Tone.Transport.start(); updatePlayStopButtons(); if (outputMode === 'midi' && selectedMidiOutput) { updateMidiStatus('active'); } }).catch(e => { console.error("Error starting Tone.js AudioContext:", e); showMessage("Error starting audio playback. User interaction might be required.", true); audioContextStarted = false; updatePlayStopButtons(); }); }
function triggerChordAndBass(chord, time) { const halfBeatDurationSecs = Tone.Time(beatSubdivision).toSeconds(); const chordDurationSecs = halfBeatDurationSecs * chord.duration * 2; if (outputMode === 'synth' && synth) { const notesToPlaySynth = getNotesInChord(chord.note, chord.typeValue, PIANO_OCTAVE); if (notesToPlaySynth?.length > 0) { try { synth.triggerAttackRelease(notesToPlaySynth, chordDurationSecs, time); const bassNoteSynth = getNotesInChord(chord.note, '', BASS_OCTAVE); if(bassNoteSynth?.[0]) { synth.triggerAttackRelease(bassNoteSynth[0], chordDurationSecs, time); } } catch (error){ console.error("Tone.js synth error:", error); } } } else if (outputMode === 'midi' && selectedMidiOutput) { const pianoNotes = getMidiNotesInChord(chord.note, chord.typeValue, PIANO_OCTAVE); if (pianoNotes) { pianoNotes.forEach(midiNote => { sendMidiMessage(selectedMidiOutput, [0x90 | MIDI_CHANNELS.PIANO, midiNote, MIDI_VELOCITY], time); activeMidiNotes.piano.push({ note: midiNote, offTime: time + chordDurationSecs }); }); } const bassNote = noteNameToMidi(chord.note, BASS_OCTAVE); if (bassNote !== null) { sendMidiMessage(selectedMidiOutput, [0x90 | MIDI_CHANNELS.BASS, bassNote, MIDI_VELOCITY], time); activeMidiNotes.bass.push({ note: bassNote, offTime: time + chordDurationSecs }); } } }
function triggerDrums(measureBeat, time) { const pattern = drumStyles[selectedStyle] || drumStyles['basic']; const drumDuration = 0.1; pattern.forEach(hit => { if (hit.beat === measureBeat || Math.abs(hit.beat - measureBeat) < 0.1) { if (outputMode === 'synth' && synth) { /* Synth drums placeholder */ } else if (outputMode === 'midi' && selectedMidiOutput) { sendMidiMessage(selectedMidiOutput, [0x90 | MIDI_CHANNELS.DRUMS, hit.note, MIDI_VELOCITY], time); activeMidiNotes.drums.push({ note: hit.note, offTime: time + drumDuration }); } } }); }
function stopProgression() { if (Tone.Transport.state !== 'stopped') { console.log("Stopping playback..."); Tone.Transport.stop(); if (transportLoopId !== null) { Tone.Transport.clear(transportLoopId); transportLoopId = null; } if (synth && outputMode === 'synth') { try { synth.releaseAll(); } catch (e) { console.error("Error releasing synth notes:", e); } } if (selectedMidiOutput && outputMode === 'midi') { sendAllMidiNotesOff(selectedMidiOutput); } clearActiveMidiNotes(); currentLoopIteration = 0; currentChordIndexInPage = 0; currentHalfBeatInChord = 0; currentlyPlayingPageIndex = -1; clearHighlights(); renderSongStructure(); updatePlayStopButtons(); if (outputMode === 'midi') { updateMidiStatus(selectedMidiOutput ? 'selected' : (midiAccess ? 'available' : 'unavailable')); } else { updateMidiStatus('unavailable'); } showMessage("Playback stopped."); } }

// --- MIDI Sending Helpers --- (No changes)
function sendMidiMessage(output, message, timestamp = 0) { if (!output) return; try { output.send(message); } catch (error) { console.error("Error sending MIDI message:", error, message); } }
function sendMidiNoteOffs(time) { const now = time; const lookahead = 0.01; ['piano', 'bass', 'drums'].forEach(track => { const notesToTurnOff = []; const remainingNotes = []; activeMidiNotes[track].forEach(noteInfo => { if (noteInfo.offTime <= now + lookahead) { notesToTurnOff.push(noteInfo); } else { remainingNotes.push(noteInfo); } }); notesToTurnOff.forEach(noteInfo => { const channel = (track === 'piano') ? MIDI_CHANNELS.PIANO : (track === 'bass') ? MIDI_CHANNELS.BASS : MIDI_CHANNELS.DRUMS; sendMidiMessage(selectedMidiOutput, [0x80 | channel, noteInfo.note, 0], time); }); activeMidiNotes[track] = remainingNotes; }); }
function sendAllMidiNotesOff(output) { if (!output) return; console.log("Sending All Notes Off / All Sound Off to", output.name); for (let channel = 0; channel < 16; channel++) { sendMidiMessage(output, [0xB0 | channel, 123, 0]); sendMidiMessage(output, [0xB0 | channel, 120, 0]); } clearActiveMidiNotes(); }
function clearActiveMidiNotes() { activeMidiNotes = { piano: [], bass: [], drums: [] }; }

// --- Tempo & Visuals --- (No changes)
function setTransportTempo(displayTempo) { if (Tone.Transport) { const actualTempo = displayTempo * 2; Tone.Transport.bpm.value = actualTempo; console.log(`Transport Tempo set to: ${actualTempo} BPM (Display: ${displayTempo})`); } else { console.warn("Cannot set tempo: Tone.Transport not available."); } }
function updateTempo() { const displayTempo = parseInt(tempoInput.value, 10); if (!isNaN(displayTempo) && displayTempo >= 40 && displayTempo <= 240) { if (audioContextStarted) { setTransportTempo(displayTempo); } else { console.log("Tempo input changed to:", displayTempo, "(Audio context not started yet)"); } showMessage(`Tempo set to ${displayTempo} BPM`); } else { const currentActualTempo = audioContextStarted ? Tone.Transport.bpm.value : 120 * 2; tempoInput.value = Math.round(currentActualTempo / 2); showMessage("Invalid tempo value (40-240 BPM).", true); } }
function highlightPlayingChord(chordId) { clearHighlights(); const chordBlock = document.getElementById(chordId); if (chordBlock) { const indicator = chordBlock.querySelector('.playing-indicator'); if(indicator) indicator.style.opacity = '1'; } }
function clearHighlights(exceptId = null) { document.querySelectorAll('.chord-block').forEach(block => { if (block.id !== exceptId) { const indicator = block.querySelector('.playing-indicator'); if(indicator) indicator.style.opacity = '0'; } }); }
function highlightPlayingPage(pageIndex) { document.querySelectorAll('#song-structure-area .page-block').forEach((block, index) => { if (index === pageIndex) { block.classList.add('playing-page'); } else { block.classList.remove('playing-page'); } }); }
function updatePlayStopButtons() { const isPlaying = Tone.Transport.state === 'started'; const canPlay = songStructure.length > 0; playButton.disabled = isPlaying || !canPlay; stopButton.disabled = !isPlaying; if (isPlaying) { playButton.innerHTML = `<span class="lucide mr-1">&#xea16;</span> Playing...`; } else { playButton.innerHTML = `<span class="lucide mr-1">&#xea4a;</span> Play`; } }

// --- Chord & MIDI Note Conversion --- (No changes)
function noteNameToMidi(noteName, octave) { const baseIndex = NOTES.indexOf(noteName); if (baseIndex === -1) return null; const midiNote = 12 * octave + baseIndex + 12; return (midiNote >= 0 && midiNote <= 127) ? midiNote : null; }
function getMidiNotesInChord(rootNote, typeValue, octave) { const rootMidi = noteNameToMidi(rootNote, octave); if (rootMidi === null) return null; let intervals = []; switch (typeValue) { case '': intervals = [0, 4, 7]; break; case 'm': intervals = [0, 3, 7]; break; case '7': intervals = [0, 4, 7, 10]; break; case 'M7': intervals = [0, 4, 7, 11]; break; case 'm7': intervals = [0, 3, 7, 10]; break; case 'dim': intervals = [0, 3, 6]; break; case 'aug': intervals = [0, 4, 8]; break; case 'sus4': intervals = [0, 5, 7]; break; case 'sus2': intervals = [0, 2, 7]; break; default: intervals = [0, 4, 7]; } return intervals.map(interval => rootMidi + interval).filter(note => note >= 0 && note <= 127); }
function midiToNoteName(midiNote) { if (midiNote < 0 || midiNote > 127) return null; const noteIndex = midiNote % 12; const octave = Math.floor(midiNote / 12) - 1; return NOTES[noteIndex] + octave; }
function getNotesInChord(rootNote, typeValue, octave) { const midiNotes = getMidiNotesInChord(rootNote, typeValue, octave); if (!midiNotes) return null; return midiNotes.map(midiNote => midiToNoteName(midiNote)).filter(n => n !== null); }

// --- Utility Functions --- (No changes)
function showMessage(message, isError = false) { messageBox.textContent = message; messageBox.className = `mt-2 text-center text-sm h-5 ${isError ? 'text-red-400' : 'text-yellow-400'}`; setTimeout(() => { if (messageBox.textContent === message) { messageBox.textContent = ''; } }, 3000); }

// --- Save/Load Functions (File Only) --- (No changes)
function getSongData() { return { pageDefinitions: pageDefinitions, songStructure: songStructure, tempo: parseInt(tempoInput.value, 10), timeSignature: timeSignatureSelect.value, selectedStyle: styleSelect.value, outputMode: outputModeSelect.value, isLooping: loopToggle.checked }; }
function applyLoadedData(data) { if (!data || typeof data.pageDefinitions !== 'object' || !Array.isArray(data.songStructure)) { console.error("Invalid song data format received:", data); throw new Error("Invalid song data format."); } stopProgression(); pageDefinitions = data.pageDefinitions || {}; songStructure = data.songStructure || []; tempoInput.value = data.tempo || 120; timeSignatureSelect.value = data.timeSignature || '4/4'; styleSelect.value = data.selectedStyle || 'basic'; outputModeSelect.value = data.outputMode || 'synth'; loopToggle.checked = data.isLooping || false; if (audioContextStarted) { setTransportTempo(parseInt(tempoInput.value, 10)); } updateTimeSignature(); updateStyle(); updateOutputMode(); updateLoopingState(); selectedPageName = null; currentlyPlayingPageIndex = -1; renderSongStructure(); renderProgression(); updatePlayStopButtons(); updateAddButtonState(); showMessage("Song data loaded successfully from file."); }
function saveToFile() { try { const songData = getSongData(); const jsonData = JSON.stringify(songData, null, 2); const blob = new Blob([jsonData], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'song.cbsong'; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); showMessage("Song saved to file."); console.log("Saved to file:", songData); } catch (error) { console.error("Error saving to file:", error); showMessage("Error saving file.", true); } }
function handleFileLoad(event) { const file = event.target.files[0]; if (!file) { return; } const reader = new FileReader(); reader.onload = (e) => { const fileContent = e.target.result; try { const loadedData = JSON.parse(fileContent); applyLoadedData(loadedData); console.log("Loaded from file:", loadedData); } catch (error) { console.error("Error parsing or applying loaded file:", error); showMessage(`Error loading file: ${error.message}`, true); } finally { fileInput.value = null; } }; reader.onerror = (e) => { console.error("Error reading file:", e); showMessage("Error reading file.", true); fileInput.value = null; }; reader.readAsText(file); }

// --- Global Init ---
initialize();
