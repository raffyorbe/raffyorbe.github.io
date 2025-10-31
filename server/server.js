import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load markdown reference once at startup
import fs from 'fs';
import path from 'path';

let referenceText = '';
try {
  const referencePath = path.join(process.cwd(), 'references', 'ai-raffy.md');
  referenceText = fs.readFileSync(referencePath, 'utf8');
  console.log('Reference file loaded successfully!');
} catch (err) {
  console.error('Error loading reference file:', err);
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    console.log("Received message:", message);

    const completion = await client.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: referenceText },
        { role: 'user', content: message },
      ],
    });

    res.json(completion);
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
