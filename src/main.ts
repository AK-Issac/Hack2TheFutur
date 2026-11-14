import Phaser from 'phaser';
import { gameConfig } from './game/config/gameConfig';
import { audioSystem } from './game/systems/AudioSystem';

let gameInstance: Phaser.Game | null = null;
let gameStarted: boolean = false;

// Exposed globally so GameScene can check whether to start gameplay
(window as any).__MILLENNIUM_STARTED = false;

function initGame() {
  if (!gameInstance) {
    gameInstance = new Phaser.Game(gameConfig);
    (window as any).__PHASER_GAME = gameInstance;
  }
}

function startGameFlow() {
  if (gameStarted) return;
  gameStarted = true;

  // Initialize Web Audio on user gesture
  audioSystem.init();

  // Signal the Phaser scene to begin gameplay
  (window as any).__MILLENNIUM_STARTED = true;

  const titleOverlay = document.getElementById('title-overlay');
  const controlsModal = document.getElementById('controls-modal');

  if (controlsModal) controlsModal.classList.add('hidden');

  if (titleOverlay) {
    titleOverlay.classList.add('hidden');
    setTimeout(() => {
      titleOverlay.style.display = 'none';
    }, 450);
  }
}

function setupUIEventListeners() {
  // Sound toggle button
  const soundBtn = document.getElementById('sound-toggle-btn');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      audioSystem.init();
      const muted = audioSystem.toggleMute();
      soundBtn.textContent = muted ? '🔇 SOUND: MUTED' : '🔊 SOUND: ON';
      soundBtn.style.borderColor = muted ? '#FF3B5C' : 'rgba(0, 217, 255, 0.4)';
      soundBtn.style.color = muted ? '#FF3B5C' : '#00D9FF';
    });
  }

  // Start Buttons
  const startBtn = document.getElementById('start-game-btn');
  const modalStartBtn = document.getElementById('modal-start-btn');
  if (startBtn) startBtn.addEventListener('click', startGameFlow);
  if (modalStartBtn) modalStartBtn.addEventListener('click', startGameFlow);

  // Controls Modal open/close
  const controlsBtn = document.getElementById('open-controls-btn');
  const helpBtn = document.getElementById('help-btn');
  const closeControlsBtn = document.getElementById('close-controls-btn');
  const controlsModal = document.getElementById('controls-modal');

  const openModal = () => {
    if (controlsModal) controlsModal.classList.remove('hidden');
  };

  const closeModal = () => {
    if (controlsModal) controlsModal.classList.add('hidden');
  };

  if (controlsBtn) controlsBtn.addEventListener('click', openModal);
  if (helpBtn) helpBtn.addEventListener('click', openModal);
  if (closeControlsBtn) closeControlsBtn.addEventListener('click', closeModal);
}

// Update top header simulation clock
function updateSystemClock() {
  const clockEl = document.getElementById('system-clock');
  if (!clockEl) return;

  let secondsLeft = 90;
  setInterval(() => {
    if (gameStarted && secondsLeft > 0) {
      secondsLeft--;
    }
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const timeStr = `12/31/1999 23:${58 + (minutes > 0 ? 1 : 0)}:${(seconds < 10 ? '0' : '') + seconds}`;
    clockEl.textContent = timeStr;
  }, 1000);
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  initGame();
  setupUIEventListeners();
  updateSystemClock();
});
