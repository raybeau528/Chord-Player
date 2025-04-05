// --- Chord & MIDI Note Conversion ---
import { NOTES } from './constants.js'; // Import NOTES constant

export function noteNameToMidi(noteName, octave) {
    const baseIndex = NOTES.indexOf(noteName);
    if (baseIndex === -1) return null;
    // MIDI note C4 = 60
    const midiNote = 12 * octave + baseIndex; // Adjust base octave if needed (e.g., 12 * (octave + 1) if C0=0)
    // Assuming C4=60 standard for now.
    return midiNote;
}

export function getMidiNotesInChord(rootNote, typeValue, octave) {
    const rootMidi = noteNameToMidi(rootNote, octave);
    if (rootMidi === null) return null;

    let intervals = []; // Semitone intervals from root
     switch (typeValue) {
        case '': intervals = [0, 4, 7]; break; // Major
        case 'm': intervals = [0, 3, 7]; break; // Minor
        case '7': intervals = [0, 4, 7, 10]; break; // Dom 7th
        case 'M7': intervals = [0, 4, 7, 11]; break; // Maj 7th
        case 'm7': intervals = [0, 3, 7, 10]; break; // Min 7th
        case 'dim': intervals = [0, 3, 6]; break; // Diminished
        case 'aug': intervals = [0, 4, 8]; break; // Augmented
        case 'sus4': intervals = [0, 5, 7]; break; // Sus4
        case 'sus2': intervals = [0, 2, 7]; break; // Sus2
        default: intervals = [0, 4, 7]; // Default to major
    }

    // Calculate MIDI notes and ensure they are within valid range 0-127
    return intervals.map(interval => rootMidi + interval).filter(note => note >= 0 && note <= 127);
}

// Function used by Tone.js (needs note name + octave string)
export function getNotesInChord(rootNote, typeValue, octave) {
    const midiNotes = getMidiNotesInChord(rootNote, typeValue, octave);
    if (!midiNotes) return null;
    // Convert MIDI numbers back to Tone.js format (e.g., 'C4')
    return midiNotes.map(midiNote => {
         const noteIndex = midiNote % 12;
         const noteOctave = Math.floor(midiNote / 12); // Calculate octave from MIDI note number
         return NOTES[noteIndex] + noteOctave;
     });
}
