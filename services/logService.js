const SystemLog = require('../models/SystemLog');

/**
 * Logs system events
 * @param {string} action - The action being performed
 * @param {object} options - Additional log options
 * @param {string} options.level - Log level: info, warning, error, critical
 * @param {string} options.userId - User ID if applicable
 * @param {object} options.details - Additional details about the action
 * @param {string} options.ip - IP address of the client
 */
const logSystemEvent = async (action, options = {}) => {
  try {
    const { level = 'info', userId = null, details = {}, ip = null } = options;
    
    const log = new SystemLog({
      action,
      level,
      userId,
      details,
      ip
    });
    
    await log.save();
    return log;
  } catch (error) {
    console.error('Error logging system event:', error);
    // We don't want to throw errors from the logging service
    // as it could disrupt normal application flow
  }
};

/**
 * Get system logs with optional filtering
 * @param {object} filters - Filters to apply
 * @param {number} page - Page number for pagination
 * @param {number} limit - Number of logs per page
 * @returns {Promise<{logs: Array, totalPages: number, count: number}>}
 */
const getSystemLogs = async (filters = {}, page = 1, limit = 20) => {
  try {
    const query = {};
    
    // Apply filters if provided
    if (filters.level) query.level = filters.level;
    if (filters.action) query.action = { $regex: filters.action, $options: 'i' };
    if (filters.userId) query.userId = filters.userId;
    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }
    
    // Get total count
    const count = await SystemLog.countDocuments(query);
    
    // Calculate pagination
    const totalPages = Math.ceil(count / limit);
    const skip = (page - 1) * limit;
    
    // Get logs with pagination and sorting
    const logs = await SystemLog.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit)
      .populate('userId', 'emailOrPhone role');
    
    return {
      logs,
      totalPages,
      count
    };
  } catch (error) {
    console.error('Error fetching system logs:', error);
    throw error;
  }
};

module.exports = {
  logSystemEvent,
  getSystemLogs
}; 