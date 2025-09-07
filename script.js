document.addEventListener('DOMContentLoaded', function() {
    const urlInput = document.getElementById('videoUrl');
    const downloadNormalBtn = document.getElementById('downloadNormal');
    const downloadHDBtn = document.getElementById('downloadHD');
    const statusMessage = document.getElementById('status');
    const downloadResult = document.getElementById('downloadResult');

    // URL validation function
    function isValidTikTokUrl(url) {
        const tikTokRegex = /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com|lite\.tiktok\.com|m\.tiktok\.com|vt\.tiktok\.com)/;
        return tikTokRegex.test(url);
    }

    // Show status message with loading animation
    function showStatus(message, type = '', showLoading = false) {
        const loadingSpinner = showLoading ? '<div class="loading"></div>' : '';
        statusMessage.innerHTML = loadingSpinner + message;
        statusMessage.className = `status-message ${type}`;
    }

    // Clear status and results
    function clearResults() {
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
        downloadResult.className = 'download-result';
        downloadResult.innerHTML = '';
    }

    // Show download result
    function showDownloadResult(videoData, quality) {
        const resultHTML = `
            <h3>Video Ready for Download!</h3>
            <p><strong>Title:</strong> ${videoData.title || 'TikTok Video'}</p>
            <p><strong>Quality:</strong> ${quality}</p>
            <a href="${videoData.downloadUrl}" class="download-link" download="tiktok-video.mp4" target="_blank">
                Download Video
            </a>
        `;
        downloadResult.innerHTML = resultHTML;
        downloadResult.className = 'download-result show';
    }

    // Fetch TikTok video data using CORS proxy
    async function fetchTikTokVideo(url, quality) {
        const apis = [
            `https://api.allorigins.win/get?url=${encodeURIComponent(`https://tikwm.com/api/?url=${encodeURIComponent(url)}&hd=${quality === 'HD' ? '1' : '0'}`)}`,
            `https://corsproxy.io/?${encodeURIComponent(`https://tikwm.com/api/?url=${encodeURIComponent(url)}&hd=${quality === 'HD' ? '1' : '0'}`)}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://tikwm.com/api/?url=${encodeURIComponent(url)}&hd=${quality === 'HD' ? '1' : '0'}`)}`
        ];
        
        for (let apiUrl of apis) {
            try {
                const response = await fetch(apiUrl);
                if (!response.ok) continue;
                
                let data = await response.json();
                
                // Handle different proxy response formats
                if (data.contents) data = JSON.parse(data.contents);
                if (typeof data === 'string') data = JSON.parse(data);
                
                if (data.code === 0 && data.data && data.data.play) {
                    return {
                        title: (data.data.title || 'TikTok Video').substring(0, 100),
                        downloadUrl: quality === 'HD' ? (data.data.hdplay || data.data.play) : data.data.play,
                        success: true
                    };
                }
            } catch (error) {
                continue;
            }
        }
        
        return { success: false, error: 'Unable to process video. Please try a different link.' };
    }

    // Handle download process
    async function handleDownload(quality) {
        const url = urlInput.value.trim();
        
        if (!url) {
            showStatus('Please enter a TikTok video URL', 'error');
            return;
        }
        
        if (!isValidTikTokUrl(url)) {
            showStatus('Please enter a valid TikTok URL', 'error');
            return;
        }
        
        // Clear previous results
        clearResults();
        
        // Disable buttons and show loading
        const originalNormalText = downloadNormalBtn.textContent;
        const originalHDText = downloadHDBtn.textContent;
        
        downloadNormalBtn.innerHTML = '<div class="loading"></div>Processing...';
        downloadHDBtn.innerHTML = '<div class="loading"></div>Processing...';
        downloadNormalBtn.disabled = true;
        downloadHDBtn.disabled = true;
        
        showStatus(`Fetching ${quality} quality video...`, '', true);
        
        // Fetch video data
        const result = await fetchTikTokVideo(url, quality);
        
        // Restore buttons
        downloadNormalBtn.textContent = originalNormalText;
        downloadHDBtn.textContent = originalHDText;
        downloadNormalBtn.disabled = false;
        downloadHDBtn.disabled = false;
        
        if (result.success) {
            showStatus('Video processed successfully!', 'success');
            showDownloadResult(result, quality);
        } else {
            showStatus(`Error: ${result.error}. Please try again.`, 'error');
        }
    }

    // Button event listeners
    downloadNormalBtn.addEventListener('click', () => handleDownload('Normal'));
    downloadHDBtn.addEventListener('click', () => handleDownload('HD'));

    // Handle Enter key press
    urlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            downloadNormalBtn.click();
        }
    });

    // Clear status when user starts typing
    urlInput.addEventListener('input', function() {
        clearResults();
    });
});
