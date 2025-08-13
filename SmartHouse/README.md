# Smart Home Dashboard

Dashboard React + Vite para controle de casa inteligente via MQTT.

## 🛠 Tecnologias Utilizadas

- **React + Vite** - Framework e build tool
- **Paho MQTT** - Comunicação com broker MQTT
- **Bootstrap 5.3** - Interface responsiva
- **Broker MQTT** - broker.hivemq.com (público)

## 📋 Funcionalidades

### 1️⃣ Conexão e Status
- ✅ Botões para conectar/desconectar do broker MQTT
- ✅ Indicador visual de status da conexão

### 2️⃣ Visualização de Sensores
- ✅ Temperatura (°C) em tempo real
- ✅ Umidade (%) em tempo real  
- ✅ Detecção de movimento (PIR)

### 3️⃣ Controle de Dispositivos

**🚗 Garagem:**
- ✅ Porta Social (Abrir/Fechar + status)
- ✅ Porta Basculante (Abrir/Fechar + status)
- ✅ Luz da Garagem (Ligar/Desligar + status)

**🛋️ Sala de Estar:**
- ✅ Luz da Sala (Ligar/Desligar + status)
- ✅ Ar-condicionado (Ligar/Desligar + status)
- ✅ Umidificador (Ligar/Desligar + status)

**🛏️ Quarto:**
- ✅ Luz do Quarto (Ligar/Desligar + status)
- ✅ Tomada Inteligente (Ligar/Desligar + status)
- ✅ Cortina (Abrir/Fechar + status)

### 4️⃣ Histórico de Mensagens
- ✅ Log das últimas 50 mensagens MQTT
- ✅ Diferenciação visual entre mensagens enviadas/recebidas/sistema

## 🚀 Como Executar

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

## 📡 Tópicos MQTT

### Comandos (Dashboard → ESP32)
- `casa/garagem/luz` - ON/OFF
- `casa/garagem/portao/social` - ABRIR/FECHAR
- `casa/garagem/portao/basculante` - ABRIR/FECHAR
- `casa/sala/luz` - ON/OFF
- `casa/sala/ar` - ON/OFF
- `casa/sala/umidificador` - ON/OFF
- `casa/quarto/luz` - ON/OFF
- `casa/quarto/tomada` - ON/OFF
- `casa/quarto/cortina` - ABRIR/FECHAR

### Status (ESP32 → Dashboard)
- `casa/*/status` - Status dos dispositivos
- `casa/sala/temperatura` - Valor da temperatura
- `casa/sala/umidade` - Valor da umidade

## 🎨 Interface

- **Design responsivo** com Bootstrap 5.3
- **Cores simples** e intuitivas
- **Organização por cômodos** para melhor usabilidade
- **Indicadores visuais** de status próximos aos controles
- **Feedback em tempo real** das ações

## 📱 Compatibilidade

- ✅ Desktop
- ✅ Tablet  
- ✅ Mobile

---

**Desenvolvido para projeto acadêmico de IoT**

