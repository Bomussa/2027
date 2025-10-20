// Simple Beep Sound for Notifications
// Just a simple "beep" tone - no complex sounds

/**
 * Play a simple beep sound for notifications
 * @param {string} priority - Priority level: 'urgent', 'high', 'normal', 'low'
 */
export function playSimpleBeep(priority = 'normal') {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Simple beep tone
    oscillator.frequency.value = 800; // Fixed frequency for all priorities
    gainNode.gain.value = 0.2; // Fixed volume
    
    // Duration based on priority
    let duration = 150; // Default 150ms
    
    switch(priority) {
      case 'urgent':
        duration = 300; // Longer beep for urgent
        break;
      case 'high':
        duration = 200;
        break;
      case 'normal':
        duration = 150;
        break;
      case 'low':
        duration = 100;
        break;
    }
    
    oscillator.start();
    setTimeout(() => oscillator.stop(), duration);
    
  } catch (e) {
    console.warn('Could not play beep sound:', e);
  }
}

/**
 * Play double beep for very urgent notifications
 */
export function playDoubleBeep() {
  playSimpleBeep('urgent');
  setTimeout(() => playSimpleBeep('urgent'), 200);
}

export default {
  playSimpleBeep,
  playDoubleBeep
};

