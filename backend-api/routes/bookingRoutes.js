// routes/bookingRoutes.js
import express from 'express';
import { bookingSchema, validate } from '../middleware/validate.js';
import { logger } from '../middleware/logger.js';

const router = express.Router();
const bookings = [];

router.post('/bookings', validate(bookingSchema), (req, res) => {
	const { name, phone, model, slot, type } = req.body;
	const newBooking = {
		id: `BK-${Math.random().toString(36).substring(7).toUpperCase()}`,
		name,
		phone,
		model,
		slot: slot || "To be confirmed by manager",
		type: type || 'test-drive',
		createdAt: new Date()
	};
	bookings.push(newBooking);
	logger.info(`New booking: ${JSON.stringify(newBooking)}`);
	res.status(201).json(newBooking);
});

export default router;
