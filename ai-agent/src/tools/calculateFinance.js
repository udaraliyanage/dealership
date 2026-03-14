import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import axios from 'axios';

export const calculateFinance = new DynamicStructuredTool({
  name: "calculate_finance",
  description: `Calculate vehicle finance repayments. 
    Call this ONLY when you have ALL of the following from the customer:
    - price (vehicle purchase price in NZD)
    - deposit (how much they can put down, can be 0)
    - termsInMonths (loan term: 12, 24, 36, 48, 60, or 72 months)
    - repaymentFreq (how often they want to pay: Weekly, Fortnightly, or Monthly)
    Do NOT guess or assume any values. Ask for each one if missing.`,
  schema: z.object({
    price: z.number().describe('Vehicle purchase price in NZD (e.g. 54500)'),
    deposit: z.number().describe('Deposit amount in NZD. Use 0 if no deposit.'),
    tradeIn: z.number().optional().default(0).describe('Trade-in value in NZD. Use 0 if none.'),
    termsInMonths: z.number().describe('Loan term in months. Must be one of: 12, 24, 36, 48, 60, 72.'),
    repaymentFreq: z.enum(['Weekly', 'Fortnightly', 'Monthly']).describe('Repayment frequency.'),
  }),
  func: async ({ price, deposit, tradeIn = 0, termsInMonths, repaymentFreq }) => {
    try {
      const url = `${process.env.BACKEND_URL}/finance/calculate`;
      console.log(`💰 AGENT CALCULATING FINANCE: ${url}`, { price, deposit, tradeIn, termsInMonths, repaymentFreq });

      const res = await axios.post(url, {
        price,
        deposit,
        tradeIn,
        termsInMonths,
        repaymentFreq,
      });

      console.log(`✅ FINANCE RESULT:`, res.data);
      return JSON.stringify(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      console.error("❌ FINANCE CALC ERROR:", msg);
      return `ERROR: ${msg}`;
    }
  },
});