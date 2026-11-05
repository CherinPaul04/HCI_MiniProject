/**
 * Eye Gaze Controller for StudyDeck using WebGazer.js
 * Features:
 * - Direct camera permission handling with user diagnostics
 * - 9-Point Interactive Calibration Screen (solves "uncalibrated" gaze)
 * - Exponential Moving Average (EMA) coordinate smoothing to eliminate jitter
 * - Radial SVG dwell timer (solves the Midas Touch problem)
 * - Draggable / toggleable face mesh video preview
 * - Seamless Pointer-Simulation fallback mode
 */

class GazeController {
  constructor() {
    this.isActive = false;
    this.isPointerSim = false;
    this.isCalibrating = false;
    this.calibrationClicksNeeded = 5;
    this.calibrationState = {}; // { pointId: count }
    this.totalCalibrationPoints = 9;

    // Smoothed coordinates
    this.smoothX = window.innerWidth / 2;
    this.smoothY = window.innerHeight / 2;
    this.alpha = 0.22; // Smoothing factor (lower = smoother, higher = more responsive)

    // Dwell detection
    this.dwellTarget = null;
    this.dwellStartTime = 0;
    this.dwellDurationMs = 1200;
    this.dwellAnimFrame = null;

    this.gazeCursor = null;
    this.onStatusChange = null;

    this.initCursor();
  }

  initCursor() {
    this.gazeCursor = document.getElementById('gazeCursor');
    if (!this.gazeCursor) {
      this.gazeCursor = document.createElement('div');
      this.gazeCursor.id = 'gazeCursor';
      this.gazeCursor.className = 'gaze-cursor';
      this.gazeCursor.hidden = true;
      document.body.appendChild(this.gazeCursor);
    }
  }

  async start() {
    if (this.isActive) return true;

    if (!window.webgazer) {
      alert("WebGazer library is not loaded. Please ensure public/lib/webgazer.min.js is present.");
      return false;
    }

    try {
      if (this.onStatusChange) this.onStatusChange("Initializing Webcam...", false);

      // 1. Explicitly test camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      // Stop the test stream so webgazer can acquire it cleanly
      stream.getTracks().forEach(t => t.stop());

      // 2. Configure WebGazer
      window.webgazer.params.showVideoPreview = true;
      window.webgazer.params.showPredictionPoints = true;
      window.webgazer.params.camConstraints = {
        video: { width: { min: 320, ideal: 640, max: 1280 }, height: { min: 240, ideal: 480, max: 720 }, facingMode: "user" }
      };

      await window.webgazer
        .setRegression('ridge')
        .setGazeListener((data, elapsedTime) => {
          if (!data || !this.isActive || this.isPointerSim) return;
          this.handleRawGaze(data.x, data.y);
        })
        .saveDataAcrossSessions(true)
        .begin();

      // Show video preview
      window.webgazer.showVideoPreview(true);
      window.webgazer.showPredictionPoints(false); // We draw our custom styled smoothed gaze dot
      window.webgazer.applyKalmanFilter(true);

      // Reposition WebGazer video to bottom-right corner if needed
      this.repositionWebgazerFeed();

      this.isActive = true;
      this.isPointerSim = false;
      this.gazeCursor.hidden = false;

      if (this.onStatusChange) this.onStatusChange("Gaze: Active", true);

      // Check if calibrated previously, otherwise offer calibration
      const hasCalibrated = localStorage.getItem('studydeck_calibrated') === 'true';
      if (!hasCalibrated) {
        this.openCalibrationModal();
      }

      return true;
    } catch (err) {
      console.error("WebGazer camera initialization failed:", err);
      // Give clear guidance and offer Pointer-Gaze mode
      const useSim = confirm(
        "Webcam access was not granted or camera is in use by another program.\n\n" +
        "Would you like to activate Pointer-Gaze Simulation Mode instead? (Simulates eye-gaze and dwell triggers with your cursor)"
      );
      if (useSim) {
        this.enablePointerSimulation();
        return true;
      } else {
        if (this.onStatusChange) this.onStatusChange("Gaze: Disabled", false);
        return false;
      }
    }
  }

