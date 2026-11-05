/**
 * Voice Recognition Module for StudyDeck
 * Robust Web Speech API implementation with:
 * - Single-trigger guarantee: tracks utterance result indices so commands NEVER fire twice
 * - Automatic resurrection on recognition end
 * - Live Web Audio API microphone volume visualizer
 * - Natural language synonym vocabulary
 * - Real-time feedback HUD
 */

class VoiceController {
  constructor() {
    this.recognition = null;
    this.isActive = false;
    this.audioContext = null;
    this.analyser = null;
    this.mediaStream = null;
    this.meterInterval = null;
    this.lastTriggerTime = 0;
    this.triggerDebounceMs = 1400; // 1.4s cooldown prevents double triggers
    this.handledIndices = new Set(); // Tracks result indices already executed
    this.restartAttempts = 0;

    this.onCommand = null;
    this.onStatusChange = null;
    this.onVolumeChange = null;

    this.initSpeechAPI();
  }

  initSpeechAPI() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Web Speech API not supported in this browser.");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 3;

    this.recognition.onstart = () => {
      this.handledIndices.clear();
      this.restartAttempts = 0;
      if (this.onStatusChange) this.onStatusChange("Listening...", true);
    };

    this.recognition.onresult = (event) => {
      const now = Date.now();

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        // Prevent double execution on the same speech segment (e.g. interim then final)
        if (this.handledIndices.has(i)) continue;

        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        if (!transcript) continue;

        if (now - this.lastTriggerTime < this.triggerDebounceMs) continue;

        const matchedAction = this.matchCommand(transcript);
        if (matchedAction) {
          // Lock this result index so it never triggers again!
          this.handledIndices.add(i);
          this.lastTriggerTime = now;

          this.playChime(500, 750, 0.08);
          if (this.onCommand) {
            this.onCommand(matchedAction, transcript);
          }
          break;
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        this.isActive = false;
        this.stopAudioMeter();
        if (this.onStatusChange) this.onStatusChange("Mic Blocked", false);
        alert("Microphone permission was denied. Please allow microphone in your address bar.");
      }
    };

    this.recognition.onend = () => {
      this.handledIndices.clear();
      if (this.isActive) {
        const delay = Math.min(250 + this.restartAttempts * 150, 1500);
        this.restartAttempts++;
        setTimeout(() => {
          if (this.isActive) {
            try { this.recognition.start(); } catch (err) {}
          }
        }, delay);
      } else {
        if (this.onStatusChange) this.onStatusChange("Voice: Off", false);
      }
    };
  }

  matchCommand(phrase) {
    if (/\b(flip|turn|answer|show answer|question|show question|reveal|rotate)\b/.test(phrase)) {
      return 'flip';
    }
    if (/\b(next|forward|advance|ahead|go next|skip)\b/.test(phrase)) {
      return 'next';
    }
    if (/\b(back|previous|prev|prior|go back|last card|return)\b/.test(phrase)) {
      return 'back';
    }
    if (/\b(upload|import|pdf|deck|open file)\b/.test(phrase)) {
      return 'upload';
    }
    if (/\b(read|speak|listen|say it|read aloud)\b/.test(phrase)) {
      return 'read';
    }
    if (/\b(shuffle|random|randomize|mix)\b/.test(phrase)) {
      return 'shuffle';
    }
    if (/\b(restart|first|first card|start over|reset)\b/.test(phrase)) {
      return 'first';
    }
    if (/\b(short question|short questions|short)\b/.test(phrase)) {
      return 'filter-short';
    }
    if (/\b(long question|long questions|long)\b/.test(phrase)) {
      return 'filter-long';
    }
    if (/\b(mcq|mcqs|multiple choice)\b/.test(phrase)) {
      return 'filter-mcq';
    }
    if (/\b(all|all cards|entire deck)\b/.test(phrase)) {
      return 'filter-all';
    }
    return null;
  }

  async start() {
    if (!this.recognition) {
      alert("Web Speech API is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return false;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.setupAudioMeter(this.mediaStream);

      this.isActive = true;
      this.handledIndices.clear();
      this.restartAttempts = 0;
      try {
        this.recognition.start();
      } catch (e) {}

      this.playChime(600, 800, 0.1);
      return true;
    } catch (err) {
      console.error("Microphone access failed:", err);
      this.isActive = false;
      if (this.onStatusChange) this.onStatusChange("Mic access denied", false);
      alert("Microphone permission is required for voice control. Please allow it in the address bar.");
      return false;
    }
  }

  stop() {
    this.isActive = false;
    this.handledIndices.clear();
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
    this.stopAudioMeter();
    if (this.onStatusChange) this.onStatusChange("Voice: Off", false);
  }

  toggle() {
    if (this.isActive) {
      this.stop();
      return false;
    } else {
      return this.start();
    }
  }

  setupAudioMeter(stream) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      this.meterInterval = setInterval(() => {
        if (!this.isActive) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        if (this.onVolumeChange) this.onVolumeChange(normalized);
      }, 80);
    } catch (e) {
      console.warn("Could not setup audio meter:", e);
    }
  }

  stopAudioMeter() {
    if (this.meterInterval) clearInterval(this.meterInterval);
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (e) {}
    }
    if (this.onVolumeChange) this.onVolumeChange(0);
  }

  playChime(freq1, freq2, duration) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq1, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq2, ctx.currentTime + duration);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }
}

window.voiceController = new VoiceController();
