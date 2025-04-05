// --- Import Dependencies ---
import * as UI from './ui.js';
// *** Import state directly from main ***
import { pageDefinitions, songStructure, selectedPageName, outputMode, selectedStyle, timeSignature, beatsPerMeasure, isLooping, setSelectedPageName } from './main.js'; // Removed beatSubdivision
import { noteNameToMidi, getNotesInChord, getMidiNotesInChord } from './utils.js';
import { MIDI_CHANNELS, DRUM_NOTES, MIDI_VELOCITY, PIANO_OCTAVE, BASS_OCTAVE, drumStyles } from './constants.js';

// --- Module State ---
let synth = null;
let transportLoopId = null;
let midiAccess = null;
let selectedMidiOutput = null;
let activeMidiNotes = { piano: [], bass: [], drums: [] };
let currentlyPlayingPageIndex = -1;
let currentLoopIteration = 0;
let currentChordIndexInPage = 0;
let currentHalfBeatInChord = 0;
// *** Define beatSubdivision locally ***
const beatSubdivision = '4n'; // Base subdivision for the loop (quarter notes relative to ACTUAL tempo)


// --- Initialization ---
export function initializePlayback(initialTempo) { /* ... no changes ... */ console.log("Initializing Playback..."); try { if (typeof Tone === 'undefined') throw new Error("Tone.js not loaded"); synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 } }).toDestination(); setTransportTempo(initialTempo); initializeMIDI(); console.log("Playback Initialized."); return true; } catch (error) { console.error("Failed to initialize Playback:", error); return false; } }

// --- Tempo ---
export function setTransportTempo(displayTempo) { /* ... no changes ... */ if (Tone && Tone.Transport) { const actualTempo = displayTempo * 2; Tone.Transport.bpm.value = actualTempo; console.log(`Tempo set: Display=${displayTempo} BPM, Actual=${actualTempo} BPM`); } }
export function updateTempo() { /* ... no changes ... */ const tempoInput = document.getElementById('tempo'); const displayTempo = parseInt(tempoInput.value, 10); if (!isNaN(displayTempo) && displayTempo >= 40 && displayTempo <= 240) { setTransportTempo(displayTempo); } else { tempoInput.value = Tone.Transport.bpm.value / 2; } }

