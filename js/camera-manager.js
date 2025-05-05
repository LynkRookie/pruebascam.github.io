/**
 * CameraManager - Gestión avanzada de múltiples cámaras de seguridad
 * Permite administrar varias cámaras, cambiar entre ellas y configurar opciones
 */
class CameraManager {
  constructor(options = {}) {
    // Opciones por defecto
    this.options = {
      container: null, // Contenedor principal
      storageKey: "cameras", // Clave para almacenamiento local
      maxCameras: 10, // Número máximo de cámaras
      defaultView: "grid", // Vista por defecto: 'grid' o 'single'
      onCameraAdded: null, // Callback al añadir cámara
      onCameraRemoved: null, // Callback al eliminar cámara
      onCameraSelected: null, // Callback al seleccionar cámara
      onError: null, // Callback en error
      ...options,
    }

    // Estado
    this.state = {
      cameras: [], // Lista de cámaras
      activeCameraIndex: -1, // Índice de cámara activa
      players: {}, // Reproductores de video
      view: this.options.defaultView, // Vista actual
      recording: {}, // Estado de grabación por cámara
      schedules: {}, // Programaciones por cámara
    }

    // Inicializar
    this.init()
  }

  /**
   * Inicializa el gestor de cámaras
   */
  init() {
    // Verificar que existe el contenedor
    if (!this.options.container) {
      console.error("CameraManager: No se ha especificado un contenedor")
      return
    }

    // Cargar cámaras guardadas
    this.loadCameras()

    // Crear interfaz de usuario
    this.createUI()

    // Inicializar reproductores para cámaras existentes
    this.initPlayers()
  }

  /**
   * Crea la interfaz de usuario
   */
  createUI() {
    const container = this.options.container
    container.innerHTML = ""
    container.classList.add("camera-manager")

    // Crear elementos
    this.elements = {
      header: document.createElement("div"),
      cameraList: document.createElement("div"),
      viewContainer: document.createElement("div"),
      addCameraForm: document.createElement("div"),
    }

    // Configurar elementos
    this.elements.header.className = "manager-header"
    this.elements.cameraList.className = "camera-list"
    this.elements.viewContainer.className = "view-container"
    this.elements.addCameraForm.className = "add-camera-form"

    // Configurar header
    this.elements.header.innerHTML = `
            <h2>Gestor de Cámaras</h2>
            <div class="view-controls">
                <button class="view-btn grid-view-btn ${this.state.view === "grid" ? "active" : ""}" title="Vista en cuadrícula">
                    <i class="fa-solid fa-th"></i>
                </button>
                <button class="view-btn single-view-btn ${this.state.view === "single" ? "active" : ""}" title="Vista única">
                    <i class="fa-solid fa-square"></i>
                </button>
            </div>
            <button class="add-camera-btn">
                <i class="fa-solid fa-plus"></i> Añadir Cámara
            </button>
        `

    // Configurar formulario de añadir cámara
    this.elements.addCameraForm.innerHTML = `
            <div class="form-header">
                <h3>Añadir Nueva Cámara</h3>
                <button class="close-form-btn"><i class="fa-solid fa-times"></i></button>
            </div>
            <form id="add-camera-form">
                <div class="form-group">
                    <label for="camera-name">Nombre:</label>
                    <input type="text" id="camera-name" placeholder="Ej: Cámara Entrada" required>
                </div>
                <div class="form-group">
                    <label for="camera-url">URL:</label>
                    <input type="text" id="camera-url" placeholder="Ej: 192.168.1.100:8080" required>
                </div>
                <div class="form-group">
                    <label for="camera-protocol">Protocolo:</label>
                    <select id="camera-protocol">
                        <option value="auto">Auto-detectar</option>
                        <option value="rtsp">RTSP</option>
                        <option value="hls">HLS</option>
                        <option value="mjpeg">MJPEG</option>
                        <option value="jpg">JPG</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="camera-username">Usuario:</label>
                    <input type="text" id="camera-username" placeholder="Usuario (opcional)">
                </div>
                <div class="form-group">
                    <label for="camera-password">Contraseña:</label>
                    <input type="password" id="camera-password" placeholder="Contraseña (opcional)">
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-submit">Guardar</button>
                    <button type="button" class="btn-cancel">Cancelar</button>
                </div>
            </form>
        `

    // Añadir elementos al contenedor
    container.appendChild(this.elements.header)
    container.appendChild(this.elements.cameraList)
    container.appendChild(this.elements.viewContainer)
    container.appendChild(this.elements.addCameraForm)

    // Ocultar formulario inicialmente
    this.elements.addCameraForm.classList.add("hidden")

    // Configurar eventos
    this.setupEvents()

    // Renderizar lista de cámaras
    this.renderCameraList()

    // Renderizar vista
    this.renderView()
  }

