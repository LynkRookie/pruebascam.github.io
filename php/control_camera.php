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
if (!isset($data['ip']) || !isset($data['port']) || !isset($data['action']) || !isset($data['direction'])) {
    echo json_encode(['success' => false, 'message' => 'Parámetros incompletos']);
    exit();
}

// Extract camera details
$ip = $data['ip'];
$port = $data['port'];
$username = isset($data['username']) ? $data['username'] : '';
$password = isset($data['password']) ? $data['password'] : '';
$action = $data['action'];
$direction = $data['direction'];

// Validate the action and direction
if ($action !== 'move') {
    echo json_encode(['success' => false, 'message' => 'Acción no válida']);
    exit();
}

if (!in_array($direction, ['up', 'down', 'left', 'right', 'home'])) {
    echo json_encode(['success' => false, 'message' => 'Dirección no válida']);
    exit();
}

// Send the control command to the camera
$result = sendControlCommand($ip, $port, $username, $password, $direction);

if ($result['success']) {
    echo json_encode(['success' => true, 'message' => 'Comando enviado correctamente']);
} else {
    echo json_encode(['success' => false, 'message' => $result['message']]);
}

/**
 * Send a control command to the camera
 * 
 * Note: The actual command format will depend on the camera model and its API.
 * This is a simplified example that may need to be adjusted for specific cameras.
 */
function sendControlCommand($ip, $port, $username, $password, $direction) {
    // Build the authentication string
    $auth = '';
    if (!empty($username) && !empty($password)) {
        $auth = urlencode($username) . ':' . urlencode($password) . '@';
    }
    
    // Map direction to command parameters
    // This mapping is camera-specific and needs to be adjusted for your camera model
    $commandParams = '';
    switch ($direction) {
        case 'up':
            $commandParams = 'move=up';
            break;
        case 'down':
            $commandParams = 'move=down';
            break;
        case 'left':
            $commandParams = 'move=left';
            break;
        case 'right':
            $commandParams = 'move=right';
            break;
        case 'home':
            $commandParams = 'move=home';
            break;
    }
    
    // Build the control URL
    // The actual URL format will depend on the camera model and its API
    $controlUrl = "http://{$auth}{$ip}:{$port}/control/ptz.cgi?{$commandParams}";
    
    // Set up a cURL request to send the command
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $controlUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5); // 5 seconds timeout
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    
    // Execute the request
    $response = curl_exec($ch);
    
    // Check if there was an error
    $errorCode = curl_errno($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    curl_close($ch);
    
    // Consider the command successful if there's no cURL error and the HTTP code is 2xx
    if ($errorCode === 0 && $httpCode >= 200 && $httpCode < 300) {
        return ['success' => true];
    } else {
        return [
            'success' => false, 
            'message' => "Error al enviar comando: " . ($errorCode ? curl_strerror($errorCode) : "HTTP $httpCode")
        ];
    }
}
?>
