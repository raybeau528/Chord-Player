// --- Import Dependencies ---
import * as UI from './ui.js';
import * as Main from './main.js';
import * as Playback from './playback.js';
import { DEFAULT_TYPE, BEAT_WIDTH_PX } from './constants.js';

// --- Resizing State ---
// These need to be managed here as resize handlers are here
let isResizing = false;
let resizingChordId = null;
let resizeStartX = 0;
let resizeStartDuration = 0;

// --- Chord Selection Logic ---

export function selectNote(note, button) {
    Main.setSelectedNote(note); // Update main state
    // Update UI highlights
    document.querySelectorAll('#note-buttons button').forEach(btn => btn.classList.remove('bg-blue-600', 'ring-2', 'ring-blue-400'));
    button.classList.add('bg-blue-600', 'ring-2', 'ring-blue-400');
    UI.updateSelectedChordDisplay();
    updateAddButtonState();
}

export function selectType(typeValue, typeName, button) {
    Main.setSelectedType({ value: typeValue, name: typeName }); // Update main state
    // Update UI highlights
    document.querySelectorAll('#type-buttons button').forEach(btn => btn.classList.remove('bg-blue-600', 'ring-2', 'ring-blue-400'));
    button.classList.add('bg-blue-600', 'ring-2', 'ring-blue-400');
    UI.updateSelectedChordDisplay();
    updateAddButtonState();
}

// --- Chord Modification Logic ---

export function updateAddButtonState() {
    const addChordButton = document.getElementById('add-chord-button');
    if (!addChordButton) return;
    addChordButton.disabled = !(Main.selectedNote && Main.selectedPageName);
    addChordButton.title = Main.selectedPageName ? "Add chord to selected page" : "Select a page first";
}

