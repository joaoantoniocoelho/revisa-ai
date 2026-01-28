import User from '../models/User.js';

class UserRepository {
  async create(userData) {
    const user = new User(userData);
    return await user.save();
  }

  async findByEmail(email) {
    return await User.findOne({ email }).select('+password');
  }

  async findById(id) {
    return await User.findById(id);
  }

  async update(id, updateData) {
    return await User.findByIdAndUpdate(id, updateData, { 
      new: true,
      runValidators: true 
    });
  }
}

export default new UserRepository();
