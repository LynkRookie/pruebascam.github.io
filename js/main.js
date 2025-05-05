document.addEventListener("DOMContentLoaded", () => {
  // Inicializar gestor de cámaras
  initCameraManager()

  // Inicializar interfaz de usuario
  initUI()

  // Configurar eventos globales
  setupGlobalEvents()
})

/**
 * Inicializa el gestor de cámaras
 */
function initCameraManager() {
  // Contenedor principal para el gestor de cámaras
  const cameraManagerContainer = document.getElementById("camera-manager-container")

  // Si no existe el contenedor, no hacer nada
  if (!cameraManagerContainer) return

  // Crear instancia del gestor de cámaras
  window.cameraManager = new CameraManager({
    container: cameraManagerContainer,
    onCameraAdded: (camera) => {
      showNotification(`Cámara "${camera.name}" añadida correctamente.`, "success")
    },
    onCameraRemoved: (camera) => {
      showNotification(`Cámara "${camera.name}" eliminada.`, "info")
    },
    onCameraSelected: (camera) => {
      console.log("Cámara seleccionada:", camera)
    },
    onError: (message) => {
      showNotification(message, "error")
    },
  })
}

/**
 * Inicializa la interfaz de usuario
 */
function initUI() {
  // Inicializar formulario de conexión
  const cameraForm = document.getElementById("camera-form")
  if (cameraForm) {
    cameraForm.addEventListener("submit", connectToCamera)
  }

  // Inicializar botones de control
  initControlButtons()

  // Inicializar panel de archivos
  initFilesPanel()

  // Inicializar modal
  initModal()
}

/**
 * Inicializa los botones de control
 */
function initControlButtons() {
  // Botones de control de movimiento
  const btnUp = document.getElementById("btn-up")
  const btnDown = document.getElementById("btn-down")
  const btnLeft = document.getElementById("btn-left")
  const btnRight = document.getElementById("btn-right")
  const btnHome = document.getElementById("btn-home")

  // Botones de acción
  const btnSnapshot = document.getElementById("btn-snapshot")
  const btnRecord = document.getElementById("btn-record")
  const btnFiles = document.getElementById("btn-files")

  // Configurar eventos de botones de movimiento
  if (btnUp) btnUp.addEventListener("click", () => moveCamera("up"))
  if (btnDown) btnDown.addEventListener("click", () => moveCamera("down"))
  if (btnLeft) btnLeft.addEventListener("click", () => moveCamera("left"))
  if (btnRight) btnRight.addEventListener("click", () => moveCamera("right"))
  if (btnHome) btnHome.addEventListener("click", () => moveCamera("home"))

  // Configurar eventos de botones de acción
  if (btnSnapshot) btnSnapshot.addEventListener("click", takeSnapshot)
  if (btnRecord) btnRecord.addEventListener("click", toggleRecording)
  if (btnFiles) btnFiles.addEventListener("click", toggleFilesPanel)
}

/**
 * Inicializa el panel de archivos
 */
function initFilesPanel() {
  const btnRefreshFiles = document.getElementById("btn-refresh-files")
  const fileFilter = document.getElementById("file-filter")

  if (btnRefreshFiles) {
    btnRefreshFiles.addEventListener("click", loadCameraFiles)
  }

  if (fileFilter) {
    fileFilter.addEventListener("change", filterFiles)
  }
}

/**
 * Inicializa el modal
 */
function initModal() {
  const modal = document.getElementById("modal")
  const closeModal = document.querySelector(".close-modal")

  if (closeModal && modal) {
    closeModal.addEventListener("click", () => modal.classList.add("hidden"))
  }
}

/**
 * Configura eventos globales
 */
function setupGlobalEvents() {
  // Cerrar modal al hacer clic fuera
  window.addEventListener("click", (e) => {
    const modal = document.getElementById("modal")
    if (modal && e.target === modal) {
      modal.classList.add("hidden")
    }
  })

  // Manejar teclas de acceso rápido
  window.addEventListener("keydown", (e) => {
    // Escape para cerrar modal
    if (e.key === "Escape") {
      const modal = document.getElementById("modal")
      if (modal && !modal.classList.contains("hidden")) {
        modal.classList.add("hidden")
      }
    }

    // Teclas de flecha para control de cámara
    if (document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
      switch (e.key) {
        case "ArrowUp":
          moveCamera("up")
          break
        case "ArrowDown":
          moveCamera("down")
          break
        case "ArrowLeft":
          moveCamera("left")
          break
        case "ArrowRight":
          moveCamera("right")
          break
        case "Home":
          moveCamera("home")
          break
      }
    }
  })
}

