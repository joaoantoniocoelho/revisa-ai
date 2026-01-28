import userLimitsService from '../services/userLimitsService.js';

export const checkPdfLimit = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Verifica se usuário pode fazer upload
    const canUpload = await userLimitsService.canUploadPdf(user);
    
    if (!canUpload) {
      const limits = await userLimitsService.getUserLimits(user);
      
      return res.status(403).json({ 
        error: 'Limite mensal de PDFs atingido',
        limit: limits.limits.pdfsPerMonth,
        used: limits.usage.pdfUsed,
        planType: user.planType,
        message: user.planType === 'free' 
          ? 'Faça upgrade para o plano pago para enviar mais PDFs'
          : 'Você atingiu o limite mensal do seu plano'
      });
    }

    next();
  } catch (error) {
    console.error('Check PDF limit error:', error);
    res.status(500).json({ error: 'Erro ao verificar limite' });
  }
};

export const checkDensityAccess = async (req, res, next) => {
  try {
    const user = req.user;
    let { density } = req.body;

    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Normaliza a densidade (lowercase e trim)
    if (density) {
      density = density.toString().toLowerCase().trim();
      req.body.density = density; // Atualiza no body
    }

    const isAllowed = await userLimitsService.isDensityAllowed(user, density);
    
    if (!isAllowed) {
      const allowedDensities = await userLimitsService.getAllowedDensities(user);
      
      return res.status(403).json({ 
        error: 'Densidade não permitida para seu plano',
        allowedDensities,
        requestedDensity: density,
        planType: user.planType,
        message: 'Faça upgrade para o plano pago para acessar todas as densidades'
      });
    }

    next();
  } catch (error) {
    console.error('Check density access error:', error);
    res.status(500).json({ error: 'Erro ao verificar acesso' });
  }
};

export const requirePaidPlan = (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (user.planType !== 'paid') {
      return res.status(403).json({ 
        error: 'Recurso disponível apenas para plano pago',
        planType: user.planType,
        message: 'Faça upgrade para acessar este recurso'
      });
    }

    next();
  } catch (error) {
    console.error('Require paid plan error:', error);
    res.status(500).json({ error: 'Erro ao verificar plano' });
  }
};

// Middleware para verificar limites gerais do plano
export const checkPlanLimits = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Busca os limites do usuário para validar o plano
    const limits = await userLimitsService.getUserLimits(user);
    
    // Adiciona limites ao request para uso posterior
    req.userLimits = limits;

    next();
  } catch (error) {
    console.error('Check plan limits error:', error);
    res.status(500).json({ error: 'Erro ao verificar limites do plano' });
  }
};
