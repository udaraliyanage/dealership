// routes/tradeInRoutes.js
import express from 'express';
import { tradeInSchema, validate } from '../middleware/validate.js';
import { logger } from '../middleware/logger.js';

const router = express.Router();

router.post('/trade-in-estimate', validate(tradeInSchema), (req, res) => {
    const { year, mileage, model } = req.body;

    const currentYear = 2026;
    const estimate = 15000 - (currentYear - year) * 1000 - (mileage * 0.05);
    const finalValue = Math.max(estimate, 1000);

    logger.info(`📊 Trade-In Estimate for ${model}: $${finalValue}`);

    res.json({ 
        model,
        estimatedValue: finalValue,
        note: "This is an automated estimate based on the details provided."
    });
});

export default router;