/**
 * Conecta a la cámara
 */
function connectToCamera(e) {
  if (e) e.preventDefault()

  const cameraIpInput = document.getElementById("camera-ip")
  const cameraPortInput = document.getElementById("camera-port")
  const cameraUsernameInput = document.getElementById("camera-username")
  const cameraPasswordInput = document.getElementById("camera-password")
  const connectionStatus = document.getElementById("connection-status")
  const loadingIndicator = document.getElementById("loading-indicator")
  const videoPlaceholder = document.getElementById("video-placeholder")
  const videoStream = document.getElementById("video-stream")

  // Validar campos
  if (!cameraIpInput || !cameraPortInput) return

  const ip = cameraIpInput.value.trim()
  const port = cameraPortInput.value.trim()
  const username = cameraUsernameInput ? cameraUsernameInput.value.trim() : ""
  const password = cameraPasswordInput ? cameraPasswordInput.value.trim() : ""

  if (!ip || !port) {
    showNotification("Por favor, ingresa la dirección IP y el puerto de la cámara.", "error")
    return
  }

  // Actualizar UI
  if (connectionStatus) connectionStatus.textContent = "Conectando..."
  if (connectionStatus) connectionStatus.className = "status-connecting"
  if (loadingIndicator) loadingIndicator.classList.remove("hidden")
  if (videoPlaceholder) videoPlaceholder.classList.add("hidden")

  // Configuración de la cámara
  const cameraConfig = {
    ip,
    port,
    username,
    password,
    url: `${ip}:${port}`,
  }

  // Enviar solicitud al servidor para verificar la conexión
  fetch("php/check_camera.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cameraConfig),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Conexión exitosa
        connectionSuccessful(cameraConfig)
      } else {
        // Conexión fallida
        connectionFailed(data.message || "No se pudo conectar a la cámara.")
      }
    })
    .catch((error) => {
      console.error("Error:", error)
      connectionFailed("Error de conexión. Verifica la configuración e intenta nuevamente.")
    })
}

/**
 * Maneja una conexión exitosa a la cámara
 */
function connectionSuccessful(cameraConfig) {
  const connectionStatus = document.getElementById("connection-status")
  const loadingIndicator = document.getElementById("loading-indicator")
  const videoPlaceholder = document.getElementById("video-placeholder")
  const videoStream = document.getElementById("video-stream")
  const controlButtons = document.querySelectorAll(".control-btn")
  const actionButtons = document.querySelectorAll(".action-btn")
  const videoContainer = document.querySelector(".video-container")

  // Actualizar UI
  if (connectionStatus) {
    connectionStatus.textContent = "Conectado"
    connectionStatus.className = "status-connected"
  }
  if (loadingIndicator) loadingIndicator.classList.add("hidden")
  if (videoPlaceholder) videoPlaceholder.classList.add("hidden")
  if (videoStream) videoStream.classList.remove("hidden")

  // Habilitar botones
  controlButtons.forEach((btn) => (btn.disabled = false))
  actionButtons.forEach((btn) => (btn.disabled = false))

  // Inicializar reproductor de video avanzado si está disponible
  if (typeof VideoPlayer !== "undefined" && videoContainer) {
    // Crear contenedor para el reproductor
    const playerContainer = document.createElement("div")
    playerContainer.id = "advanced-player"
    playerContainer.className = "advanced-player"
    videoContainer.appendChild(playerContainer)

    // Ocultar stream básico
    if (videoStream) videoStream.classList.add("hidden")

    // Inicializar reproductor
    window.videoPlayer = new VideoPlayer({
      container: playerContainer,
      protocol: "auto",
      debug: true,
      onConnect: (protocol) => {
        showNotification(`Conectado con protocolo: ${protocol}`, "success")
      },
      onDisconnect: () => {
        showNotification("Desconectado de la cámara", "warning")
      },
      onError: (message) => {
        showNotification(`Error: ${message}`, "error")
      },
      onMotionDetected: () => {
        showNotification("¡Movimiento detectado!", "warning")
      },
    })

    // Conectar a la cámara
    window.videoPlayer.connect({
      url: cameraConfig.url,
      auth: {
        username: cameraConfig.username,
        password: cameraConfig.password,
      },
    })
  } else {
    // Usar método básico de streaming
    startBasicVideoStream(cameraConfig)
  }

  // Cargar archivos de la cámara
  loadCameraFiles()

  showNotification("Conexión establecida correctamente.", "success")
}

