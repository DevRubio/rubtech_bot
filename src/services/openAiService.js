import OpenAI from "openai";
import config from "../config/env.js";

const client = new OpenAI({
    apiKey: config.OPENAI_API_KEY,
});

const openAiService = async (message) => {
    try {
        const response = await client.chat.completions.create({
            messages: [{ role: 'system', content: 'Comportarte como un vendedor de productos de domotica, deberás de resolver las preguntas lo más simple posible. Responde en texto plano, como si fuera una conversación por WhatsApp, no saludes, no generas conversaciones, solo respondes con la pregunta del usuario, y anima al usuario a realizar la compra.'}, { role: 'user', content: message }],
            model: 'gpt-4o'
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error(error);
    }
}

export default openAiService;