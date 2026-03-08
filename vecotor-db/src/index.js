import { client } from './db.js';
import { GoogleGenerativeAI } from "@google/generative-ai"; // Native SDK
import dotenv from 'dotenv';

dotenv.config();

// 1. Initialize the Native Google SDK
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// Stability Note: text-embedding-004 was deprecated Jan 2026, 
// gemini-embedding-001 is the current standard.
const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

async function run() {
    try {
        await client.connect();
        console.log("Connected to Dealership DB.");

        // 2. SYNC MISSING EMBEDDINGS
        console.log("Checking for missing embeddings...");
        const { rows: missingRows } = await client.query(
            'SELECT id, description FROM vehicle WHERE embedding IS NULL'
        );

        for (const vehicle of missingRows) {
            console.log(`- Generating 768d embedding for ID: ${vehicle.id}`);
            
            // Native SDK call - this correctly respects outputDimensionality
            const result = await model.embedContent({
                content: { parts: [{ text: vehicle.description }] },
                taskType: "RETRIEVAL_DOCUMENT",
                outputDimensionality: 768, 
            });

            const vector = result.embedding.values;
            const vectorString = `[${vector.join(',')}]`;

            await client.query(
                'UPDATE vehicle SET embedding = $1 WHERE id = $2',
                [vectorString, vehicle.id]
            );
        }
        console.log("✅ Sync complete.");

        // 3. SEARCH LOGIC
        const queryText = "luxury and technology";
        const maxPrice = 120300;

        console.log(`\nSearching for: "${queryText}" under $${maxPrice}...`);

        const searchResult = await model.embedContent({
            content: { parts: [{ text: queryText }] },
            taskType: "RETRIEVAL_QUERY",
            outputDimensionality: 768,
        });

        const queryVectorString = `[${searchResult.embedding.values.join(',')}]`;

        const sql = `
            SELECT model, price, 
                   1 - (embedding <=> $1) AS similarity
            FROM vehicle
            WHERE price <= $2
            ORDER BY embedding <=> $1
            LIMIT 5;
        `;

        const { rows: results } = await client.query(sql, [queryVectorString, maxPrice]);

        console.table(results.map(r => ({
            Model: r.model,
            Price: `$${r.price}`,
            Match: `${(r.similarity * 100).toFixed(2)}%`
        })));

    } catch (err) {
        console.error("❌ Error encountered:", err);
    } finally {
        await client.end();
    }
}

run();