/**
 * Maneja una conexión fallida a la cámara
 */
function connectionFailed(message) {
  const connectionStatus = document.getElementById("connection-status")
  const loadingIndicator = document.getElementById("loading-indicator")
  const videoPlaceholder = document.getElementById("video-placeholder")
  const videoStream = document.getElementById("video-stream")
  const controlButtons = document.querySelectorAll(".control-btn")
  const actionButtons = document.querySelectorAll(".action-btn")
  const filesPanel = document.getElementById("files-panel")

  // Actualizar UI
  if (connectionStatus) {
    connectionStatus.textContent = "Desconectado"
    connectionStatus.className = "status-disconnected"
  }
  if (loadingIndicator) loadingIndicator.classList.add("hidden")
  if (videoPlaceholder) videoPlaceholder.classList.remove("hidden")
  if (videoStream) videoStream.classList.add("hidden")

  // Deshabilitar botones
  controlButtons.forEach((btn) => (btn.disabled = true))
  actionButtons.forEach((btn) => (btn.disabled = true))

  // Ocultar panel de archivos
  if (filesPanel) filesPanel.classList.add("hidden")

  // Limpiar reproductor avanzado si existe
  const advancedPlayer = document.getElementById("advanced-player")
  if (advancedPlayer) {
    advancedPlayer.parentNode.removeChild(advancedPlayer)
  }

  showNotification(message, "error")
}

/**
 * Inicia el streaming básico de video
 */
function startBasicVideoStream(cameraConfig) {
  const videoStream = document.getElementById("video-stream")
  if (!videoStream) return

  // Limpiar cualquier intervalo existente
  if (window.streamInterval) {
    clearInterval(window.streamInterval)
  }

  // Función para actualizar el stream
  const updateVideoStream = () => {
    // Añadir timestamp para evitar caché
    const timestamp = new Date().getTime()
    videoStream.src = `php/get_stream.php?url=${encodeURIComponent(cameraConfig.url)}&protocol=jpg&t=${timestamp}`
  }

  // Actualizar stream inicialmente
  updateVideoStream()

  // Configurar intervalo para actualizar el stream
  window.streamInterval = setInterval(updateVideoStream, 1000)
}

/**
 * Mueve la cámara en la dirección especificada
 */
function moveCamera(direction) {
  const cameraIpInput = document.getElementById("camera-ip")
  const cameraPortInput = document.getElementById("camera-port")
  const cameraUsernameInput = document.getElementById("camera-username")
  const cameraPasswordInput = document.getElementById("camera-password")

  // Validar que estamos conectados
  const connectionStatus = document.getElementById("connection-status")
  if (!connectionStatus || connectionStatus.textContent !== "Conectado") {
    return
  }

  // Obtener configuración de la cámara
  const cameraConfig = {
    ip: cameraIpInput.value.trim(),
    port: cameraPortInput.value.trim(),
    username: cameraUsernameInput ? cameraUsernameInput.value.trim() : "",
    password: cameraPasswordInput ? cameraPasswordInput.value.trim() : "",
    action: "move",
    direction: direction,
  }

  // Enviar comando al servidor
  fetch("php/control_camera.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cameraConfig),
  })
    .then((response) => response.json())
    .then((data) => {
      if (!data.success) {
        showNotification(`Error al mover la cámara: ${data.message}`, "error")
      }
    })
    .catch((error) => {
      console.error("Error:", error)
      showNotification("Error al enviar el comando de movimiento.", "error")
    })
}

