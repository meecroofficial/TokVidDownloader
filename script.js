document.addEventListener('DOMContentLoaded', function() {
    const urlInput = document.getElementById('videoUrl');
    const downloadNormalBtn = document.getElementById('downloadNormal');
    const downloadHDBtn = document.getElementById('downloadHD');
    const statusMessage = document.getElementById('status');
    const downloadResult = document.getElementById('downloadResult');

    // URL validation function
    function isValidTikTokUrl(url) {
        const tikTokRegex = /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com|lite\.tiktok\.com|m\.tiktok\.com|vt\.tiktok\.com|tiktoklite\.com)/;
        return tikTokRegex.test(url);
    }

    // Convert TikTok Lite URLs to standard format
    async function convertLiteUrl(url) {
        try {
            // Handle different Lite URL formats
            if (url.includes('lite.tiktok.com') || url.includes('tiktoklite.com')) {
                // Try to resolve redirect to get actual TikTok URL
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
                const response = await fetch(proxyUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    // Look for canonical URL or redirect URL in response
                    const content = data.contents;
                    const canonicalMatch = content.match(/canonical.*?href=["'](.*?)["']/i);
                    const redirectMatch = content.match(/window\.location\.href\s*=\s*["'](.*?)["']/i);
                    
                    if (canonicalMatch && canonicalMatch[1].includes('tiktok.com')) {
                        return canonicalMatch[1];
                    }
                    if (redirectMatch && redirectMatch[1].includes('tiktok.com')) {
                        return redirectMatch[1];
                    }
                }
            }
            
            // If no conversion needed or failed, return original
            return url;
        } catch (error) {
            console.log('URL conversion failed, using original:', error);
            return url;
        }
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

    // Fetch TikTok video data using CORS proxy with Lite support
    async function fetchTikTokVideo(originalUrl, quality) {
        // First, try to convert Lite URLs
        const convertedUrl = await convertLiteUrl(originalUrl);
        
        const apis = [
            {
                url: `https://api.allorigins.win/get?url=${encodeURIComponent(`https://tikwm.com/api/?url=${encodeURIComponent(convertedUrl)}&hd=${quality === 'HD' ? '1' : '0'}`)}`,
                headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15' }
            },
            {
                url: `https://corsproxy.io/?${encodeURIComponent(`https://tikwm.com/api/?url=${encodeURIComponent(convertedUrl)}&hd=${quality === 'HD' ? '1' : '0'}`)}`,
                headers: { 'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:91.0) Gecko/91.0 Firefox/91.0' }
            },
            {
                url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://tikwm.com/api/?url=${encodeURIComponent(convertedUrl)}&hd=${quality === 'HD' ? '1' : '0'}`)}`,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            }
        ];
        
        // If original URL was different from converted, also try original
        if (originalUrl !== convertedUrl) {
            apis.push({
                url: `https://api.allorigins.win/get?url=${encodeURIComponent(`https://tikwm.com/api/?url=${encodeURIComponent(originalUrl)}&hd=${quality === 'HD' ? '1' : '0'}`)}`,
                headers: { 'User-Agent': 'TikTok/1.0 (iPhone; iOS 14.0; Scale/3.00)' }
            });
        }
        
        for (let api of apis) {
            try {
                const response = await fetch(api.url, {
                    headers: api.headers,
                    redirect: 'follow'
                });
                
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
        
        return { success: false, error: 'Unable to process video. Please try a different link or check if the video is public.' };
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
