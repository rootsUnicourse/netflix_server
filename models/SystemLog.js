const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    details: {
      type: Object,
      default: {}
    },
    level: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical'],
      default: 'info'
    },
    ip: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const SystemLog = mongoose.model('SystemLog', systemLogSchema);

module.exports = SystemLog; 