/**
 * Toma una captura de la cámara
 */
function takeSnapshot() {
  const cameraIpInput = document.getElementById("camera-ip")
  const cameraPortInput = document.getElementById("camera-port")
  const cameraUsernameInput = document.getElementById("camera-username")
  const cameraPasswordInput = document.getElementById("camera-password")

  // Validar que estamos conectados
  const connectionStatus = document.getElementById("connection-status")
  if (!connectionStatus || connectionStatus.textContent !== "Conectado") {
    return
  }

  // Mostrar notificación
  showNotification("Capturando imagen...", "info")

  // Obtener configuración de la cámara
  const cameraConfig = {
    ip: cameraIpInput.value.trim(),
    port: cameraPortInput.value.trim(),
    username: cameraUsernameInput ? cameraUsernameInput.value.trim() : "",
    password: cameraPasswordInput ? cameraPasswordInput.value.trim() : "",
  }

  // Enviar solicitud al servidor
  fetch("php/snapshot.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cameraConfig),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showNotification("Imagen capturada correctamente.", "success")
        // Actualizar lista de archivos
        loadCameraFiles()
      } else {
        showNotification(`Error al capturar imagen: ${data.message}`, "error")
      }
    })
    .catch((error) => {
      console.error("Error:", error)
      showNotification("Error al capturar imagen.", "error")
    })
}

/**
 * Activa/desactiva la grabación
 */
function toggleRecording() {
  const btnRecord = document.getElementById("btn-record")
  const cameraIpInput = document.getElementById("camera-ip")
  const cameraPortInput = document.getElementById("camera-port")
  const cameraUsernameInput = document.getElementById("camera-username")
  const cameraPasswordInput = document.getElementById("camera-password")

  // Validar que estamos conectados
  const connectionStatus = document.getElementById("connection-status")
  if (!connectionStatus || connectionStatus.textContent !== "Conectado") {
    return
  }

  // Determinar si estamos grabando o no
  const isRecording = btnRecord.innerHTML.includes("Detener")
  const action = isRecording ? "stop" : "start"

  // Actualizar UI
  if (!isRecording) {
    btnRecord.innerHTML = '<i class="fa-solid fa-stop"></i> Detener'
    btnRecord.style.backgroundColor = "var(--error-color)"
  } else {
    btnRecord.innerHTML = '<i class="fa-solid fa-record-vinyl"></i> Grabar'
    btnRecord.style.backgroundColor = ""
  }

  // Obtener configuración de la cámara
  const cameraConfig = {
    ip: cameraIpInput.value.trim(),
    port: cameraPortInput.value.trim(),
    username: cameraUsernameInput ? cameraUsernameInput.value.trim() : "",
    password: cameraPasswordInput ? cameraPasswordInput.value.trim() : "",
    action: action,
  }

  // Enviar solicitud al servidor
  fetch("php/record.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cameraConfig),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showNotification(isRecording ? "Grabación detenida." : "Grabación iniciada.", "success")
        // Si detuvimos la grabación, actualizar lista de archivos
        if (isRecording) {
          loadCameraFiles()
        }
      } else {
        // Revertir UI si hay error
        if (!isRecording) {
          btnRecord.innerHTML = '<i class="fa-solid fa-record-vinyl"></i> Grabar'
          btnRecord.style.backgroundColor = ""
        } else {
          btnRecord.innerHTML = '<i class="fa-solid fa-stop"></i> Detener'
          btnRecord.style.backgroundColor = "var(--error-color)"
        }
        showNotification(`Error al ${isRecording ? "detener" : "iniciar"} grabación: ${data.message}`, "error")
      }
    })
    .catch((error) => {
      console.error("Error:", error)
      // Revertir UI si hay error
      if (!isRecording) {
        btnRecord.innerHTML = '<i class="fa-solid fa-record-vinyl"></i> Grabar'
        btnRecord.style.backgroundColor = ""
      } else {
        btnRecord.innerHTML = '<i class="fa-solid fa-stop"></i> Detener'
        btnRecord.style.backgroundColor = "var(--error-color)"
      }
      showNotification(`Error al ${isRecording ? "detener" : "iniciar"} grabación.`, "error")
    })
}

