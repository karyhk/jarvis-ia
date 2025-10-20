// Elementos del DOM
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

// Configuración segura - Token integrado pero no visible
const HUGGING_FACE_TOKEN = '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';
const HUGGING_FACE_API = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large';

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
    
    // Scroll al final
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Función para usar Hugging Face API
async function queryHuggingFaceAPI(prompt) {
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
                }
            }),
        });

        if (!response.ok) {
            throw new Error(`Error en la API: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }

        return result[0]?.generated_text || 'Lo siento, no pude generar una respuesta.';

    } catch (error) {
        console.error('Error con la API:', error);
        // Respuestas predeterminadas para errores comunes
        const fallbackResponses = {
            'hola': '¡Hola! Soy JARVIS, tu asistente de IA. ¿En qué puedo ayudarte?',
            'qué es un átomo': 'Un átomo es la unidad básica de la materia. Está compuesto por un núcleo con protones y neutrones, y electrones que orbitan alrededor del núcleo.',
            'qué puedes hacer': 'Puedo responder preguntas, explicar conceptos, ayudarte con tareas y mantener conversaciones. ¡Pregúntame lo que quieras!',
            'quién eres': 'Soy JARVIS, un asistente de inteligencia artificial creado para ayudarte con cualquier consulta que tengas.',
            'gracias': '¡De nada! Estoy aquí para ayudarte cuando lo necesites.',
            'cómo estás': '¡Funcionando perfectamente! Listo para ayudarte con lo que necesites.',
            'adiós': '¡Hasta luego! Fue un placer ayudarte.'
        };
        
        const lowerPrompt = prompt.toLowerCase();
        for (const [key, response] of Object.entries(fallbackResponses)) {
            if (lowerPrompt.includes(key)) {
                return response;
            }
        }
        
        return 'Parece que hay un problema temporal con mi conexión. Por favor, intenta tu pregunta de nuevo.';
    }
}

// Función principal para procesar mensajes
async function processUserMessage() {
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Agregar mensaje del usuario
    addMessage(message, true);
    
    // Limpiar input
    userInput.value = '';
    
    // Mostrar indicador de escritura
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'message bot-message';
    typingIndicator.id = 'typingIndicator';
    typingIndicator.innerHTML = `
        <div class="avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <p><i class="fas fa-ellipsis-h"></i> JARVIS está pensando...</p>
        </div>
    `;
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        // Obtener respuesta de la IA
        const response = await queryHuggingFaceAPI(message);
        
        // Eliminar indicador de escritura
        document.getElementById('typingIndicator').remove();
        
        // Agregar respuesta
        addMessage(response);
        
    } catch (error) {
        // Eliminar indicador de escritura
        document.getElementById('typingIndicator').remove();
        
        // Mensaje de error amigable
        addMessage('Lo siento, estoy teniendo problemas técnicos en este momento. Por favor, intenta de nuevo en un momento.');
    }
}

// Event Listeners
sendButton.addEventListener('click', processUserMessage);

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        processUserMessage();
    }
});

// Enfocar el input automáticamente
userInput.focus();

// Mensaje de bienvenida después de cargar
setTimeout(() => {
    addMessage('Puedes preguntarme sobre cualquier tema: ciencia, tecnología, historia, matemáticas, o simplemente conversar. ¡Estoy aquí para ayudarte!');
}, 1000);
