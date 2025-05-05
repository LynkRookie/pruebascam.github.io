/**
 * VideoPlayer - Módulo avanzado para reproducción de video de cámaras de seguridad
 * Soporta múltiples protocolos: MJPEG, HLS, RTSP (vía WebRTC), y JPG secuencial
 */
class VideoPlayer {
  constructor(options) {
    // Opciones por defecto
    this.options = {
      container: null, // Elemento contenedor del reproductor
      autoplay: true, // Iniciar reproducción automáticamente
      protocol: "auto", // Protocolo: 'mjpeg', 'hls', 'rtsp', 'jpg', 'auto'
      fps: 15, // Cuadros por segundo para modo JPG
      reconnectInterval: 5000, // Intervalo de reconexión en ms
      onConnect: null, // Callback al conectar
      onDisconnect: null, // Callback al desconectar
      onError: null, // Callback en error
      debug: false, // Modo debug
      ...options,
    }

    // Estado del reproductor
    this.state = {
      connected: false,
      connecting: false,
      stream: null,
      player: null,
      reconnectTimer: null,
      lastFrameTime: 0,
      detectionEnabled: false,
      motionDetected: false,
      lastFrameData: null,
    }

    // Inicializar
    this.init()
  }

  /**
   * Inicializa el reproductor de video
   */
  init() {
    this.log("Inicializando reproductor de video")

    // Verificar que existe el contenedor
    if (!this.options.container) {
      this.error("No se ha especificado un contenedor para el reproductor")
      return
    }

    // Crear elementos UI
    this.createUI()
  }

  /**
   * Crea los elementos de UI del reproductor
   */
  createUI() {
    const container = this.options.container
    container.innerHTML = ""
    container.classList.add("video-player-container")

    // Crear elementos
    this.elements = {
      videoContainer: document.createElement("div"),
      video: null,
      canvas: document.createElement("canvas"),
      loadingIndicator: document.createElement("div"),
      errorMessage: document.createElement("div"),
      controls: document.createElement("div"),
      statusIndicator: document.createElement("div"),
    }

    // Configurar elementos
    this.elements.videoContainer.className = "video-display"
    this.elements.canvas.className = "detection-canvas"
    this.elements.loadingIndicator.className = "loading-indicator hidden"
    this.elements.loadingIndicator.innerHTML = '<div class="spinner"></div><p>Conectando...</p>'
    this.elements.errorMessage.className = "error-message hidden"
    this.elements.controls.className = "player-controls"
    this.elements.statusIndicator.className = "status-indicator"

    // Añadir controles básicos
    this.elements.controls.innerHTML = `
            <button class="control-btn btn-reconnect hidden" title="Reconectar">
                <i class="fa-solid fa-rotate"></i>
            </button>
            <button class="control-btn btn-fullscreen" title="Pantalla completa">
                <i class="fa-solid fa-expand"></i>
            </button>
            <button class="control-btn btn-detection" title="Detección de movimiento">
                <i class="fa-solid fa-video"></i>
            </button>
            <div class="stream-stats">
                <span class="protocol-indicator">Sin conexión</span>
                <span class="resolution-indicator"></span>
                <span class="fps-indicator"></span>
            </div>
        `

    // Añadir elementos al contenedor
    this.elements.videoContainer.appendChild(this.elements.canvas)
    container.appendChild(this.elements.videoContainer)
    container.appendChild(this.elements.loadingIndicator)
    container.appendChild(this.elements.errorMessage)
    container.appendChild(this.elements.controls)
    container.appendChild(this.elements.statusIndicator)

    // Configurar eventos de controles
    const btnReconnect = this.elements.controls.querySelector(".btn-reconnect")
    const btnFullscreen = this.elements.controls.querySelector(".btn-fullscreen")
    const btnDetection = this.elements.controls.querySelector(".btn-detection")

    btnReconnect.addEventListener("click", () => this.connect())
    btnFullscreen.addEventListener("click", () => this.toggleFullscreen())
    btnDetection.addEventListener("click", () => this.toggleMotionDetection())

    // Inicializar canvas para detección de movimiento
    this.initDetectionCanvas()
  }

