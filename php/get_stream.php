<?php
// Set headers to allow cross-origin requests
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check if the required parameters are present
if (!isset($_GET['url'])) {
    header("HTTP/1.1 400 Bad Request");
    echo "Parámetros incompletos";
    exit();
}

// Extract parameters
$url = $_GET['url'];
$protocol = isset($_GET['protocol']) ? $_GET['protocol'] : 'auto';
$timestamp = isset($_GET['t']) ? $_GET['t'] : null;

// Add timestamp to URL if provided and not already present
if ($timestamp && strpos($url, '?t=') === false && strpos($url, '&t=') === false) {
    $url .= (strpos($url, '?') === false) ? "?t=$timestamp" : "&t=$timestamp";
}

// Set appropriate headers based on protocol
switch ($protocol) {
    case 'mjpeg':
        header("Content-Type: multipart/x-mixed-replace; boundary=--boundary");
        break;
    case 'jpg':
        header("Content-Type: image/jpeg");
        break;
    case 'hls':
        header("Content-Type: application/vnd.apple.mpegurl");
        break;
    default:
        // Try to determine content type from response
        break;
}

// Proxy the stream
proxyStream($url, $protocol);

/**
 * Proxy the stream from the camera to the client
 */
function proxyStream($url, $protocol) {
    // Set up a cURL request to fetch the stream
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5); // 5 seconds timeout
    
    // Set timeout based on protocol
    if ($protocol === 'mjpeg') {
        // For MJPEG, we need a longer timeout
        curl_setopt($ch, CURLOPT_TIMEOUT, 0); // No timeout
    } else {
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    }
    
    // Execute the request
    $response = curl_exec($ch);
    
    // Check if there was an error
    $errorCode = curl_errno($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    
    curl_close($ch);
    
    // If there was an error or the HTTP code is not successful
    if ($errorCode !== 0 || $httpCode < 200 || $httpCode >= 300) {
        // Return a placeholder image or error message
        if ($protocol === 'jpg' || $protocol === 'mjpeg') {
            header("Content-Type: image/png");
            readfile("../img/no-signal.png");
        } else {
            header("HTTP/1.1 502 Bad Gateway");
            echo "Error al obtener el stream: " . ($errorCode ? curl_strerror($errorCode) : "HTTP $httpCode");
        }
        exit();
    }
    
    // Set content type if not already set
    if (!headers_sent() && $contentType) {
        header("Content-Type: $contentType");
    }
    
    // Output the stream data
    echo $response;
}
?>
