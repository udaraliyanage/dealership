import { z } from 'zod';

export const bookingSchema = z.object({
  name: z.string({ 
    required_error: "Missing 'name'. I need the customer's full name to hold the test drive reservation." 
  }).min(1, "Missing 'name'. I need the customer's full name to hold the test drive reservation."),
  
  phone: z.string({ 
    required_error: "Missing 'phone'. I need a valid contact number to send the booking confirmation and reminder." 
  }).min(1, "Missing 'phone'. I need a valid contact number to send the booking confirmation and reminder."),
  
  model: z.string({ 
    required_error: "Missing 'model'. Please specify which vehicle model the customer wants to test drive (e.g., 'Toyota RAV4')." 
  }).min(1, "Missing 'model'. Please specify which vehicle model the customer wants to test drive (e.g., 'Toyota RAV4')."),
  
  slot: z.string().optional(),
  type: z.string().optional()
});

export const leadSchema = z.object({
  name: z.string({ 
    required_error: "Missing 'name'. I need the customer's full name so the manager can follow up." 
  }).min(1, "Missing 'name'. I need the customer's full name so the manager can follow up."),

  phone: z.string({ 
    required_error: "Missing 'phone'. I need a valid contact number so the manager can send the confirmation and follow-up." 
  }).min(1, "Missing 'phone'. I need a valid contact number so the manager can send the confirmation and follow-up."),
  
  // Storing as a string to match your preference
  history: z.string().optional().default("") 
});

export const tradeInSchema = z.object({
  year: z.coerce.number({ // Use coerce to handle string-to-number conversion automatically
    required_error: "Missing 'year'. I need the vehicle's manufacturing year to calculate trade-in value.",
    invalid_type_error: "Year must be a number (e.g., 2022)." 
  })
  .min(1990, "Vehicle year out of range. We only provide estimates for vehicles between 1990 and 2027. Please confirm the year with the customer.")
  .max(2027, "Vehicle year out of range. We only provide estimates for vehicles between 1990 and 2027. Please confirm the year with the customer."),

  model: z.string({ 
    required_error: "Missing 'model'. I need the vehicle's make and model to calculate trade-in value." 
  }),

  mileage: z.coerce.number({ 
    required_error: "Missing 'mileage'. I need the current odometer reading to calculate trade-in value.",
    invalid_type_error: "Mileage must be a number (e.g., 50000)." 
  })
  .max(500000, "High mileage detected (over 500k). For vehicles with very high mileage, please advise the customer to bring the car in for a manual appraisal to ensure accuracy.")
});

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      // Map the errors into a single string for the AI to process easily
      const errorMessage = result.error.errors.map(e => e.message).join(' ');
      return res.status(400).json({ error: errorMessage });
    }
    next();
  };
}