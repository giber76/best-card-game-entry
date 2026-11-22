// Ember Court — procedural sound. Every effect is a short WebAudio oscillator
// phrase, so the game ships no audio files and makes no network request.
// The context starts on the first user gesture (browser autoplay policy);
// a muted flag (M key) silences everything.

let audioContext = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

// Call from a user gesture (click or key) so the context is allowed to start.
export function unlockAudio() {
  if (audioContext === null) {
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      audioContext = new Context();
    } catch {
      audioContext = null;
    }
  }
  if (audioContext !== null && audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

function tone(frequency, startAt, length, type, volume) {
  if (audioContext === null || muted) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + startAt);
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime + startAt);
  gain.gain.exponentialRampToValueAtTime(volume, audioContext.currentTime + startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + startAt + length);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(audioContext.currentTime + startAt);
  oscillator.stop(audioContext.currentTime + startAt + length + 0.05);
}

export function playFlip() {
  tone(620, 0, 0.07, 'triangle', 0.12);
  tone(880, 0.03, 0.06, 'triangle', 0.08);
}

export function playDeal() {
  tone(330, 0, 0.05, 'sine', 0.1);
  tone(440, 0.05, 0.05, 'sine', 0.1);
  tone(550, 0.1, 0.06, 'sine', 0.1);
}

export function playDamage() {
  tone(140, 0, 0.18, 'sawtooth', 0.14);
  tone(90, 0.05, 0.22, 'sawtooth', 0.12);
}

export function playHeal() {
  tone(520, 0, 0.1, 'sine', 0.1);
  tone(660, 0.08, 0.12, 'sine', 0.1);
}

export function playWin() {
  const notes = [523, 659, 784, 1047];
  for (let index = 0; index < notes.length; index += 1) {
    tone(notes[index], index * 0.12, 0.22, 'triangle', 0.14);
  }
  tone(1319, 0.5, 0.5, 'triangle', 0.12);
}

export function playLose() {
  const notes = [392, 330, 262, 196];
  for (let index = 0; index < notes.length; index += 1) {
    tone(notes[index], index * 0.14, 0.2, 'sine', 0.12);
  }
}