export function addChordToProgression() {
    const pageName = Main.selectedPageName;
    const note = Main.selectedNote;
    const type = Main.selectedType;

    if (!pageName || !Main.pageDefinitions.hasOwnProperty(pageName)) {
        UI.showMessage("Please select a page from the structure above first.", true);
        return;
    }
    if (note) {
        const typeInfo = type || DEFAULT_TYPE;
        const storeTypeName = (typeInfo.value === '') ? null : typeInfo.name; // Store null for major
        const defaultDuration = Main.beatsPerMeasure;
        console.log(`Adding chord to page "${pageName}", default duration: ${defaultDuration} beats`);

        const newChord = {
            id: `chord-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            note: note,
            typeValue: typeInfo.value,
            typeName: storeTypeName,
            duration: defaultDuration
        };
        // Directly modify the state (alternative: dispatch action/event)
        Main.pageDefinitions[pageName].push(newChord);
        UI.renderProgression(); // Re-render the chord area for the current page
        UI.updatePlayStopButtons();

        // Reset selection
        Main.setSelectedNote(null);
        Main.setSelectedType(null);
        document.querySelectorAll('#note-buttons button, #type-buttons button').forEach(btn => btn.classList.remove('bg-blue-600', 'ring-2', 'ring-blue-400'));
        UI.updateSelectedChordDisplay();
        updateAddButtonState();
    }
}

export function removeChord(chordIdToRemove) {
    const pageName = Main.selectedPageName;
    if (!pageName || !Main.pageDefinitions.hasOwnProperty(pageName)) {
        console.warn("Cannot remove chord: No page selected.");
        return;
    }
    Playback.stopProgression();
    const pageChords = Main.pageDefinitions[pageName];
    const initialLength = pageChords.length;
    // Directly modify state
    Main.pageDefinitions[pageName] = pageChords.filter(chord => chord.id !== chordIdToRemove);
    if (Main.pageDefinitions[pageName].length < initialLength) {
        console.log(`Removed chord ${chordIdToRemove} from page "${pageName}"`);
        UI.renderProgression();
        UI.updatePlayStopButtons();
    }
}

export function clearSelectedPageChords() {
    const pageName = Main.selectedPageName;
    if (!pageName || !Main.pageDefinitions.hasOwnProperty(pageName)) {
        UI.showMessage("Select a page first to clear its chords.", true);
        return;
    }
    Playback.stopProgression();
    console.log(`Clearing all chords from page "${pageName}"`);
    // Directly modify state
    Main.pageDefinitions[pageName] = [];
    UI.renderProgression();
    UI.updatePlayStopButtons();
}

// --- Double Click Handlers ---
export function handleNoteDoubleClick(note, button) {
     console.log(`Note DblClick: ${note}`);
     if (!Main.selectedPageName) {
         UI.showMessage("Select a page first!", true);
         return;
     }
     selectNote(note, button); // Select note
     Main.setSelectedType(DEFAULT_TYPE); // Set type to major
     addChordToProgression(); // Add
     button.classList.add('ring-green-500');
     setTimeout(() => button.classList.remove('ring-green-500'), 200);
}

export function handleTypeDoubleClick(typeValue, typeName, button) {
    console.log(`Type DblClick: ${typeName}`);
    if (!Main.selectedPageName) {
        UI.showMessage("Select a page first!", true);
        return;
    }
    if (!Main.selectedNote) {
        UI.showMessage("Select a root note first!", true);
        return;
    }
    selectType(typeValue, typeName, button); // Select type
    addChordToProgression(); // Add
    button.classList.add('ring-green-500');
    setTimeout(() => button.classList.remove('ring-green-500'), 200);
}


// --- Page Structure Modification ---

export function addPageToStructure(pageName) {
    if (!Main.pageDefinitions.hasOwnProperty(pageName)) {
        console.error(`Page definition "${pageName}" does not exist.`);
        return;
    }
    // Modify main state
    Main.songStructure.push(pageName);
    console.log(`Added page "${pageName}" to structure:`, Main.songStructure);
    UI.renderSongStructure();
    selectPage(pageName, Main.songStructure.length - 1); // Select the new page
}

export function selectPage(pageName, indexInStructure) {
    console.log(`Selecting page definition "${pageName}"`);
    if (!Main.pageDefinitions.hasOwnProperty(pageName)) {
        console.error(`Cannot select page definition "${pageName}": Not found.`);
        return;
    }
    // Modify main state
    Main.setSelectedPageName(pageName);
    Playback.stopProgression();
    UI.renderSongStructure(); // Update selected highlight
    UI.renderProgression(); // Render chords for selected page
    UI.updatePlayStopButtons();
}

export function removePageFromStructure(indexInStructure) {
    if (indexInStructure < 0 || indexInStructure >= Main.songStructure.length) {
        console.error("Invalid index for removing page from structure:", indexInStructure);
        return;
    }
    Playback.stopProgression();
    const removedPageName = Main.songStructure[indexInStructure];
    // Modify main state
    Main.songStructure.splice(indexInStructure, 1);
    console.log(`Removed page "${removedPageName}" at index ${indexInStructure}. Structure:`, Main.songStructure);

    if (Main.songStructure.length === 0) {
        Main.setSelectedPageName(null);
    } else if (Main.selectedPageName === removedPageName) {
         // If the definition of the removed instance was selected, deselect it
         // A better approach might be needed if multiple instances could be selected
         Main.setSelectedPageName(null);
    }

    UI.renderSongStructure();
    UI.renderProgression();
    UI.updatePlayStopButtons();
}

// --- Drag/Drop Logic for Chords ---
let draggedChordItem = null;
export function handleChordDragStart(e) {
     if (e.target.classList.contains('chord-block') && !e.target.classList.contains('resizing')) {
         draggedChordItem = e.target;
         setTimeout(() => e.target.classList.add('dragging'), 0);
         e.dataTransfer.effectAllowed = 'move';
         e.dataTransfer.setData('text/plain', e.target.id);
     } else { e.preventDefault(); }
}
export function handleChordDragOver(e) {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    const container = document.getElementById('chord-progression'); // Target chord container
    const afterElement = UI.getDragAfterElement(container, e.clientX);
    const draggableElements = [...container.querySelectorAll('.chord-block:not(.dragging)')];
    draggableElements.forEach(el => el.classList.remove('drag-over-before', 'drag-over-after'));
    container.classList.remove('drag-over');
    if (afterElement == null) { if (draggableElements.length > 0) { draggableElements[draggableElements.length - 1].classList.add('drag-over-after'); } else { container.classList.add('drag-over'); } }
    else { afterElement.classList.add('drag-over-before'); }
}
export function handleChordDragLeave(e) {
    const container = document.getElementById('chord-progression');
    const relatedTarget = e.relatedTarget; if (!container.contains(relatedTarget) || !relatedTarget?.closest('.chord-block')) { UI.clearDragOverStyles(); }
}
export function handleChordDrop(e) {
     e.preventDefault(); UI.clearDragOverStyles();
     const pageName = Main.selectedPageName;
     if (!draggedChordItem || !pageName || !Main.pageDefinitions.hasOwnProperty(pageName)) return;

     Playback.stopProgression();
     const id = e.dataTransfer.getData('text/plain');
     const draggedElement = document.getElementById(id);
     if (!draggedElement) return;

     const currentPageChords = Main.pageDefinitions[pageName];
     const container = document.getElementById('chord-progression');
     const afterElement = UI.getDragAfterElement(container, e.clientX);
     const draggedIndex = currentPageChords.findIndex(c => c.id === id);

     if (draggedIndex === -1) return;

     const draggedChord = currentPageChords[draggedIndex];
     // Modify state directly
     currentPageChords.splice(draggedIndex, 1);

     if (afterElement == null) {
          currentPageChords.push(draggedChord);
     } else {
         const dropTargetIndex = currentPageChords.findIndex(c => c.id === afterElement.id);
         if (dropTargetIndex !== -1) {
             currentPageChords.splice(dropTargetIndex, 0, draggedChord);
         } else {
              currentPageChords.push(draggedChord);
         }
     }
     draggedChordItem = null;
     UI.renderProgression();
     UI.updatePlayStopButtons();
}
export function handleChordDragEnd(e) {
     UI.clearDragOverStyles(); if (e.target.classList.contains('chord-block')) { e.target.classList.remove('dragging'); } draggedChordItem = null;
}

// --- Resize Logic for Chords ---
export function handleResizeMouseDown(e) {
    e.preventDefault(); e.stopPropagation();
    isResizing = true;
    const chordBlock = e.target.closest('.chord-block');
    resizingChordId = chordBlock.dataset.chordId;
    const pageName = Main.selectedPageName;
    const chordData = Main.pageDefinitions[pageName]?.find(c => c.id === resizingChordId);
    if (!chordData) { isResizing = false; return; }
    resizeStartX = e.clientX; resizeStartDuration = chordData.duration;
    document.body.classList.add('resizing'); chordBlock.classList.add('resizing');
    console.log(`Start resize for ${resizingChordId}, start duration: ${resizeStartDuration}`);
}

export function handleGlobalMouseMove(e) {
     if (!isResizing || !resizingChordId) return;
     const pageName = Main.selectedPageName;
     if (!pageName) return; // No page selected

     const currentX = e.clientX; const deltaX = currentX - resizeStartX;
     const deltaBeats = Math.round(deltaX / BEAT_WIDTH_PX);
     let newDuration = resizeStartDuration + deltaBeats;
     newDuration = Math.max(1, newDuration);

     const pageChords = Main.pageDefinitions[pageName];
     const chordIndex = pageChords?.findIndex(c => c.id === resizingChordId);

     if (chordIndex !== -1 && pageChords[chordIndex].duration !== newDuration) {
         // Modify state directly
         pageChords[chordIndex].duration = newDuration;
         console.log(`Resizing ${resizingChordId} in page "${pageName}" to duration: ${newDuration}`);
         // Update UI directly (could also call renderProgression, but this is faster)
         const chordBlock = document.getElementById(resizingChordId);
         if (chordBlock) {
             chordBlock.style.width = `${newDuration * BEAT_WIDTH_PX}px`;
             const durationDisplay = chordBlock.querySelector('.chord-duration-display');
             if(durationDisplay) durationDisplay.textContent = `${newDuration}b`;
         }
          Playback.stopProgression();
     }
}
export function handleGlobalMouseUp(e) {
     if (isResizing) {
         console.log(`End resize for ${resizingChordId}`);
         const chordBlock = document.getElementById(resizingChordId);
          if (chordBlock) { chordBlock.classList.remove('resizing'); }
         isResizing = false; resizingChordId = null;
         document.body.classList.remove('resizing');
         UI.updatePlayStopButtons();
     }
}
