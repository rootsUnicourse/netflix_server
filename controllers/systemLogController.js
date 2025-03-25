const { logSystemEvent, getSystemLogs } = require('../services/logService');
const SystemLog = require('../models/SystemLog');

/**
 * Get system logs with pagination and filtering
 * @route GET /api/admin/logs
 * @access Private/Admin
 */
exports.getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, level, action, userId, startDate, endDate, excludeAction } = req.query;
    
    const filters = {};
    if (level) filters.level = level;
    if (action) filters.action = action;
    if (excludeAction) filters.excludeAction = excludeAction;
    if (userId) filters.userId = userId;
    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }
    
    // Log this access to system logs
    await logSystemEvent('System logs accessed', {
      userId: req.user.userId,
      level: 'info',
      details: { filters },
      ip: req.ip
    });
    
    const result = await getSystemLogs(filters, parseInt(page), parseInt(limit));
    
    res.status(200).json({
      logs: result.logs,
      totalPages: result.totalPages,
      totalCount: result.count,
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error getting system logs:', error);
    res.status(500).json({ message: 'Server error retrieving system logs' });
  }
};

/**
 * Clear system logs (only accessible by admin)
 * @route DELETE /api/admin/logs
 * @access Private/Admin
 */
exports.clearLogs = async (req, res) => {
  try {
    const { olderThan } = req.body;
    
    let query = {};
    if (olderThan) {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(olderThan));
      query = { createdAt: { $lt: date } };
    }
    
    // Log this action
    await logSystemEvent('System logs cleared', {
      userId: req.user.userId,
      level: 'warning',
      details: { olderThan },
      ip: req.ip
    });
    
    // Remove logs based on query
    const result = await SystemLog.deleteMany(query);
    
    res.status(200).json({
      message: `${result.deletedCount} logs have been deleted`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing system logs:', error);
    res.status(500).json({ message: 'Server error while clearing logs' });
  }
}; 