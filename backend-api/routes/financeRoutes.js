// routes/financeRoutes.js
import express from 'express';
import { logger } from '../middleware/logger.js';

const router = express.Router();

/**
 * POST /finance/calculate
 *
 * Body:
 *   price            number  - vehicle purchase price (NZD)
 *   deposit          number  - deposit amount (NZD, default 0)
 *   tradeIn          number  - trade-in value (NZD, default 0)
 *   termsInMonths    number  - loan term: 12 | 24 | 36 | 48 | 60 | 72 (default 60)
 *   repaymentFreq    string  - "Weekly" | "Fortnightly" | "Monthly" (default "Weekly")
 *   interestRate     number  - annual rate as decimal e.g. 0.0785 (default 0.0785 = 7.85%)
 */
router.post('/finance/calculate', (req, res) => {
  try {
    const {
      price,
      deposit = 0,
      tradeIn = 0,
      termsInMonths = 60,
      repaymentFreq = 'Weekly',
      interestRate = 0.0785,
    } = req.body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!price || typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ error: 'price is required and must be a positive number.' });
    }

    const validTerms = [12, 24, 36, 48, 60, 72];
    if (!validTerms.includes(Number(termsInMonths))) {
      return res.status(400).json({ error: `termsInMonths must be one of: ${validTerms.join(', ')}.` });
    }

    const validFreqs = ['Weekly', 'Fortnightly', 'Monthly'];
    if (!validFreqs.includes(repaymentFreq)) {
      return res.status(400).json({ error: `repaymentFreq must be one of: ${validFreqs.join(', ')}.` });
    }

    // ── Core calculation ─────────────────────────────────────────────────────
    const ORIGINATION_FEE = 500;      // flat establishment fee
    const ADMIN_FEE_RATE  = 0.015;    // 1.5% admin fee on amount to finance

    const depositAmount   = Number(deposit);
    const tradeInValue    = Number(tradeIn);
    const annualRate      = Number(interestRate);
    const months          = Number(termsInMonths);

    // Amount the customer needs to borrow (before fees)
    const amountToFinance = price - depositAmount - tradeInValue;

    if (amountToFinance <= 0) {
      return res.status(400).json({ error: 'Deposit and trade-in exceed the vehicle price.' });
    }

    // Total financed amount including origination fee
    const adminFee      = parseFloat((amountToFinance * ADMIN_FEE_RATE).toFixed(2));
    const totalToFinance = amountToFinance + ORIGINATION_FEE;

    // Periods per year based on repayment frequency
    const periodsPerYear = repaymentFreq === 'Weekly'
      ? 52
      : repaymentFreq === 'Fortnightly'
        ? 26
        : 12;

    const totalPeriods  = Math.round((months / 12) * periodsPerYear);
    const ratePerPeriod = annualRate / periodsPerYear;

    // Standard annuity formula: PMT = PV * r / (1 - (1+r)^-n)
    let repaymentAmount;
    if (ratePerPeriod === 0) {
      repaymentAmount = totalToFinance / totalPeriods;
    } else {
      repaymentAmount = totalToFinance * ratePerPeriod /
        (1 - Math.pow(1 + ratePerPeriod, -totalPeriods));
    }

    const repaymentRounded = parseFloat(repaymentAmount.toFixed(2));
    const totalRepayment   = parseFloat((repaymentRounded * totalPeriods).toFixed(2));

    const result = {
      purchasePrice:      price,
      depositAmount,
      tradeInValue,
      amountToFinance,
      originationFee:     ORIGINATION_FEE,
      adminFee,
      totalToFinance,
      interestRate:       `${(annualRate * 100).toFixed(2)}%`,
      termsInMonths:      months,
      repaymentFrequency: repaymentFreq,
      periodCount:        totalPeriods,
      repaymentAmount:    repaymentRounded,
      totalRepayment,
    };

    logger.info(`💰 Finance calc: price=$${price}, deposit=$${depositAmount}, ` +
      `term=${months}mo, freq=${repaymentFreq}, payment=$${repaymentRounded}`);

    res.json(result);

  } catch (err) {
    logger.error(`❌ Finance calc error: ${err.message}`);
    res.status(500).json({ error: 'Finance calculation failed. Please try again.' });
  }
});

export default router;