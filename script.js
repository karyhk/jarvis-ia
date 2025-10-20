// Elementos del DOM
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const webSearchToggle = document.getElementById('webSearchToggle');
const aiToggle = document.getElementById('aiToggle');
const hfTokenInput = document.getElementById('hfToken');
const hfStatus = document.getElementById('hfStatus');
const searchStatus = document.getElementById('searchStatus');

// Configuración con TU API KEY
const HUGGING_FACE_TOKEN = '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';
const HUGGING_FACE_API = 'https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta';

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    addMessage('Sistema JARVIS inicializado. Token de Hugging Face integrado. IA avanzada y búsqueda web disponibles.', false);
});

// Función para agregar mensajes al chat
function addMessage(content, isUser = false, metadata = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    
    const avatarIcon = document.createElement('i');
    avatarIcon.className = isUser ? 'fas fa-user' : 'fas fa-robot';
    avatarDiv.appendChild(avatarIcon);
    
    const messageContentDiv = document.createElement('div');
    messageContentDiv.className = 'message-content';
    
    const messageText = document.createElement('div');
    messageText.innerHTML = content;
    messageContentDiv.appendChild(messageText);
    
    // Agregar metadata si existe
    if (metadata) {
        const messageInfo = document.createElement('div');
        messageInfo.className = 'message-info';
        
        if (metadata.model) {
            messageInfo.innerHTML = `<small>Usando: ${metadata.model} | Tiempo: ${metadata.time}ms</small>`;
        } else if (metadata.search) {
            messageInfo.innerHTML = `<small>Búsqueda web realizada | Fuentes: ${metadata.sources}</small>`;
        }
        
        messageContentDiv.appendChild(messageInfo);
    }
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(messageContentDiv);
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll al final
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Función para buscar en internet usando múltiples fuentes
async function searchWeb(query) {
    try {
        // Opción 1: DuckDuckGo (principal)
        const duckDuckGoResults = await searchWithDuckDuckGo(query);
        if (duckDuckGoResults && duckDuckGoResults.sources > 0) {
            return duckDuckGoResults;
        }

        // Opción 2: Wikipedia API (fallback)
        const wikiResults = await searchWithWikipedia(query);
        if (wikiResults && wikiResults.sources > 0) {
            return wikiResults;
        }

        throw new Error('No se pudieron obtener resultados de búsqueda');

    } catch (error) {
        console.error('Error en búsqueda web:', error);
        return {
            content: 'No pude acceder a información actualizada en este momento. Usaré mi conocimiento de IA para responder.',
            metadata: { search: true, sources: 0 }
        };
    }
}

// Búsqueda con DuckDuckGo
async function searchWithDuckDuckGo(query) {
    try {
        const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
        const data = await response.json();
        
        let content = '';
        let sources = 0;
        
        if (data.AbstractText) {
            content += `<div class="search-results">
                <h4>🔍 Información encontrada:</h4>
                <p>${data.AbstractText}</p>`;
            sources++;
        }
        
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            const topics = data.RelatedTopics.slice(0, 2);
            if (!content) content += `<div class="search-results">`;
            content += `<h4>📚 Temas relacionados:</h4>`;
            
            topics.forEach((topic, index) => {
                if (topic.Text) {
                    content += `<div class="search-result-item">
                        <p>${topic.Text}</p>
                    </div>`;
                    sources++;
                }
            });
            
            content += `</div>`;
        }
        
        return {
            content: content || 'No encontré información específica sobre tu consulta en la búsqueda web.',
            metadata: { search: true, sources }
        };
        
    } catch (error) {
        console.log('DuckDuckGo no disponible');
        return null;
    }
}

// Búsqueda con Wikipedia (fallback)
async function searchWithWikipedia(query) {
    try {
        const response = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
        if (response.ok) {
            const data = await response.json();
            
            if (data.extract) {
                return {
                    content: `<div class="search-results">
                        <h4>📖 Información de Wikipedia:</h4>
                        <p>${data.extract}</p>
                        ${data.content_urls ? `<a href="${data.content_urls.desktop.page}" target="_blank">Leer más en Wikipedia</a>` : ''}
                    </div>`,
                    metadata: { search: true, sources: 1 }
                };
            }
        }
        return null;
    } catch (error) {
        console.log('Wikipedia no disponible');
        return null;
    }
}

// Función para usar Hugging Face API
async function queryHuggingFaceAPI(prompt) {
    const startTime = Date.now();
    
    try {
        const response = await fetch(HUGGING_FACE_API, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUGGING_FACE_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: `<|system|>
Eres JARVIS, un asistente de IA útil, inteligente y avanzado. Responde de manera clara, concisa y amigable.
Usuario: ${prompt}</s>
<|assistant|>`,
                parameters: {
                    max_new_tokens: 600,
                    temperature: 0.7,
                    top_p: 0.9,
                    do_sample: true,
                    return_full_text: false
                }
            }),
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }

        const endTime = Date.now();
        const responseText = result[0]?.generated_text || 'No pude generar una respuesta en este momento.';
        
        return {
            content: responseText.trim(),
            metadata: {
                model: 'Zephyr-7B-Beta',
                time: endTime - startTime
            }
        };

    } catch (error) {
        console.error('Error con Hugging Face API:', error);
        
        // Intentar con un modelo alternativo si el principal falla
        try {
            return await queryHuggingFaceAPIFallback(prompt);
        } catch (fallbackError) {
            throw new Error('El servicio de IA no está disponible en este momento. Intenta más tarde.');
        }
    }
}

