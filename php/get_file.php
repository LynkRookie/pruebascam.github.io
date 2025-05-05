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
if (!isset($_GET['file'])) {
    header("HTTP/1.1 400 Bad Request");
    echo "Parámetros incompletos";
    exit();
}

// Get the file path
$filePath = $_GET['file'];

// Check if the file exists
if (!file_exists($filePath)) {
    header("HTTP/1.1 404 Not Found");
    echo "Archivo no encontrado";
    exit();
}

// Get the file extension
$extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

// Set the content type based on the file extension
if (in_array($extension, ['jpg', 'jpeg'])) {
    header("Content-Type: image/jpeg");
} elseif ($extension === 'png') {
    header("Content-Type: image/png");
} elseif ($extension === 'gif') {
    header("Content-Type: image/gif");
} elseif ($extension === 'mp4') {
    header("Content-Type: video/mp4");
} elseif ($extension === 'avi') {
    header("Content-Type: video/x-msvideo");
} elseif ($extension === 'mov') {
    header("Content-Type: video/quicktime");
} elseif ($extension === 'mkv') {
    header("Content-Type: video/x-matroska");
} else {
    header("Content-Type: application/octet-stream");
}

// Output the file
readfile($filePath);
?>
