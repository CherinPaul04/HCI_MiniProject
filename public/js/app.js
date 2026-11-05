/**
 * StudyDeck HCI Core Application State & UI Coordinator
 */

class StudyDeckApp {
  constructor() {
    this.allCards = [];
    this.filteredCards = [];
    this.currentIndex = 0;
    this.isFlipped = false;
    this.activeFilter = 'all'; // 'all' | 'short' | 'long' | 'mcq'
    this.scanIndex = -1; // Switch-key navigation scan index

    // Embedded HCI Deck Fallback so app runs instantly even without server
    this.defaultDeck = [
      {
        id: 1, category: 'Short Question', type: 'short',
        q: '1. What is HCI?',
        a: 'HCI (Human-Computer Interaction) is the study of how humans interact with computers and how to design easy, efficient, and user-friendly systems.'
      },
      {
        id: 2, category: 'Short Question', type: 'short',
        q: '2. What is the main goal of HCI?',
        a: 'To make computer systems simple, efficient, comfortable, safe, and error-free for users.'
      },
      {
        id: 3, category: 'Short Question', type: 'short',
        q: '3. What is usability?',
        a: 'Usability means how easy and pleasant a system is to learn, use, remember, and how few mistakes it causes.'
      },
      {
        id: 4, category: 'Short Question', type: 'short',
        q: '4. What is Human-Centered Design (HCD)?',
        a: 'A design method that actively focuses on user needs, limits, skills, and behavior throughout the system development cycle.'
      },
      {
        id: 5, category: 'Short Question', type: 'short',
        q: '5. What is a mental model?',
        a: 'The internal conceptual picture or idea a user has in mind about how a system works.'
      },
      {
        id: 6, category: 'Short Question', type: 'short',
        q: '6. What is working memory?',
        a: 'Short-term memory used while actively thinking or doing tasks; it has very limited capacity (approx. 7 ± 2 chunks).'
      },
      {
        id: 7, category: 'Short Question', type: 'short',
        q: '7. What is long-term memory?',
        a: 'Memory that stores information for a long time, including rules, language, procedural skills, and knowledge.'
      },
      {
        id: 8, category: 'Short Question', type: 'short',
        q: '8. What is perception?',
        a: 'How users detect and understand information received through their senses, especially visual perception on digital screens.'
      },
      {
        id: 9, category: 'Short Question', type: 'short',
        q: '9. What are interaction styles?',
        a: 'The diverse ways users interact with computers: Command-Line Interfaces (CLI), Menus, Form fill-in, and Direct Manipulation.'
      },
      {
        id: 10, category: 'Short Question', type: 'short',
        q: '10. What is direct manipulation?',
        a: 'Interacting with on-screen visual objects directly, such as dragging icons, resizing windows, and clicking physical-like controls.'
      },
      {
        id: 11, category: 'Long Question', type: 'long',
        q: '1. Importance of HCI (Long Question)',
        a: 'HCI makes technology easier and better to use:\n\n• Reduces user errors & cognitive friction\n• Saves operational time and increases productivity\n• Elevates user satisfaction & engagement\n• Promotes universal accessibility for beginners, experts, elderly users, and people with disabilities.'
      },
      {
        id: 12, category: 'Long Question', type: 'long',
        q: '2. Human Information Processing Model (Long Question)',
        a: 'This cognitive model explains how humans process information:\n\n1. Sensory Memory – briefly captures raw environmental stimuli through senses.\n2. Working Memory – holds small amounts of information during active thought.\n3. Long-Term Memory – stores knowledge, associations, and rules permanently.\n\nDesign Rule: Systems must respect cognitive limits to avoid cognitive overload.'
      },
      {
        id: 13, category: 'Long Question', type: 'long',
        q: '3. Usability and Its Components (Long Question)',
        a: 'Usability is defined across five core quality attributes (Nielsen):\n\n• Learnability: How easy is it for first-time users?\n• Efficiency: Once learned, how quickly can users perform tasks?\n• Memorability: After a period of non-use, how easily can users return?\n• Errors: How few errors do users make, and how easily can they recover?\n• Satisfaction: How pleasant and comfortable is the system to use?'
      },
      {
        id: 14, category: 'Long Question', type: 'long',
        q: '4. Interaction Styles (Long Question)',
        a: 'The four major interaction paradigms each suit different users:\n\n• Command-Line Interface (CLI): Typing commands; fast for experts, steep learning curve.\n• Menus: Selecting options from lists; reduces memory load, great for novices.\n• Form Fill-in: Structured data entry fields; straightforward for repetitive data.\n• Direct Manipulation: Visual objects clicked & dragged; intuitive with instant feedback.'
      },
      {
        id: 15, category: 'Long Question', type: 'long',
        q: '5. Human Factors in Interaction Design (Long Question)',
        a: 'HCI designers must systematically accommodate critical human constraints:\n\n• Physical Factors: Vision, hearing, motor dexterity, ergonomics.\n• Psychological Factors: Stress, time pressure, fatigue.\n• Cognitive Factors: Attention span, working memory limits, mental models.\n• Experience Level: Designing for novices, intermediates, and seasoned experts.'
      },
      {
        id: 16, category: 'MCQ', type: 'mcq',
        q: '1. HCI stands for:\n\nA) Human Computer Interaction\nB) Human Control Interface\nC) Host Computer Integration\nD) Hardware Control Index',
        a: 'Correct Answer: A (Human Computer Interaction)',
        options: ['A) Human Computer Interaction', 'B) Human Control Interface', 'C) Host Computer Integration', 'D) Hardware Control Index'],
        correct: 'A'
      },
      {
        id: 17, category: 'MCQ', type: 'mcq',
        q: '2. Which memory has limited capacity?\n\nA) Working memory\nB) Long-term memory\nC) Sensory memory\nD) Permanent memory',
        a: 'Correct Answer: A (Working memory)',
        options: ['A) Working memory', 'B) Long-term memory', 'C) Sensory memory', 'D) Permanent memory'],
        correct: 'A'
      },
      {
        id: 18, category: 'MCQ', type: 'mcq',
        q: '3. Direct manipulation means:\n\nA) Writing terminal commands\nB) Dragging objects on screen\nC) Reading user manuals\nD) Waiting for background jobs',
        a: 'Correct Answer: B (Dragging objects on screen)',
        options: ['A) Writing terminal commands', 'B) Dragging objects on screen', 'C) Reading user manuals', 'D) Waiting for background jobs'],
        correct: 'B'
      },
      {
        id: 19, category: 'MCQ', type: 'mcq',
        q: '4. Which is NOT an interaction style?\n\nA) CLI\nB) Menus\nC) Direct Manipulation\nD) Electricity flow',
        a: 'Correct Answer: D (Electricity flow)',
        options: ['A) CLI', 'B) Menus', 'C) Direct Manipulation', 'D) Electricity flow'],
        correct: 'D'
      },
      {
        id: 20, category: 'MCQ', type: 'mcq',
        q: '5. Usability focuses on:\n\nA) Server hardware overclocking\nB) User satisfaction and ease-of-use\nC) CPU clock frequency\nD) Database query execution plan',
        a: 'Correct Answer: B (User satisfaction and ease-of-use)',
        options: ['A) Server hardware overclocking', 'B) User satisfaction and ease-of-use', 'C) CPU clock frequency', 'D) Database query execution plan'],
        correct: 'B'
      },
      {
        id: 21, category: 'MCQ', type: 'mcq',
        q: '6. Norman’s model of interaction is based on:\n\nA) Execution and evaluation\nB) Compiling and debugging\nC) Uploading and downloading\nD) Encryption and hashing',
        a: 'Correct Answer: A (Execution and evaluation)',
        options: ['A) Execution and evaluation', 'B) Compiling and debugging', 'C) Uploading and downloading', 'D) Encryption and hashing'],
        correct: 'A'
      },
      {
        id: 22, category: 'MCQ', type: 'mcq',
        q: '7. Expert users are:\n\nA) First-time system visitors\nB) Users who only use mouse clicks\nC) Users with high experience\nD) Casual occasional users',
        a: 'Correct Answer: C (Users with high experience)',
        options: ['A) First-time system visitors', 'B) Users who only use mouse clicks', 'C) Users with high experience', 'D) Casual occasional users'],
        correct: 'C'
      }
    ];
  }

