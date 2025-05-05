<?php
/**
 * Script para limpiar archivos antiguos del almacenamiento
 * Se puede ejecutar manualmente o programar como tarea cron
 */

// Incluir archivo de configuración
require_once __DIR__ . '/config.php';

// Verificar si la limpieza automática está habilitada
$autoCleanup = getConfig('storage.auto_cleanup', true);

if (!$autoCleanup) {
    echo "La limpieza automática está deshabilitada en la configuración.\n";
    exit;
}

// Obtener configuración de limpieza
$storagePath = getConfig('storage.path', '../storage');
$cleanupDays = getConfig('storage.cleanup_days', 30);
$maxSize = getConfig('storage.max_size', 10000) * 1024 * 1024; // Convertir a bytes

// Verificar si existe el directorio de almacenamiento
if (!file_exists($storagePath)) {
    echo "El directorio de almacenamiento no existe.\n";
    exit;
}

// Calcular fecha límite
$limitDate = time() - ($cleanupDays * 24 * 60 * 60);

// Obtener tamaño actual del almacenamiento
$currentSize = getDirSize($storagePath);

echo "Iniciando limpieza de archivos...\n";
echo "Directorio: $storagePath\n";
echo "Eliminar archivos anteriores a: " . date('Y-m-d H:i:s', $limitDate) . "\n";
echo "Tamaño actual: " . formatSize($currentSize) . " / " . formatSize($maxSize) . "\n";

// Verificar si se necesita limpieza por tamaño
$needSizeCleanup = $currentSize > $maxSize;

if ($needSizeCleanup) {
    echo "El almacenamiento excede el tamaño máximo, se eliminarán archivos antiguos.\n";
}

// Obtener todos los archivos
$files = [];
getFilesRecursive($storagePath, $files);

// Ordenar archivos por fecha (más antiguos primero)
usort($files, function($a, $b) {
    return $a['time'] - $b['time'];
});

// Contador de archivos eliminados
$deletedCount = 0;
$deletedSize = 0;

// Eliminar archivos antiguos
foreach ($files as $file) {
    $delete = false;
    
    // Verificar si el archivo es antiguo
    if ($file['time'] < $limitDate) {
        $delete = true;
        echo "Archivo antiguo: " . $file['path'] . " (" . date('Y-m-d H:i:s', $file['time']) . ")\n";
    }
    // Verificar si se necesita liberar espacio
    elseif ($needSizeCleanup && $currentSize > $maxSize) {
        $delete = true;
        echo "Liberando espacio: " . $file['path'] . " (" . formatSize($file['size']) . ")\n";
    }
    
    // Eliminar archivo si es necesario
    if ($delete) {
        if (unlink($file['path'])) {
            $deletedCount++;
            $deletedSize += $file['size'];
            $currentSize -= $file['size'];
            echo "Eliminado: " . $file['path'] . "\n";
        } else {
            echo "Error al eliminar: " . $file['path'] . "\n";
        }
    }
    
    // Si ya se liberó suficiente espacio, detener
    if ($currentSize <= $maxSize * 0.9) { // 90% del tamaño máximo
        $needSizeCleanup = false;
    }
}

// Eliminar directorios vacíos
removeEmptyDirs($storagePath);

echo "Limpieza completada.\n";
echo "Archivos eliminados: $deletedCount\n";
echo "Espacio liberado: " . formatSize($deletedSize) . "\n";
echo "Tamaño actual: " . formatSize($currentSize) . "\n";

/**
 * Obtiene todos los archivos de un directorio de forma recursiva
 * @param string $dir Directorio a recorrer
 * @param array &$files Array donde se almacenarán los archivos encontrados
 */
function getFilesRecursive($dir, &$files) {
    $items = scandir($dir);
    
    foreach ($items as $item) {
        // Ignorar . y ..
        if ($item === '.' || $item === '..') {
            continue;
        }
        
        $path = $dir . '/' . $item;
        
        if (is_dir($path)) {
            // Recorrer subdirectorio
            getFilesRecursive($path, $files);
        } else {
            // Añadir archivo a la lista
            $files[] = [
                'path' => $path,
                'time' => filemtime($path),
                'size' => filesize($path)
            ];
        }
    }
}

/**
 * Elimina directorios vacíos de forma recursiva
 * @param string $dir Directorio a verificar
 * @return bool True si el directorio está vacío, False en caso contrario
 */
function removeEmptyDirs($dir) {
    if (!is_dir($dir)) {
        return false;
    }
    
    // Obtener contenido del directorio
    $items = scandir($dir);
    
    // Verificar si solo contiene . y ..
    if (count($items) === 2) {
        // Directorio vacío, eliminar
        rmdir($dir);
        echo "Directorio vacío eliminado: $dir\n";
        return true;
    }
    
    // Recorrer subdirectorios
    $empty = true;
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        
        $path = $dir . '/' . $item;
        
        if (is_dir($path)) {
            // Verificar si el subdirectorio está vacío
            $subdirEmpty = removeEmptyDirs($path);
            $empty = $empty && $subdirEmpty;
        } else {
            // Si hay archivos, el directorio no está vacío
            $empty = false;
        }
    }
    
    // Si después de eliminar subdirectorios vacíos, este directorio quedó vacío, eliminarlo
    if ($empty) {
        // Verificar nuevamente si el directorio está vacío
        $items = scandir($dir);
        if (count($items) === 2) {
            rmdir($dir);
            echo "Directorio vacío eliminado: $dir\n";
            return true;
        }
    }
    
    return false;
}

/**
 * Obtiene el tamaño de un directorio de forma recursiva
 * @param string $dir Directorio a medir
 * @return int Tamaño en bytes
 */
function getDirSize($dir) {
    $size = 0;
    
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS)) as $file) {
        $size += $file->getSize();
    }
    
    return $size;
}

/**
 * Formatea un tamaño en bytes a una unidad legible
 * @param int $size Tamaño en bytes
 * @return string Tamaño formateado
 */
function formatSize($size) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $i = 0;
    
    while ($size >= 1024 && $i < count($units) - 1) {
        $size /= 1024;
        $i++;
    }
    
    return round($size, 2) . ' ' . $units[$i];
}
?>
