import planService from './planService.js';

class UserLimitsService {
  async getUserLimits(user) {
    // Reset contador se necessário
    user.checkAndResetMonthlyCount();
    await user.save();

    // Busca informações do plano
    const plan = await planService.getPlanByName(user.planType);
    
    if (!plan) {
      throw new Error('Plano não encontrado');
    }

    const pdfLimit = plan.limits.pdfsPerMonth;
    const pdfUsed = user.monthlyPdfCount;
    const pdfRemaining = pdfLimit - pdfUsed;

    return {
      plan: {
        name: plan.name,
        displayName: plan.displayName,
        features: plan.features,
      },
      limits: {
        pdfsPerMonth: pdfLimit,
        allowedDensities: plan.limits.allowedDensities,
        maxCardsPerDeck: plan.limits.maxCardsPerDeck,
      },
      usage: {
        pdfUsed,
        pdfRemaining,
        canUploadPdf: pdfUsed < pdfLimit,
      },
    };
  }

  async canUploadPdf(user) {
    user.checkAndResetMonthlyCount();
    const plan = await planService.getPlanByName(user.planType);
    
    if (!plan) {
      return false;
    }

    return user.monthlyPdfCount < plan.limits.pdfsPerMonth;
  }

  async isDensityAllowed(user, density) {
    const plan = await planService.getPlanByName(user.planType);
    
    if (!plan) {
      return false;
    }

    // Normaliza a densidade
    const normalizedDensity = density ? density.toString().toLowerCase().trim() : '';
    
    return plan.limits.allowedDensities.includes(normalizedDensity);
  }

  async getAllowedDensities(user) {
    const plan = await planService.getPlanByName(user.planType);
    
    if (!plan) {
      return ['low'];
    }

    return plan.limits.allowedDensities;
  }
}

export default new UserLimitsService();
