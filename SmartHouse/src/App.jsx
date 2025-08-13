import { useState, useCallback, useEffect } from "react"
import "./App.css"

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Verificar preferência salva no localStorage ou preferência do sistema
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme) {
      return savedTheme === "dark"
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  // Estados de conexão
  const [isConnected, setIsConnected] = useState(false)
  const [client, setClient] = useState(null)
  const [logs, setLogs] = useState([])
  const [connectionStatus, setConnectionStatus] = useState("Desconectado")

  // Estados dos sensores
  const [sensorData, setSensorData] = useState({
    temperatura: 0,
    umidade: 0,
    movimento: false,
  })

  // Estados dos dispositivos
  const [deviceStates, setDeviceStates] = useState({
    // Garagem
    luzGaragem: false,
    portaoSocial: "FECHADO",
    portaoBasculante: "FECHADO",

    // Sala
    luzSala: false,
    arCondicionado: false,
    umidificador: false,

    // Quarto
    luzQuarto: false,
    tomada: false,
    cortina: "IDLE",
  })

  const [commandQueue, setCommandQueue] = useState(new Map())

  const toggleTheme = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    localStorage.setItem("theme", newTheme ? "dark" : "light")
  }

  useEffect(() => {
    document.body.className = isDarkMode ? "dark-theme" : "light-theme"
  }, [isDarkMode])

  useEffect(() => {
    // Carregar Paho MQTT
    const loadPahoMQTT = () => {
      // Verificar se já está carregado
      if (window.Paho && window.Paho.MQTT) {
        console.log("Paho MQTT já disponível")
        setTimeout(connectMQTT, 1000)
        return
      }

      // Tentar carregar via CDN principal
      const script = document.createElement("script")
      script.src = "https://unpkg.com/paho-mqtt@1.1.0/paho-mqtt.js"

      script.onload = () => {
        console.log("✅ Paho MQTT carregado com sucesso")
        addLog("✅ Biblioteca Paho MQTT carregada", "system")
        // Aguardar um pouco para garantir que está disponível
        setTimeout(() => {
          if (window.Paho && window.Paho.MQTT) {
            connectMQTT()
          } else {
            addLog("❌ Paho MQTT carregado mas não disponível", "system")
            tryAlternativeCDN()
          }
        }, 1500)
      }

      script.onerror = () => {
        console.error("❌ Erro ao carregar Paho MQTT do CDN principal")
        addLog("❌ Erro ao carregar do CDN principal, tentando alternativo...", "system")
        tryAlternativeCDN()
      }

      document.head.appendChild(script)
    }

    // Função para tentar CDN alternativo
    const tryAlternativeCDN = () => {
      const altScript = document.createElement("script")
      altScript.src = "https://cdnjs.cloudflare.com/ajax/libs/paho-mqtt/1.0.1/mqttws31.min.js"

      altScript.onload = () => {
        console.log("✅ Paho MQTT alternativo carregado")
        addLog("✅ Biblioteca MQTT alternativa carregada", "system")
        setTimeout(() => {
          if (window.Paho && window.Paho.MQTT) {
            connectMQTT()
          } else {
            addLog("❌ Falha total no carregamento do MQTT", "system")
            setConnectionStatus("Erro: Biblioteca MQTT não disponível")
          }
        }, 1000)
      }

      altScript.onerror = () => {
        addLog("❌ Falha em todos os CDNs do MQTT", "system")
        setConnectionStatus("Erro: Não foi possível carregar MQTT")
      }

      document.head.appendChild(altScript)
    }

    loadPahoMQTT()

    return () => {
      // Cleanup scripts
      const scripts = document.querySelectorAll('script[src*="paho-mqtt"], script[src*="mqttws31"]')
      scripts.forEach((script) => {
        if (document.head.contains(script)) {
          document.head.removeChild(script)
        }
      })
    }
  }, [])

  // Função para adicionar log
  const addLog = useCallback((message, type = "system") => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [
      {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp,
        message,
        type,
      },
      ...prev.slice(0, 49),
    ])
  }, [])

  const connectMQTT = useCallback(() => {
    if (!window.Paho) {
      addLog("❌ Objeto Paho não encontrado", "system")
      setConnectionStatus("Erro: Paho não disponível")
      return
    }

    if (!window.Paho.MQTT) {
      addLog("❌ Paho.MQTT não encontrado", "system")
      setConnectionStatus("Erro: Paho.MQTT não disponível")
      return
    }

    if (!window.Paho.MQTT.Client) {
      addLog("❌ Paho.MQTT.Client não encontrado", "system")
      setConnectionStatus("Erro: Cliente MQTT não disponível")
      return
    }

    try {
      setConnectionStatus("Conectando...")
      addLog("🔄 Iniciando conexão MQTT...", "system")

      const clientId = "DashboardBiaSenai790Jahu"
      addLog(`🆔 Cliente ID: ${clientId}`, "system")

      const mqttClient = new window.Paho.MQTT.Client(
        "broker.hivemq.com", // host
        8000, // porta WebSocket
        "/mqtt", // path
        clientId, // clientId
      )

      mqttClient.onConnectionLost = (responseObject) => {
        console.log("🔌 Conexão perdida:", responseObject)
        setIsConnected(false)
        setClient(null)
        setConnectionStatus("Conexão perdida. Tentando reconectar...")
        addLog(`🔌 Conexão perdida: ${responseObject.errorMessage || "Motivo desconhecido"}`, "system")

        // Tentar reconectar após 5 segundos
        setTimeout(() => {
          if (!isConnected) {
            addLog("🔄 Tentando reconectar...", "system")
            connectMQTT()
          }
        }, 5000)
      }

      mqttClient.onMessageArrived = (message) => {
        const topic = message.destinationName
        const payload = message.payloadString
        console.log("📨 Mensagem recebida:", topic, payload)
        addLog(`📨 ${topic}: ${payload}`, "received")
        updateDeviceState(topic, payload)
      }

      const connectOptions = {
        timeout: 30, // Aumentado para 30 segundos
        keepAliveInterval: 30, // Reduzido para 30 segundos
        cleanSession: true,
        useSSL: false, // Desabilitado SSL para porta 8000
        onSuccess: () => {
          console.log("✅ Conectado ao MQTT")
          setIsConnected(true)
          setClient(mqttClient)
          setConnectionStatus("Conectado")
          addLog("✅ Conectado ao broker MQTT via WebSocket", "system")

          try {
            mqttClient.subscribe("BLhouse3604/#", {
              qos: 0,
              onSuccess: () => {
                addLog("📡 Subscrito aos tópicos BLhouse3604/#", "system")
              },
              onFailure: (error) => {
                addLog(`❌ Erro ao subscrever: ${error.errorMessage}`, "system")
              },
            })
          } catch (subError) {
            addLog(`❌ Erro na subscrição: ${subError.message}`, "system")
          }
        },
        onFailure: (error) => {
          console.error("❌ Falha na conexão:", error)
          setIsConnected(false)
          setClient(null)
          setConnectionStatus("Falha na conexão")
          addLog(`❌ Erro na conexão: ${error.errorMessage || error.message || "Erro desconhecido"}`, "system")

          setTimeout(() => {
            addLog("🔄 Tentando broker alternativo...", "system")
            tryAlternativeBroker()
          }, 3000)
        },
      }

      addLog("🌐 Conectando ao broker.hivemq.com:8000 (WebSocket sem SSL)...", "system")
      mqttClient.connect(connectOptions)
    } catch (error) {
      console.error("💥 Erro crítico:", error)
      addLog(`💥 Erro crítico ao conectar: ${error.message}`, "system")
      setConnectionStatus("Erro crítico de conexão")

      // Tentar broker alternativo após erro crítico
      setTimeout(() => {
        addLog("🔄 Tentativa com broker alternativo após erro crítico...", "system")
        tryAlternativeBroker()
      }, 5000)
    }
  }, [addLog, isConnected])

  const tryAlternativeBroker = useCallback(() => {
    if (!window.Paho || !window.Paho.MQTT) {
      addLog("❌ Paho MQTT não disponível para broker alternativo", "system")
      return
    }

    try {
      setConnectionStatus("Tentando broker alternativo...")
      addLog("🔄 Tentando broker alternativo test.mosquitto.org...", "system")

      const clientId = "DashboardBiaSenai790JahuAlt"

      const mqttClient = new window.Paho.MQTT.Client(
        "test.mosquitto.org", // broker alternativo
        8080, // porta WebSocket alternativa
        "/mqtt", // path
        clientId,
      )

      mqttClient.onConnectionLost = (responseObject) => {
        console.log("🔌 Conexão perdida (broker alternativo):", responseObject)
        setIsConnected(false)
        setClient(null)
        setConnectionStatus("Conexão perdida. Voltando ao broker principal...")
        addLog(
          `🔌 Conexão perdida no broker alternativo: ${responseObject.errorMessage || "Motivo desconhecido"}`,
          "system",
        )

        // Voltar ao broker principal após 10 segundos
        setTimeout(() => {
          addLog("🔄 Voltando ao broker principal...", "system")
          connectMQTT()
        }, 10000)
      }

      mqttClient.onMessageArrived = (message) => {
        const topic = message.destinationName
        const payload = message.payloadString
        console.log("📨 Mensagem recebida (broker alternativo):", topic, payload)
        addLog(`📨 ${topic}: ${payload}`, "received")
        updateDeviceState(topic, payload)
      }

      const connectOptions = {
        timeout: 20,
        keepAliveInterval: 45,
        cleanSession: true,
        useSSL: false,
        onSuccess: () => {
          console.log("✅ Conectado ao broker alternativo")
          setIsConnected(true)
          setClient(mqttClient)
          setConnectionStatus("Conectado (broker alternativo)")
          addLog("✅ Conectado ao broker alternativo test.mosquitto.org", "system")

          mqttClient.subscribe("BLhouse3604/#", {
            qos: 0,
            onSuccess: () => {
              addLog("📡 Subscrito aos tópicos BLhouse3604/# (broker alternativo)", "system")
            },
            onFailure: (error) => {
              addLog(`❌ Erro ao subscrever no broker alternativo: ${error.errorMessage}`, "system")
            },
          })
        },
        onFailure: (error) => {
          console.error("❌ Falha no broker alternativo:", error)
          setIsConnected(false)
          setClient(null)
          setConnectionStatus("Falha em todos os brokers")
          addLog(`❌ Falha no broker alternativo: ${error.errorMessage || "Erro desconhecido"}`, "system")

          // Tentar novamente o broker principal após 15 segundos
          setTimeout(() => {
            addLog("🔄 Tentando novamente o broker principal...", "system")
            connectMQTT()
          }, 15000)
        },
      }

      addLog("🌐 Conectando ao broker.hivemq.com:8000 (WebSocket sem SSL)...", "system")
      mqttClient.connect(connectOptions)
    } catch (error) {
      console.error("💥 Erro no broker alternativo:", error)
      addLog(`💥 Erro no broker alternativo: ${error.message}`, "system")

      // Voltar ao broker principal
      setTimeout(() => {
        addLog("🔄 Voltando ao broker principal após erro...", "system")
        connectMQTT()
      }, 10000)
    }
  }, [addLog, connectMQTT])

  const updateDeviceState = (topic, payload) => {
    const commandKey = topic.replace("/status", "")
    if (commandQueue.has(commandKey)) {
      const queuedCommand = commandQueue.get(commandKey)
      if (queuedCommand.payload === payload && Date.now() - queuedCommand.timestamp < 2000) {
        // Ignorar se é o mesmo comando enviado há menos de 2 segundos
        return
      }
    }

    // Sensores
    if (topic === "BLhouse3604/sala/temperatura") {
      setSensorData((prev) => ({ ...prev, temperatura: Number.parseFloat(payload) || 0 }))
    } else if (topic === "BLhouse3604/sala/umidade") {
      setSensorData((prev) => ({ ...prev, umidade: Number.parseFloat(payload) || 0 }))
    }
    // Estados dos dispositivos (tópicos com /status)
    else if (topic === "BLhouse3604/garagem/luz/status") {
      setDeviceStates((prev) => ({ ...prev, luzGaragem: payload === "ON" }))
    } else if (topic === "BLhouse3604/garagem/portao/social/status") {
      setDeviceStates((prev) => ({ ...prev, portaoSocial: payload }))
    } else if (topic === "BLhouse3604/garagem/portao/basculante/status") {
      setDeviceStates((prev) => ({ ...prev, portaoBasculante: payload }))
    } else if (topic === "BLhouse3604/sala/luz/status") {
      setDeviceStates((prev) => ({ ...prev, luzSala: payload === "ON" }))
    } else if (topic === "BLhouse3604/sala/ar/status") {
      setDeviceStates((prev) => ({ ...prev, arCondicionado: payload === "ON" }))
    } else if (topic === "BLhouse3604/sala/umidificador/status") {
      setDeviceStates((prev) => ({ ...prev, umidificador: payload === "ON" }))
    } else if (topic === "BLhouse3604/quarto/luz/status") {
      setDeviceStates((prev) => ({ ...prev, luzQuarto: payload === "ON" }))
    } else if (topic === "BLhouse3604/quarto/tomada/status") {
      setDeviceStates((prev) => ({ ...prev, tomada: payload === "ON" }))
    } else if (topic === "BLhouse3604/quarto/cortina/status") {
      setDeviceStates((prev) => ({ ...prev, cortina: payload }))
    }
  }

  const sendCommand = useCallback(
    (topic, payload) => {
      if (client && isConnected) {
        const now = Date.now()
        if (commandQueue.has(topic)) {
          const lastCommand = commandQueue.get(topic)
          if (now - lastCommand.timestamp < 1000) {
            addLog(`⏳ Comando ignorado (debounce): ${topic}`, "system")
            return
          }
        }

        try {
          const message = new window.Paho.MQTT.Message(payload)
          message.destinationName = topic
          message.qos = 0
          message.retained = false

          client.send(message)

          setCommandQueue((prev) => new Map(prev.set(topic, { payload, timestamp: now })))

          setTimeout(() => {
            setCommandQueue((prev) => {
              const newQueue = new Map(prev)
              newQueue.delete(topic)
              return newQueue
            })
          }, 3000)

          addLog(`📤 Enviado -> ${topic}: ${payload}`, "sent")
        } catch (error) {
          addLog(`❌ Erro ao enviar -> ${topic}: ${error.message}`, "system")
        }
      } else {
        addLog("❌ Cliente MQTT não conectado", "system")
      }
    },
    [client, isConnected, addLog, commandQueue],
  )

  // Funções de controle dos dispositivos
  const controlGaragemLuz = useCallback((command) => sendCommand("BLhouse3604/garagem/luz", command), [sendCommand])
  const controlGaragemPortaoSocial = useCallback(
    (command) => sendCommand("BLhouse3604/garagem/portao/social", command),
    [sendCommand],
  )
  const controlGaragemPortaoBasculante = useCallback(
    (command) => sendCommand("BLhouse3604/garagem/portao/basculante", command),
    [sendCommand],
  )
  const controlSalaLuz = useCallback((command) => sendCommand("BLhouse3604/sala/luz", command), [sendCommand])
  const controlSalaAr = useCallback((command) => sendCommand("BLhouse3604/sala/ar", command), [sendCommand])
  const controlSalaUmidificador = useCallback(
    (command) => sendCommand("BLhouse3604/sala/umidificador", command),
    [sendCommand],
  )
  const controlQuartoLuz = useCallback((command) => sendCommand("BLhouse3604/quarto/luz", command), [sendCommand])
  const controlQuartoTomada = useCallback((command) => sendCommand("BLhouse3604/quarto/tomada", command), [sendCommand])
  const controlQuartoCortina = useCallback(
    (command) => sendCommand("BLhouse3604/quarto/cortina", command),
    [sendCommand],
  )

  const DeviceControl = ({ title, status, onCommand, type = "switch" }) => {
    const [sending, setSending] = useState(false)
    const [lastCommand, setLastCommand] = useState(null)

    const handleCommand = async (cmd) => {
      if (sending || (lastCommand === cmd && Date.now() - lastCommand?.timestamp < 2000)) {
        return
      }

      setSending(true)
      setLastCommand({ cmd, timestamp: Date.now() })

      onCommand(cmd)

      setTimeout(() => setSending(false), 1500)
    }

    const getStatusColor = () => {
      if (type === "door") return status === "ABERTO" ? "status-on" : "status-off"
      if (type === "curtain") return status === "IDLE" ? "status-off" : "status-on"
      return status ? "status-on" : "status-off"
    }

    const getStatusText = () => {
      if (type === "door") return status
      if (type === "curtain") return status
      return status ? "Ligado" : "Desligado"
    }

    return (
      <div className="card device-card mb-3">
        <div className="card-body">
          <h6 className="card-title">
            <span className={`status-indicator ${getStatusColor()}`}></span>
            {title}
            {sending && <span className="spinner-border spinner-border-sm ms-2" role="status"></span>}
          </h6>
          <p className="card-text small text-muted">Status: {getStatusText()}</p>
          <div className="btn-group btn-group-sm" role="group">
            {type === "door" && (
              <>
                <button
                  className="btn btn-outline-success"
                  onClick={() => handleCommand("ABRIR")}
                  disabled={!isConnected || sending}
                >
                  Abrir
                </button>
                <button
                  className="btn btn-outline-danger"
                  onClick={() => handleCommand("FECHAR")}
                  disabled={!isConnected || sending}
                >
                  Fechar
                </button>
              </>
            )}
            {type === "curtain" && (
              <>
                <button
                  className="btn btn-outline-success"
                  onClick={() => handleCommand("ABRIR")}
                  disabled={!isConnected || sending}
                >
                  Abrir
                </button>
                <button
                  className="btn btn-outline-danger"
                  onClick={() => handleCommand("FECHAR")}
                  disabled={!isConnected || sending}
                >
                  Fechar
                </button>
              </>
            )}
            {type === "switch" && (
              <>
                <button
                  className="btn btn-outline-success"
                  onClick={() => handleCommand("ON")}
                  disabled={!isConnected || sending}
                >
                  Ligar
                </button>
                <button
                  className="btn btn-outline-danger"
                  onClick={() => handleCommand("OFF")}
                  disabled={!isConnected || sending}
                >
                  Desligar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />

      <button className="theme-toggle" onClick={toggleTheme} title={isDarkMode ? "Modo Claro" : "Modo Escuro"}>
      {isDarkMode ? "🌙" : "☀️"}
      </button>

      <div className="container-fluid py-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col">
            <h1 className="h3 mb-3">🏠 Smart Home Dashboard</h1>

            {/* Status de Conexão */}
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="card-title">
                  <span
                    className={`status-indicator ${isConnected ? "status-connected" : "status-disconnected"}`}
                  ></span>
                  Conexão MQTT
                </h5>
                <div
                  className={`connection-status ${isConnected ? "connection-connected" : "connection-disconnected"}`}
                >
                  {connectionStatus}
                </div>
                <p className="card-text mt-2 mb-0">
                  <small className="text-muted">Broker: broker.hivemq.com:8000 (WebSocket) | Cliente: Paho MQTT</small>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sensores */}
        <div className="row mb-4">
          <div className="col">
            <h4>📊 Sensores em Tempo Real</h4>
          </div>
        </div>
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card sensor-card">
              <div className="card-body text-center">
                <h5 className="card-title">🌡️ Temperatura</h5>
                <h2 className="display-4">{sensorData.temperatura.toFixed(1)}°C</h2>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card sensor-card">
              <div className="card-body text-center">
                <h5 className="card-title">💧 Umidade</h5>
                <h2 className="display-4">{sensorData.umidade.toFixed(1)}%</h2>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card sensor-card">
              <div className="card-body text-center">
                <h5 className="card-title">🚶 Movimento</h5>
                <h2 className="display-4">{sensorData.movimento ? "✅" : "❌"}</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Controles por Cômodo */}
        <div className="row">
          {/* Garagem */}
          <div className="col-lg-4 mb-4">
            <h4>🚗 Garagem</h4>
            <DeviceControl title="Luz da Garagem" status={deviceStates.luzGaragem} onCommand={controlGaragemLuz} />
            <DeviceControl
              title="Portão Social"
              status={deviceStates.portaoSocial}
              onCommand={controlGaragemPortaoSocial}
              type="door"
            />
            <DeviceControl
              title="Portão Basculante"
              status={deviceStates.portaoBasculante}
              onCommand={controlGaragemPortaoBasculante}
              type="door"
            />
          </div>

          {/* Sala */}
          <div className="col-lg-4 mb-4">
            <h4>🛋️ Sala de Estar</h4>
            <DeviceControl title="Luz da Sala" status={deviceStates.luzSala} onCommand={controlSalaLuz} />
            <DeviceControl title="Ar-condicionado" status={deviceStates.arCondicionado} onCommand={controlSalaAr} />
            <DeviceControl
              title="Umidificador"
              status={deviceStates.umidificador}
              onCommand={controlSalaUmidificador}
            />
          </div>

          {/* Quarto */}
          <div className="col-lg-4 mb-4">
            <h4>🛏️ Quarto</h4>
            <DeviceControl title="Luz do Quarto" status={deviceStates.luzQuarto} onCommand={controlQuartoLuz} />
            <DeviceControl title="Tomada Inteligente" status={deviceStates.tomada} onCommand={controlQuartoTomada} />
            <DeviceControl
              title="Cortina"
              status={deviceStates.cortina}
              onCommand={controlQuartoCortina}
              type="curtain"
            />
          </div>
        </div>

        {/* Log de Mensagens */}
        <div className="row">
          <div className="col">
            <h4>📝 Histórico de Mensagens MQTT</h4>
            <div className="log-container">
              {logs.length === 0 ? (
                <p className="text-muted">Aguardando mensagens MQTT...</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className={`log-entry log-${log.type}`}>
                    <strong>[{log.timestamp}]</strong> {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default App
