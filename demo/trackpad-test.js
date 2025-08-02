let events = [];

function log(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logDiv = document.getElementById('log');
    logDiv.innerHTML += `[${timestamp}] ${message}<br>`;
    logDiv.scrollTop = logDiv.scrollHeight;
    console.log(message);
}

function updatePressure(value) {
    document.getElementById('pressure').textContent = `${Math.round(value)}g`;
}

function updateStatus(message, isSuccess = false) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = isSuccess ? 'info success' : 'info';
}

// Detect browser and device
function detectEnvironment() {
    const ua = navigator.userAgent;
    const isSafari = ua.includes('Safari') && !ua.includes('Chrome');
    const isChrome = ua.includes('Chrome');
    const isMac = ua.includes('Mac');
    
    document.getElementById('browser-info').innerHTML = `
        <strong>Browser:</strong> ${isSafari ? 'Safari' : isChrome ? 'Chrome' : 'Other'}<br>
        <strong>Platform:</strong> ${isMac ? 'macOS' : 'Other'}<br>
        <strong>User Agent:</strong> ${ua}
    `;
    
    log(`Environment: ${isSafari ? 'Safari' : isChrome ? 'Chrome' : 'Other'} on ${isMac ? 'macOS' : 'Other'}`);
    
    return { isSafari, isChrome, isMac };
}

// Setup all possible event listeners
function setupEventListeners() {
    const testArea = document.getElementById('test-area');
    const env = detectEnvironment();
    
    // Mouse events (works everywhere)
    testArea.addEventListener('mousedown', (e) => {
        log(`Mouse down - Button: ${e.button}, Buttons: ${e.buttons}`);
        updatePressure(50);
        updateStatus('Mouse event detected!', true);
    });
    
    testArea.addEventListener('mouseup', (e) => {
        log(`Mouse up`);
        updatePressure(0);
    });
    
    // Touch events (mobile/trackpad)
    testArea.addEventListener('touchstart', (e) => {
        log(`Touch start - Touches: ${e.touches.length}`);
        updatePressure(60);
        updateStatus('Touch event detected!', true);
        
        // Check for force
        if (e.touches[0] && e.touches[0].force !== undefined) {
            const force = e.touches[0].force;
            log(`Touch force: ${force}`);
            updatePressure(force * 100);
        }
        
        e.preventDefault();
    });
    
    testArea.addEventListener('touchend', (e) => {
        log(`Touch end`);
        updatePressure(0);
    });
    
    testArea.addEventListener('touchmove', (e) => {
        if (e.touches[0] && e.touches[0].force !== undefined) {
            const force = e.touches[0].force;
            updatePressure(force * 100);
            log(`Touch force move: ${force}`);
        }
        e.preventDefault();
    });
    
    // Pointer events (modern browsers)
    if ('PointerEvent' in window) {
        testArea.addEventListener('pointerdown', (e) => {
            log(`Pointer down - Type: ${e.pointerType}, Pressure: ${e.pressure}, Force: ${e.force || 'N/A'}`);
            if (e.pressure > 0) {
                updatePressure(e.pressure * 100);
                updateStatus('Pointer pressure detected!', true);
            } else {
                updatePressure(40);
                updateStatus('Pointer event detected!', true);
            }
        });
        
        testArea.addEventListener('pointermove', (e) => {
            if (e.buttons > 0 && e.pressure > 0) {
                updatePressure(e.pressure * 100);
                log(`Pointer pressure: ${e.pressure}`);
            }
        });
        
        testArea.addEventListener('pointerup', (e) => {
            log(`Pointer up`);
            updatePressure(0);
        });
    }
    
    // Safari Force Touch events
    if (env.isSafari) {
        // Try all variations of WebKit force events
        const forceEvents = [
            'webkitmouseforcedown',
            'webkitmouseforceup',
            'webkitmouseforcechanged',
            'webkitforcemousedown',
            'webkitforcemouseup',
            'touchforcechange'
        ];
        
        forceEvents.forEach(eventName => {
            testArea.addEventListener(eventName, (e) => {
                log(`${eventName} - Force: ${e.webkitForce || e.force || 'N/A'}`);
                const force = e.webkitForce || e.force || 0;
                if (force > 0) {
                    updatePressure(force * 100);
                    updateStatus(`Force Touch detected! (${eventName})`, true);
                }
            });
        });
        
        log('Safari Force Touch events registered');
    }
    
    // Chrome WebHID (requires user gesture)
    if (env.isChrome && 'hid' in navigator) {
        testArea.addEventListener('click', async () => {
            try {
                log('Attempting WebHID access...');
                const devices = await navigator.hid.requestDevice({
                    filters: [{ vendorId: 0x05ac }] // Apple
                });
                
                if (devices.length > 0) {
                    log(`WebHID device found: ${devices[0].productName}`);
                    updateStatus('WebHID device connected!', true);
                }
            } catch (error) {
                log(`WebHID error: ${error.message}`);
            }
        });
        
        log('Chrome WebHID support registered');
    }
    
    log('All event listeners registered');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    log('Page loaded, setting up tests...');
    setupEventListeners();
    updateStatus('Try clicking, touching, or applying pressure to the test area above');
});

// Fallback initialization
if (document.readyState !== 'loading') {
    setupEventListeners();
}
