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
if (!isset($data['ip'])) {
    echo json_encode(['success' => false, 'message' => 'Parámetros incompletos']);
    exit();
}

// Extract camera details
$ip = $data['ip'];

// Get files from the camera's storage
$result = getStorageFiles($ip);

if ($result['success']) {
    echo json_encode([
        'success' => true, 
        'files' => $result['files']
    ]);
} else {
    echo json_encode(['success' => false, 'message' => $result  => $result['files']
    ]);
} else {
    echo json_encode(['success' => false, 'message' => $result['message']]);
}

/**
 * Get files from the camera's storage
 * 
 * Note: In a real application, you would fetch files directly from the camera.
 * This example uses local storage to simulate camera storage.
 */
function getStorageFiles($ip) {
    // Define the storage directory for this camera
    $storageDir = '../storage/' . $ip;
    
    // Check if the directory exists
    if (!file_exists($storageDir)) {
        // Create the directory if it doesn't exist
        mkdir($storageDir, 0777, true);
        return ['success' => true, 'files' => []];
    }
    
    // Get all files in the directory
    $files = scandir($storageDir);
    
    // Filter out . and .. directories
    $files = array_diff($files, ['.', '..']);
    
    // Prepare the result array
    $result = [];
    
    foreach ($files as $file) {
        $filePath = $storageDir . '/' . $file;
        
        // Skip directories
        if (is_dir($filePath)) {
            continue;
        }
        
        // Determine file type based on extension
        $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $type = 'other';
        
        if (in_array($extension, ['jpg', 'jpeg', 'png', 'gif'])) {
            $type = 'image';
        } elseif (in_array($extension, ['mp4', 'avi', 'mov', 'mkv'])) {
            $type = 'video';
        }
        
        // Get file modification time
        $modTime = filemtime($filePath);
        
        // Add file to result array
        $result[] = [
            'name' => $file,
            'path' => $filePath,
            'type' => $type,
            'size' => filesize($filePath),
            'date' => date('Y-m-d H:i:s', $modTime)
        ];
    }
    
    return ['success' => true, 'files' => $result];
}
?>