// --- MIDI ---
function initializeMIDI() { /* ... no changes ... */ if (navigator.requestMIDIAccess) { navigator.requestMIDIAccess({ sysex: false }).then(onMIDISuccess, onMIDIFailure); } else { console.warn("Web MIDI API not supported."); } }
function onMIDISuccess(access) { /* ... (Calls UI.updateMidiStatus) ... */ console.log("MIDI Access Granted!"); midiAccess = access; populateMIDIOutputs(); UI.updateMidiStatus('available'); access.onstatechange = (event) => { console.log("MIDI state changed:", event.port.name, event.port.state); populateMIDIOutputs(); if (selectedMidiOutput && selectedMidiOutput.id === event.port.id && event.port.state === 'disconnected') { selectedMidiOutput = null; document.getElementById('midi-output').value = ""; UI.updateMidiStatus('available'); UI.showMessage(`MIDI device ${event.port.name} disconnected.`); stopProgression(); } }; }
function onMIDIFailure(msg) { /* ... (Calls UI.updateMidiStatus) ... */ console.error("Failed to get MIDI access -", msg); UI.showMessage("MIDI Access Denied or Failed.", true); UI.updateMidiStatus('unavailable'); }
export function populateMIDIOutputs() { /* ... (Calls UI.updateMidiStatus) ... */ const midiOutputSelect = document.getElementById('midi-output'); if (!midiOutputSelect || !midiAccess) return; const previousSelectionId = selectedMidiOutput ? selectedMidiOutput.id : midiOutputSelect.value; midiOutputSelect.innerHTML = '<option value="">No MIDI Output</option>'; let foundPrevious = false; if (midiAccess.outputs.size > 0) { midiAccess.outputs.forEach(output => { const option = document.createElement('option'); option.value = output.id; option.textContent = output.name; midiOutputSelect.appendChild(option); if (output.id === previousSelectionId) { foundPrevious = true; } }); if (foundPrevious) { midiOutputSelect.value = previousSelectionId; selectedMidiOutput = midiAccess.outputs.get(previousSelectionId); UI.updateMidiStatus('selected'); } else { selectedMidiOutput = null; midiOutputSelect.value = ""; UI.updateMidiStatus('available'); } } else { selectedMidiOutput = null; midiOutputSelect.value = ""; UI.updateMidiStatus(midiAccess ? 'available' : 'unavailable'); } midiOutputSelect.disabled = (outputMode === 'synth'); } // Uses imported outputMode
export function selectMidiOutput() { /* ... (Calls UI.updateMidiStatus) ... */ const midiOutputSelect = document.getElementById('midi-output'); const selectedId = midiOutputSelect.value; if (midiAccess && selectedId) { selectedMidiOutput = midiAccess.outputs.get(selectedId); if (!selectedMidiOutput) { console.warn("Selected MIDI output device not found."); } } else { selectedMidiOutput = null; } } // Status update handled in main.js listener
export function getSelectedMidiOutputName() { /* ... no changes ... */ return selectedMidiOutput?.name || 'Unknown'; }
export function getSelectedMidiOutput() { /* ... no changes ... */ return selectedMidiOutput; }
function sendMidiMessage(output, message, timestamp = 0) { /* ... no changes ... */ if (!output) return; try { output.send(message); } catch (error) { console.error("Error sending MIDI message:", error, message); } }
function sendMidiNoteOffs(time) { /* ... no changes ... */ if (!selectedMidiOutput) return; const now = Tone.Transport.seconds; const lookahead = 0.01; ['piano', 'bass', 'drums'].forEach(track => { const notesToTurnOff = activeMidiNotes[track].filter(note => note.offTime <= now + lookahead); const remainingNotes = activeMidiNotes[track].filter(note => note.offTime > now + lookahead); notesToTurnOff.forEach(noteInfo => { const channel = (track === 'piano') ? MIDI_CHANNELS.PIANO : (track === 'bass') ? MIDI_CHANNELS.BASS : MIDI_CHANNELS.DRUMS; sendMidiMessage(selectedMidiOutput, [0x80 | channel, noteInfo.note, 0], time); }); activeMidiNotes[track] = remainingNotes; }); }
function sendAllMidiNotesOff(output) { /* ... no changes ... */ if (!output) return; console.log("Sending All Notes Off to", output.name); for (let channel = 0; channel < 16; channel++) { sendMidiMessage(output, [0xB0 | channel, 123, 0]); } clearActiveMidiNotes(); }
function clearActiveMidiNotes() { /* ... no changes ... */ activeMidiNotes = { piano: [], bass: [], drums: [] }; }

// --- Playback Control ---

export function isTransportPlaying() { /* ... no changes ... */ return Tone && Tone.Transport.state === 'started'; }
export function getCurrentlyPlayingPageIndex() { /* ... no changes ... */ return currentlyPlayingPageIndex; }

