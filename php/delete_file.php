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
if (!isset($data['filePath'])) {
    echo json_encode(['success' => false, 'message' => 'Parámetros incompletos']);
    exit();
}

// Get the file path
$filePath = $data['filePath'];

// Check if the file exists
if (!file_exists($filePath)) {
    echo json_encode(['success' => false, 'message' => 'Archivo no encontrado']);
    exit();
}

// Try to delete the file
if (unlink($filePath)) {
    echo json_encode(['success' => true, 'message' => 'Archivo eliminado correctamente']);
} else {
    echo json_encode(['success' => false, 'message' => 'Error al eliminar el archivo']);
}
?>
