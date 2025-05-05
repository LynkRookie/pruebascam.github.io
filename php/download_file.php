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
if (!isset($_GET['file']) || !isset($_GET['name'])) {
    header("HTTP/1.1 400 Bad Request");
    echo "Parámetros incompletos";
    exit();
}

// Get the file path and name
$filePath = $_GET['file'];
$fileName = $_GET['name'];

// Check if the file exists
if (!file_exists($filePath)) {
    header("HTTP/1.1 404 Not Found");
    echo "Archivo no encontrado";
    exit();
}

// Set headers for file download
header("Content-Type: application/octet-stream");
header("Content-Disposition: attachment; filename=\"$fileName\"");
header("Content-Length: " . filesize($filePath));

// Output the file
readfile($filePath);
?>
