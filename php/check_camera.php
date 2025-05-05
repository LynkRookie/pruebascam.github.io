<?php
// Set headers to allow cross-origin requests
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check if the request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

// Get the request body
$requestBody = file_get_contents('php://input');
$data = json_decode($requestBody, true);

// Check if the required parameters are present
if (!isset($data['ip']) || !isset($data['port'])) {
    echo json_encode(['success' => false, 'message' => 'Parámetros incompletos']);
    exit();
}

// Extract camera details
$ip = $data['ip'];
$port = $data['port'];
$username = isset($data['username']) ? $data['username'] : '';
$password = isset($data['password']) ? $data['password'] : '';

// Build the URL to check camera connectivity
$url = buildCameraUrl($ip, $port, $username, $password);

// Check if the camera is reachable
$isConnected = checkCameraConnection($url);

if ($isConnected) {
    echo json_encode(['success' => true, 'message' => 'Conexión exitosa']);
} else {
    echo json_encode(['success' => false, 'message' => 'No se pudo conectar a la cámara. Verifica la dirección IP, puerto y credenciales.']);
}

/**
 * Build the camera URL based on the provided parameters
 * 
 * Note: The actual URL format will depend on the camera model and protocol.
 * This is a simplified example that may need to be adjusted for specific cameras.
 */
function buildCameraUrl($ip, $port, $username, $password) {
    $auth = '';
    if (!empty($username) && !empty($password)) {
        $auth = urlencode($username) . ':' . urlencode($password) . '@';
    }
    
    // This is a generic URL format - adjust based on your camera's API
    return "http://{$auth}{$ip}:{$port}/";
}

/**
 * Check if the camera is reachable at the given URL
 */
function checkCameraConnection($url) {
    // Set up a cURL request to check connectivity
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5); // 5 seconds timeout
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_NOBODY, true); // HEAD request
    
    // Execute the request
    curl_exec($ch);
    
    // Check if there was an error
    $errorCode = curl_errno($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    curl_close($ch);
    
    // Consider the connection successful if there's no cURL error and the HTTP code is 2xx or 3xx
    return $errorCode === 0 && ($httpCode >= 200 && $httpCode < 400);
    
    // Note: In a real application, you would implement more specific checks
    // based on the camera model and its API responses
}
?>
