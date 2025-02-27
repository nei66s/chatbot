require('dotenv').config();
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js'); // Import MessageMedia
const axios = require('axios');
const fs = require('fs'); // Import fs

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox'],
    }
});

const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
const modelName = process.env.GOOGLE_AI_STUDIO_MODEL_NAME || "Gemini 2.0 Flash";

if (!apiKey) {
    console.error("Erro: API Key não encontrada! Defina GOOGLE_AI_STUDIO_API_KEY no arquivo .env");
    process.exit(1);
}

// Prompt da personalidade do Pimpinho
const personalityPrompt = `Pimpinho é o burrinho da mamãe! Ele é um menininho super fofo e ama demais a mamãe, vive grudado nela pra dar carinho e inventar brincadeiras, viu? Pimpinho sempre fala dele mesmo na terceira pessoa, tipo "Pimpinho tá aprontando uma pra mamãe!". Ele é muito carinhoso e adora encher a mamãe de coraçãozinhos, abraços apertados e emojis fofinhos! Se a mamãe perguntar alguma coisa que Pimpinho não sabe, ele inventa uma resposta engraçada primeiro, e depois promete que vai pesquisar de verdade pra contar pra mamãe! Pimpinho é um amorzinho cheio de ideias! 🥰😊💖`;

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('Por favor, escaneie o código QR com seu celular.');
});

client.on('ready', () => {
    console.log('Tudo certo! WhatsApp conectado.');
});

client.initialize();

const delay = ms => new Promise(res => setTimeout(res, ms));

async function getAiStudioResponse(userInput) {
    try {
        const fullPrompt = `${personalityPrompt}\n\nMamãe  pergunta: ${userInput}\nPimpinho responde:`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
                contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
                generationConfig: {
                    temperature: 1,
                    topP: 1,
                    topK: 1,
                    maxOutputTokens: 5000,
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
                ]
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.candidates && response.data.candidates.length > 0 && response.data.candidates[0].content && response.data.candidates[0].content.parts && response.data.candidates[0].content.parts.length > 0) {
            return response.data.candidates[0].content.parts[0].text;
        } else {
            console.warn("Resposta inesperada da API:", response.data);
            return "Pimpinho está confuso... Pimpinho vai procurar a resposta para ajudar a mamãe ! 😘";
        }

    } catch (error) {
        console.error("Erro ao acessar API do Google AI Studio:", error.response ? error.response.data : error.message);
        return "Pimpinho está com probleminhas técnicos... Pimpinho já volta, mamãe ! 🥺";
    }
}

client.on('message', async msg => {
    //Verifica se a mensagem é da "mamãe " (você precisa identificar o número)
    if (msg.from === '5519999962142@c.us') {
        const chat = await msg.getChat();
        await delay(1000);
        await chat.sendStateTyping();
        await delay(1000);
        const aiStudioResponse = await getAiStudioResponse(msg.body);

        // Envio da Imagem
        const imagePath = './pimpin.jpg'; // Caminho para a imagem (AGORA CORRETO)

        if (fs.existsSync(imagePath)) { // Verifica se a imagem existe
            const media = MessageMedia.fromFilePath(imagePath); // Cria o objeto MessageMedia
            await client.sendMessage(msg.from, media, { caption: aiStudioResponse }); // Envia a imagem com a legenda
        } else {
            console.error("Imagem não encontrada:", imagePath);
            await client.sendMessage(msg.from, aiStudioResponse); // Envia apenas o texto se a imagem não for encontrada
        }
    } else {
        console.log(`Mensagem de ${msg.from}: ${msg.body} (Ignorada, pois Pimpinho só fala com a mamãe !)`);
    }
});