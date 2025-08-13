# Automação Residencial com ESP32 + MQTT

## 1. Introdução

Este projeto implementa um sistema de automação residencial utilizando ESP32, o protocolo MQTT e o broker público broker.hivemq.com, simulado no Wokwi.

O objetivo é controlar três ambientes — **Garagem**, **Sala** e **Quarto** — permitindo o acionamento de luzes, portões, ar-condicionado, umidificador, tomada e motor de passo, além de monitorar sensores de temperatura, umidade e movimento.

### Tecnologias utilizadas:
- **ESP32**
- **MQTT** (broker.hivemq.com)
- **Wokwi Simulator**
- **React + Vite** (Dashboard Web)
- **Bootstrap 5.3** (Interface)
- **Paho MQTT** (Comunicação WebSocket)
- **Sensores**: DHT22 (temperatura/umidade) e PIR (movimento)
- **Atuadores**: LEDs, Servomotor, Motor de Passo e Relés

## 2. Endpoints MQTT

### 🚗 Garagem

| Tópico | Operação | Descrição | Payloads Aceitos | Exemplo |
|--------|----------|-----------|------------------|---------|
| `BLhouse3604/garagem/luz` | Assinar | Liga/desliga a luz da garagem | ON / OFF | ON |
| `BLhouse3604/garagem/luz/status` | Publicar | Informa o estado atual da luz da garagem | ON / OFF | OFF |
| `BLhouse3604/garagem/portao/social` | Assinar | Abre/fecha o portão social | ABRIR / FECHAR | ABRIR |
| `BLhouse3604/garagem/portao/social/status` | Publicar | Estado do portão social | ABERTO / FECHADO | ABERTO |
| `BLhouse3604/garagem/portao/basculante` | Assinar | Abre/fecha o portão basculante | ABRIR / FECHAR | FECHAR |
| `BLhouse3604/garagem/portao/basculante/status` | Publicar | Estado do portão basculante | ABERTO / FECHADO | FECHADO |

### 🛋️ Sala

| Tópico | Operação | Descrição | Payloads Aceitos | Exemplo |
|--------|----------|-----------|------------------|---------|
| `BLhouse3604/sala/luz` | Assinar | Liga/desliga a luz da sala | ON / OFF | ON |
| `BLhouse3604/sala/luz/status` | Publicar | Estado da luz da sala | ON / OFF | OFF |
| `BLhouse3604/sala/ar` | Assinar | Liga/desliga o ar-condicionado | ON / OFF | ON |
| `BLhouse3604/sala/ar/status` | Publicar | Estado do ar-condicionado | ON / OFF | OFF |
| `BLhouse3604/sala/umidificador` | Assinar | Liga/desliga o umidificador | ON / OFF | OFF |
| `BLhouse3604/sala/umidificador/status` | Publicar | Estado do umidificador | ON / OFF | ON |
| `BLhouse3604/sala/temperatura` | Publicar | Temperatura lida pelo DHT22 | valor numérico (xx.xx) | 27.50 |
| `BLhouse3604/sala/umidade` | Publicar | Umidade lida pelo DHT22 | valor numérico (xx.xx) | 55.20 |

### 🛏️ Quarto

| Tópico | Operação | Descrição | Payloads Aceitos | Exemplo |
|--------|----------|-----------|------------------|---------|
| `BLhouse3604/quarto/luz` | Assinar | Liga/desliga a luz do quarto | ON / OFF | ON |
| `BLhouse3604/quarto/luz/status` | Publicar | Estado da luz do quarto | ON / OFF | OFF |
| `BLhouse3604/quarto/tomada` | Assinar | Liga/desliga a tomada do quarto | ON / OFF | ON |
| `BLhouse3604/quarto/tomada/status` | Publicar | Estado da tomada | ON / OFF | OFF |
| `BLhouse3604/quarto/cortina` | Assinar | Abre/fecha a cortina | ABRIR / FECHAR | ABRIR |
| `BLhouse3604/quarto/cortina/status` | Publicar | Estado da cortina | ABRINDO / FECHANDO / IDLE | IDLE |

## 3. Guia de Uso dos Endpoints

### Exemplo usando cliente MQTT (MQTT Explorer ou HiveMQ Web Client):

