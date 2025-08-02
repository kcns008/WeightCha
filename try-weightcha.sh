#!/bin/bash

# WeightCha One-Click Demo
# Fastest way to try WeightCha on your machine

set -e

DEMO_DIR="weightcha-demo"
DEMO_PORT=8080

echo "⚡ WeightCha One-Click Demo"
echo "=========================="
echo ""

# Check if port is available
if lsof -Pi :$DEMO_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "❌ Port $DEMO_PORT is already in use"
    echo "   Please close any applications using port $DEMO_PORT and try again"
    exit 1
fi

# Create demo directory
if [ -d "$DEMO_DIR" ]; then
    echo "📁 Removing existing demo directory..."
    rm -rf "$DEMO_DIR"
fi

echo "📁 Creating demo directory..."
mkdir "$DEMO_DIR"
cd "$DEMO_DIR"

# Create a simple HTML demo
echo "📝 Creating demo files..."

cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WeightCha Demo - Try Human Verification</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2d3748;
            text-align: center;
            margin-bottom: 10px;
        }
        .subtitle {
            text-align: center;
            color: #718096;
            margin-bottom: 40px;
            font-size: 18px;
        }
        .demo-form {
            max-width: 500px;
            margin: 0 auto;
        }
        input, textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 16px;
            margin-bottom: 20px;
            transition: border-color 0.2s;
        }
        input:focus, textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        #weightcha-container {
            margin: 30px 0;
            padding: 20px;
            border: 2px dashed #cbd5e0;
            border-radius: 8px;
            text-align: center;
            background-color: #f7fafc;
            min-height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: #718096;
        }
        .submit-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: transform 0.2s;
        }
        .submit-btn:hover {
            transform: translateY(-2px);
        }
        .submit-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        .info-box {
            background: #ebf8ff;
            border: 1px solid #bee3f8;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .info-box h3 {
            margin-top: 0;
            color: #2b6cb0;
        }
        .status {
            margin-top: 20px;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            font-weight: 600;
        }
        .status.success {
            background: #f0fff4;
            color: #22543d;
            border: 1px solid #9ae6b4;
        }
        .status.error {
            background: #fed7d7;
            color: #742a2a;
            border: 1px solid #feb2b2;
        }
        .device-check {
            font-size: 14px;
            color: #718096;
            text-align: center;
            margin-bottom: 20px;
        }
        .device-check.supported {
            color: #38a169;
        }
        .device-check.unsupported {
            color: #e53e3e;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 WeightCha Demo</h1>
        <p class="subtitle">Experience next-generation human verification</p>
        
        <div class="info-box">
            <h3>🎯 How it works</h3>
            <p>WeightCha uses your trackpad's pressure sensors to verify you're human. Simply apply gentle pressure when prompted - no clicking puzzles or traffic lights!</p>
            <p><strong>Best experience:</strong> Use a MacBook with Force Touch trackpad</p>
        </div>

        <div id="device-status" class="device-check">
            Checking device compatibility...
        </div>

        <form class="demo-form" id="demoForm">
            <input type="email" placeholder="Your email address" required>
            <textarea placeholder="Tell us what you think about WeightCha!" rows="4" required></textarea>
            
            <div id="weightcha-container">
                Click "Try WeightCha" to start verification
            </div>
            
            <button type="button" class="submit-btn" id="verifyBtn">Try WeightCha Verification</button>
            <button type="submit" class="submit-btn" id="submitBtn" style="display:none;">Submit Form</button>
        </form>

        <div id="status"></div>
    </div>

    <script src="https://unpkg.com/weightcha@latest/dist/weightcha.min.js"></script>
    <script>
        let verificationToken = null;
        const deviceStatus = document.getElementById('device-status');
        const verifyBtn = document.getElementById('verifyBtn');
        const submitBtn = document.getElementById('submitBtn');
        const status = document.getElementById('status');
        const form = document.getElementById('demoForm');

        // Check device compatibility
        function checkDevice() {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const hasForceTouch = 'ontouchforcechange' in document;
            
            if (isMac) {
                deviceStatus.className = 'device-check supported';
                deviceStatus.textContent = '✅ MacBook detected - Optimal experience available!';
            } else {
                deviceStatus.className = 'device-check';
                deviceStatus.textContent = '📱 Non-Mac device - Touch/mouse fallback will be used';
            }
        }

        // Initialize WeightCha
        const weightcha = new WeightCha({
            apiKey: 'demo-key',
            endpoint: 'https://demo-api.weightcha.com', // Demo endpoint
            theme: 'light'
        });

        // Handle verification
        verifyBtn.addEventListener('click', async () => {
            verifyBtn.disabled = true;
            verifyBtn.textContent = 'Initializing...';
            status.innerHTML = '';

            try {
                const token = await weightcha.verify('weightcha-container', {
                    onProgress: (progress) => {
                        verifyBtn.textContent = `Verifying... ${progress}%`;
                    },
                    onSuccess: (token) => {
                        verificationToken = token;
                        verifyBtn.style.display = 'none';
                        submitBtn.style.display = 'block';
                        status.innerHTML = '<div class="status success">✅ Human verification successful! You can now submit the form.</div>';
                    },
                    onError: (error) => {
                        throw error;
                    }
                });
            } catch (error) {
                console.error('Verification failed:', error);
                status.innerHTML = `<div class="status error">❌ Verification failed: ${error.message}</div>`;
                verifyBtn.disabled = false;
                verifyBtn.textContent = 'Try Again';
            }
        });

        // Handle form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (!verificationToken) {
                alert('Please complete human verification first!');
                return;
            }

            // Simulate form submission
            status.innerHTML = '<div class="status success">🎉 Form submitted successfully! Thank you for trying WeightCha.</div>';
            
            // Show success message
            setTimeout(() => {
                status.innerHTML += `
                    <div class="info-box" style="margin-top: 20px;">
                        <h3>🚀 Ready to integrate WeightCha?</h3>
                        <p><strong>Install:</strong> <code>npm install weightcha</code></p>
                        <p><strong>Docs:</strong> <a href="https://github.com/weightcha/weightcha" target="_blank">github.com/weightcha/weightcha</a></p>
                        <p><strong>Discord:</strong> <a href="https://discord.gg/weightcha" target="_blank">Join our community</a></p>
                    </div>
                `;
            }, 1000);
        });

        // Initialize
        checkDevice();
    </script>
