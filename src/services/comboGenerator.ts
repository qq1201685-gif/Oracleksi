/**
 * Kalshi Multi-Contract Binary Combination Generator with Aggression vs. Accuracy Optimization
 * Binary Directional Corridors, Range Bracket Boxes, Double Breakout Strangles, and Kelly Sizing.
 */

import {
  KalshiMarketAsset,
  Kalshi15mContract,
  TechnicalAnalysisPosture,
  ComboStrategy,
  ComboLeg,
} from '../types/market.ts';

export function generateComboStrategies(
  asset: KalshiMarketAsset,
  contracts: Kalshi15mContract[],
  posture: TechnicalAnalysisPosture,
  aggressionPercent: number = 50, // 0 to 100
  accountBankrollDollars: number = 1000
): ComboStrategy[] {
  if (contracts.length < 5) return [];

  const currentPrice = asset.currentPrice;
  const sortedContracts = [...contracts].sort((a, b) => a.strikePrice - b.strikePrice);
  const atmIdx = Math.floor(sortedContracts.length / 2);

  const lowerStrike = sortedContracts[Math.max(0, atmIdx - 1)];
  const atmStrike = sortedContracts[atmIdx];
  const upperStrike = sortedContracts[Math.min(sortedContracts.length - 1, atmIdx + 1)];
  const deepLowerStrike = sortedContracts[Math.max(0, atmIdx - 2)];
  const deepUpperStrike = sortedContracts[Math.min(sortedContracts.length - 1, atmIdx + 2)];

  const strategies: ComboStrategy[] = [];

  // Helper to generate payoff curve across a price range for binary contracts (100¢ payout if settlement condition met)
  function buildPayoff(
    legs: ComboLeg[],
    minPrice: number,
    maxPrice: number,
    steps: number = 24
  ): Array<{ price: number; pnlCents: number }> {
    const curve: Array<{ price: number; pnlCents: number }> = [];
    const stepSize = (maxPrice - minPrice) / steps;

    for (let i = 0; i <= steps; i++) {
      const p = minPrice + i * stepSize;
      let totalPnl = 0;

      for (const leg of legs) {
        let settlementValue = 0;
        if (leg.side === 'YES') {
          settlementValue = p > leg.strike ? 100 : 0;
        } else {
          settlementValue = p <= leg.strike ? 100 : 0;
        }

        const legPnl =
          leg.action === 'BUY'
            ? (settlementValue - leg.priceCents) * leg.contractsCount
            : (leg.priceCents - settlementValue) * leg.contractsCount;

        totalPnl += legPnl;
      }

      curve.push({
        price: parseFloat(p.toFixed(2)),
        pnlCents: Math.round(totalPnl),
      });
    }
    return curve;
  }

  // 1. DIRECTIONAL UPSIDE BINARY CORRIDOR (Buy Lower YES + Sell Higher YES)
  {
    const buyLeg: ComboLeg = {
      contractTicker: atmStrike.ticker,
      strike: atmStrike.strikePrice,
      side: 'YES',
      action: 'BUY',
      priceCents: atmStrike.yesAsk,
      contractsCount: 1,
    };
    const sellLeg: ComboLeg = {
      contractTicker: upperStrike.ticker,
      strike: upperStrike.strikePrice,
      side: 'YES',
      action: 'SELL',
      priceCents: upperStrike.yesBid,
      contractsCount: 1,
    };

    const netCost = buyLeg.priceCents - sellLeg.priceCents;
    const maxProfit = 100 - netCost;
    const maxRisk = Math.max(1, netCost);

    let winProb = Math.min(88, Math.max(30, atmStrike.calculatedFairOdds * 0.9));
    if (posture.eliadesOffsets.projectedTargetDirection === 'UP') winProb += 7;
    if (aggressionPercent > 60) winProb -= (aggressionPercent - 60) * 0.15;

    const bOdds = maxRisk > 0 ? maxProfit / maxRisk : 1;
    const p = winProb / 100;
    const q = 1 - p;
    const fullKelly = Math.max(0, (p * bOdds - q) / bOdds);
    const fractionalKelly = fullKelly * 0.25;
    const recContracts = Math.max(1, Math.min(50, Math.floor((accountBankrollDollars * 100 * fractionalKelly) / maxRisk)));

    const ev = (winProb / 100) * maxProfit - ((100 - winProb) / 100) * maxRisk;
    const priceMin = currentPrice * 0.985;
    const priceMax = currentPrice * 1.015;

    strategies.push({
      id: 'combo-bull-corridor',
      name: 'Upside Binary Corridor (Directional Pair)',
      category: 'BINARY_UPSIDE_CORRIDOR',
      description: `Buy YES at $${atmStrike.strikePrice.toLocaleString()} & Sell YES at $${upperStrike.strikePrice.toLocaleString()} on Kalshi to capitalize on upward Eliades cycle targets with discounted net debit.`,
      aggressionScore: Math.round(30 + aggressionPercent * 0.4),
      accuracyScore: Math.round(winProb),
      legs: [buyLeg, sellLeg],
      netCostCents: netCost,
      maxProfitCents: maxProfit,
      maxRiskCents: maxRisk,
      winProbabilityPercent: parseFloat(winProb.toFixed(1)),
      riskRewardRatio: parseFloat((maxProfit / maxRisk).toFixed(2)),
      expectedValueCents: parseFloat(ev.toFixed(2)),
      recommendedKellyContracts: recContracts,
      payoffCurve: buildPayoff([buyLeg, sellLeg], priceMin, priceMax),
    });
  }

  // 2. DOWNSIDE BINARY CORRIDOR (Buy Higher NO + Sell Lower NO)
  {
    const buyLeg: ComboLeg = {
      contractTicker: atmStrike.ticker,
      strike: atmStrike.strikePrice,
      side: 'NO',
      action: 'BUY',
      priceCents: atmStrike.noAsk,
      contractsCount: 1,
    };
    const sellLeg: ComboLeg = {
      contractTicker: lowerStrike.ticker,
      strike: lowerStrike.strikePrice,
      side: 'NO',
      action: 'SELL',
      priceCents: lowerStrike.noBid,
      contractsCount: 1,
    };

    const netCost = buyLeg.priceCents - sellLeg.priceCents;
    const maxProfit = 100 - netCost;
    const maxRisk = Math.max(1, netCost);

    let winProb = Math.min(88, Math.max(30, (100 - atmStrike.calculatedFairOdds) * 0.9));
    if (posture.eliadesOffsets.projectedTargetDirection === 'DOWN') winProb += 7;
    if (aggressionPercent > 60) winProb -= (aggressionPercent - 60) * 0.15;

    const bOdds = maxRisk > 0 ? maxProfit / maxRisk : 1;
    const p = winProb / 100;
    const q = 1 - p;
    const fullKelly = Math.max(0, (p * bOdds - q) / bOdds);
    const recContracts = Math.max(1, Math.min(50, Math.floor((accountBankrollDollars * 100 * (fullKelly * 0.25)) / maxRisk)));

    const ev = (winProb / 100) * maxProfit - ((100 - winProb) / 100) * maxRisk;
    const priceMin = currentPrice * 0.985;
    const priceMax = currentPrice * 1.015;

    strategies.push({
      id: 'combo-bear-floor',
      name: 'Downside Binary Corridor (Directional Pair)',
      category: 'BINARY_DOWNSIDE_CORRIDOR',
      description: `Buy NO at $${atmStrike.strikePrice.toLocaleString()} & Sell NO at $${lowerStrike.strikePrice.toLocaleString()} on Kalshi to monetize downward momentum with reduced cost.`,
      aggressionScore: Math.round(35 + aggressionPercent * 0.4),
      accuracyScore: Math.round(winProb),
      legs: [buyLeg, sellLeg],
      netCostCents: netCost,
      maxProfitCents: maxProfit,
      maxRiskCents: maxRisk,
      winProbabilityPercent: parseFloat(winProb.toFixed(1)),
      riskRewardRatio: parseFloat((maxProfit / maxRisk).toFixed(2)),
      expectedValueCents: parseFloat(ev.toFixed(2)),
      recommendedKellyContracts: recContracts,
      payoffCurve: buildPayoff([buyLeg, sellLeg], priceMin, priceMax),
    });
  }

  // 3. DUAL-WING VOLATILITY BREAKOUT STRANGLE
  {
    const buyUpperYes: ComboLeg = {
      contractTicker: upperStrike.ticker,
      strike: upperStrike.strikePrice,
      side: 'YES',
      action: 'BUY',
      priceCents: upperStrike.yesAsk,
      contractsCount: 1,
    };
    const buyLowerNo: ComboLeg = {
      contractTicker: lowerStrike.ticker,
      strike: lowerStrike.strikePrice,
      side: 'NO',
      action: 'BUY',
      priceCents: lowerStrike.noAsk,
      contractsCount: 1,
    };

    const netCost = buyUpperYes.priceCents + buyLowerNo.priceCents;
    const maxProfit = 100 - netCost;
    const maxRisk = Math.max(1, netCost);

    const volExpansionFactor = posture.bollinger.bandWidthPercent > 1.5 ? 1.2 : 0.8;
    const winProb = Math.min(75, Math.max(25, 42 * volExpansionFactor + (aggressionPercent / 100) * 15));

    const bOdds = maxRisk > 0 ? maxProfit / maxRisk : 1;
    const p = winProb / 100;
    const q = 1 - p;
    const fullKelly = Math.max(0, (p * bOdds - q) / bOdds);
    const recContracts = Math.max(1, Math.min(40, Math.floor((accountBankrollDollars * 100 * (fullKelly * 0.2)) / maxRisk)));

    const ev = (winProb / 100) * maxProfit - ((100 - winProb) / 100) * maxRisk;
    const priceMin = currentPrice * 0.98;
    const priceMax = currentPrice * 1.02;

    strategies.push({
      id: 'combo-volatility-strangle',
      name: 'Dual-Wing Binary Breakout Pair',
      category: 'BINARY_BREAKOUT_STRANGLE',
      description: `Buy OTM YES at $${upperStrike.strikePrice.toLocaleString()} + Buy OTM NO at $${lowerStrike.strikePrice.toLocaleString()} on Kalshi to profit when 15m price explodes outside the range.`,
      aggressionScore: Math.round(65 + aggressionPercent * 0.35),
      accuracyScore: Math.round(winProb),
      legs: [buyUpperYes, buyLowerNo],
      netCostCents: netCost,
      maxProfitCents: maxProfit,
      maxRiskCents: maxRisk,
      winProbabilityPercent: parseFloat(winProb.toFixed(1)),
      riskRewardRatio: parseFloat((maxProfit / maxRisk).toFixed(2)),
      expectedValueCents: parseFloat(ev.toFixed(2)),
      recommendedKellyContracts: recContracts,
      payoffCurve: buildPayoff([buyUpperYes, buyLowerNo], priceMin, priceMax),
    });
  }

  // 4. HURST ENVELOPE RANGE BRACKET BOX (HIGH PROBABILITY HARVESTER)
  {
    const buyLowerYes: ComboLeg = {
      contractTicker: deepLowerStrike.ticker,
      strike: deepLowerStrike.strikePrice,
      side: 'YES',
      action: 'BUY',
      priceCents: deepLowerStrike.yesAsk,
      contractsCount: 1,
    };
    const buyUpperNo: ComboLeg = {
      contractTicker: deepUpperStrike.ticker,
      strike: deepUpperStrike.strikePrice,
      side: 'NO',
      action: 'BUY',
      priceCents: deepUpperStrike.noAsk,
      contractsCount: 1,
    };

    const netCost = buyLowerYes.priceCents + buyUpperNo.priceCents;
    const maxProfit = 200 - netCost;
    const maxRisk = Math.max(1, netCost);

    const hurstStabilityBonus = posture.hurstCycles.hurstExponent < 0.5 ? 12 : 4;
    const winProb = Math.min(89, Math.max(50, 70 + hurstStabilityBonus - (aggressionPercent / 100) * 12));

    const bOdds = maxRisk > 0 ? maxProfit / maxRisk : 1;
    const p = winProb / 100;
    const q = 1 - p;
    const fullKelly = Math.max(0, (p * bOdds - q) / bOdds);
    const recContracts = Math.max(1, Math.min(50, Math.floor((accountBankrollDollars * 100 * (fullKelly * 0.3)) / maxRisk)));

    const ev = (winProb / 100) * maxProfit - ((100 - winProb) / 100) * maxRisk;
    const priceMin = currentPrice * 0.985;
    const priceMax = currentPrice * 1.015;

    strategies.push({
      id: 'combo-range-box',
      name: 'Hurst Range Bracket Box (Double Win Corridor)',
      category: 'BINARY_RANGE_BOX',
      description: `Buy YES at Hurst lower envelope ($${deepLowerStrike.strikePrice.toLocaleString()}) + Buy NO at Hurst upper envelope ($${deepUpperStrike.strikePrice.toLocaleString()}) to collect double payouts if price stays bounded.`,
      aggressionScore: Math.round(15 + aggressionPercent * 0.25),
      accuracyScore: Math.round(winProb),
      legs: [buyLowerYes, buyUpperNo],
      netCostCents: netCost,
      maxProfitCents: maxProfit,
      maxRiskCents: maxRisk,
      winProbabilityPercent: parseFloat(winProb.toFixed(1)),
      riskRewardRatio: parseFloat((maxProfit / maxRisk).toFixed(2)),
      expectedValueCents: parseFloat(ev.toFixed(2)),
      recommendedKellyContracts: recContracts,
      payoffCurve: buildPayoff([buyLowerYes, buyUpperNo], priceMin, priceMax),
    });
  }

  // 5. DELTA ROC MOMENTUM SNIPER
  {
    const isBull = posture.momentumDeltaROC.velocityPosture.includes('BULL');
    const targetStrike = isBull ? upperStrike : lowerStrike;
    const side = isBull ? 'YES' : 'NO';
    const price = isBull ? targetStrike.yesAsk : targetStrike.noAsk;

    const sniperLeg: ComboLeg = {
      contractTicker: targetStrike.ticker,
      strike: targetStrike.strikePrice,
      side,
      action: 'BUY',
      priceCents: price,
      contractsCount: 1,
    };

    const maxProfit = 100 - price;
    const maxRisk = Math.max(1, price);
    const winProb = isBull ? targetStrike.calculatedFairOdds : 100 - targetStrike.calculatedFairOdds;

    const bOdds = maxRisk > 0 ? maxProfit / maxRisk : 1;
    const p = winProb / 100;
    const q = 1 - p;
    const fullKelly = Math.max(0, (p * bOdds - q) / bOdds);
    const recContracts = Math.max(1, Math.min(60, Math.floor((accountBankrollDollars * 100 * (fullKelly * 0.25)) / maxRisk)));

    const ev = (winProb / 100) * maxProfit - ((100 - winProb) / 100) * maxRisk;
    const priceMin = currentPrice * 0.985;
    const priceMax = currentPrice * 1.015;

    strategies.push({
      id: 'combo-delta-sniper',
      name: `Delta ROC ${isBull ? 'Bullish' : 'Bearish'} Velocity Sniper`,
      category: 'BINARY_EDGE_SNIPER',
      description: `High-conviction single-strike binary bet: Buy ${side} on $${targetStrike.strikePrice.toLocaleString()} aligned with Delta ROC 2nd-derivative velocity.`,
      aggressionScore: Math.round(50 + aggressionPercent * 0.4),
      accuracyScore: Math.round(winProb),
      legs: [sniperLeg],
      netCostCents: price,
      maxProfitCents: maxProfit,
      maxRiskCents: maxRisk,
      winProbabilityPercent: parseFloat(winProb.toFixed(1)),
      riskRewardRatio: parseFloat((maxProfit / maxRisk).toFixed(2)),
      expectedValueCents: parseFloat(ev.toFixed(2)),
      recommendedKellyContracts: recContracts,
      payoffCurve: buildPayoff([sniperLeg], priceMin, priceMax),
    });
  }

  // Sort strategies based on user aggression preference
  return strategies.sort((a, b) => {
    if (aggressionPercent >= 60) {
      return b.expectedValueCents - a.expectedValueCents;
    }
    return b.winProbabilityPercent - a.winProbabilityPercent;
  });
}