  /**
   * Configura los eventos de la interfaz
   */
  setupEvents() {
    // Botón de añadir cámara
    const addCameraBtn = this.elements.header.querySelector(".add-camera-btn")
    addCameraBtn.addEventListener("click", () => this.showAddCameraForm())

    // Botones de vista
    const gridViewBtn = this.elements.header.querySelector(".grid-view-btn")
    const singleViewBtn = this.elements.header.querySelector(".single-view-btn")

    gridViewBtn.addEventListener("click", () => this.setView("grid"))
    singleViewBtn.addEventListener("click", () => this.setView("single"))

    // Formulario de añadir cámara
    const addCameraForm = this.elements.addCameraForm.querySelector("form")
    const closeFormBtn = this.elements.addCameraForm.querySelector(".close-form-btn")
    const cancelBtn = this.elements.addCameraForm.querySelector(".btn-cancel")

    addCameraForm.addEventListener("submit", (e) => {
      e.preventDefault()
      this.addCamera()
    })

    closeFormBtn.addEventListener("click", () => this.hideAddCameraForm())
    cancelBtn.addEventListener("click", () => this.hideAddCameraForm())
  }

  /**
   * Muestra el formulario para añadir una cámara
   */
  showAddCameraForm() {
    this.elements.addCameraForm.classList.remove("hidden")
  }

  /**
   * Oculta el formulario para añadir una cámara
   */
  hideAddCameraForm() {
    this.elements.addCameraForm.classList.add("hidden")
    // Limpiar formulario
    const form = this.elements.addCameraForm.querySelector("form")
    form.reset()
  }

  /**
   * Añade una nueva cámara
   */
  addCamera() {
    // Obtener datos del formulario
    const nameInput = document.getElementById("camera-name")
    const urlInput = document.getElementById("camera-url")
    const protocolInput = document.getElementById("camera-protocol")
    const usernameInput = document.getElementById("camera-username")
    const passwordInput = document.getElementById("camera-password")

    const name = nameInput.value.trim()
    const url = urlInput.value.trim()
    const protocol = protocolInput.value
    const username = usernameInput.value.trim()
    const password = passwordInput.value.trim()

    // Validar datos
    if (!name || !url) {
      this.showError("Por favor, completa todos los campos obligatorios.")
      return
    }

    // Verificar límite de cámaras
    if (this.state.cameras.length >= this.options.maxCameras) {
      this.showError(`No puedes añadir más de ${this.options.maxCameras} cámaras.`)
      return
    }

    // Crear objeto de cámara
    const camera = {
      id: Date.now().toString(),
      name,
      url,
      protocol,
      auth: {
        username,
        password,
      },
      enabled: true,
      ptz: true, // Asumimos que todas las cámaras tienen PTZ por defecto
      createdAt: new Date().toISOString(),
    }

    // Añadir a la lista
    this.state.cameras.push(camera)

    // Guardar cámaras
    this.saveCameras()

    // Actualizar UI
    this.renderCameraList()
    this.initPlayer(camera)
    this.renderView()

    // Ocultar formulario
    this.hideAddCameraForm()

    // Seleccionar la nueva cámara
    this.selectCamera(this.state.cameras.length - 1)

    // Ejecutar callback si existe
    if (typeof this.options.onCameraAdded === "function") {
      this.options.onCameraAdded(camera)
    }
  }