</body>
</html>
EOF

# Create a simple HTTP server script
cat > server.py << 'EOF'
#!/usr/bin/env python3
import http.server
import socketserver
import webbrowser
import os

PORT = 8080

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"🌐 Demo server running at http://localhost:{PORT}")
        print("📱 Open the URL in your browser to try WeightCha")
        print("🛑 Press Ctrl+C to stop the server")
        
        # Try to open browser automatically
        try:
            webbrowser.open(f'http://localhost:{PORT}')
        except:
            pass
        
        httpd.serve_forever()
EOF

chmod +x server.py

echo "✅ Demo files created successfully!"
echo ""
echo "🚀 Starting demo server..."

# Check if Python is available
if command -v python3 &> /dev/null; then
    echo "📝 Using Python 3 server..."
    python3 server.py
elif command -v python &> /dev/null; then
    echo "📝 Using Python server..."
    python server.py
else
    # Fallback to a simple static file server
    echo "📝 Python not found, creating simple instructions..."
    echo ""
    echo "🌐 Demo ready! Open the following file in your browser:"
    echo "   file://$(pwd)/index.html"
    echo ""
    echo "📱 Or serve with any web server:"
    echo "   npx serve . -p $DEMO_PORT"
    echo "   php -S localhost:$DEMO_PORT"
    echo "   ruby -run -e httpd . -p $DEMO_PORT"
    echo ""
fi
