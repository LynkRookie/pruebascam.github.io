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
if (!isset($data['type']) || !isset($data['camera']) || !isset($data['timestamp'])) {
    echo json_encode(['success' => false, 'message' => 'Parámetros incompletos']);
    exit();
}

// Extract notification details
$type = $data['type'];
$camera = $data['camera'];
$timestamp = $data['timestamp'];
$formattedTime = date('d/m/Y H:i:s', strtotime($timestamp));

// Load configuration
$config = loadConfig();

// Check if notifications are enabled
if (!$config['notifications']['enabled']) {
    echo json_encode(['success' => false, 'message' => 'Notificaciones desactivadas']);
    exit();
}

// Prepare notification message
$subject = '';
$message = '';

switch ($type) {
    case 'motion':
        $subject = "Alerta de Movimiento - Cámara $camera";
        $message = "Se ha detectado movimiento en la cámara '$camera' a las $formattedTime.";
        break;
    case 'offline':
        $subject = "Alerta de Desconexión - Cámara $camera";
        $message = "La cámara '$camera' se ha desconectado a las $formattedTime.";
        break;
    case 'online':
        $subject = "Alerta de Conexión - Cámara $camera";
        $message = "La cámara '$camera' se ha conectado a las $formattedTime.";
        break;
    default:
        $subject = "Alerta de Cámara - $camera";
        $message = "Se ha generado una alerta en la cámara '$camera' a las $formattedTime.";
}

// Send notification based on configured methods
$results = [];

// Email notification
if ($config['notifications']['email']['enabled']) {
    $emailResult = sendEmailNotification($subject, $message, $config['notifications']['email']);
    $results['email'] = $emailResult;
}

// SMS notification (if implemented)
if ($config['notifications']['sms']['enabled']) {
    $smsResult = sendSmsNotification($message, $config['notifications']['sms']);
    $results['sms'] = $smsResult;
}

// Push notification (if implemented)
if ($config['notifications']['push']['enabled']) {
    $pushResult = sendPushNotification($subject, $message, $config['notifications']['push']);
    $results['push'] = $pushResult;
}

// Log notification
logNotification($type, $camera, $timestamp, $results);

// Return success if at least one notification method succeeded
$success = false;
foreach ($results as $result) {
    if ($result['success']) {
        $success = true;
        break;
    }
}

if ($success) {
    echo json_encode(['success' => true, 'message' => 'Notificación enviada correctamente', 'details' => $results]);
} else {
    echo json_encode(['success' => false, 'message' => 'Error al enviar notificación', 'details' => $results]);
}

/**
 * Load configuration from file
 */
function loadConfig() {
    $configFile = '../config/config.json';
    
    // Default configuration
    $defaultConfig = [
        'notifications' => [
            'enabled' => true,
            'email' => [
                'enabled' => true,
                'recipients' => ['admin@example.com'],
                'from' => 'camaras@example.com',
                'smtp' => [
                    'host' => 'smtp.example.com',
                    'port' => 587,
                    'username' => 'user@example.com',
                    'password' => 'password',
                    'encryption' => 'tls'
                ]
            ],
            'sms' => [
                'enabled' => false,
                'recipients' => ['+1234567890'],
                'provider' => 'none'
            ],
            'push' => [
                'enabled' => false,
                'service' => 'none'
            ]
        ]
    ];
    
    // Check if config file exists
    if (file_exists($configFile)) {
        $config = json_decode(file_get_contents($configFile), true);
        
        // Merge with default config to ensure all required fields exist
        $config = array_merge_recursive($defaultConfig, $config);
        
        return $config;
    }
    
    // If no config file exists, create one with default values
    file_put_contents($configFile, json_encode($defaultConfig, JSON_PRETTY_PRINT));
    
    return $defaultConfig;
}

/**
 * Send email notification
 */
function sendEmailNotification($subject, $message, $config) {
    // In a real implementation, you would use a proper email library like PHPMailer
    // This is a simplified example
    
    $to = implode(', ', $config['recipients']);
    $from = $config['from'];
    $headers = "From: $from\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    
    // Attempt to send email
    $success = mail($to, $subject, $message, $headers);
    
    return [
        'success' => $success,
        'method' => 'email',
        'recipients' => $config['recipients'],
        'message' => $success ? 'Email enviado correctamente' : 'Error al enviar email'
    ];
}

/**
 * Send SMS notification
 */
function sendSmsNotification($message, $config) {
    // This is a placeholder for SMS implementation
    // In a real application, you would integrate with an SMS gateway
    
    return [
        'success' => false,
        'method' => 'sms',
        'message' => 'Funcionalidad SMS no implementada'
    ];
}

/**
 * Send push notification
 */
function sendPushNotification($title, $message, $config) {
    // This is a placeholder for push notification implementation
    // In a real application, you would integrate with a push notification service
    
    return [
        'success' => false,
        'method' => 'push',
        'message' => 'Funcionalidad de notificaciones push no implementada'
    ];
}

/**
 * Log notification to file
 */
function logNotification($type, $camera, $timestamp, $results) {
    $logDir = '../logs';
    
    // Create log directory if it doesn't exist
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/notifications.log';
    
    // Format log entry
    $logEntry = date('Y-m-d H:i:s') . " | $type | $camera | $timestamp | ";
    
    // Add results summary
    $successMethods = [];
    $failedMethods = [];
    
    foreach ($results as $method => $result) {
        if ($result['success']) {
            $successMethods[] = $method;
        } else {
            $failedMethods[] = $method;
        }
    }
    
    $logEntry .= "Success: " . implode(', ', $successMethods) . " | ";
    $logEntry .= "Failed: " . implode(', ', $failedMethods) . "\n";
    
    // Write to log file
    file_put_contents($logFile, $logEntry, FILE_APPEND);
}
?>
