// --- Constants ---
export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const TYPES = { 'maj': '', 'm': 'm', '7': '7', 'M7': 'M7', 'm7': 'm7', 'dim': 'dim', 'aug': 'aug', 'sus4': 'sus4', 'sus2': 'sus2' };
export const DEFAULT_TYPE = { value: '', name: 'maj' }; // Internal representation for default major
export const MIDI_CHANNELS = { PIANO: 0, BASS: 1, DRUMS: 9 };
export const DRUM_NOTES = { KICK: 36, SNARE: 38, HIHAT_CLOSED: 42, HIHAT_OPEN: 46, CRASH: 49 };
export const MIDI_VELOCITY = 100;
export const PIANO_OCTAVE = 4;
export const BASS_OCTAVE = 2;
export const drumStyles = { 'basic': [ { note: DRUM_NOTES.KICK, beat: 1 }, { note: DRUM_NOTES.SNARE, beat: 3 } ], 'pop':   [ { note: DRUM_NOTES.KICK, beat: 1 }, { note: DRUM_NOTES.HIHAT_CLOSED, beat: 1 }, { note: DRUM_NOTES.HIHAT_CLOSED, beat: 2 }, { note: DRUM_NOTES.SNARE, beat: 3 }, { note: DRUM_NOTES.HIHAT_CLOSED, beat: 3 }, { note: DRUM_NOTES.HIHAT_CLOSED, beat: 4 }], 'rock':  [ { note: DRUM_NOTES.KICK, beat: 1 }, { note: DRUM_NOTES.SNARE, beat: 3 }, { note: DRUM_NOTES.CRASH, beat: 1 } ], 'latin': [ { note: DRUM_NOTES.KICK, beat: 1 }, { note: DRUM_NOTES.HIHAT_CLOSED, beat: 2.5 }, { note: DRUM_NOTES.SNARE, beat: 3 } ] };
// export const LOCAL_STORAGE_KEY = 'chordBuilderSongData'; // No longer needed
export const BEAT_WIDTH_PX = 40; // How many pixels represent one FULL beat width