  /**
   * Elimina una cámara
   * @param {string} id - ID de la cámara a eliminar
   */
  removeCamera(id) {
    // Buscar índice de la cámara
    const index = this.state.cameras.findIndex((camera) => camera.id === id)

    if (index === -1) return

    // Obtener cámara
    const camera = this.state.cameras[index]

    // Confirmar eliminación
    if (!confirm(`¿Estás seguro de que deseas eliminar la cámara "${camera.name}"?`)) {
      return
    }

    // Destruir reproductor si existe
    if (this.state.players[camera.id]) {
      // Limpiar reproductor
      this.state.players[camera.id] = null
    }

    // Eliminar de la lista
    this.state.cameras.splice(index, 1)

    // Actualizar cámara activa si es necesario
    if (this.state.activeCameraIndex === index) {
      this.state.activeCameraIndex = this.state.cameras.length > 0 ? 0 : -1
    } else if (this.state.activeCameraIndex > index) {
      this.state.activeCameraIndex--
    }

    // Guardar cámaras
    this.saveCameras()

    // Actualizar UI
    this.renderCameraList()
    this.renderView()

    // Ejecutar callback si existe
    if (typeof this.options.onCameraRemoved === "function") {
      this.options.onCameraRemoved(camera)
    }
  }

  /**
   * Selecciona una cámara
   * @param {number} index - Índice de la cámara a seleccionar
   */
  selectCamera(index) {
    if (index < 0 || index >= this.state.cameras.length) return

    // Actualizar índice
    this.state.activeCameraIndex = index

    // Actualizar UI
    this.renderCameraList()

    // Si estamos en vista única, actualizar vista
    if (this.state.view === "single") {
      this.renderView()
    }

    // Ejecutar callback si existe
    if (typeof this.options.onCameraSelected === "function") {
      this.options.onCameraSelected(this.state.cameras[index])
    }
  }

  /**
   * Cambia la vista
   * @param {string} view - Vista a mostrar ('grid' o 'single')
   */
  setView(view) {
    if (view !== "grid" && view !== "single") return

    // Actualizar vista
    this.state.view = view

    // Actualizar botones
    const gridViewBtn = this.elements.header.querySelector(".grid-view-btn")
    const singleViewBtn = this.elements.header.querySelector(".single-view-btn")

    if (view === "grid") {
      gridViewBtn.classList.add("active")
      singleViewBtn.classList.remove("active")
    } else {
      gridViewBtn.classList.remove("active")
      singleViewBtn.classList.add("active")
    }

    // Renderizar vista
    this.renderView()
  }

  /**
   * Renderiza la lista de cámaras
   */
  renderCameraList() {
    const cameraList = this.elements.cameraList
    cameraList.innerHTML = ""

    if (this.state.cameras.length === 0) {
      cameraList.innerHTML = '<div class="no-cameras">No hay cámaras configuradas</div>'
      return
    }

    // Crear lista
    const ul = document.createElement("ul")

    this.state.cameras.forEach((camera, index) => {
      const li = document.createElement("li")
      li.className = index === this.state.activeCameraIndex ? "active" : ""

      li.innerHTML = `
                <div class="camera-item" data-id="${camera.id}">
                    <div class="camera-info">
                        <span class="camera-name">${camera.name}</span>
                        <span class="camera-status ${this.isCameraConnected(camera.id) ? "connected" : "disconnected"}">
                            <i class="fa-solid fa-circle"></i>
                        </span>
                    </div>
                    <div class="camera-actions">
                        <button class="camera-action-btn btn-edit" title="Editar">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        <button class="camera-action-btn btn-remove" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `

      // Configurar eventos
      li.querySelector(".camera-info").addEventListener("click", () => this.selectCamera(index))
      li.querySelector(".btn-edit").addEventListener("click", () => this.editCamera(camera.id))
      li.querySelector(".btn-remove").addEventListener("click", () => this.removeCamera(camera.id))

      ul.appendChild(li)
    })

    cameraList.appendChild(ul)
  }