/**
 * Muestra/oculta el panel de archivos
 */
function toggleFilesPanel() {
  const filesPanel = document.getElementById("files-panel")
  if (!filesPanel) return

  filesPanel.classList.toggle("hidden")

  if (!filesPanel.classList.contains("hidden")) {
    loadCameraFiles()
  }
}

/**
 * Carga los archivos de la cámara
 */
function loadCameraFiles() {
  const filesContainer = document.getElementById("files-container")
  const cameraIpInput = document.getElementById("camera-ip")

  if (!filesContainer || !cameraIpInput) return

  // Validar que estamos conectados
  const connectionStatus = document.getElementById("connection-status")
  if (!connectionStatus || connectionStatus.textContent !== "Conectado") {
    return
  }

  // Mostrar mensaje de carga
  filesContainer.innerHTML = '<p class="no-files">Cargando archivos...</p>'

  // Obtener configuración de la cámara
  const cameraConfig = {
    ip: cameraIpInput.value.trim(),
  }

  // Enviar solicitud al servidor
  fetch("php/get_files.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cameraConfig),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Renderizar archivos
        renderFiles(data.files)
      } else {
        filesContainer.innerHTML = `<p class="no-files">Error al cargar archivos: ${data.message}</p>`
      }
    })
    .catch((error) => {
      console.error("Error:", error)
      filesContainer.innerHTML = '<p class="no-files">Error al cargar archivos. Intenta nuevamente.</p>'
    })
}

/**
 * Renderiza los archivos en el panel
 */
function renderFiles(files) {
  const filesContainer = document.getElementById("files-container")
  const fileFilter = document.getElementById("file-filter")

  if (!filesContainer) return

  if (!files || files.length === 0) {
    filesContainer.innerHTML = '<p class="no-files">No hay archivos disponibles.</p>'
    return
  }

  // Aplicar filtro si existe
  if (fileFilter) {
    const filterValue = fileFilter.value
    if (filterValue !== "all") {
      files = files.filter((file) => file.type === filterValue)

      if (files.length === 0) {
        filesContainer.innerHTML = `<p class="no-files">No hay archivos de tipo "${filterValue}" disponibles.</p>`
        return
      }
    }
  }

  // Ordenar archivos por fecha (más recientes primero)
  files.sort((a, b) => new Date(b.date) - new Date(a.date))

  // Generar HTML
  let html = ""

  files.forEach((file) => {
    const isImage = file.type === "image"
    const isVideo = file.type === "video"

    html += `
      <div class="file-item">
        <div class="file-thumbnail">
          ${
            isImage
              ? `<img src="php/get_thumbnail.php?file=${encodeURIComponent(file.path)}" alt="${file.name}">`
              : isVideo
                ? `<i class="fa-solid fa-film"></i>`
                : `<i class="fa-solid fa-file"></i>`
          }
        </div>
        <div class="file-info">
          <div class="file-name" title="${file.name}">${file.name}</div>
          <div class="file-date">${formatDate(file.date)}</div>
        </div>
        <div class="file-actions">
          <button class="file-action-btn" onclick="viewFile('${file.path}', '${file.type}', '${file.name}')">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button class="file-action-btn" onclick="downloadFile('${file.path}', '${file.type}', '${file.name}')">
            <i class="fa-solid fa-download"></i>
          </button>
          <button class="file-action-btn" onclick="deleteFile('${file.path}', '${file.name}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `
  })

  filesContainer.innerHTML = html
}

/**
 * Filtra los archivos según el tipo seleccionado
 */
function filterFiles() {
  loadCameraFiles()
}

/**
 * Formatea una fecha
 */
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString() + " " + date.toLocaleTimeString()
}

/**
 * Visualiza un archivo
 */
