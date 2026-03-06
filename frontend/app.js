// API Base URL - empty string for same-origin (Vercel), or localhost for local dev
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

// DOM Elements
const statusText = document.getElementById('status-text');
const statusIndicator = document.getElementById('status-indicator');
const promptInput = document.getElementById('prompt-input');
const enhanceBtn = document.getElementById('enhance-btn');
const enhancedPromptContainer = document.getElementById('enhanced-prompt-container');
const enhancedPromptDisplay = document.getElementById('enhanced-prompt-display');
const approveBtn = document.getElementById('approve-btn');
const editBtn = document.getElementById('edit-btn');
const generateImageBtn = document.getElementById('generate-image-btn');
const generatedImageContainer = document.getElementById('generated-image-container');
const generatedImage = document.getElementById('generated-image');
const downloadImageBtn = document.getElementById('download-image-btn');
const imageUpload = document.getElementById('image-upload');
const fileName = document.getElementById('file-name');
const uploadPreviewContainer = document.getElementById('upload-preview-container');
const uploadPreview = document.getElementById('upload-preview');
const analyzeBtn = document.getElementById('analyze-btn');
const analysisContainer = document.getElementById('analysis-container');
const analysisDisplay = document.getElementById('analysis-display');
const generateVariationBtn = document.getElementById('generate-variation-btn');
const variationImageContainer = document.getElementById('variation-image-container');
const variationImage = document.getElementById('variation-image');
const downloadVariationBtn = document.getElementById('download-variation-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

// State
let currentEnhancedPrompt = '';
let approvedPrompt = '';
let uploadedImageBase64 = '';
let uploadedImageMimeType = '';
let currentAnalysis = '';

// Utility Functions
function setStatus(text, state = 'ready') {
    statusText.textContent = text;
    statusIndicator.className = 'status-dot ' + state;
}

function showLoading(message = 'Processing...') {
    loadingText.textContent = message;
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

function showError(message) {
    setStatus(message, 'error');
    setTimeout(() => setStatus('Ready', 'ready'), 5000);
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

// Download image function
function downloadImage(base64Data, filename) {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${base64Data}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Section 1: Text to Image Functions

// Enhance Prompt
async function enhancePrompt() {
    const prompt = promptInput.value.trim();
    if (!prompt) {
        showError('Please enter a prompt');
        return;
    }

    try {
        showLoading('Enhancing your prompt...');
        setStatus('Enhancing...', 'processing');

        const response = await fetch(`${API_BASE_URL}/api/enhance-and-analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'enhance',
                textPrompt: prompt
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to enhance prompt');
        }

        currentEnhancedPrompt = data.result;
        enhancedPromptDisplay.textContent = currentEnhancedPrompt;
        enhancedPromptContainer.classList.remove('hidden');

        setStatus('Prompt enhanced!', 'ready');
    } catch (error) {
        console.error('Enhance error:', error);
        showError('Error: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Approve Enhanced Prompt
function approvePrompt() {
    approvedPrompt = currentEnhancedPrompt;
    generateImageBtn.disabled = false;
    setStatus('Prompt approved!', 'ready');

    // Add visual feedback
    enhancedPromptContainer.style.borderColor = '#22c55e';
}

// Edit Prompt (copy to input)
function editPrompt() {
    promptInput.value = currentEnhancedPrompt;
    enhancedPromptContainer.classList.add('hidden');
    generateImageBtn.disabled = true;
    approvedPrompt = '';
    setStatus('Edit your prompt', 'ready');
}

// Generate Image
async function generateImage() {
    if (!approvedPrompt) {
        showError('Please approve a prompt first');
        return;
    }

    try {
        showLoading('Generating your image...');
        setStatus('Generating...', 'processing');

        const response = await fetch(`${API_BASE_URL}/api/generate-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ approvedPrompt })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate image');
        }

        generatedImage.src = `data:image/png;base64,${data.image}`;
        generatedImage.dataset.base64 = data.image;
        generatedImageContainer.classList.remove('hidden');

        setStatus('Image generated!', 'ready');
    } catch (error) {
        console.error('Generate error:', error);
        showError('Error: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Download Generated Image
function downloadGeneratedImage() {
    const base64 = generatedImage.dataset.base64;
    if (base64) {
        downloadImage(base64, 'generated-image.png');
    }
}

// Section 2: Image to Variation Functions

// Handle File Upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    fileName.textContent = file.name;
    uploadedImageMimeType = file.type;

    try {
        uploadedImageBase64 = await fileToBase64(file);

        // Show preview
        uploadPreview.src = `data:${file.type};base64,${uploadedImageBase64}`;
        uploadPreviewContainer.classList.remove('hidden');

        // Enable analyze button
        analyzeBtn.disabled = false;

        // Reset analysis and variation
        analysisDisplay.textContent = 'Awaiting analysis...';
        analysisDisplay.classList.remove('has-content');
        currentAnalysis = '';
        generateVariationBtn.disabled = true;
        variationImageContainer.classList.add('hidden');

        setStatus('Image loaded', 'ready');
    } catch (error) {
        console.error('File upload error:', error);
        showError('Error loading image');
    }
}

// Analyze Image
async function analyzeImage() {
    if (!uploadedImageBase64) {
        showError('Please upload an image first');
        return;
    }

    try {
        showLoading('Analyzing your image...');
        setStatus('Analyzing...', 'processing');

        const response = await fetch(`${API_BASE_URL}/api/enhance-and-analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'analyze',
                base64Image: uploadedImageBase64,
                mimeType: uploadedImageMimeType
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to analyze image');
        }

        currentAnalysis = data.result;
        analysisDisplay.textContent = currentAnalysis;
        analysisDisplay.classList.add('has-content');
        generateVariationBtn.disabled = false;

        setStatus('Analysis complete!', 'ready');
    } catch (error) {
        console.error('Analysis error:', error);
        showError('Error: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Generate Variation
async function generateVariation() {
    if (!currentAnalysis) {
        showError('Please analyze an image first');
        return;
    }

    try {
        showLoading('Generating variation...');
        setStatus('Generating...', 'processing');

        const response = await fetch(`${API_BASE_URL}/api/generate-variation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageAnalysis: currentAnalysis })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate variation');
        }

        variationImage.src = `data:image/png;base64,${data.image}`;
        variationImage.dataset.base64 = data.image;
        variationImageContainer.classList.remove('hidden');

        setStatus('Variation generated!', 'ready');
    } catch (error) {
        console.error('Variation error:', error);
        showError('Error: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Download Variation Image
function downloadVariation() {
    const base64 = variationImage.dataset.base64;
    if (base64) {
        downloadImage(base64, 'variation-image.png');
    }
}

// Event Listeners
enhanceBtn.addEventListener('click', enhancePrompt);
approveBtn.addEventListener('click', approvePrompt);
editBtn.addEventListener('click', editPrompt);
generateImageBtn.addEventListener('click', generateImage);
downloadImageBtn.addEventListener('click', downloadGeneratedImage);
imageUpload.addEventListener('change', handleFileUpload);
analyzeBtn.addEventListener('click', analyzeImage);
generateVariationBtn.addEventListener('click', generateVariation);
downloadVariationBtn.addEventListener('click', downloadVariation);

// Enter key to enhance prompt
promptInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        enhancePrompt();
    }
});

// Check API connection on load
async function checkAPIConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/test-key`);
        const data = await response.json();

        if (data.geminiKeySet) {
            setStatus('Ready', 'ready');
        } else {
            setStatus('API key not configured', 'error');
        }
    } catch (error) {
        setStatus('Cannot connect to server', 'error');
        console.error('API connection error:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', checkAPIConnection);
