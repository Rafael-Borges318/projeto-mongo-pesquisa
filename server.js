
import OpenAI from "openai";
import express from 'express';
import connection from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;
const COLLECTION = 'respostas';

async function chatGptResponse(question, answer) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `${question}: ${answer} | A partir dessa pergunta e resposta, crie um json com 4 métricas. Cada metrica deve ter uma nota de 0 a 10. E sera necessario criar uma quinta metrica com o nome "avaliacaoGeral" que sera responsavel pela media das métricas.`
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
        const response = await chatGptResponse(doc.question, doc.answer);
        doc.metricas = JSON.parse(response.choices[0].message.content);
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
