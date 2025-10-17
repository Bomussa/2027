/**
 * Device Compatibility Fixes
 * Handles device detection, scrolling behavior, and barcode link handling
 */

/**
 * Detect the device type
 * @returns {string} 'ios', 'android', or 'desktop'
 */
function detectDevice() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  // iOS detection
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    return 'ios';
  }
  
  // Android detection
  if (/android/i.test(userAgent)) {
    return 'android';
  }
  
  // Default to desktop
  return 'desktop';
}

/**
 * Add device-specific class to the HTML element
 */
function addDeviceClass() {
  const device = detectDevice();
  const htmlElement = document.documentElement;
  
  // Add device class
  htmlElement.classList.add(`device-${device}`);
  
  // Add mobile class for iOS and Android
  if (device === 'ios' || device === 'android') {
    htmlElement.classList.add('device-mobile');
  }
}

/**
 * Prevent horizontal scrolling while allowing vertical scrolling
 */
function fixScrollBehavior() {
  // Prevent horizontal scroll
  document.body.style.overflowX = 'hidden';
  document.documentElement.style.overflowX = 'hidden';
  
  // Ensure vertical scroll is allowed
  document.body.style.overflowY = 'auto';
  document.documentElement.style.overflowY = 'auto';
  
  // Enable smooth scrolling
  document.documentElement.style.scrollBehavior = 'smooth';
}

/**
 * Handle barcode links in query strings
 * Automatically opens barcode links in the device's default browser
 */
function handleBarcodeLinks() {
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const barcodeParam = urlParams.get('barcode');
  
  if (barcodeParam) {
    // Create the full barcode URL
    const barcodeUrl = barcodeParam.startsWith('http') 
      ? barcodeParam 
      : `https://${barcodeParam}`;
    
    // Open in default browser
    // For mobile devices, this will open in the native browser
    // For desktop, it will open in a new tab
    window.open(barcodeUrl, '_blank');
    
    // Remove the barcode parameter from the URL to clean up
    urlParams.delete('barcode');
    const newUrl = urlParams.toString() 
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname;
    
    // Update URL without reload
    window.history.replaceState({}, '', newUrl);
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
      fixScrollBehavior();
      handleBarcodeLinks();
    });
  } else {
    // DOM is already ready
    addDeviceClass();
    fixScrollBehavior();
    handleBarcodeLinks();
  }
}

// Auto-initialize when module is loaded
initDeviceFixes();

// Export for potential external use
export { detectDevice, addDeviceClass, fixScrollBehavior, handleBarcodeLinks, initDeviceFixes };