export function playProgression() {
    // *** Use imported state directly ***
    if (songStructure.length === 0 || isTransportPlaying()) {
        // if (songStructure.length === 0) UI.showMessage("Add pages to the song structure first.", true); // Handled in main
        return;
    }

    Tone.start().then(() => {
        console.log("Starting playback of song structure...");
        // UI.showMessage("Starting playback..."); // Handled in main
        currentLoopIteration = 0;
        currentChordIndexInPage = 0;
        currentHalfBeatInChord = 0;
        currentlyPlayingPageIndex = 0;
        clearActiveMidiNotes();
        if (transportLoopId !== null) Tone.Transport.clear(transportLoopId);

        // Initial UI update for playback start
        setSelectedPageName(songStructure[currentlyPlayingPageIndex]); // Update state in main
        UI.renderProgression();
        UI.renderSongStructure();

        transportLoopId = Tone.Transport.scheduleRepeat(time => {
            // *** Use imported state directly ***
            const currentSongStructure = songStructure;
            const isLoopingActive = isLooping;
            const pageDefs = pageDefinitions;
            const currentBeatsPerMeasure = beatsPerMeasure;
            // *** Use local beatSubdivision ***
            const currentBeatSubdivision = beatSubdivision;

            // --- A. Check for End of Structure / Loop ---
            if (currentlyPlayingPageIndex < 0) currentlyPlayingPageIndex = 0;
            if (currentlyPlayingPageIndex >= currentSongStructure.length) {
                if (isLoopingActive && currentSongStructure.length > 0) {
                    console.log("Looping back to start.");
                    currentlyPlayingPageIndex = 0; currentLoopIteration = 0; currentChordIndexInPage = 0; currentHalfBeatInChord = 0;
                    setSelectedPageName(currentSongStructure[currentlyPlayingPageIndex]); // Update state in main
                    Tone.Draw.schedule(() => { UI.renderProgression(); UI.renderSongStructure(); }, time);
                } else {
                    console.log("End of song structure reached.");
                    stopProgression(); // Calls internal stop
                    Tone.Draw.schedule(() => { // Ensure UI updates after stopping
                         UI.clearHighlights(); UI.renderSongStructure(); UI.updatePlayStopButtons(); UI.updateMidiStatus(getSelectedMidiOutput() ? 'selected' : 'available');
                     }, time + 0.05); // Schedule slightly after stop
                    return;
                }
            }
            if (currentlyPlayingPageIndex >= currentSongStructure.length) { stopProgression(); return; }

            // --- B. Get Current Page/Chord Details ---
            const currentPageName = currentSongStructure[currentlyPlayingPageIndex];
            const currentPageChords = pageDefs[currentPageName] || [];

            if (currentPageChords.length === 0) { /* ... (skip logic unchanged) ... */ console.log(`Page "${currentPageName}" is empty, skipping.`); currentlyPlayingPageIndex++; currentChordIndexInPage = 0; currentHalfBeatInChord = 0; Tone.Draw.schedule(() => { UI.renderSongStructure(); }, time); return; }
            if (currentChordIndexInPage >= currentPageChords.length) { /* ... (skip logic unchanged) ... */ console.warn("Chord index out of bounds, advancing page."); currentlyPlayingPageIndex++; currentChordIndexInPage = 0; currentHalfBeatInChord = 0; Tone.Draw.schedule(() => { UI.renderSongStructure(); }, time); return; }

            const currentChord = currentPageChords[currentChordIndexInPage];
            const currentFullBeat = Math.floor(currentLoopIteration / 2);
            const currentMeasureBeat = (currentFullBeat % currentBeatsPerMeasure) + 1;
            const isDownBeat = currentLoopIteration % 2 === 0;
            const isFirstHalfBeatOfChord = (currentHalfBeatInChord === 0);

            // --- C. Stop Previous MIDI Notes ---
            if (outputMode === 'midi' && selectedMidiOutput) sendMidiNoteOffs(time); // Uses imported outputMode

            // --- D. Trigger Notes & Schedule UI Updates ---
            if (isFirstHalfBeatOfChord) {
                console.log(`Time: ${time.toFixed(2)}, PageIdx: ${currentlyPlayingPageIndex}, ChordIdx: ${currentChordIndexInPage}, Chord: ${currentChord.note}${currentChord.typeName ?? ''} (Dur: ${currentChord.duration})`);
                Tone.Draw.schedule(() => {
                    if (selectedPageName !== currentPageName) { // Uses imported selectedPageName
                        setSelectedPageName(currentPageName); // Update state in main
                        UI.renderProgression();
                        UI.renderSongStructure();
                    } else {
                        UI.highlightPlayingPage(currentlyPlayingPageIndex);
                    }
                    UI.highlightPlayingChord(currentChord.id);
                }, time);
                triggerChordAndBass(currentChord, time);
            }
            if (isDownBeat) {
                triggerDrums(currentMeasureBeat, time);
            }

            // --- E. Advance Counters ---
            currentLoopIteration++; currentHalfBeatInChord++;

            // --- F. Check if Chord Finished ---
            if (currentHalfBeatInChord >= currentChord.duration * 2) {
                currentChordIndexInPage++; currentHalfBeatInChord = 0;
                const halfBeatDurationSecs = Tone.Time(currentBeatSubdivision).toSeconds();
                Tone.Draw.schedule(() => { UI.clearHighlights(currentChord.id); }, time + halfBeatDurationSecs - 0.01);
                if (currentChordIndexInPage >= currentPageChords.length) {
                    console.log(`Finished page ${currentlyPlayingPageIndex} ("${currentPageName}")`);
                    currentlyPlayingPageIndex++; currentChordIndexInPage = 0;
                }
            }
        }, beatSubdivision); // Use local beatSubdivision

        Tone.Transport.start();
        UI.updatePlayStopButtons(); // Let UI module handle this
        if (outputMode === 'midi' && selectedMidiOutput) UI.updateMidiStatus('active'); // Let UI module handle this
    }).catch(e => { console.error("Error starting Tone.js:", e); /* UI.showMessage removed */ UI.updatePlayStopButtons(); });
}

