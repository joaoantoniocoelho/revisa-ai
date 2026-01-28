import express from 'express';
import multer from 'multer';
import deckController from '../controllers/deckController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPdfLimit, checkDensityAccess } from '../middlewares/checkLimits.js';

const router = express.Router();

// Configuração do multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('File must be a PDF'));
      return;
    }
    cb(null, true);
  },
});

// Rotas protegidas
router.post(
  '/generate',
  authenticate,
  upload.single('pdf'), // DEVE VIR PRIMEIRO para processar FormData
  checkPdfLimit,        // Valida limite mensal de PDFs
  checkDensityAccess,   // Valida densidade permitida pelo plano
  deckController.generate
);

// Listar decks - valida plano para possível limitação futura
router.get('/', authenticate, deckController.getDecks);

// Ver deck específico - valida ownership no controller
router.get('/:deckId', authenticate, deckController.getDeck);

// Atualizar nome do deck - valida ownership no controller
router.patch('/:deckId', authenticate, deckController.updateDeck);

// Deletar deck - valida ownership no controller
router.delete('/:deckId', authenticate, deckController.deleteDeck);

// Error handler para multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'PDF must be smaller than 10MB' });
    }
    return res.status(400).json({ error: error.message });
  }
  
  if (error.message === 'File must be a PDF') {
    return res.status(400).json({ error: 'File must be a PDF' });
  }
  
  next(error);
});

export default router;
