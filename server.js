import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { CohereClient } from 'cohere-ai';
import fs from 'fs/promises';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
const EMBEDDINGS_FILE = './documents/embeddings.json';

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  return dot / (magA * magB);
}

function getTopKDocuments(queryEmbedding, docs, k = 5) {
  const sims = docs.map(d => ({
    doc: d,
    score: cosineSimilarity(queryEmbedding, d.embedding)
  }));
  sims.sort((a, b) => b.score - a.score);
  return sims.slice(0, k).map(s => s.doc);
}

async function loadDocuments() {
  const docsDir = path.resolve('./documents');
  let files;
  try {
    files = await fs.readdir(docsDir);
  } catch (err) {
    console.error('Could not list documents folder:', err);
    return [];
  }

  const documents = [];
  for (const file of files) {
    if (!file.match(/\.(json|txt|md)$/)) continue;
    try {
      const content = await fs.readFile(path.join(docsDir, file), 'utf8');
      if (file.endsWith('.json')) {
        const json = JSON.parse(content);
        documents.push({
          id: file,
          data: { title: file, snippet: JSON.stringify(json).slice(0, 1000) }
        });
      } else {
        documents.push({
          id: file,
          data: { title: file, snippet: content.slice(0, 1000) }
        });
      }
    } catch (err) {
      console.error(`Error reading ${file}:`, err);
    }
  }
  console.log(`Loaded ${documents.length} documents`);
  return documents;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function embedDocumentsInBatches(docs, batchSize = 96) {
  const allEmbeddings = [];
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    console.log(`Embedding batch ${i / batchSize + 1} of ${Math.ceil(docs.length / batchSize)}...`);
    const resp = await cohere.embed({
      texts: batch.map(d => `${d.data.title}. ${d.data.snippet}`),
      model: 'embed-multilingual-v3.0',
      input_type: 'search_document'
    });
    allEmbeddings.push(...resp.embeddings);
    await sleep(10000);
  }
  return allEmbeddings;
}

async function saveEmbeddingsToFile(docs) {
  const out = docs.map(d => ({
    id: d.id,
    title: d.data.title,
    snippet: d.data.snippet,
    embedding: d.embedding
  }));
  await fs.writeFile(EMBEDDINGS_FILE, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Embeddings saved to ${EMBEDDINGS_FILE}`);
}

async function loadEmbeddingsFromFile() {
  try {
    const raw = await fs.readFile(EMBEDDINGS_FILE, 'utf8');
    const arr = JSON.parse(raw);
    console.log(`Loaded ${arr.length} embeddings from file`);
    return arr.map(item => ({
      id: item.id,
      data: { title: item.title, snippet: item.snippet },
      embedding: item.embedding
    }));
  } catch {
    console.warn('No existing embeddings file; will compute fresh.');
    return null;
  }
}

let cachedDocuments = [];
async function initializeDocuments() {
  const fromFile = await loadEmbeddingsFromFile();
  if (fromFile) {
    cachedDocuments = fromFile;
  } else {
    const docs = await loadDocuments();
    const embs = await embedDocumentsInBatches(docs);
    embs.forEach((e, idx) => (docs[idx].embedding = e));
    await saveEmbeddingsToFile(docs);
    cachedDocuments = docs;
  }
  console.log('Documents are ready.');
}
initializeDocuments();

// <-- NEW ROOT ROUTE
app.get('/', (_req, res) => {
  res.send(`
    <h1>Y-TravelBot API</h1>
    <p>Use <code>POST /generate</code> with JSON <code>{ "prompt": "..." }</code> to get a generated answer.</p>
    <p>Use <code>POST /holiday</code> with JSON <code>{ "userInput": "..." }</code> to get an itinerary.</p>
  `);
});

app.post('/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  try {
    const embedResp = await cohere.embed({
      texts: [prompt],
      model: 'embed-multilingual-v3.0',
      input_type: 'search_document'
    });
    const queryEmb = embedResp.embeddings[0];

    const topDocs = getTopKDocuments(queryEmb, cachedDocuments, 10);
    const chatResp = await cohere.chat({
      model: 'command-r-plus',
      message: prompt,
      documents: topDocs.map(d => ({ text: `${d.data.title}. ${d.data.snippet}` })),
      preamble: 'You are a travel assistant named Y-TravelBot. Answer using only the docs provided.',
      temperature: 0.3
    });

    res.json({ text: chatResp.text, citations: chatResp.citations ?? [] });
  } catch (err) {
    console.error('Cohere error:', err);
    res.status(500).json({ error: 'Cohere request failed' });
  }
});

app.post('/holiday', async (req, res) => {
  const { userInput } = req.body;
  if (!userInput) return res.status(400).json({ error: 'userInput is required' });

  try {
    const response = await cohere.chat({
      message: `Generate a holiday itinerary: "${userInput}"`,
      temperature: 0.7,
      max_tokens: 1000
    });
    res.json({ itinerary: response.text });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to generate itinerary' });
  }
});

app.listen(5000, () => {
  console.log('Listening on http://localhost:5000');
});