  /**
   * Renderiza la vista actual
   */
  renderView() {
    const viewContainer = this.elements.viewContainer
    viewContainer.innerHTML = ""

    if (this.state.cameras.length === 0) {
      viewContainer.innerHTML = '<div class="no-cameras-view">No hay cámaras configuradas</div>'
      return
    }

    if (this.state.view === "single") {
      // Vista única
      if (this.state.activeCameraIndex === -1) {
        this.state.activeCameraIndex = 0
      }

      const camera = this.state.cameras[this.state.activeCameraIndex]

      // Crear contenedor para la cámara
      const cameraContainer = document.createElement("div")
      cameraContainer.className = "camera-container single-view"
      cameraContainer.dataset.id = camera.id

      // Añadir título
      const cameraTitle = document.createElement("div")
      cameraTitle.className = "camera-title"
      cameraTitle.textContent = camera.name

      // Añadir contenedor de video
      const videoContainer = document.createElement("div")
      videoContainer.className = "video-container"
      videoContainer.id = `video-container-${camera.id}`

      // Añadir controles PTZ si la cámara los soporta
      if (camera.ptz) {
        const ptzControls = this.createPTZControls(camera.id)
        cameraContainer.appendChild(ptzControls)
      }

      // Añadir elementos al contenedor
      cameraContainer.appendChild(cameraTitle)
      cameraContainer.appendChild(videoContainer)

      // Añadir al contenedor principal
      viewContainer.appendChild(cameraContainer)

      // Inicializar reproductor si no existe
      if (!this.state.players[camera.id]) {
        this.initPlayer(camera)
      }
    } else {
      // Vista en cuadrícula
      viewContainer.className = "view-container grid-view"

      // Determinar número de columnas según cantidad de cámaras
      const numCameras = this.state.cameras.length
      let columns = 2

      if (numCameras > 4) columns = 3
      if (numCameras > 9) columns = 4

      viewContainer.style.gridTemplateColumns = `repeat(${columns}, 1fr)`

      // Crear contenedor para cada cámara
      this.state.cameras.forEach((camera) => {
        const cameraContainer = document.createElement("div")
        cameraContainer.className = "camera-container grid-item"
        cameraContainer.dataset.id = camera.id

        // Añadir título
        const cameraTitle = document.createElement("div")
        cameraTitle.className = "camera-title"
        cameraTitle.textContent = camera.name

        // Añadir contenedor de video
        const videoContainer = document.createElement("div")
        videoContainer.className = "video-container"
        videoContainer.id = `video-container-${camera.id}`

        // Añadir elementos al contenedor
        cameraContainer.appendChild(cameraTitle)
        cameraContainer.appendChild(videoContainer)

        // Añadir evento para cambiar a vista única
        cameraContainer.addEventListener("dblclick", () => {
          const index = this.state.cameras.findIndex((c) => c.id === camera.id)
          this.selectCamera(index)
          this.setView("single")
        })

        // Añadir al contenedor principal
        viewContainer.appendChild(cameraContainer)

        // Inicializar reproductor si no existe
        if (!this.state.players[camera.id]) {
          this.initPlayer(camera)
        }
      })
    }
  }

