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

// Create storage directory if it doesn't exist
$storageDir = '../storage/' . $ip;
if (!file_exists($storageDir)) {
    mkdir($storageDir, 0777, true);
}

// Generate a filename based on the current timestamp
$timestamp = date('Y-m-d_H-i-s');
$filename = "snapshot_{$timestamp}.jpg";
$filePath = $storageDir . '/' . $filename;

// Take a snapshot from the camera
$result = takeSnapshot($ip, $port, $username, $password, $filePath);

if ($result['success']) {
    echo json_encode([
        'success' => true, 
        'message' => 'Imagen capturada correctamente',
        'filename' => $filename,
        'path' => $filePath
    ]);
} else {
    echo json_encode(['success' => false, 'message' => $result['message']]);
}

/**
 * Take a snapshot from the camera and save it to the specified path
 * 
 * Note: The actual implementation will depend on the camera model and its API.
 * This is a simplified example that may need to be adjusted for specific cameras.
 */
function takeSnapshot($ip, $port, $username, $password, $filePath) {
    // Build the authentication string
    $auth = '';
    if (!empty($username) && !empty($password)) {
        $auth = urlencode($username) . ':' . urlencode($password) . '@';
    }
    
    // Build the snapshot URL
    // The actual URL format will depend on the camera model and its API
    $snapshotUrl = "http://{$auth}{$ip}:{$port}/snapshot.cgi";
    
    // Set up a cURL request to fetch the snapshot
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $snapshotUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5); // 5 seconds timeout
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    // Execute the request
    $response = curl_exec($ch);
    
    // Check if there was an error
    $errorCode = curl_errno($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    
    curl_close($ch);
    
    // If there was an error or the HTTP code is not successful
    if ($errorCode !== 0 || $httpCode < 200 || $httpCode >= 300) {
        return [
            'success' => false, 
            'message' => "Error al capturar imagen: " . ($errorCode ? curl_strerror($errorCode) : "HTTP $httpCode")
        ];
    }
    
    // Check if the content type is an image
    if (strpos($contentType, 'image/') !== 0) {
        return [
            'success' => false, 
            'message' => "La respuesta no es una imagen válida"
        ];
    }
    
    // Save the image to the specified path
    if (file_put_contents($filePath, $response) === false) {
        return [
            'success' => false, 
            'message' => "Error al guardar la imagen"
        ];
    }
    
    return ['success' => true];
}
?>
