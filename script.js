// Elementos del DOM
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

// Configuración
const HUGGING_FACE_TOKEN = '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';
const HUGGING_FACE_API = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large';
const MAX_WAIT_TIME = 30000; // 30 segundos máximo

// Función para agregar mensajes al chat
function addMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    
    const avatarIcon = document.createElement('i');
    avatarIcon.className = isUser ? 'fas fa-user' : 'fas fa-robot';
    avatarDiv.appendChild(avatarIcon);
    
    const messageContentDiv = document.createElement('div');
    messageContentDiv.className = 'message-content';
    
    const messageText = document.createElement('p');
    messageText.textContent = content;
    messageContentDiv.appendChild(messageText);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(messageContentDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Función para mostrar indicador de carga con barra de progreso
function showLoadingIndicator() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot-message';
    loadingDiv.id = 'loadingIndicator';
    loadingDiv.innerHTML = `
        <div class="avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="loading-indicator">
                <div class="loading-spinner"></div>
                <span>JARVIS está procesando tu pregunta...</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <small>Tiempo máximo: 30 segundos</small>
        </div>
    `;
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Función para ocultar indicador de carga
function hideLoadingIndicator() {
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) indicator.remove();
}

// Función mejorada para usar Hugging Face API con espera inteligente
async function queryHuggingFaceAPI(prompt) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MAX_WAIT_TIME);
    
    try {
        const response = await fetch(HUGGING_FACE_API, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUGGING_FACE_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: 500,
                    temperature: 0.7,
                    top_p: 0.9,
                    do_sample: true,
                    return_full_text: false
                },
                options: {
                    wait_for_model: true // Esto hace que espere a que el modelo cargue
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 503) {
            // El modelo está cargando, obtener tiempo estimado
            const errorData = await response.json();
            const estimatedTime = errorData.estimated_time || 20;
            
            // Actualizar el indicador con el tiempo estimado
            updateLoadingIndicator(`El modelo se está cargando... (${Math.ceil(estimatedTime)} segundos)`);
            
            // Esperar y reintentar
            await new Promise(resolve => setTimeout(resolve, estimatedTime * 1000));
            return await queryHuggingFaceAPI(prompt);
        }

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }

        const generatedText = result[0]?.generated_text;
        
        if (!generatedText || generatedText.trim().length < 2) {
            throw new Error('Respuesta vacía del modelo');
        }

        return generatedText.trim();

    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            throw new Error('El modelo está tomando demasiado tiempo. Por favor, intenta con una pregunta más corta o espera unos minutos.');
        }
        
        throw error;
    }
}

// Función para actualizar el indicador de carga
function updateLoadingIndicator(message) {
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) {
        const loadingText = indicator.querySelector('.loading-indicator span');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }
}

// Función principal mejorada
async function processUserMessage() {
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Deshabilitar input temporalmente
    userInput.disabled = true;
    sendButton.disabled = true;
    
    // Agregar mensaje del usuario
    addMessage(message, true);
    userInput.value = '';
    
    // Mostrar indicador de carga
    showLoadingIndicator();
    
    try {
        const response = await queryHuggingFaceAPI(message);
        hideLoadingIndicator();
        addMessage(response);
        
    } catch (error) {
        hideLoadingIndicator();
        
        // Mensajes de error más específicos
        if (error.message.includes('demasiado tiempo')) {
            addMessage('⏰ ' + error.message + ' Las siguientes preguntas deberían ser más rápidas una vez que el modelo esté activo.');
        } else if (error.message.includes('Error HTTP: 5')) {
            addMessage('🔧 El servicio está experimentando problemas temporales. Por favor, intenta de nuevo en un momento.');
        } else {
            addMessage('❌ ' + error.message + ' Intenta reformular tu pregunta.');
        }
        
        console.error('Error detallado:', error);
    } finally {
        // Rehabilitar input
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();
    }
}

// Event Listeners
sendButton.addEventListener('click', processUserMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') processUserMessage();
});

// Enfocar automáticamente
userInput.focus();

// Mensaje de bienvenida
setTimeout(() => {
    addMessage('💡 **Nota:** La primera pregunta puede tomar hasta 30 segundos mientras el modelo "despierta". Las siguientes preguntas serán mucho más rápidas. ¡Pregúntame lo que quieras!');
}, 1000);