  /**
   * Crea los controles PTZ para una cámara
   * @param {string} cameraId - ID de la cámara
   * @returns {HTMLElement} Elemento con los controles PTZ
   */
  createPTZControls(cameraId) {
    const ptzContainer = document.createElement("div")
    ptzContainer.className = "ptz-controls"

    ptzContainer.innerHTML = `
            <div class="ptz-buttons">
                <button class="ptz-btn btn-up" data-direction="up">
                    <i class="fa-solid fa-chevron-up"></i>
                </button>
                <div class="ptz-horizontal">
                    <button class="ptz-btn btn-left" data-direction="left">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <button class="ptz-btn btn-home" data-direction="home">
                        <i class="fa-solid fa-home"></i>
                    </button>
                    <button class="ptz-btn btn-right" data-direction="right">
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
                <button class="ptz-btn btn-down" data-direction="down">
                    <i class="fa-solid fa-chevron-down"></i>
                </button>
            </div>
            <div class="ptz-presets">
                <button class="preset-btn" data-preset="1">1</button>
                <button class="preset-btn" data-preset="2">2</button>
                <button class="preset-btn" data-preset="3">3</button>
                <button class="preset-btn" data-preset="4">4</button>
            </div>
        `

    // Configurar eventos de los botones PTZ
    const ptzButtons = ptzContainer.querySelectorAll(".ptz-btn")
    ptzButtons.forEach((button) => {
      const direction = button.dataset.direction

      // Evento mousedown para iniciar movimiento
      button.addEventListener("mousedown", () => {
        this.controlCamera(cameraId, "move", { direction })
      })

      // Evento mouseup para detener movimiento
      button.addEventListener("mouseup", () => {
        this.controlCamera(cameraId, "stop")
      })

      // Evento mouseleave para detener movimiento si el ratón sale del botón
      button.addEventListener("mouseleave", () => {
        this.controlCamera(cameraId, "stop")
      })
    })

    // Configurar eventos de los botones de presets
    const presetButtons = ptzContainer.querySelectorAll(".preset-btn")
    presetButtons.forEach((button) => {
      const preset = button.dataset.preset

      button.addEventListener("click", () => {
        this.controlCamera(cameraId, "preset", { preset })
      })
    })

    return ptzContainer
  }

