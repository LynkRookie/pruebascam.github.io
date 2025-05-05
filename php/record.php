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
if (!isset($data['ip']) || !isset($data['port']) || !isset($data['action'])) {
    echo json_encode(['success' => false, 'message' => 'Parámetros incompletos']);
    exit();
}

// Extract camera details
$ip = $data['ip'];
$port = $data['port'];
$username = isset($data['username']) ? $data['username'] : '';
$password = isset($data['password']) ? $data['password'] : '';
$action = $data['action'];

// Validate the action
if (!in_array($action, ['start', 'stop'])) {
    echo json_encode(['success' => false, 'message' => 'Acción no válida']);
    exit();
}

// Create storage directory if it doesn't exist
$storageDir = '../storage/' . $ip;
if (!file_exists($storageDir)) {
    mkdir($storageDir, 0777, true);
}

// Generate a filename based on the current timestamp (for start action)
$filename = '';
$filePath = '';
if ($action === 'start') {
    $timestamp = date('Y-m-d_H-i-s');
    $filename = "recording_{$timestamp}.mp4";
    $filePath = $storageDir . '/' . $filename;
}

// Send the recording command to the camera
$result = controlRecording($ip, $port, $username, $password, $action, $filePath);

if ($result['success']) {
    $message = $action === 'start' ? 'Grabación iniciada correctamente' : 'Grabación detenida correctamente';
    $response = [
        'success' => true, 
        'message' => $message
    ];
    
    if ($action === 'start') {
        $response['filename'] = $filename;
        $response['path'] = $filePath;
    }
    
    echo json_encode($response);
} else {
    echo json_encode(['success' => false, 'message' => $result['message']]);
}

/**
 * Control the recording function of the camera
 * 
 * Note: The actual implementation will depend on the camera model and its API.
 * This is a simplified example that may need to be adjusted for specific cameras.
 */
function controlRecording($ip, $port, $username, $password, $action, $filePath = '') {
    // Build the authentication string
    $auth = '';
    if (!empty($username) && !empty($password)) {
        $auth = urlencode($username) . ':' . urlencode($password) . '@';
    }
    
    // Build the recording control URL
    // The actual URL format will depend on the camera model and its API
    $commandParams = $action === 'start' ? 'action=start' : 'action=stop';
    $recordUrl = "http://{$auth}{$ip}:{$port}/record.cgi?{$commandParams}";
    
    // Set up a cURL request to send the command
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $recordUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5); // 5 seconds timeout
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    // Execute the request
    $response = curl_exec($ch);
    
    // Check if there was an error
    $errorCode = curl_errno($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    curl_close($ch);
    
    // If there was an error or the HTTP code is not successful
    if ($errorCode !== 0 || $httpCode < 200 || $httpCode >= 300) {
        return [
            'success' => false, 
            'message' => "Error al controlar grabación: " . ($errorCode ? curl_strerror($errorCode) : "HTTP $httpCode")
        ];
    }
    
    // For demonstration purposes, we'll simulate recording by creating an empty file
    // In a real application, you would implement the actual recording logic
    if ($action === 'start' && !empty($filePath)) {
        // Create an empty file to represent the recording
        // In a real application, you would implement the actual recording logic
        file_put_contents($filePath, '');
    }
    
    return ['success' => true];
}
?>