1. **Conectar ao broker**: `broker.hivemq.com`
   - Porta: 1883 (TCP)

2. **Ligar LED da sala**
   - Tópico: `BLhouse3604/sala/luz`
   - Mensagem: `ON`

3. **Abrir portão social**
   - Tópico: `BLhouse3604/garagem/portao/social`
   - Mensagem: `ABRIR`

4. **Receber dados do sensor DHT22**
   - Inscrever-se no tópico: `BLhouse3604/sala/temperatura`
   - Exemplo de retorno: `27.50`

## 4. Esquema de Ligação Elétrica

### 🚗 Garagem
| Dispositivo | GPIO |
|-------------|------|
| LED Garagem | 26 |
| Sensor PIR | 18 |
| Servo Portão Social | 19 |
| Servo Portão Basculante | 21 |

### 🛋️ Sala
| Dispositivo | GPIO |
|-------------|------|
| LED Sala | 25 |
| Relé Ar-Condicionado | 22 |
| Relé Umidificador | 23 |
| Sensor DHT22 | 27 |

### 🛏️ Quarto
| Dispositivo | GPIO |
|-------------|------|
| LED Quarto | 14 |
| Relé Tomada | 12 |
| Motor de Passo DIR | 13 |
| Motor de Passo STEP | 15 |
| Motor de Passo ENABLE | 2 |

> **Nota**: Todos os dispositivos estão alimentados com 3.3V ou 5V conforme especificação e compartilham GND comum.

## 5. Funcionalidades por Ambiente

### 🚗 Garagem
- ✅ Controle de LED
- ✅ Abertura/fechamento de dois portões (social e basculante)
- ✅ Sensor PIR para acender luz automaticamente

### 🛋️ Sala
- ✅ Controle de LED
- ✅ Ar-condicionado via MQTT
- ✅ Umidificador via MQTT
- ✅ Monitoramento de temperatura e umidade (DHT22)

### 🛏️ Quarto
- ✅ Controle de LED
- ✅ Controle de tomada via relé
- ✅ Controle de cortina/motor via motor de passo

## 6. Dashboard Web

### 🛠 Tecnologias do Dashboard
- **React + Vite** - Framework e build tool
- **Paho MQTT** - Comunicação WebSocket com broker
- **Bootstrap 5.3** - Interface responsiva
- **Broker MQTT** - broker.hivemq.com:8000 (WebSocket)

### 📋 Funcionalidades do Dashboard

#### 1️⃣ Conexão e Status
- ✅ Botões para conectar/desconectar do broker MQTT
- ✅ Indicador visual de status da conexão
- ✅ Reconexão automática

#### 2️⃣ Visualização de Sensores
- ✅ Temperatura (°C) em tempo real
- ✅ Umidade (%) em tempo real  
- ✅ Detecção de movimento (PIR)

#### 3️⃣ Controle de Dispositivos
- ✅ Interface organizada por cômodos
- ✅ Botões de controle com feedback visual
- ✅ Indicadores de status em tempo real
- ✅ Cores intuitivas (verde=ligado, vermelho=desligado)

#### 4️⃣ Histórico de Mensagens
- ✅ Log das últimas 50 mensagens MQTT
- ✅ Diferenciação visual entre mensagens enviadas/recebidas/sistema
- ✅ Timestamp de cada mensagem

### 🚀 Como Executar o Dashboard

1. **Instalar dependências:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Executar em modo desenvolvimento:**
   \`\`\`bash
   npm run dev
   \`\`\`

3. **Build para produção:**
   \`\`\`bash
   npm run build
   \`\`\`

### 🎨 Interface do Dashboard
- **Design responsivo** com Bootstrap 5.3
- **Cores simples** e intuitivas
- **Organização por cômodos** para melhor usabilidade
- **Indicadores visuais** de status próximos aos controles
- **Feedback em tempo real** das ações

### 📱 Compatibilidade
- ✅ Desktop
- ✅ Tablet  
- ✅ Mobile

## 7. Link Público no Wokwi

🔗 **[Clique aqui para abrir o projeto no Wokwi](https://wokwi.com/projects/438562786584517633)**

## 8. Licença

Projeto licenciado sob a **MIT License**.

---

**Desenvolvido para projeto acadêmico de IoT**