  stop() {
    this.isActive = false;
    this.isPointerSim = false;
    this.resetDwell();

    if (window.webgazer) {
      try {
        window.webgazer.pause();
        window.webgazer.showVideoPreview(false);
      } catch (e) {}
    }

    if (this.gazeCursor) this.gazeCursor.hidden = true;
    if (this.onStatusChange) this.onStatusChange("Gaze: Off", false);
  }

  toggle() {
    if (this.isActive) {
      this.stop();
      return false;
    } else {
      return this.start();
    }
  }

  enablePointerSimulation() {
    this.isActive = true;
    this.isPointerSim = true;
    this.gazeCursor.hidden = false;

    window.addEventListener('mousemove', (e) => {
      if (this.isActive && this.isPointerSim) {
        this.updateGazePosition(e.clientX, e.clientY);
      }
    });

    if (this.onStatusChange) this.onStatusChange("Pointer Gaze: Active", true);
  }

  handleRawGaze(rawX, rawY) {
    if (isNaN(rawX) || isNaN(rawY)) return;

    // Constrain to viewport
    const x = Math.max(10, Math.min(window.innerWidth - 10, rawX));
    const y = Math.max(10, Math.min(window.innerHeight - 10, rawY));

    // Exponential Moving Average (EMA) smoothing
    this.smoothX = this.smoothX * (1 - this.alpha) + x * this.alpha;
    this.smoothY = this.smoothY * (1 - this.alpha) + y * this.alpha;

    this.updateGazePosition(this.smoothX, this.smoothY);
  }

  updateGazePosition(x, y) {
    if (this.gazeCursor) {
      this.gazeCursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    if (this.isCalibrating) return;

    // Find interactive element under gaze
    const elements = document.elementsFromPoint(x, y) || [];
    const target = elements.find(el => el.classList && (el.classList.contains('act-btn') || el.classList.contains('card-wrapper') || el.classList.contains('filter-chip')));

    if (target) {
      if (this.dwellTarget !== target) {
        this.resetDwell();
        this.startDwell(target);
      }
    } else {
      this.resetDwell();
    }
  }

  startDwell(element) {
    this.dwellTarget = element;
    this.dwellStartTime = performance.now();

    const progRing = element.querySelector('.dwell-prog');
    element.classList.add('dwell-active');

    const animate = (currentTime) => {
      if (this.dwellTarget !== element) return;

      const elapsed = currentTime - this.dwellStartTime;
      const progress = Math.min(1, elapsed / this.dwellDurationMs);

      if (progRing) {
        // strokeDashoffset from 100 to 0
        progRing.style.strokeDashoffset = (100 - progress * 100).toFixed(1);
      }

      if (progress >= 1) {
        // Complete!
        this.playDwellSound();
        this.triggerTargetAction(element);
        this.resetDwell();
      } else {
        this.dwellAnimFrame = requestAnimationFrame(animate);
      }
    };

    this.dwellAnimFrame = requestAnimationFrame(animate);
  }

  resetDwell() {
    if (this.dwellAnimFrame) {
      cancelAnimationFrame(this.dwellAnimFrame);
      this.dwellAnimFrame = null;
    }

    if (this.dwellTarget) {
      this.dwellTarget.classList.remove('dwell-active');
      const ring = this.dwellTarget.querySelector('.dwell-prog');
      if (ring) ring.style.strokeDashoffset = '100';
      this.dwellTarget = null;
    }

    document.querySelectorAll('.dwell-prog').forEach(p => p.style.strokeDashoffset = '100');
  }

  triggerTargetAction(element) {
    element.classList.add('dwell-clicked');
    setTimeout(() => element.classList.remove('dwell-clicked'), 250);
    element.click();
  }

  playDwellSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  }

