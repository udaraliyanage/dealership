// routes/leadRoutes.js
import express from 'express';
import { leadSchema, validate } from '../middleware/validate.js';
import { logger } from '../middleware/logger.js';

const router = express.Router();
const leads = [];

router.post('/lead', validate(leadSchema), (req, res) => {
    const { name, phone, history } = req.body;
    
    const lead = {
        id: `LEAD-${Date.now()}`,
        name,
        phone,
        history, // This is now a validated string
        timestamp: new Date()
    };

    leads.push(lead);
    
    // Log exactly like your original version
    logger.info(`🚨 Capturing lead: ${JSON.stringify(lead)}`);
    logger.info(`📈 Lead Captured. Total leads: ${leads.length}`);

    res.status(201).json({ 
        status: "Lead recorded", 
        leadId: lead.id 
    });
});

export default router;