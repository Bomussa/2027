/**
 * Device Compatibility Fixes
 * Enhances user experience across iOS, Android, and Desktop devices
 * without altering the visual identity of the application
 */

/**
 * Detect the device type based on user agent
 * @returns {string} 'ios', 'android', or 'desktop'
 */
function detectDevice() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  // Check for iOS devices
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return 'ios';
  }
  
  // Check for Android devices
  if (/android/i.test(userAgent)) {
    return 'android';
  }
  
  // Default to desktop
  return 'desktop';
}

/**
 * Add device-specific class to the html tag
 */
function addDeviceClass() {
  const deviceType = detectDevice();
  const htmlElement = document.documentElement;
  
  // Add device-specific class
  htmlElement.classList.add(`device-${deviceType}`);
  
  // Also add a mobile class for easier targeting
  if (deviceType === 'ios' || deviceType === 'android') {
    htmlElement.classList.add('device-mobile');
  }
}

/**
 * Prevent horizontal scrolling and enable vertical scrolling
 */
function configureScrolling() {
  // Prevent horizontal scrolling on the body
  document.body.style.overflowX = 'hidden';
  
  // Ensure vertical scrolling is enabled
  document.body.style.overflowY = 'auto';
  
  // Add smooth scrolling behavior
  document.documentElement.style.scrollBehavior = 'smooth';
}

/**
 * Handle barcode query parameter
 * If ?barcode= is present in the URL, open it in the device's default browser
 */
function handleBarcodeLink() {
  const urlParams = new URLSearchParams(window.location.search);
  const barcodeValue = urlParams.get('barcode');
  
  if (barcodeValue) {
    // For mobile devices, try to open in external browser
    const deviceType = detectDevice();
    
    if (deviceType === 'ios' || deviceType === 'android') {
      // Create the full URL with barcode parameter
      const currentUrl = window.location.href;
      
      // Attempt to open in external browser
      // For iOS/Android, this will typically open in Safari/Chrome
      if (window.confirm('هل تريد فتح هذا الرابط في المتصفح الافتراضي؟\nDo you want to open this link in the default browser?')) {
        window.open(currentUrl, '_blank', 'noopener,noreferrer');
      }
    }
  }
}

/**
 * Initialize all device compatibility fixes
 */
function initDeviceFixes() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      addDeviceClass();
      configureScrolling();
      handleBarcodeLink();
    });
  } else {
    // DOM is already ready
    addDeviceClass();
    configureScrolling();
    handleBarcodeLink();
  }
}

// Auto-initialize when the script is loaded
initDeviceFixes();

// Export functions for testing purposes
export {
  detectDevice,
  addDeviceClass,
  configureScrolling,
  handleBarcodeLink,
  initDeviceFixes
};
