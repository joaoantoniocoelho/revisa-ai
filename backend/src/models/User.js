import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
  },
  password: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [6, 'Senha deve ter no mínimo 6 caracteres'],
    select: false, // Não retorna senha por padrão em queries
  },
  planType: {
    type: String,
    enum: ['free', 'paid'],
    default: 'free',
  },
  monthlyPdfCount: {
    type: Number,
    default: 0,
  },
  lastPdfResetDate: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Hash password antes de salvar
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Método para comparar senha
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Método para incrementar contador de PDFs
userSchema.methods.incrementPdfCount = async function() {
  this.monthlyPdfCount += 1;
  await this.save(); 
};

// Método para resetar contador se necessário
userSchema.methods.checkAndResetMonthlyCount = function() {
  const now = new Date();
  const lastReset = new Date(this.lastPdfResetDate);
  
  // Reset mensal
  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    this.monthlyPdfCount = 0;
    this.lastPdfResetDate = now;
  }
};

// Remove senha e campos sensíveis ao converter para JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;