  /**
   * Inicializa el canvas para detección de movimiento
   */
  initDetectionCanvas() {
    const canvas = this.elements.canvas
    const ctx = canvas.getContext("2d")

    // Establecer dimensiones iniciales
    canvas.width = this.options.container.clientWidth
    canvas.height = this.options.container.clientHeight

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  /**
   * Conecta con la cámara y comienza la reproducción
   * @param {Object} streamConfig - Configuración del stream
   */
  connect(streamConfig = {}) {
    // Si ya está conectado o conectando, no hacer nada
    if (this.state.connected || this.state.connecting) {
      return
    }

    // Actualizar estado
    this.state.connecting = true

    // Mostrar indicador de carga
    this.elements.loadingIndicator.classList.remove("hidden")
    this.elements.errorMessage.classList.add("hidden")

    // Actualizar configuración del stream
    this.streamConfig = {
      url: "",
      protocol: this.options.protocol,
      auth: {
        username: "",
        password: "",
      },
      ...streamConfig,
    }

    this.log("Conectando a la cámara:", this.streamConfig)

    // Si el protocolo es 'auto', intentar detectar el mejor protocolo
    if (this.streamConfig.protocol === "auto") {
      this.detectBestProtocol()
    } else {
      this.startStream(this.streamConfig.protocol)
    }
  }

  /**
   * Detecta el mejor protocolo disponible para la cámara
   */
  detectBestProtocol() {
    this.log("Detectando mejor protocolo disponible")

    // Orden de preferencia: HLS > RTSP > MJPEG > JPG
    const protocols = ["hls", "rtsp", "mjpeg", "jpg"]
    let protocolIndex = 0

    const tryProtocol = () => {
      if (protocolIndex >= protocols.length) {
        // Si no se pudo conectar con ningún protocolo, mostrar error
        this.error("No se pudo conectar con ningún protocolo compatible")
        return
      }

      const protocol = protocols[protocolIndex]
      this.log(`Intentando protocolo: ${protocol}`)

      // Intentar conectar con el protocolo actual
      this.startStream(protocol, (success) => {
        if (!success) {
          // Si no se pudo conectar, intentar con el siguiente protocolo
          protocolIndex++
          tryProtocol()
        }
      })
    }

    // Comenzar a probar protocolos
    tryProtocol()
  }

  /**
   * Inicia la reproducción del stream según el protocolo
   * @param {string} protocol - Protocolo a utilizar
   * @param {Function} callback - Función de callback (opcional)
   */
  startStream(protocol, callback = null) {
    this.log(`Iniciando stream con protocolo: ${protocol}`)

    // Limpiar cualquier stream anterior
    this.cleanupCurrentStream()

    // Actualizar indicador de protocolo
    const protocolIndicator = this.elements.controls.querySelector(".protocol-indicator")
    protocolIndicator.textContent = protocol.toUpperCase()

    // Iniciar stream según el protocolo
    switch (protocol) {
      case "hls":
        this.startHLSStream(callback)
        break
      case "rtsp":
        this.startRTSPStream(callback)
        break
      case "mjpeg":
        this.startMJPEGStream(callback)
        break
      case "jpg":
        this.startJPGStream(callback)
        break
      default:
        this.error(`Protocolo no soportado: ${protocol}`)
        if (callback) callback(false)
    }
  }

  /**
   * Inicia un stream HLS (HTTP Live Streaming)
   * @param {Function} callback - Función de callback (opcional)
   */
  startHLSStream(callback = null) {
    // Verificar si el navegador soporta HLS nativo o necesitamos hls.js
    const supportsHLS = document.createElement("video").canPlayType("application/vnd.apple.mpegurl") !== ""

    // Crear elemento de video
    const video = document.createElement("video")
    video.className = "video-element"
    video.controls = false
    video.autoplay = this.options.autoplay
    video.muted = true
    video.playsInline = true

    // Añadir video al contenedor
    this.elements.videoContainer.appendChild(video)
    this.elements.video = video

    // Construir URL del stream
    const streamUrl = this.buildStreamUrl("hls")

    if (supportsHLS) {
      // HLS nativo (Safari)
      video.src = streamUrl
      this.setupVideoEvents(video, callback)
    } else {
      // Usar hls.js
      this.loadScript("https://cdn.jsdelivr.net/npm/hls.js@latest", () => {
        if (typeof Hls !== "undefined" && Hls.isSupported()) {
          const hls = new Hls()
          hls.loadSource(streamUrl)
          hls.attachMedia(video)

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play()
          })

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              this.error(`Error HLS: ${data.type}`)
              if (callback) callback(false)
            }
          })

          this.state.player = hls
          this.setupVideoEvents(video, callback)
        } else {
          this.error("HLS no es soportado por este navegador")
          if (callback) callback(false)
        }
      })
    }
  }

  /**
   * Inicia un stream RTSP (vía WebRTC)
   * @param {Function} callback - Función de callback (opcional)
   */
  startRTSPStream(callback = null) {
    // Para RTSP necesitamos un servidor proxy WebRTC como mediasoup o janus
    // Esta es una implementación simplificada que asume un servidor de señalización WebRTC

    // Crear elemento de video
    const video = document.createElement("video")
    video.className = "video-element"
    video.controls = false
    video.autoplay = this.options.autoplay
    video.muted = true
    video.playsInline = true

    // Añadir video al contenedor
    this.elements.videoContainer.appendChild(video)
    this.elements.video = video

    // En un caso real, aquí se establecería la conexión WebRTC
    // Para este ejemplo, simularemos una conexión exitosa o fallida

    // Simulación: 50% de probabilidad de éxito
    const success = Math.random() > 0.5

    if (success) {
      // Simular conexión exitosa después de un retraso
      setTimeout(() => {
        // En un caso real, aquí se reproduciría el stream RTSP vía WebRTC
        this.onStreamConnected("rtsp")
        if (callback) callback(true)
      }, 1500)
    } else {
      // Simular error de conexión
      setTimeout(() => {
        this.error("No se pudo establecer conexión RTSP")
        if (callback) callback(false)
      }, 1000)
    }
  }

  /**
   * Inicia un stream MJPEG
   * @param {Function} callback - Función de callback (opcional)
   */
  startMJPEGStream(callback = null) {
    // Para MJPEG usamos un iframe o img con actualización continua

    // Construir URL del stream
    const streamUrl = this.buildStreamUrl("mjpeg")

    // Método 1: Usar un iframe (funciona en la mayoría de navegadores)
    const iframe = document.createElement("iframe")
    iframe.className = "mjpeg-frame"
    iframe.src = streamUrl
    iframe.setAttribute("frameborder", "0")
    iframe.setAttribute("scrolling", "no")

    // Añadir iframe al contenedor
    this.elements.videoContainer.appendChild(iframe)
    this.elements.video = iframe

    // Configurar eventos
    iframe.onload = () => {
      this.onStreamConnected("mjpeg")
      if (callback) callback(true)
    }

    iframe.onerror = () => {
      // Si falla el iframe, intentar con una imagen
      this.elements.videoContainer.removeChild(iframe)
      this.startJPGStream(callback)
    }

    // Establecer timeout para detectar si la conexión falla
    setTimeout(() => {
      if (!this.state.connected) {
        this.error("Timeout al conectar con MJPEG")
        if (callback) callback(false)
      }
    }, 5000)
  }

  /**
   * Inicia un stream JPG (imágenes secuenciales)
   * @param {Function} callback - Función de callback (opcional)
   */
  startJPGStream(callback = null) {
    // Para JPG usamos una imagen que se actualiza periódicamente

    // Crear elemento de imagen
    const img = document.createElement("img")
    img.className = "jpg-frame"

    // Añadir imagen al contenedor
    this.elements.videoContainer.appendChild(img)
    this.elements.video = img

    // Configurar actualización periódica
    let frameCount = 0
    let successCount = 0
    let errorCount = 0
    let lastFrameTime = Date.now()
    let fps = 0

    const updateFrame = () => {
      if (!this.state.connected) return

      // Construir URL con timestamp para evitar caché
      const timestamp = Date.now()
      const streamUrl = this.buildStreamUrl("jpg", timestamp)

      // Crear nueva imagen para precargar
      const newImg = new Image()
      newImg.crossOrigin = "anonymous"

      newImg.onload = () => {
        // Actualizar imagen principal
        img.src = newImg.src

        // Actualizar contador de frames
        frameCount++
        successCount++

        // Calcular FPS
        const now = Date.now()
        const elapsed = now - lastFrameTime
        if (elapsed >= 1000) {
          fps = Math.round((frameCount * 1000) / elapsed)
          frameCount = 0
          lastFrameTime = now

          // Actualizar indicador de FPS
          const fpsIndicator = this.elements.controls.querySelector(".fps-indicator")
          fpsIndicator.textContent = `${fps} FPS`
        }

        // Procesar frame para detección de movimiento si está habilitado
        if (this.state.detectionEnabled) {
          this.processFrameForMotionDetection(newImg)
        }

        // Programar siguiente frame
        setTimeout(updateFrame, 1000 / this.options.fps)
      }

      newImg.onerror = () => {
        errorCount++

        // Si hay demasiados errores consecutivos, considerar desconectado
        if (errorCount > 5) {
          this.disconnect()
          this.error("Demasiados errores al obtener frames")
          if (callback && successCount === 0) callback(false)
        } else {
          // Intentar nuevamente después de un retraso
          setTimeout(updateFrame, 1000)
        }
      }

      // Iniciar carga de la imagen
      newImg.src = streamUrl

      // Si es el primer frame exitoso, considerar conectado
      if (successCount === 0 && !this.state.connected) {
        this.onStreamConnected("jpg")
        if (callback) callback(true)
      }
    }

    // Iniciar actualización de frames
    updateFrame()
  }

  /**
   * Configura los eventos para el elemento de video
   * @param {HTMLVideoElement} video - Elemento de video
   * @param {Function} callback - Función de callback (opcional)
   */
  setupVideoEvents(video, callback = null) {
    // Evento de reproducción iniciada
    video.addEventListener("playing", () => {
      this.onStreamConnected(this.streamConfig.protocol)
      if (callback) callback(true)

      // Iniciar monitoreo de estadísticas
      this.startStatsMonitoring(video)
    })

    // Evento de error
    video.addEventListener("error", () => {
      this.error(`Error al reproducir video: ${video.error.message}`)
      if (callback) callback(false)
    })

    // Evento de fin de stream
    video.addEventListener("ended", () => {
      this.disconnect()
    })
  }

  /**
   * Inicia el monitoreo de estadísticas del video
   * @param {HTMLVideoElement} video - Elemento de video
   */
  startStatsMonitoring(video) {
    // Monitorear resolución y FPS
    const updateStats = () => {
      if (!this.state.connected) return

      // Actualizar indicador de resolución
      if (video.videoWidth && video.videoHeight) {
        const resolutionIndicator = this.elements.controls.querySelector(".resolution-indicator")
        resolutionIndicator.textContent = `${video.videoWidth}x${video.videoHeight}`
      }

      // Programar siguiente actualización
      setTimeout(updateStats, 5000)
    }

    // Iniciar actualización de estadísticas
    updateStats()
  }

  /**
   * Callback cuando el stream se ha conectado exitosamente
   * @param {string} protocol - Protocolo utilizado
   */
  onStreamConnected(protocol) {
    this.log(`Stream conectado con protocolo: ${protocol}`)

    // Actualizar estado
    this.state.connected = true
    this.state.connecting = false
    this.streamConfig.protocol = protocol

    // Actualizar UI
    this.elements.loadingIndicator.classList.add("hidden")
    this.elements.errorMessage.classList.add("hidden")
    this.elements.controls.querySelector(".btn-reconnect").classList.add("hidden")

    // Actualizar indicador de estado
    this.updateStatusIndicator(true)

    // Ejecutar callback si existe
    if (typeof this.options.onConnect === "function") {
      this.options.onConnect(protocol)
    }
  }

  /**
   * Desconecta el stream actual
   */
  disconnect() {
    if (!this.state.connected && !this.state.connecting) {
      return
    }

    this.log("Desconectando stream")

    // Limpiar stream actual
    this.cleanupCurrentStream()

    // Actualizar estado
    this.state.connected = false
    this.state.connecting = false

    // Actualizar UI
    this.elements.controls.querySelector(".btn-reconnect").classList.remove("hidden")

    // Actualizar indicador de estado
    this.updateStatusIndicator(false)

    // Ejecutar callback si existe
    if (typeof this.options.onDisconnect === "function") {
      this.options.onDisconnect()
    }
  }

  /**
   * Limpia el stream actual y libera recursos
   */
  cleanupCurrentStream() {
    // Detener cualquier reproductor activo
    if (this.state.player) {
      if (typeof this.state.player.destroy === "function") {
        this.state.player.destroy()
      }
      this.state.player = null
    }

    // Eliminar elemento de video/iframe
    if (this.elements.video) {
      if (this.elements.video.parentNode) {
        this.elements.video.parentNode.removeChild(this.elements.video)
      }
      this.elements.video = null
    }

    // Limpiar temporizadores
    if (this.state.reconnectTimer) {
      clearTimeout(this.state.reconnectTimer)
      this.state.reconnectTimer = null
    }
  }

  /**
   * Actualiza el indicador de estado
   * @param {boolean} connected - Estado de conexión
   */
  updateStatusIndicator(connected) {
    const indicator = this.elements.statusIndicator

    if (connected) {
      indicator.className = "status-indicator status-connected"
      indicator.innerHTML = '<i class="fa-solid fa-circle"></i> Conectado'
    } else {
      indicator.className = "status-indicator status-disconnected"
      indicator.innerHTML = '<i class="fa-solid fa-circle"></i> Desconectado'
    }
  }

  /**
   * Construye la URL del stream según el protocolo
   * @param {string} protocol - Protocolo a utilizar
   * @param {number} timestamp - Timestamp para evitar caché (opcional)
   * @returns {string} URL del stream
   */
  buildStreamUrl(protocol, timestamp = null) {
    // Obtener base URL
    let baseUrl = this.streamConfig.url

    // Añadir autenticación si es necesario
    if (this.streamConfig.auth.username && this.streamConfig.auth.password) {
      // Verificar si la URL ya tiene un esquema
      if (baseUrl.indexOf("://") === -1) {
        baseUrl = `http://${baseUrl}`
      }

      // Insertar credenciales
      baseUrl = baseUrl.replace(
        "://",
        `://${encodeURIComponent(this.streamConfig.auth.username)}:${encodeURIComponent(this.streamConfig.auth.password)}@`,
      )
    }

    // Construir URL según protocolo
    let url = ""

    switch (protocol) {
      case "hls":
        url = `${baseUrl}/stream.m3u8`
        break
      case "rtsp":
        url = baseUrl.replace(/^http/, "rtsp")
        break
      case "mjpeg":
        url = `${baseUrl}/mjpeg`
        break
      case "jpg":
        url = `${baseUrl}/snapshot.jpg`
        // Añadir timestamp para evitar caché
        if (timestamp) {
          url += `?t=${timestamp}`
        }
        break
    }

    // Para desarrollo/pruebas, podemos usar un proxy PHP
    if (this.options.usePhpProxy) {
      url = `php/get_stream.php?url=${encodeURIComponent(url)}&protocol=${protocol}`
      if (timestamp) {
        url += `&t=${timestamp}`
      }
    }

    return url
  }

  /**
   * Activa/desactiva el modo pantalla completa
   */
  toggleFullscreen() {
    const container = this.options.container

    if (!document.fullscreenElement) {
      // Entrar en pantalla completa
      if (container.requestFullscreen) {
        container.requestFullscreen()
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen()
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen()
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen()
      }

      // Actualizar icono
      this.elements.controls.querySelector(".btn-fullscreen i").className = "fa-solid fa-compress"
    } else {
      // Salir de pantalla completa
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen()
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen()
      }

      // Actualizar icono
      this.elements.controls.querySelector(".btn-fullscreen i").className = "fa-solid fa-expand"
    }
  }

  /**
   * Activa/desactiva la detección de movimiento
   */
  toggleMotionDetection() {
    this.state.detectionEnabled = !this.state.detectionEnabled

    // Actualizar UI
    const btnDetection = this.elements.controls.querySelector(".btn-detection")

    if (this.state.detectionEnabled) {
      btnDetection.classList.add("active")
      this.elements.canvas.classList.add("active")
    } else {
      btnDetection.classList.remove("active")
      this.elements.canvas.classList.remove("active")

      // Limpiar canvas
      const ctx = this.elements.canvas.getContext("2d")
      ctx.clearRect(0, 0, this.elements.canvas.width, this.elements.canvas.height)
    }

    this.log(`Detección de movimiento ${this.state.detectionEnabled ? "activada" : "desactivada"}`)
  }

  /**
   * Procesa un frame para detección de movimiento
   * @param {HTMLImageElement} img - Imagen a procesar
   */
  processFrameForMotionDetection(img) {
    if (!this.state.detectionEnabled) return

    const canvas = this.elements.canvas
    const ctx = canvas.getContext("2d")

    // Ajustar dimensiones del canvas si es necesario
    if (canvas.width !== img.width || canvas.height !== img.height) {
      canvas.width = img.width
      canvas.height = img.height
    }

    // Dibujar imagen en el canvas
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // Obtener datos de la imagen
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Si no hay frame anterior, guardar este y salir
    if (!this.state.lastFrameData) {
      this.state.lastFrameData = data.slice()
      return
    }

    // Comparar con frame anterior
    const lastData = this.state.lastFrameData
    let diffCount = 0
    const threshold = 30 // Umbral de diferencia
    const minPixelChanges = canvas.width * canvas.height * 0.01 // 1% de los píxeles

    // Analizar cada 10 píxeles para rendimiento
    for (let i = 0; i < data.length; i += 40) {
      const r1 = data[i]
      const g1 = data[i + 1]
      const b1 = data[i + 2]

      const r2 = lastData[i]
      const g2 = lastData[i + 1]
      const b2 = lastData[i + 2]

      // Calcular diferencia
      const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2)

      if (diff > threshold) {
        diffCount++

        // Marcar píxel en el canvas (para visualización)
        const pixelIndex = i / 4
        const x = pixelIndex % canvas.width
        const y = Math.floor(pixelIndex / canvas.width)

        ctx.fillStyle = "rgba(255, 0, 0, 0.5)"
        ctx.fillRect(x, y, 10, 10)
      }
    }

    // Determinar si hay movimiento
    const motionDetected = diffCount > minPixelChanges

    // Si el estado de movimiento ha cambiado, notificar
    if (motionDetected !== this.state.motionDetected) {
      this.state.motionDetected = motionDetected

      if (motionDetected) {
        this.log("¡Movimiento detectado!")
        this.onMotionDetected()
      } else {
        this.log("Movimiento detenido")
        this.onMotionStopped()
      }
    }

    // Guardar frame actual como anterior
    this.state.lastFrameData = data.slice()
  }

  /**
   * Callback cuando se detecta movimiento
   */
  onMotionDetected() {
    // Mostrar indicador de movimiento
    this.elements.statusIndicator.className = "status-indicator status-motion"
    this.elements.statusIndicator.innerHTML = '<i class="fa-solid fa-circle"></i> ¡Movimiento detectado!'

    // Añadir clase para efecto visual
    this.options.container.classList.add("motion-detected")

    // Disparar evento personalizado
    const event = new CustomEvent("motion-detected", {
      detail: {
        timestamp: new Date(),
        source: this,
      },
    })
    this.options.container.dispatchEvent(event)

    // Si hay callback configurado, ejecutarlo
    if (typeof this.options.onMotionDetected === "function") {
      this.options.onMotionDetected()
    }
  }

  /**
   * Callback cuando el movimiento se detiene
   */
  onMotionStopped() {
    // Restaurar indicador de estado
    this.updateStatusIndicator(this.state.connected)

    // Quitar clase para efecto visual
    this.options.container.classList.remove("motion-detected")

    // Disparar evento personalizado
    const event = new CustomEvent("motion-stopped", {
      detail: {
        timestamp: new Date(),
        source: this,
      },
    })
    this.options.container.dispatchEvent(event)

    // Si hay callback configurado, ejecutarlo
    if (typeof this.options.onMotionStopped === "function") {
      this.options.onMotionStopped()
    }
  }

  /**
   * Muestra un mensaje de error
   * @param {string} message - Mensaje de error
   */
  error(message) {
    this.log("ERROR: " + message, "error")

    // Actualizar estado
    this.state.connecting = false

    // Mostrar mensaje de error
    this.elements.errorMessage.textContent = message
    this.elements.errorMessage.classList.remove("hidden")
    this.elements.loadingIndicator.classList.add("hidden")

    // Mostrar botón de reconexión
    this.elements.controls.querySelector(".btn-reconnect").classList.remove("hidden")

    // Programar reconexión automática si está habilitada
    if (this.options.reconnectInterval > 0) {
      this.state.reconnectTimer = setTimeout(() => {
        this.connect(this.streamConfig)
      }, this.options.reconnectInterval)
    }

    // Ejecutar callback si existe
    if (typeof this.options.onError === "function") {
      this.options.onError(message)
    }
  }

  /**
   * Registra un mensaje en la consola (si debug está habilitado)
   * @param {string} message - Mensaje a registrar
   * @param {string} level - Nivel de log (log, error, warn, info)
   */
  log(message, level = "log") {
    if (!this.options.debug) return

    const prefix = "[VideoPlayer]"

    switch (level) {
      case "error":
        console.error(prefix, message)
        break
      case "warn":
        console.warn(prefix, message)
        break
      case "info":
        console.info(prefix, message)
        break
      default:
        console.log(prefix, message)
    }
  }

  /**
   * Carga un script externo dinámicamente
   * @param {string} url - URL del script
   * @param {Function} callback - Función a ejecutar cuando el script se carga
   */
  loadScript(url, callback) {
    // Verificar si el script ya está cargado
    const existingScript = document.querySelector(`script[src="${url}"]`)
    if (existingScript) {
      callback()
      return
    }

    // Crear elemento script
    const script = document.createElement("script")
    script.type = "text/javascript"
    script.src = url
    script.async = true

    // Configurar eventos
    script.onload = callback
    script.onerror = () => {
      this.error(`Error al cargar script: ${url}`)
    }

    // Añadir al documento
    document.head.appendChild(script)
  }
}

// Exportar clase
window.VideoPlayer = VideoPlayer
