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
} else {
    // For non-image files, return a placeholder icon
    header("Content-Type: image/png");
    readfile("../img/file-icon.png");
    exit();
}

// For image files, generate a thumbnail
generateThumbnail($filePath, $extension);

/**
 * Generate a thumbnail for the given image file
 */
function generateThumbnail($filePath, $extension) {
    // Define thumbnail dimensions
    $maxWidth = 200;
    $maxHeight = 150;
    
    // Load the image based on its extension
    $sourceImage = null;
    if (in_array($extension, ['jpg', 'jpeg'])) {
        $sourceImage = imagecreatefromjpeg($filePath);
    } elseif ($extension === 'png') {
        $sourceImage = imagecreatefrompng($filePath);
    } elseif ($extension === 'gif') {
        $sourceImage = imagecreatefromgif($filePath);
    }
    
    if (!$sourceImage) {
        // If the image couldn't be loaded, return a placeholder
        header("Content-Type: image/png");
        readfile("../img/file-icon.png");
        exit();
    }
    
    // Get the original image dimensions
    $width = imagesx($sourceImage);
    $height = imagesy($sourceImage);
    
    // Calculate the thumbnail dimensions while maintaining aspect ratio
    if ($width > $height) {
        $newWidth = $maxWidth;
        $newHeight = intval($height * $maxWidth / $width);
    } else {
        $newHeight = $maxHeight;
        $newWidth = intval($width * $maxHeight / $height);
    }
    
    // Create a new image for the thumbnail
    $thumbnail = imagecreatetruecolor($newWidth, $newHeight);
    
    // Preserve transparency for PNG images
    if ($extension === 'png') {
        imagealphablending($thumbnail, false);
        imagesavealpha($thumbnail, true);
        $transparent = imagecolorallocatealpha($thumbnail, 255, 255, 255, 127);
        imagefilledrectangle($thumbnail, 0, 0, $newWidth, $newHeight, $transparent);
    }
    
    // Resize the image
    imagecopyresampled($thumbnail, $sourceImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
    
    // Output the thumbnail
    if (in_array($extension, ['jpg', 'jpeg'])) {
        imagejpeg($thumbnail, null, 80);
    } elseif ($extension === 'png') {
        imagepng($thumbnail);
    } elseif ($extension === 'gif') {
        imagegif($thumbnail);
    }
    
    // Free up memory
    imagedestroy($sourceImage);
    imagedestroy($thumbnail);
}
?>