export function stopProgression() {
    if (!isTransportPlaying()) return;
    Tone.Transport.stop();
    if (transportLoopId !== null) { Tone.Transport.clear(transportLoopId); transportLoopId = null; }
    if (synth && outputMode === 'synth') { try { synth.releaseAll(); } catch (e) {} } // Use imported outputMode
    if (selectedMidiOutput && outputMode === 'midi') { sendAllMidiNotesOff(selectedMidiOutput); } // Use imported outputMode
    clearActiveMidiNotes(); console.log("Playback stopped.");
    currentLoopIteration = 0; currentChordIndexInPage = 0; currentHalfBeatInChord = 0; currentlyPlayingPageIndex = -1;
    // UI updates are now triggered by the event listener in main.js after calling this
}


function triggerChordAndBass(chord, time) { /* ... (Uses local beatSubdivision, imported state/constants) ... */
     const halfBeatDurationSecs = Tone.Time(beatSubdivision).toSeconds(); const chordDurationSecs = halfBeatDurationSecs * chord.duration * 2;
     if (outputMode === 'synth' && synth) { const notesToPlaySynth = getNotesInChord(chord.note, chord.typeValue, PIANO_OCTAVE); if (notesToPlaySynth?.length > 0) { try { synth.triggerAttackRelease(notesToPlaySynth, chordDurationSecs, time); const bassNoteSynth = getNotesInChord(chord.note, '', BASS_OCTAVE); if(bassNoteSynth?.[0]) synth.triggerAttackRelease(bassNoteSynth[0], chordDurationSecs, time); } catch (error){ console.error("Tone.js synth error:", error); } } }
     else if (outputMode === 'midi' && selectedMidiOutput) { const pianoNotes = getMidiNotesInChord(chord.note, chord.typeValue, PIANO_OCTAVE); if (pianoNotes) { pianoNotes.forEach(midiNote => { sendMidiMessage(selectedMidiOutput, [0x90 | MIDI_CHANNELS.PIANO, midiNote, MIDI_VELOCITY], time); activeMidiNotes.piano.push({ note: midiNote, offTime: time + chordDurationSecs }); }); } const bassNote = noteNameToMidi(chord.note, BASS_OCTAVE); if (bassNote !== null) { sendMidiMessage(selectedMidiOutput, [0x90 | MIDI_CHANNELS.BASS, bassNote, MIDI_VELOCITY], time); activeMidiNotes.bass.push({ note: bassNote, offTime: time + chordDurationSecs }); } }
}
function triggerDrums(measureBeat, time) { /* ... (Uses imported state/constants) ... */
     const pattern = drumStyles[selectedStyle] || drumStyles['basic']; const drumDuration = 0.1; pattern.forEach(hit => { if (Math.floor(hit.beat) === measureBeat) { if (outputMode === 'synth' && synth) { try { /* synth.triggerAttackRelease('C6', '16n', time); */ } catch(e) {} } else if (outputMode === 'midi' && selectedMidiOutput) { sendMidiMessage(selectedMidiOutput, [0x90 | MIDI_CHANNELS.DRUMS, hit.note, MIDI_VELOCITY], time); activeMidiNotes.drums.push({ note: hit.note, offTime: time + drumDuration }); } } });
}