  /**
   * Envía un comando de control a una cámara
   * @param {string} cameraId - ID de la cámara
   * @param {string} command - Comando a enviar
   * @param {Object} params - Parámetros adicionales
   */
  controlCamera(cameraId, command, params = {}) {
    // Buscar cámara
    const camera = this.state.cameras.find((c) => c.id === cameraId)

    if (!camera) return

    // Construir datos para la petición
    const data = {
      camera: {
        url: camera.url,
        auth: camera.auth,
      },
      command,
      ...params,
    }

    // Enviar comando al servidor
    fetch("php/control_camera.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((result) => {
        if (!result.success) {
          console.error("Error al controlar cámara:", result.message)
        }
      })
      .catch((error) => {
        console.error("Error al enviar comando:", error)
      })
  }

  /**
   * Inicializa los reproductores para todas las cámaras
   */
  initPlayers() {
    this.state.cameras.forEach((camera) => {
      this.initPlayer(camera)
    })
  }

  /**
   * Inicializa el reproductor para una cámara
   * @param {Object} camera - Objeto de cámara
   */
  initPlayer(camera) {
    // Verificar si ya existe un reproductor para esta cámara
    if (this.state.players[camera.id]) {
      return
    }

    // Buscar contenedor
    const containerId = `video-container-${camera.id}`
    const container = document.getElementById(containerId)

    if (!container) {
      console.error(`No se encontró el contenedor para la cámara ${camera.id}`)
      return
    }

    // Configurar opciones del reproductor
    const playerOptions = {
      container,
      protocol: camera.protocol,
      autoplay: true,
      reconnectInterval: 5000,
      debug: false,
      onConnect: () => {
        this.updateCameraStatus(camera.id, true)
      },
      onDisconnect: () => {
        this.updateCameraStatus(camera.id, false)
      },
      onError: (message) => {
        console.error(`Error en cámara ${camera.name}:`, message)
      },
      onMotionDetected: () => {
        this.handleMotionDetection(camera.id)
      },
    }

    // Crear reproductor
    const player = new VideoPlayer(playerOptions)

    // Guardar referencia
    this.state.players[camera.id] = player

    // Conectar
    player.connect({
      url: camera.url,
      protocol: camera.protocol,
      auth: camera.auth,
    })
  }

  /**
   * Actualiza el estado de conexión de una cámara en la UI
   * @param {string} cameraId - ID de la cámara
   * @param {boolean} connected - Estado de conexión
   */
  updateCameraStatus(cameraId, connected) {
    const cameraItem = document.querySelector(`.camera-item[data-id="${cameraId}"]`)

    if (!cameraItem) return

    const statusIndicator = cameraItem.querySelector(".camera-status")

    if (connected) {
      statusIndicator.className = "camera-status connected"
    } else {
      statusIndicator.className = "camera-status disconnected"
    }
  }

  /**
   * Verifica si una cámara está conectada
   * @param {string} cameraId - ID de la cámara
   * @returns {boolean} Estado de conexión
   */
  isCameraConnected(cameraId) {
    return this.state.players[cameraId]?.state.connected || false
  }

  /**
   * Maneja la detección de movimiento en una cámara
   * @param {string} cameraId - ID de la cámara
   */
  handleMotionDetection(cameraId) {
    // Buscar cámara
    const camera = this.state.cameras.find((c) => c.id === cameraId)

    if (!camera) return

    console.log(`Movimiento detectado en cámara ${camera.name}`)

    // Si la grabación automática está habilitada, iniciar grabación
    if (this.state.recording[cameraId]?.autoRecord) {
      this.startRecording(cameraId)
    }

    // Enviar notificación si está configurado
    if (this.state.recording[cameraId]?.notifyOnMotion) {
      this.sendMotionNotification(camera)
    }
  }

  /**
   * Inicia la grabación en una cámara
   * @param {string} cameraId - ID de la cámara
   */
  startRecording(cameraId) {
    // Verificar si ya está grabando
    if (this.state.recording[cameraId]?.isRecording) {
      return
    }

    // Buscar cámara
    const camera = this.state.cameras.find((c) => c.id === cameraId)

    if (!camera) return

    console.log(`Iniciando grabación en cámara ${camera.name}`)

    // Actualizar estado
    this.state.recording[cameraId] = {
      ...(this.state.recording[cameraId] || {}),
      isRecording: true,
      startTime: new Date().toISOString(),
    }

    // Enviar comando al servidor
    fetch("php/record.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        camera: {
          url: camera.url,
          auth: camera.auth,
        },
        action: "start",
      }),
    })
      .then((response) => response.json())
      .then((result) => {
        if (!result.success) {
          console.error("Error al iniciar grabación:", result.message)
          this.state.recording[cameraId].isRecording = false
        }
      })
      .catch((error) => {
        console.error("Error al enviar comando de grabación:", error)
        this.state.recording[cameraId].isRecording = false
      })
  }

  /**
   * Detiene la grabación en una cámara
   * @param {string} cameraId - ID de la cámara
   */
  stopRecording(cameraId) {
    // Verificar si está grabando
    if (!this.state.recording[cameraId]?.isRecording) {
      return
    }

    // Buscar cámara
    const camera = this.state.cameras.find((c) => c.id === cameraId)

    if (!camera) return

    console.log(`Deteniendo grabación en cámara ${camera.name}`)

    // Actualizar estado
    this.state.recording[cameraId].isRecording = false

    // Enviar comando al servidor
    fetch("php/record.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        camera: {
          url: camera.url,
          auth: camera.auth,
        },
        action: "stop",
      }),
    })
      .then((response) => response.json())
      .then((result) => {
        if (!result.success) {
          console.error("Error al detener grabación:", result.message)
        }
      })
      .catch((error) => {
        console.error("Error al enviar comando de grabación:", error)
      })
  }

  /**
   * Envía una notificación de movimiento
   * @param {Object} camera - Objeto de cámara
   */
  sendMotionNotification(camera) {
    // En una implementación real, esto podría enviar un correo, SMS, o notificación push
    console.log(`Enviando notificación de movimiento para cámara ${camera.name}`)

    // Ejemplo: enviar notificación por correo
    fetch("php/send_notification.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "motion",
        camera: camera.name,
        timestamp: new Date().toISOString(),
      }),
    })
      .then((response) => response.json())
      .then((result) => {
        if (!result.success) {
          console.error("Error al enviar notificación:", result.message)
        }
      })
      .catch((error) => {
        console.error("Error al enviar notificación:", error)
      })
  }

  /**
   * Edita una cámara existente
   * @param {string} cameraId - ID de la cámara a editar
   */
  editCamera(cameraId) {
    // Buscar cámara
    const camera = this.state.cameras.find((c) => c.id === cameraId)

    if (!camera) return

    // Mostrar formulario
    this.elements.addCameraForm.classList.remove("hidden")

    // Actualizar título del formulario
    this.elements.addCameraForm.querySelector(".form-header h3").textContent = "Editar Cámara"

    // Rellenar formulario
    document.getElementById("camera-name").value = camera.name
    document.getElementById("camera-url").value = camera.url
    document.getElementById("camera-protocol").value = camera.protocol
    document.getElementById("camera-username").value = camera.auth.username || ""
    document.getElementById("camera-password").value = camera.auth.password || ""

    // Cambiar comportamiento del formulario
    const form = this.elements.addCameraForm.querySelector("form")

    // Eliminar eventos anteriores
    const newForm = form.cloneNode(true)
    form.parentNode.replaceChild(newForm, form)

    // Configurar nuevo evento
    newForm.addEventListener("submit", (e) => {
      e.preventDefault()

      // Obtener datos del formulario
      const name = document.getElementById("camera-name").value.trim()
      const url = document.getElementById("camera-url").value.trim()
      const protocol = document.getElementById("camera-protocol").value
      const username = document.getElementById("camera-username").value.trim()
      const password = document.getElementById("camera-password").value.trim()

      // Validar datos
      if (!name || !url) {
        this.showError("Por favor, completa todos los campos obligatorios.")
        return
      }

      // Actualizar cámara
      camera.name = name
      camera.url = url
      camera.protocol = protocol
      camera.auth = {
        username,
        password,
      }

      // Guardar cámaras
      this.saveCameras()

      // Actualizar UI
      this.renderCameraList()

      // Reiniciar reproductor
      if (this.state.players[camera.id]) {
        this.state.players[camera.id].disconnect()
        delete this.state.players[camera.id]
      }

      this.initPlayer(camera)
      this.renderView()

      // Ocultar formulario
      this.hideAddCameraForm()
    })

    // Configurar botón de cancelar
    newForm.querySelector(".btn-cancel").addEventListener("click", () => this.hideAddCameraForm())
  }

  /**
   * Carga las cámaras guardadas
   */
  loadCameras() {
    try {
      const savedCameras = localStorage.getItem(this.options.storageKey)

      if (savedCameras) {
        this.state.cameras = JSON.parse(savedCameras)
      }
    } catch (error) {
      console.error("Error al cargar cámaras:", error)
      this.state.cameras = []
    }
  }

  /**
   * Guarda las cámaras en el almacenamiento local
   */
  saveCameras() {
    try {
      localStorage.setItem(this.options.storageKey, JSON.stringify(this.state.cameras))
    } catch (error) {
      console.error("Error al guardar cámaras:", error)
    }
  }

  /**
   * Muestra un mensaje de error
   * @param {string} message - Mensaje de error
   */
  showError(message) {
    alert(message)

    // En una implementación real, esto podría mostrar un toast o notificación
    if (typeof this.options.onError === "function") {
      this.options.onError(message)
    }
  }
}

// Exportar clase
window.CameraManager = CameraManager