// Función de fallback para Hugging Face
async function queryHuggingFaceAPIFallback(prompt) {
    const startTime = Date.now();
    
    const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-large', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HUGGING_FACE_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            inputs: prompt,
            parameters: {
                max_new_tokens: 300,
                temperature: 0.7
            }
        }),
    });

    const result = await response.json();
    const endTime = Date.now();

    return {
        content: result[0]?.generated_text || 'Lo siento, no pude procesar tu solicitud.',
        metadata: {
            model: 'DialoGPT-large (Fallback)',
            time: endTime - startTime
        }
    };
}

// Función para respuesta de fallback (cuando no hay API)
function generateFallbackResponse(message) {
    const responses = {
        'hola': '¡Hola! Soy JARVIS, tu asistente de IA avanzado. ¿En qué puedo ayudarte hoy?',
        'qué puedes hacer': 'Puedo responder preguntas usando IA avanzada con Hugging Face, buscar información en internet en tiempo real, ayudarte con análisis, programación, investigación y mucho más. ¡Solo pregunta!',
        'quién eres': 'Soy JARVIS, un asistente de IA desarrollado como parte del PROJECT 2.0. Uso modelos de lenguaje avanzados de Hugging Face y búsqueda web para proporcionar respuestas precisas y actualizadas.',
        'cómo estás': '¡Sistemas operativos al 100%! Modelo Zephyr-7B-Beta cargado y listo. ¿En qué puedo asistirte?',
        'gracias': '¡De nada! Es un placer ayudarte. ¿Hay algo más en lo que pueda asistirte?',
        'adiós': '¡Hasta luego! Fue un placer ayudarte. Vuelve cuando necesites asistencia.',
        'buscar': 'Puedo buscar información en internet. El interruptor "Búsqueda Web" está activado por defecto. ¡Pregúntame cualquier cosa!',
        'ia': 'Estoy usando el modelo Zephyr-7B-Beta de Hugging Face para proporcionar respuestas inteligentes y contextuales.'
    };
    
    const lowerMessage = message.toLowerCase();
    
    for (const [key, value] of Object.entries(responses)) {
        if (lowerMessage.includes(key)) {
            return {
                content: value,
                metadata: { model: 'Sistema', time: 0 }
            };
        }
    }
    
    return {
        content: `He procesado tu consulta: "${message}". Para una respuesta más precisa, estoy usando mi capacidad de IA avanzada.`,
        metadata: { model: 'Zephyr-7B-Beta', time: 0 }
    };
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
    showTypingIndicator();

    try {
        let response;
        const useAI = aiToggle.checked;
        const useWebSearch = webSearchToggle.checked;

        // Búsqueda web si está activada
        let searchData = null;
        if (useWebSearch) {
            searchData = await searchWeb(message);
            if (searchData.sources > 0) {
                addMessage(searchData.content, false, searchData.metadata);
            }
        }

        // Procesamiento con IA
        if (useAI) {
            try {
                response = await queryHuggingFaceAPI(message);
            } catch (error) {
                console.warn('Error con Hugging Face, usando fallback:', error);
                response = generateFallbackResponse(message);
            }
        } else {
            response = generateFallbackResponse(message);
        }

        // Agregar respuesta de IA
        addMessage(response.content, false, response.metadata);

    } catch (error) {
        console.error('Error procesando mensaje:', error);
        addMessage(`<div class="error-message">Error temporal: ${error.message}. Intenta nuevamente.</div>`, false);
    } finally {
        hideTypingIndicator();
    }
}

// Indicador de escritura
function showTypingIndicator() {
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'message bot-message';
    typingIndicator.id = 'typingIndicator';
    typingIndicator.innerHTML = `
        <div class="avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <p><i class="fas fa-ellipsis-h"></i> JARVIS está procesando tu solicitud...</p>
        </div>
    `;
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// Event Listeners
sendButton.addEventListener('click', processUserMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        processUserMessage();
    }
});

// Mensaje de bienvenida inicial
setTimeout(() => {
    addMessage(`<strong>Características activas:</strong><br>
    • 🤖 IA avanzada con Hugging Face (Zephyr-7B-Beta)<br>
    • 🌐 Búsqueda web en tiempo real<br>
    • 💬 Conversaciones contextuales<br>
    • ⚡ Respuestas rápidas y precisas<br>
    <br>
    <em>Puedes desactivar la búsqueda web o la IA usando los interruptores inferiores.</em>`, false);
}, 1500);