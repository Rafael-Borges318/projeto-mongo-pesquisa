import 'dotenv/config';
import OpenAI from "openai";
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import connection from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/favicon.ico', (_req, res) => res.status(204).end());
app.get('/.well-known/*', (_req, res) => res.status(204).end());

const COLLECTION = 'respostas';

async function chatGptResponse(question, answer) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "Você retorna apenas JSON válido, sem texto adicional."
      },
      {
        role: "user",
        content: `Pergunta: ${question}\nResposta: ${answer}\n\nCrie um JSON com 4 métricas avaliando a resposta. Cada métrica deve ter uma nota de 0 a 10. Adicione uma quinta chave "avaliacaoGeral" com a média das 4 notas.`
      }
    ]
  });
}

app.get('/respostas', async (req, res) => {
  try {
    const db = await connection.getDb();
    const docs = await db.collection(COLLECTION).find({}).toArray();

    if (process.env.OPENAI_API_KEY) {
      await Promise.all(docs.map(async (doc) => {
        try {
          const response = await chatGptResponse(doc.question, doc.answer);
          doc.metricas = JSON.parse(response.choices[0].message.content);
        } catch (aiErr) {
          console.warn(`IA falhou para "${doc.question?.slice(0, 40)}":`, aiErr.message);
        }
      }));
    }

    res.json({ total: docs.length, dados: docs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
