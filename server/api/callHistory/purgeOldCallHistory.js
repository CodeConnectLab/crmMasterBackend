/**
 * Scheduled cleanup: delete call history / call logs older than RETENTION_DAYS.
 *
 * Runs daily at 01:00 server time. Age is measured on the call `timestamp`
 * (actual call time), falling back to `createdAt` for any legacy rows that
 * predate the timestamp field.
 */
const cron = require('node-cron');
const CallHistory = require('./callHistory.model');

const RETENTION_DAYS = Number(process.env.CALL_HISTORY_RETENTION_DAYS || 60);

const purgeOldCallHistory = async () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  try {
    const result = await CallHistory.deleteMany({
      $or: [
        { timestamp: { $lt: cutoff } },
        // Legacy rows with no timestamp — fall back to createdAt.
        { timestamp: { $exists: false }, createdAt: { $lt: cutoff } },
      ],
    });
    console.log(
      `Cron Job: Deleted ${result.deletedCount} call history records older than ${RETENTION_DAYS} days (cutoff ${cutoff.toISOString()}).`
    );
  } catch (error) {
    console.error('Error purging old call history:', error);
  }
};

const initCallHistoryPurgeCron = () => {
  // Daily at 01:00.
  cron.schedule('0 1 * * *', purgeOldCallHistory);
  console.log(
    `Call history purge cron scheduled (daily 01:00, retention ${RETENTION_DAYS} days).`
  );
};

module.exports = { initCallHistoryPurgeCron, purgeOldCallHistory };
