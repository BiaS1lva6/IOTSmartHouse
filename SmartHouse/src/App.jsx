

import { useState, useCallback, useEffect } from "react"

function App() {
  // Estados de conexão
  const [isConnected, setIsConnected] = useState(false)
  const [client, setClient] = useState(null)
  const [logs, setLogs] = useState([])
  const [mqttLoaded, setMqttLoaded] = useState(false)

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

  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://unpkg.com/paho-mqtt@1.1.0/paho-mqtt.js"
    script.onload = () => {
      setMqttLoaded(true)
    }
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  // Função para adicionar log
  const addLog = useCallback((message, type = "system") => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [
      {
        id: Date.now(),
        timestamp,
        message,
        type,
      },
      ...prev.slice(0, 49),
    ]) // Manter apenas os últimos 50 logs
  }, [])

  const connectMQTT = useCallback(() => {
    if (!mqttLoaded || !window.Paho) {
      addLog("Biblioteca MQTT não carregada", "system")
      return
    }

    const clientId = `dashboard_${Math.random().toString(16).substr(2, 8)}`
    const mqttClient = new window.Paho.MQTT.Client("broker.hivemq.com", 8000, clientId)

    mqttClient.onConnectionLost = (responseObject) => {
      if (responseObject.errorCode !== 0) {
        setIsConnected(false)
        addLog(`Conexão perdida: ${responseObject.errorMessage}`, "system")
      }
    }

    mqttClient.onMessageArrived = (message) => {
      const topic = message.destinationName
      const payload = message.payloadString

      addLog(`${topic}: ${payload}`, "received")

      // Atualizar estados baseado nas mensagens recebidas
      if (topic.includes("/status")) {
        updateDeviceState(topic, payload)
      } else if (topic === "casa/sala/temperatura") {
        setSensorData((prev) => ({ ...prev, temperatura: Number.parseFloat(payload) }))
      } else if (topic === "casa/sala/umidade") {
        setSensorData((prev) => ({ ...prev, umidade: Number.parseFloat(payload) }))
      }
    }

    mqttClient.connect({
      onSuccess: () => {
        setIsConnected(true)
        setClient(mqttClient)
        addLog("Conectado ao broker MQTT", "system")

        // Subscrever aos tópicos
        mqttClient.subscribe("casa/#")
        addLog("Subscrito aos tópicos casa/#", "system")
      },
      onFailure: (error) => {
        addLog(`Falha na conexão: ${error.errorMessage}`, "system")
      },
    })
  }, [addLog, mqttLoaded])

  // Desconectar do MQTT
  const disconnectMQTT = useCallback(() => {
    if (client && isConnected) {
      client.disconnect()
      setIsConnected(false)
      setClient(null)
      addLog("Desconectado do broker MQTT", "system")
    }
  }, [client, isConnected, addLog])

  // Atualizar estado do dispositivo baseado na mensagem recebida
  const updateDeviceState = (topic, payload) => {
    if (topic === "casa/garagem/luz/status") {
      setDeviceStates((prev) => ({ ...prev, luzGaragem: payload === "ON" }))
    } else if (topic === "casa/garagem/portao/social/status") {
      setDeviceStates((prev) => ({ ...prev, portaoSocial: payload }))
    } else if (topic === "casa/garagem/portao/basculante/status") {
      setDeviceStates((prev) => ({ ...prev, portaoBasculante: payload }))
    } else if (topic === "casa/sala/luz/status") {
      setDeviceStates((prev) => ({ ...prev, luzSala: payload === "ON" }))
    } else if (topic === "casa/sala/ar/status") {
      setDeviceStates((prev) => ({ ...prev, arCondicionado: payload === "ON" }))
    } else if (topic === "casa/sala/umidificador/status") {
      setDeviceStates((prev) => ({ ...prev, umidificador: payload === "ON" }))
    } else if (topic === "casa/quarto/luz/status") {
      setDeviceStates((prev) => ({ ...prev, luzQuarto: payload === "ON" }))
    } else if (topic === "casa/quarto/tomada/status") {
      setDeviceStates((prev) => ({ ...prev, tomada: payload === "ON" }))
    } else if (topic === "casa/quarto/cortina/status") {
      setDeviceStates((prev) => ({ ...prev, cortina: payload }))
    }
  }

  const sendCommand = useCallback(
    (topic, payload) => {
      if (client && isConnected && window.Paho) {
        const message = new window.Paho.MQTT.Message(payload)
        message.destinationName = topic
        client.send(message)
        addLog(`${topic}: ${payload}`, "sent")
      }
    },
    [client, isConnected, addLog],
  )

  // Componente de controle de dispositivo
  const DeviceControl = ({ title, status, onCommand, type = "switch" }) => {
    const getStatusColor = () => {
      if (type === "door") {
        return status === "ABERTO" ? "status-on" : "status-off"
      }
      if (type === "curtain") {
        return status === "IDLE" ? "status-off" : "status-on"
      }
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
          </h6>
          <p className="card-text small text-muted">Status: {getStatusText()}</p>
          <div className="btn-group btn-group-sm" role="group">
            {type === "door" && (
              <>
                <button className="btn btn-outline-success" onClick={() => onCommand("ABRIR")} disabled={!isConnected}>
                  Abrir
                </button>
                <button className="btn btn-outline-danger" onClick={() => onCommand("FECHAR")} disabled={!isConnected}>
                  Fechar
                </button>
              </>
            )}
            {type === "curtain" && (
              <>
                <button className="btn btn-outline-success" onClick={() => onCommand("ABRIR")} disabled={!isConnected}>
                  Abrir
                </button>
                <button className="btn btn-outline-danger" onClick={() => onCommand("FECHAR")} disabled={!isConnected}>
                  Fechar
                </button>
              </>
            )}
            {type === "switch" && (
              <>
                <button className="btn btn-outline-success" onClick={() => onCommand("ON")} disabled={!isConnected}>
                  Ligar
                </button>
                <button className="btn btn-outline-danger" onClick={() => onCommand("OFF")} disabled={!isConnected}>
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

      <style jsx>{`
        body {
          background-color: #f8f9fa;
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 8px;
        }

        .status-connected {
          background-color: #28a745;
        }

        .status-disconnected {
          background-color: #dc3545;
        }

        .status-on {
          background-color: #28a745;
        }

        .status-off {
          background-color: #6c757d;
        }

        .sensor-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
        }

        .device-card {
          transition: transform 0.2s;
        }

        .device-card:hover {
          transform: translateY(-2px);
        }

        .log-container {
          max-height: 300px;
          overflow-y: auto;
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 0.375rem;
          padding: 1rem;
        }

        .log-entry {
          font-family: "Courier New", monospace;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
          padding: 0.25rem;
          border-radius: 0.25rem;
        }

        .log-received {
          background-color: #d1ecf1;
          color: #0c5460;
        }

        .log-sent {
          background-color: #d4edda;
          color: #155724;
        }

        .log-system {
          background-color: #fff3cd;
          color: #856404;
        }
      `}</style>

      <div className="container-fluid py-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col">
            <h1 className="h3 mb-3">🏠 Smart Home Dashboard</h1>

            {/* Controles de Conexão */}
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="card-title">
                  <span
                    className={`status-indicator ${isConnected ? "status-connected" : "status-disconnected"}`}
                  ></span>
                  Conexão MQTT
                </h5>
                <p className="card-text">
                  Status: {isConnected ? "Conectado" : "Desconectado"} | Broker: broker.hivemq.com
                  {!mqttLoaded && " | Carregando biblioteca MQTT..."}
                </p>
                <div className="btn-group" role="group">
                  <button className="btn btn-success" onClick={connectMQTT} disabled={isConnected || !mqttLoaded}>
                    Conectar
                  </button>
                  <button className="btn btn-danger" onClick={disconnectMQTT} disabled={!isConnected}>
                    Desconectar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sensores */}
        <div className="row mb-4">
          <div className="col">
            <h4>📊 Sensores</h4>
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
            <DeviceControl
              title="Luz da Garagem"
              status={deviceStates.luzGaragem}
              onCommand={(cmd) => sendCommand("casa/garagem/luz", cmd)}
            />
            <DeviceControl
              title="Portão Social"
              status={deviceStates.portaoSocial}
              onCommand={(cmd) => sendCommand("casa/garagem/portao/social", cmd)}
              type="door"
            />
            <DeviceControl
              title="Portão Basculante"
              status={deviceStates.portaoBasculante}
              onCommand={(cmd) => sendCommand("casa/garagem/portao/basculante", cmd)}
              type="door"
            />
          </div>

          {/* Sala */}
          <div className="col-lg-4 mb-4">
            <h4>🛋️ Sala de Estar</h4>
            <DeviceControl
              title="Luz da Sala"
              status={deviceStates.luzSala}
              onCommand={(cmd) => sendCommand("casa/sala/luz", cmd)}
            />
            <DeviceControl
              title="Ar-condicionado"
              status={deviceStates.arCondicionado}
              onCommand={(cmd) => sendCommand("casa/sala/ar", cmd)}
            />
            <DeviceControl
              title="Umidificador"
              status={deviceStates.umidificador}
              onCommand={(cmd) => sendCommand("casa/sala/umidificador", cmd)}
            />
          </div>

          {/* Quarto */}
          <div className="col-lg-4 mb-4">
            <h4>🛏️ Quarto</h4>
            <DeviceControl
              title="Luz do Quarto"
              status={deviceStates.luzQuarto}
              onCommand={(cmd) => sendCommand("casa/quarto/luz", cmd)}
            />
            <DeviceControl
              title="Tomada Inteligente"
              status={deviceStates.tomada}
              onCommand={(cmd) => sendCommand("casa/quarto/tomada", cmd)}
            />
            <DeviceControl
              title="Cortina"
              status={deviceStates.cortina}
              onCommand={(cmd) => sendCommand("casa/quarto/cortina", cmd)}
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
                <p className="text-muted">Nenhuma mensagem ainda...</p>
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