function viewFile(filePath, fileType, fileName) {
  const modal = document.getElementById("modal")
  const modalTitle = document.getElementById("modal-title")
  const modalBody = document.getElementById("modal-body")

  if (!modal || !modalTitle || !modalBody) return

  // Configurar modal
  modalTitle.textContent = fileName

  // Obtener configuración de la cámara
  const cameraIpInput = document.getElementById("camera-ip")
  const cameraPortInput = document.getElementById("camera-port")
  const cameraUsernameInput = document.getElementById("camera-username")
  const cameraPasswordInput = document.getElementById("camera-password")

  const cameraConfig = {
    ip: cameraIpInput.value.trim(),
    port: cameraPortInput ? cameraPortInput.value.trim() : "",
    username: cameraUsernameInput ? cameraUsernameInput.value.trim() : "",
    password: cameraPasswordInput ? cameraPasswordInput.value.trim() : "",
  }

  // Generar contenido según tipo de archivo
  let content = ""

  if (fileType === "image") {
    content = `<img src="php/get_file.php?file=${encodeURIComponent(filePath)}" alt="${fileName}" style="max-width: 100%;">`
  } else if (fileType === "video") {
    content = `
      <video controls style="max-width: 100%;">
        <source src="php/get_file.php?file=${encodeURIComponent(filePath)}" type="video/mp4">
        Tu navegador no soporta la reproducción de video.
      </video>
    `
  } else {
    content = `<p>No se puede previsualizar este tipo de archivo.</p>`
  }

  modalBody.innerHTML = content
  modal.classList.remove("hidden")
}

/**
 * Descarga un archivo
 */
function downloadFile(filePath, fileName) {
  // Crear URL de descarga
  const downloadUrl = `php/download_file.php?file=${encodeURIComponent(filePath)}&name=${encodeURIComponent(fileName)}`

  // Crear enlace temporal y hacer clic
  const link = document.createElement("a")
  link.href = downloadUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Elimina un archivo
 */
function deleteFile(filePath, fileName) {
  if (!confirm(`¿Estás seguro de que deseas eliminar "${fileName}"?`)) {
    return
  }

  // Obtener configuración de la cámara
  const cameraIpInput = document.getElementById("camera-ip")

  if (!cameraIpInput) return

  const cameraConfig = {
    ip: cameraIpInput.value.trim(),
    filePath: filePath,
  }

  // Enviar solicitud al servidor
  fetch("php/delete_file.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cameraConfig),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showNotification(`Archivo "${fileName}" eliminado correctamente.`, "success")
        loadCameraFiles()
      } else {
        showNotification(`Error al eliminar archivo: ${data.message}`, "error")
      }
    })
    .catch((error) => {
      console.error("Error:", error)
      showNotification("Error al eliminar archivo.", "error")
    })
}

/**
 * Muestra una notificación
 */
function showNotification(message, type) {
  // Crear elemento de notificación
  const notification = document.createElement("div")
  notification.className = `notification ${type}`
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fa-solid ${
        type === "success"
          ? "fa-check-circle"
          : type === "error"
            ? "fa-times-circle"
            : type === "warning"
              ? "fa-exclamation-triangle"
              : "fa-info-circle"
      }"></i>
      <span>${message}</span>
    </div>
  `

  // Añadir al documento
  document.body.appendChild(notification)

  // Mostrar notificación
  setTimeout(() => {
    notification.classList.add("show")
  }, 10)

  // Eliminar después de un tiempo
  setTimeout(() => {
    notification.classList.remove("show")
    setTimeout(() => {
      document.body.removeChild(notification)
    }, 300)
  }, 3000)
}

// Añadir estilos de notificación si no existen
if (!document.getElementById("notification-styles")) {
  const notificationStyles = document.createElement("style")
  notificationStyles.id = "notification-styles"
  notificationStyles.textContent = `
    .notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 4px;
      color: white;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateX(120%);
      transition: transform 0.3s ease;
      z-index: 1001;
    }
    
    .notification.show {
      transform: translateX(0);
    }
    
    .notification.success {
      background-color: var(--success-color);
    }
    
    .notification.error {
      background-color: var(--error-color);
    }
    
    .notification.warning {
      background-color: var(--warning-color);
    }
    
    .notification.info {
      background-color: var(--secondary-color);
    }
    
    .notification-content {
      display: flex;
      align-items: center;
    }
    
    .notification-content i {
      margin-right: 10px;
      font-size: 20px;
    }
  `
  document.head.appendChild(notificationStyles)
}
