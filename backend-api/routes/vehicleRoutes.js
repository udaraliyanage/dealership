// routes/vehicleRoutes.js
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { logger } from '../middleware/logger.js';

const router = express.Router();

const getInventory = () => {
    try {
        const dataPath = path.resolve(process.cwd(), 'data', 'inventory.json');
        const rawData = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(rawData);
    } catch (err) {
        logger.error(`❌ Inventory Read Failed: ${err.message}`);
        throw new Error("Could not connect to inventory database.");
    }
};

router.get('/vehicles', (req, res) => {
    try {
        let vehicles = getInventory();
        const { type, maxPrice } = req.query;

        // Filtering logic (Your "Criteria API" replacement)
        if (type) {
            vehicles = vehicles.filter(v => v.type.toLowerCase() === type.toLowerCase());
        }

        if (maxPrice) {
            const priceLimit = parseInt(maxPrice, 10);
            vehicles = vehicles.filter(v => v.price <= priceLimit);
        }

        logger.info(`🔍 Search Results: ${vehicles.length} vehicles found.`);
        res.json(vehicles);

    } catch (err) {
        // This is caught by the AI and used to pivot the conversation
        res.status(500).json({ error: "Inventory is currently unavailable. Please try again in a moment." });
    }
});

router.get('/available-slots', (req, res) => {
    const slots = ["Tomorrow 10:00 AM", "Tomorrow 2:00 PM", "Saturday 11:00 AM"];
    res.json({ slots });
});

export default router;