  async init() {
    this.setupEventListeners();
    this.setupVoiceController();
    this.setupGazeController();

    // Load deck: try /api/deck first, fall back to default
    await this.loadInitialDeck();
  }

  async loadInitialDeck() {
    this.updateStatusFeedback("Loading HCI Flashcards...");
    try {
      const resp = await fetch('/api/deck');
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          this.allCards = data;
        } else {
          this.allCards = this.defaultDeck;
        }
      } else {
        this.allCards = this.defaultDeck;
      }
    } catch (e) {
      console.log("Using embedded HCI flashcard deck.", e);
      this.allCards = this.defaultDeck;
    }

    this.applyFilter('all');
    this.updateStatusFeedback(`Loaded complete HCI Lecture Deck (${this.allCards.length} cards).`);
  }

  applyFilter(category) {
    this.activeFilter = category;
    if (category === 'all') {
      this.filteredCards = this.allCards.slice();
    } else if (category === 'short') {
      this.filteredCards = this.allCards.filter(c => c.category === 'Short Question' || c.type === 'short');
    } else if (category === 'long') {
      this.filteredCards = this.allCards.filter(c => c.category === 'Long Question' || c.type === 'long');
    } else if (category === 'mcq') {
      this.filteredCards = this.allCards.filter(c => c.category === 'MCQ' || c.type === 'mcq');
    }

    // Update filter UI pills
    document.querySelectorAll('.filter-chip').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === category);
    });

    this.updateFilterCounts();
    this.currentIndex = 0;
    this.isFlipped = false;
    this.renderCard();
  }

  updateFilterCounts() {
    const totalAll = this.allCards.length;
    const totalShort = this.allCards.filter(c => c.category === 'Short Question' || c.type === 'short').length;
    const totalLong = this.allCards.filter(c => c.category === 'Long Question' || c.type === 'long').length;
    const totalMcq = this.allCards.filter(c => c.category === 'MCQ' || c.type === 'mcq').length;

    const elAll = document.getElementById('cntAll');
    if (elAll) elAll.textContent = totalAll;
    const elShort = document.getElementById('cntShort');
    if (elShort) elShort.textContent = totalShort;
    const elLong = document.getElementById('cntLong');
    if (elLong) elLong.textContent = totalLong;
    const elMcq = document.getElementById('cntMcq');
    if (elMcq) elMcq.textContent = totalMcq;
  }

  renderCard() {
    if (!this.filteredCards || this.filteredCards.length === 0) {
      document.getElementById('cardCounter').textContent = `0 of 0`;
      document.getElementById('qText').textContent = "No cards available in this category.";
      document.getElementById('aText').textContent = "";
      return;
    }

    const card = this.filteredCards[this.currentIndex];
    const total = this.filteredCards.length;

    // Counter
    document.getElementById('cardCounter').textContent = `Card ${this.currentIndex + 1} of ${total}`;

    // Badges
    const badgeCategory = card.category || (card.type === 'mcq' ? 'MCQ' : (card.type === 'long' ? 'Long Question' : 'Short Question'));
    document.getElementById('frontBadge').textContent = badgeCategory;
    document.getElementById('backBadge').textContent = `${badgeCategory} — Answer`;

    // Question content
    const qContainer = document.getElementById('qText');
    qContainer.innerHTML = '';

    if (card.options && card.options.length > 0) {
      // Format MCQ with options list
      const qTitle = document.createElement('div');
      qTitle.className = 'mcq-question-title';
      // Strip option letters from question title if present
      const cleanQ = card.q.split(/\n[A-D]\)/)[0].trim();
      qTitle.textContent = cleanQ;
      qContainer.appendChild(qTitle);

      const optsList = document.createElement('div');
      optsList.className = 'mcq-options-grid';
      card.options.forEach(opt => {
        const optEl = document.createElement('div');
        optEl.className = 'mcq-opt-item';
        optEl.textContent = opt;
        optsList.appendChild(optEl);
      });
      qContainer.appendChild(optsList);
    } else {
      qContainer.textContent = card.q;
    }

    // Answer content
    const aContainer = document.getElementById('aText');
    aContainer.innerHTML = '';

    if (card.type === 'mcq' || card.options) {
      // Highlight correct answer
      const ansBox = document.createElement('div');
      ansBox.className = 'mcq-answer-highlight';
      ansBox.innerHTML = `<strong>${this.escapeHtml(card.a)}</strong>`;
      aContainer.appendChild(ansBox);
    } else {
      // Format bullet points or lines
      const lines = card.a.split('\n');
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const p = document.createElement('p');
        p.className = trimmed.startsWith('•') || trimmed.match(/^\d+\./) ? 'card-bullet-line' : 'card-body-line';
        p.textContent = trimmed;
        aContainer.appendChild(p);
      });
    }

    // Flip card state
    const cardEl = document.getElementById('flashcard');
    cardEl.classList.toggle('flipped', this.isFlipped);

    // Auto-read via TTS if enabled
    if (window.ttsManager && window.ttsManager.autoRead) {
      this.speakCurrentCard();
    }
  }

  flipCard() {
    this.isFlipped = !this.isFlipped;
    const cardEl = document.getElementById('flashcard');
    cardEl.classList.toggle('flipped', this.isFlipped);
    this.updateStatusFeedback(this.isFlipped ? "Showing Answer." : "Showing Question.");

    if (window.ttsManager && window.ttsManager.autoRead) {
      this.speakCurrentCard();
    }
  }

  navigateCard(direction) {
    if (this.filteredCards.length === 0) return;
    this.currentIndex = (this.currentIndex + direction + this.filteredCards.length) % this.filteredCards.length;
    this.isFlipped = false;
    this.renderCard();
    this.updateStatusFeedback(`Card ${this.currentIndex + 1} of ${this.filteredCards.length}.`);
  }

  shuffleDeck() {
    for (let i = this.filteredCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.filteredCards[i], this.filteredCards[j]] = [this.filteredCards[j], this.filteredCards[i]];
    }
    this.currentIndex = 0;
    this.isFlipped = false;
    this.renderCard();
    this.showVoiceHeardNotification("Deck Shuffled!");
    this.updateStatusFeedback("Deck shuffled randomly.");
  }

  speakCurrentCard() {
    if (!this.filteredCards || this.filteredCards.length === 0) return;
    const card = this.filteredCards[this.currentIndex];
    const textToSpeak = this.isFlipped ? card.a : card.q;
    window.ttsManager.speak(textToSpeak);
    this.updateStatusFeedback("Reading aloud...");
  }

  updateStatusFeedback(msg) {
    const el = document.getElementById('statusFeedback');
    if (el) el.textContent = msg;
  }

  showVoiceHeardNotification(text) {
    const banner = document.getElementById('voiceFeedbackBanner');
    if (!banner) return;
    banner.textContent = text;
    banner.classList.add('visible');
    clearTimeout(this.feedbackTimer);
    this.feedbackTimer = setTimeout(() => {
      banner.classList.remove('visible');
    }, 2400);
  }

  // --- MULTIMODAL CONTROLLERS SETUP ---
  setupVoiceController() {
    const vc = window.voiceController;
    if (!vc) return;

    vc.onCommand = (command, rawPhrase) => {
      console.log(`Voice recognized command: "${command}" (phrase: "${rawPhrase}")`);
      this.showVoiceHeardNotification(`🎙️ Heard: "${rawPhrase}" → [${command.toUpperCase()}]`);

      switch (command) {
        case 'flip':
          this.flipCard();
          break;
        case 'next':
          this.navigateCard(1);
          break;
        case 'back':
          this.navigateCard(-1);
          break;
        case 'upload':
          if (typeof openFileModal === 'function') openFileModal();
          break;
        case 'read':
          this.speakCurrentCard();
          break;
        case 'shuffle':
          this.shuffleDeck();
          break;
        case 'first':
          this.currentIndex = 0;
          this.isFlipped = false;
          this.renderCard();
          break;
        case 'filter-short':
          this.applyFilter('short');
          break;
        case 'filter-long':
          this.applyFilter('long');
          break;
        case 'filter-mcq':
          this.applyFilter('mcq');
          break;
        case 'filter-all':
          this.applyFilter('all');
          break;
      }
    };

    vc.onStatusChange = (statusText, isActive) => {
      const pill = document.getElementById('pillVoice');
      const btn = document.getElementById('btnVoiceToggle');
      if (pill) {
        pill.classList.toggle('active', isActive);
        pill.querySelector('.pill-label').textContent = statusText;
      }
      if (btn) btn.classList.toggle('active', isActive);
    };

    vc.onVolumeChange = (level) => {
      const meterBars = document.querySelectorAll('.meter-bar');
      meterBars.forEach((bar, idx) => {
        const threshold = (idx + 1) * 20;
        bar.style.height = level >= threshold ? `${8 + (level / 100) * 14}px` : '4px';
        bar.style.opacity = level >= threshold ? '1' : '0.35';
      });
    };
  }

  setupGazeController() {
    const gc = window.gazeController;
    if (!gc) return;

    gc.onStatusChange = (statusText, isActive) => {
      const pill = document.getElementById('pillGaze');
      const btn = document.getElementById('btnGazeToggle');
      if (pill) {
        pill.classList.toggle('active', isActive);
        pill.querySelector('.pill-label').textContent = statusText;
      }
      if (btn) btn.classList.toggle('active', isActive);
    };
  }

  setupEventListeners() {
    // Switch-Key Navigation & Global Shortcuts
    document.addEventListener('keydown', (e) => {
      if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.handleSwitchScan();
      } else if (e.code === 'Enter') {
        e.preventDefault();
        this.handleSwitchSelect();
      } else if (e.key.toLowerCase() === 'f') {
        this.flipCard();
      } else if (e.code === 'ArrowRight') {
        this.navigateCard(1);
      } else if (e.code === 'ArrowLeft') {
        this.navigateCard(-1);
      } else if (e.key.toLowerCase() === 'v') {
        window.voiceController.toggle();
      } else if (e.key.toLowerCase() === 'g') {
        window.gazeController.toggle();
      } else if (e.key.toLowerCase() === 'c') {
        window.gazeController.openCalibrationModal();
      } else if (e.key.toLowerCase() === 's') {
        this.speakCurrentCard();
      }
    });
  }

  handleSwitchScan() {
    const acts = Array.from(document.querySelectorAll('.act-btn, .filter-chip'));
    if (acts.length === 0) return;
    this.scanIndex = (this.scanIndex + 1) % acts.length;
    acts.forEach((el, idx) => el.classList.toggle('scan-highlight', idx === this.scanIndex));
    this.updateStatusFeedback(`Scanning: focused on [${acts[this.scanIndex].innerText.replace(/\n/g, ' ')}]. Press Enter to select.`);
  }

  handleSwitchSelect() {
    const acts = Array.from(document.querySelectorAll('.act-btn, .filter-chip'));
    if (this.scanIndex >= 0 && acts[this.scanIndex]) {
      acts[this.scanIndex].click();
      acts[this.scanIndex].classList.remove('scan-highlight');
      this.scanIndex = -1;
    } else {
      this.flipCard();
    }
  }

  async handleFileUpload(file) {
    if (!file) return;
    this.updateStatusFeedback(`Extracting flashcards from "${file.name}"...`);

    try {
      const parsedCards = await window.documentParser.parseFile(file);
      if (parsedCards && parsedCards.length > 0) {
        this.allCards = parsedCards;
        this.applyFilter('all');
        this.updateStatusFeedback(`Successfully imported ${parsedCards.length} cards from ${file.name}!`);
        this.showVoiceHeardNotification(`Extracted ${parsedCards.length} Flashcards!`);
      } else {
        alert("No question & answer patterns found in this document. Please check the document format.");
      }
    } catch (err) {
      console.error(err);
      alert(`Error extracting document: ${err.message}`);
    }
  }

  escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// Global App instance
window.app = new StudyDeckApp();
window.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});

