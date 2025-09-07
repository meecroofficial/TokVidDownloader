document.addEventListener('DOMContentLoaded', function() {
    const urlInput = document.getElementById('videoUrl');
    const downloadNormalBtn = document.getElementById('downloadNormal');
    const downloadHDBtn = document.getElementById('downloadHD');
    const statusMessage = document.getElementById('status');
    const downloadResult = document.getElementById('downloadResult');

    // Extract TikTok URL from text (removes extra text from TikTok Lite)
    function extractTikTokUrl(text) {
        const urlRegex = /https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com|m\.tiktok\.com|vt\.tiktok\.com)[^\s]*/i;
        const match = text.match(urlRegex);
        return match ? match[0] : text.trim();
    }

    // URL validation function
    function isValidTikTokUrl(url) {
        const tikTokRegex = /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com|m\.tiktok\.com|vt\.tiktok\.com)/;
        return tikTokRegex.test(url);
    }

    // Resolve short TikTok URLs to full URLs
    async function resolveShortUrl(url) {
        // Check if it's a vm.tiktok.com short URL
        if (url.includes('vm.tiktok.com')) {
            try {
                // Use redirect service to get final URL
                const redirectApis = [
                    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
                    `https://corsproxy.io/?${encodeURIComponent(url)}`,
                    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
                ];
                
                for (let apiUrl of redirectApis) {
                    try {
                        const response = await fetch(apiUrl, {
                            method: 'HEAD',
                            redirect: 'follow'
                        });
                        
                        // Get the final URL after redirects
                        const finalUrl = response.url;
                        if (finalUrl && finalUrl.includes('tiktok.com/') && !finalUrl.includes('vm.tiktok.com')) {
                            return finalUrl;
                        }
                    } catch (e) {
                        continue;
                    }
                }
                
                // Alternative method: try to extract from HTML
                try {
                    const htmlResponse = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
                    const data = await htmlResponse.json();
                    const content = data.contents;
                    
                    // Look for canonical URL or meta refresh
                    const patterns = [
                        /canonical.*?href=["'](https:\/\/[^"']*tiktok\.com[^"']*)["']/i,
                        /property=["']og:url["'].*?content=["'](https:\/\/[^"']*tiktok\.com[^"']*)["']/i,
                        /http-equiv=["']refresh["'].*?url=(https:\/\/[^"']*tiktok\.com[^"']*)/i
                    ];
                    
                    for (let pattern of patterns) {
                        const match = content.match(pattern);
                        if (match && match[1]) {
                            return match[1];
                        }
                    }
                } catch (e) {
                    // Continue to return original URL
                }
            } catch (error) {
                console.log('Short URL resolution failed:', error);
            }
        }
        
        return url;
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

    // Fetch TikTok video data with short URL support
    async function fetchTikTokVideo(originalUrl, quality) {
        // First, resolve short URLs to full URLs
        const resolvedUrl = await resolveShortUrl(originalUrl);
        
        const apis = [
            `https://api.allorigins.win/get?url=${encodeURIComponent(`https://tikwm.com/api/?url=${encodeURIComponent(resolvedUrl)}&hd=${quality === 'HD' ? '1' : '0'}`)}`,
            `https://corsproxy.io/?${encodeURIComponent(`https://tikwm.com/api/?url=${encodeURIComponent(resolvedUrl)}&hd=${quality === 'HD' ? '1' : '0'}`)}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://tikwm.com/api/?url=${encodeURIComponent(resolvedUrl)}&hd=${quality === 'HD' ? '1' : '0'}`)}`
        ];
        
        // If original URL was different from resolved, also try original
        if (originalUrl !== resolvedUrl) {
            apis.push(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://tikwm.com/api/?url=${encodeURIComponent(originalUrl)}&hd=${quality === 'HD' ? '1' : '0'}`)}`);
        }
        
        for (let apiUrl of apis) {
            try {
                const response = await fetch(apiUrl);
                if (!response.ok) continue;
                
                let data = await response.json();
                
                // Handle different proxy response formats
                if (data.contents) {
                    try {
                        data = JSON.parse(data.contents);
                    } catch (e) {
                        continue;
                    }
                }
                if (typeof data === 'string') {
                    try {
                        data = JSON.parse(data);
                    } catch (e) {
                        continue;
                    }
                }
                
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
        
        return { success: false, error: 'Unable to process video. Please check if the link is valid and the video is public.' };
    }

    // Handle download process
    async function handleDownload(quality) {
        const inputText = urlInput.value.trim();
        
        if (!inputText) {
            showStatus('Please enter a TikTok video URL', 'error');
            return;
        }
        
        // Extract clean URL from input text
        const url = extractTikTokUrl(inputText);
        
        if (!isValidTikTokUrl(url)) {
            showStatus('Please enter a valid TikTok URL', 'error');
            return;
        }
        
        // Update input field with clean URL
        urlInput.value = url;
        
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
