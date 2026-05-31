'use strict';

const mailer = require('./index');

const PLAN_LABELS = {
  free: 'Free',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise'
};

function subscriptionPlanDisplay(raw) {
  if (!raw || typeof raw !== 'string') return '—';
  const key = raw.toLowerCase();
  return PLAN_LABELS[key]
    ? PLAN_LABELS[key]
    : raw.charAt(0).toUpperCase() + raw.slice(1);
}

function parseOverageRecipients() {
  const raw = process.env.USER_LIMIT_OVERAGE_NOTIFY_EMAILS || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.includes('@'))
}

/**
 * @param {{
 *   company: import('mongoose').LeanDocument<object>,
 *   previousCount: number,
 *   resolvedLimit: number,
 *   createdUser: import('mongoose').Document,
 *   performer: { name?: string, email?: string }
 * }} opts
 */
function buildLocals(opts) {
  const { company, previousCount, resolvedLimit, createdUser, performer } = opts;
  const subs = company.subscription || {};
  const endDate = subs.endDate ? new Date(subs.endDate) : null;

  return {
    goConnectLogoUrl: (process.env.CODE_CONNECT_LOGO_URL || '').trim(),
    connectCrmLogoUrl: (process.env.CONNECT_CRM_LOGO_URL || '').trim(),
    companyName: company.name || '—',
    companyLogoUrl: (company.logo || '').trim(),
    subscriptionPlanRaw: subs.plan || '—',
    subscriptionPlanLabel: subscriptionPlanDisplay(subs.plan),
    subscriptionEndDateFormatted: endDate
      ? endDate.toUTCString()
      : '—',
    userLimitAllocated: resolvedLimit,
    usersCountBefore: previousCount,
    usersCountAfter: previousCount + 1,
    newUserName: createdUser.name || '—',
    newUserEmail: createdUser.email || '—',
    newUserPhone: createdUser.phone || '—',
    newUserRole: createdUser.role || '—',
    addedByName: performer.name || '—',
    addedByEmail: performer.email || '—',
    timestampUtc: new Date().toISOString(),
    supportEmail:
      process.env.SUPPORT_EMAIL || process.env.SMTP_FROM || 'support@codeconnect.in',
    appDashboardUrl:
      process.env.APP_URL ||
      process.env.CORS_ORIGIN?.split(',')[0]?.trim() ||
      'https://crm.codeconnect.in'
  };
}

function fireNotification(locals) {
  const recipients = parseOverageRecipients();
  if (!recipients.length) {
    return;
  }

  const toEmail = recipients.join(', ');
  const subject = `[Connect CRM] Extra seat billing notice — ${locals.companyName || 'Company'}`;

  setImmediate(() => {
    mailer
      .sendMail({
        templateName: 'user-limit-extra-seat',
        toEmail,
        locals,
        subject
      })
      .catch((err) => {
        console.error(
          '[userLimitExtraSeat] Failed to send notification email:',
          err?.message || err
        );
      });
  });
}

module.exports = {
  buildLocals,
  fireNotification,
  parseOverageRecipients,
  subscriptionPlanDisplay
};
