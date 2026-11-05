/**
 * Text-to-Speech (TTS) Module for StudyDeck
 * Provides audio accessibility for reading flashcard questions & answers.
 */

class TTSManager {
  constructor() {
    this.synth = window.speechSynthesis;
    this.enabled = false;
    this.autoRead = false;
    this.voice = null;
    this.rate = 1.0;
    this.pitch = 1.0;

    if (this.synth) {
      this.initVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  initVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prefer natural sounding English voice
    this.voice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('David'))) || voices.find(v => v.lang.startsWith('en')) || voices[0];
  }

  speak(text, onEnd) {
    if (!this.synth) return;
    this.stop();

    if (!text || !text.trim()) return;

    // Clean up text for speech (replace bullets, citations)
    const cleanText = text
      .replace(/•/g, ', ')
      .replace(/–/g, ' - ')
      .replace(/\(cid:\d+\)/g, '')
      .replace(/https?:\/\/\S+/g, 'link');

    const utter = new SpeechSynthesisUtterance(cleanText);
    if (this.voice) utter.voice = this.voice;
    utter.rate = this.rate;
    utter.pitch = this.pitch;

    if (onEnd) utter.onend = onEnd;

    this.synth.speak(utter);
  }

  stop() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
  }

  toggleAutoRead() {
    this.autoRead = !this.autoRead;
    return this.autoRead;
  }
}

window.ttsManager = new TTSManager();

