<?php
/**
 * Archivo de autenticación para el sistema de monitoreo de cámaras
 * Contiene funciones para gestionar la autenticación de usuarios
 */

// Incluir archivo de configuración
require_once __DIR__ . '/config.php';

// Iniciar sesión si no está iniciada
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Verifica si el usuario está autenticado
 * @return bool True si el usuario está autenticado, False en caso contrario
 */
function isAuthenticated() {
    // Verificar si se requiere inicio de sesión
    $requireLogin = getConfig('security.require_login', false);
    
    if (!$requireLogin) {
        return true;
    }
    
    // Verificar si existe la sesión
    if (!isset($_SESSION['user']) || !isset($_SESSION['last_activity'])) {
        return false;
    }
    
    // Verificar tiempo de inactividad
    $sessionTimeout = getConfig('security.session_timeout', 30) * 60; // Convertir a segundos
    $currentTime = time();
    
    if ($currentTime - $_SESSION['last_activity'] > $sessionTimeout) {
        // Sesión expirada
        logout();
        return false;
    }
    
    // Actualizar tiempo de actividad
    $_SESSION['last_activity'] = $currentTime;
    
    return true;
}

/**
 * Autentica un usuario
 * @param string $username Nombre de usuario
 * @param string $password Contraseña
 * @return bool True si la autenticación fue exitosa, False en caso contrario
 */
function login($username, $password) {
    // Obtener credenciales de la configuración
    $configUsername = getConfig('security.username', 'admin');
    $configPassword = getConfig('security.password', 'admin');
    
    // Verificar credenciales
    if ($username === $configUsername && $password === $configPassword) {
        // Iniciar sesión
        $_SESSION['user'] = $username;
        $_SESSION['last_activity'] = time();
        return true;
    }
    
    return false;
}

/**
 * Cierra la sesión del usuario
 */
function logout() {
    // Destruir sesión
    session_unset();
    session_destroy();
}

/**
 * Verifica si el usuario está autenticado, si no, redirige a la página de inicio de sesión
 */
function requireAuth() {
    if (!isAuthenticated()) {
        // Guardar URL actual para redireccionar después del inicio de sesión
        if (!isset($_SESSION['redirect_url'])) {
            $_SESSION['redirect_url'] = $_SERVER['REQUEST_URI'];
        }
        
        // Redireccionar a la página de inicio de sesión
        header('Location: login.php');
        exit;
    }
}
?>
