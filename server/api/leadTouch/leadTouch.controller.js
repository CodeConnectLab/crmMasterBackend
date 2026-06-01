const service = require('./leadTouch.service');

/**
 * POST /v1/lead/:id/touch
 * Records an in-app tap of Call / WhatsApp / Email / SMS for a lead.
 */
exports.recordTouch = (req, res) => {
  return service
    .recordTouch(req.params.id, req.body, req.user)
    .then((result) =>
      responseHandler.success(
        res,
        {
          touchId: result.touch._id,
          clientNonce: result.touch.clientNonce,
          deduplicated: result.deduplicated,
          serverTs: result.touch.serverTs,
        },
        result.deduplicated ? 'Touch already recorded' : 'Touch recorded',
        200
      )
    )
    .catch((error) =>
      responseHandler.error(
        res,
        error,
        error.message || 'Failed to record touch',
        error.code || 500
      )
    );
};

/**
 * GET /v1/reports/engagement-per-day
 * Returns one row per (user, day) with engaged / verified / channel breakdown.
 */
exports.engagementPerDay = (req, res) => {
  return service
    .getEngagementPerDay(req.query, req.user)
    .then((rows) =>
      responseHandler.success(res, rows, 'Engagement report fetched', 200)
    )
    .catch((error) =>
      responseHandler.error(
        res,
        error,
        error.message || 'Failed to build report',
        500
      )
    );
};
