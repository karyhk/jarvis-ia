// Elementos del DOM
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

// Configuración mejorada
const HUGGING_FACE_TOKEN = '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';
const HUGGING_FACE_API = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium';

// Respuestas de respaldo inteligentes
const SMART_RESPONSES = {
    'hola': '¡Hola! Soy JARVIS, tu asistente de IA. ¿En qué puedo ayudarte hoy?',
    'qué es un átomo': 'Un átomo es la unidad básica de la materia. Está compuesto por un núcleo central con protones (carga positiva) y neutrones (sin carga), rodeado por electrones (carga negativa) que orbitan alrededor. Los átomos se combinan para formar moléculas y compuestos.',
    'qué es la inteligencia artificial': 'La inteligencia artificial (IA) es la simulación de procesos de inteligencia humana por parte de máquinas, especialmente sistemas informáticos. Incluye aprendizaje automático, razonamiento, percepción y resolución de problemas.',
    'quién eres': 'Soy JARVIS, un asistente de inteligencia artificial creado para ayudarte con información, responder preguntas y asistirte en diversas tareas. Estoy aquí para hacer tu vida más fácil.',
    'qué puedes hacer': 'Puedo: Responder preguntas sobre diversos temas, explicar conceptos científicos, ayudar con tareas académicas, proporcionar información actualizada y mantener conversaciones naturales.',
    'gracias': '¡De nada! Es un placer ayudarte. ¿Hay algo más en lo que pueda asistirte?',
    'cómo estás': '¡Funcionando perfectamente! Todos mis sistemas están operativos y listos para ayudarte.',
    'adiós': '¡Hasta luego! Fue un placer asistirte. Regresa cuando necesites ayuda.',
    'qué es el machine learning': 'El machine learning (aprendizaje automático) es una rama de la IA que permite a las computadoras aprender y mejorar desde la experiencia sin ser programadas explícitamente. Usa algoritmos que identifican patrones en datos.',
    'qué es python': 'Python es un lenguaje de programación de alto nivel, interpretado y de propósito general. Es conocido por su sintaxis clara y legible, siendo muy popular en ciencia de datos, IA, desarrollo web y automatización.'
};

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

// Función inteligente para usar Hugging Face API con reintentos
async function queryHuggingFaceAPI(prompt) {
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Primero verificar si tenemos una respuesta inteligente predefinida
            const smartResponse = getSmartResponse(prompt);
            if (smartResponse) {
                return smartResponse;
            }

            const response = await fetch(HUGGING_FACE_API, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HUGGING_FACE_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 400,
                        temperature: 0.7,
                        top_p: 0.9,
                        do_sample: true,
                        return_full_text: false
                    },
                    options: {
                        wait_for_model: true
                    }
                }),
            });

            // Si el modelo está cargando
            if (response.status === 503) {
                const errorData = await response.json();
                const waitTime = errorData.estimated_time || 15;
                
                if (attempt < maxRetries) {
                    addMessage(`⏳ El modelo se está cargando (${Math.round(waitTime)} segundos)...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                    continue;
                }
            }

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }

            const generatedText = result[0]?.generated_text;
            
            if (!generatedText || generatedText.trim().length < 5) {
                throw new Error('Respuesta vacía');
            }

            return generatedText.trim();

        } catch (error) {
            console.log(`Intento ${attempt} fallido:`, error.message);
            
            if (attempt === maxRetries) {
                // En el último intento, usar respuestas inteligentes
                const fallback = getSmartResponse(prompt);
                if (fallback) {
                    return fallback;
                }
                throw new Error('El servicio está ocupado. Por favor, intenta de nuevo en un momento.');
            }
            
            // Esperar antes del siguiente intento
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
}

// Función para obtener respuestas inteligentes predefinidas
function getSmartResponse(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    // Buscar coincidencias exactas primero
    for (const [key, response] of Object.entries(SMART_RESPONSES)) {
        if (lowerPrompt === key.toLowerCase()) {
            return response;
        }
    }
    
    // Buscar coincidencias parciales
    for (const [key, response] of Object.entries(SMART_RESPONSES)) {
        if (lowerPrompt.includes(key.toLowerCase())) {
            return response;
        }
    }
    
    return null;
}

// Función principal mejorada
async function processUserMessage() {
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Agregar mensaje del usuario
    addMessage(message, true);
    userInput.value = '';
    
    // Mostrar indicador de escritura
    showTypingIndicator();
    
    try {
        const response = await queryHuggingFaceAPI(message);
        hideTypingIndicator();
        addMessage(response);
        
    } catch (error) {
        hideTypingIndicator();
        addMessage('🔧 Estoy teniendo dificultades técnicas momentáneas. Por favor, reformula tu pregunta o intenta de nuevo en un momento.');
    }
}

// Indicadores de escritura
function showTypingIndicator() {
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'message bot-message';
    typingIndicator.id = 'typingIndicator';
    typingIndicator.innerHTML = `
        <div class="avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <p><i class="fas fa-ellipsis-h"></i> JARVIS está procesando...</p>
        </div>
    `;
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
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
    addMessage('💡 **Consejo:** Si mi respuesta tarda mucho, significa que el modelo se está "despertando". Las siguientes preguntas serán más rápidas. Puedes preguntarme sobre: ciencia, tecnología, historia, programación, o cualquier tema de tu interés.');
}, 1500);
