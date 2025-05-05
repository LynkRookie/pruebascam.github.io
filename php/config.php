<?php
/**
 * Archivo de configuración para el sistema de monitoreo de cámaras
 * Contiene funciones para cargar y guardar configuraciones
 */

/**
 * Carga la configuración del sistema
 * @return array Configuración del sistema
 */
function loadConfig() {
    $configFile = __DIR__ . '/../config/config.json';
    
    // Configuración por defecto
    $defaultConfig = [
        'system' => [
            'name' => 'Sistema de Monitoreo de Cámaras',
            'version' => '2.0.0',
            'language' => 'es',
            'timezone' => 'America/Mexico_City',
            'debug' => false
        ],
        'storage' => [
            'path' => '../storage',
            'max_size' => 10000, // MB
            'auto_cleanup' => true,
            'cleanup_days' => 30
        ],
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
        ],
        'security' => [
            'require_login' => false,
            'username' => 'admin',
            'password' => 'admin',
            'session_timeout' => 30 // minutos
        ]
    ];
    
    // Verificar si existe el directorio de configuración
    $configDir = dirname($configFile);
    if (!file_exists($configDir)) {
        mkdir($configDir, 0777, true);
    }
    
    // Verificar si existe el archivo de configuración
    if (file_exists($configFile)) {
        $config = json_decode(file_get_contents($configFile), true);
        
        // Verificar si la configuración es válida
        if ($config === null) {
            // Si hay un error en el JSON, usar la configuración por defecto
            $config = $defaultConfig;
            saveConfig($config);
        } else {
            // Combinar con la configuración por defecto para asegurar que existan todos los campos
            $config = array_replace_recursive($defaultConfig, $config);
        }
    } else {
        // Si no existe el archivo, crear uno con la configuración por defecto
        $config = $defaultConfig;
        saveConfig($config);
    }
    
    return $config;
}

/**
 * Guarda la configuración del sistema
 * @param array $config Configuración a guardar
 * @return bool True si se guardó correctamente, False en caso contrario
 */
function saveConfig($config) {
    $configFile = __DIR__ . '/../config/config.json';
    
    // Verificar si existe el directorio de configuración
    $configDir = dirname($configFile);
    if (!file_exists($configDir)) {
        mkdir($configDir, 0777, true);
    }
    
    // Guardar configuración
    return file_put_contents($configFile, json_encode($config, JSON_PRETTY_PRINT));
}

/**
 * Obtiene una configuración específica
 * @param string $key Clave de la configuración (formato: section.key.subkey)
 * @param mixed $default Valor por defecto si no existe la configuración
 * @return mixed Valor de la configuración
 */
function getConfig($key, $default = null) {
    $config = loadConfig();
    
    // Dividir la clave en secciones
    $keys = explode('.', $key);
    $value = $config;
    
    // Recorrer las secciones
    foreach ($keys as $k) {
        if (!isset($value[$k])) {
            return $default;
        }
        $value = $value[$k];
    }
    
    return $value;
}

/**
 * Establece una configuración específica
 * @param string $key Clave de la configuración (formato: section.key.subkey)
 * @param mixed $value Valor a establecer
 * @return bool True si se guardó correctamente, False en caso contrario
 */
function setConfig($key, $value) {
    $config = loadConfig();
    
    // Dividir la clave en secciones
    $keys = explode('.', $key);
    $lastKey = array_pop($keys);
    $current = &$config;
    
    // Recorrer las secciones
    foreach ($keys as $k) {
        if (!isset($current[$k]) || !is_array($current[$k])) {
            $current[$k] = [];
        }
        $current = &$current[$k];
    }
    
    // Establecer el valor
    $current[$lastKey] = $value;
    
    // Guardar configuración
    return saveConfig($config);
}
?>