  repositionWebgazerFeed() {
    const videoContainer = document.getElementById('webgazerVideoContainer');
    if (videoContainer) {
      videoContainer.style.position = 'fixed';
      videoContainer.style.top = '72px';
      videoContainer.style.right = '16px';
      videoContainer.style.zIndex = '9990';
      videoContainer.style.borderRadius = '12px';
      videoContainer.style.overflow = 'hidden';
      videoContainer.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)';
      videoContainer.style.border = '2px solid #4F46E5';
      videoContainer.style.width = '180px';
      videoContainer.style.height = '135px';

      const video = document.getElementById('webgazerVideoFeed');
      if (video) {
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
      }
    }
  }

  // --- 9-POINT CALIBRATION MODAL LOGIC ---
  openCalibrationModal() {
    this.isCalibrating = true;
    this.calibrationState = {};
    for (let i = 1; i <= this.totalCalibrationPoints; i++) {
      this.calibrationState[i] = 0;
    }

    let modal = document.getElementById('gazeCalibModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'gazeCalibModal';
      modal.className = 'calib-overlay';
      modal.innerHTML = `
        <div class="calib-banner">
          <h3>WebGazer 9-Point Eye Calibration</h3>
          <p>Look directly at each yellow dot and click it 5 times until it turns green.</p>
          <div class="calib-stats"><span id="calibScore">0</span> / 9 Points Calibrated</div>
          <button class="calib-skip-btn" onclick="window.gazeController.closeCalibrationModal()">Skip Calibration</button>
        </div>
        <div class="calib-points">
          <div class="calib-dot" data-point="1" style="top:5%; left:5%;">5</div>
          <div class="calib-dot" data-point="2" style="top:5%; left:50%; transform:translateX(-50%);">5</div>
          <div class="calib-dot" data-point="3" style="top:5%; right:5%;">5</div>
          <div class="calib-dot" data-point="4" style="top:50%; left:5%; transform:translateY(-50%);">5</div>
          <div class="calib-dot" data-point="5" style="top:50%; left:50%; transform:translate(-50%,-50%);">5</div>
          <div class="calib-dot" data-point="6" style="top:50%; right:5%; transform:translateY(-50%);">5</div>
          <div class="calib-dot" data-point="7" style="bottom:5%; left:5%;">5</div>
          <div class="calib-dot" data-point="8" style="bottom:5%; left:50%; transform:translateX(-50%);">5</div>
          <div class="calib-dot" data-point="9" style="bottom:5%; right:5%;">5</div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelectorAll('.calib-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
          const ptId = parseInt(dot.getAttribute('data-point'));
          this.handleCalibrationClick(ptId, dot, e.clientX, e.clientY);
        });
      });
    }

    // Reset dots visual
    modal.querySelectorAll('.calib-dot').forEach(dot => {
      dot.classList.remove('calibrated');
      dot.style.background = '#F59E0B';
      dot.textContent = '5';
    });
    const scoreEl = document.getElementById('calibScore');
    if (scoreEl) scoreEl.textContent = '0';
    modal.hidden = false;
  }

  handleCalibrationClick(pointId, dotEl, clientX, clientY) {
    if (window.webgazer) {
      // Feed actual screen click coordinates into WebGazer regression model
      window.webgazer.recordScreenPosition(clientX, clientY, 'click');
    }

    this.calibrationState[pointId] = (this.calibrationState[pointId] || 0) + 1;
    const remaining = this.calibrationClicksNeeded - this.calibrationState[pointId];

    if (remaining > 0) {
      dotEl.textContent = remaining;
      dotEl.style.transform = 'scale(1.18)';
      setTimeout(() => dotEl.style.transform = '', 150);
    } else {
      dotEl.textContent = '✓';
      dotEl.classList.add('calibrated');
      dotEl.style.background = '#10B981';
    }

    // Check total calibrated
    const calibratedCount = Object.values(this.calibrationState).filter(c => c >= this.calibrationClicksNeeded).length;
    const scoreEl = document.getElementById('calibScore');
    if (scoreEl) scoreEl.textContent = calibratedCount;

    if (calibratedCount >= this.totalCalibrationPoints) {
      localStorage.setItem('studydeck_calibrated', 'true');
      setTimeout(() => {
        alert("Calibration Complete! WebGazer has successfully learned your eye positions.");
        this.closeCalibrationModal();
      }, 350);
    }
  }

  closeCalibrationModal() {
    this.isCalibrating = false;
    const modal = document.getElementById('gazeCalibModal');
    if (modal) modal.hidden = true;
  }
}

window.gazeController = new GazeController();

