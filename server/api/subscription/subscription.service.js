'use strict';

const mongoose = require('mongoose');
const Company = require('../company/company.model');
const UserModel = require('../user/user.model');
const {
  SUBSCRIPTION_ERROR,
  SUBSCRIPTION_EXPIRED_MESSAGE,
  USER_LIMIT_EXCEEDED_MESSAGE,
  HTTP_FORBIDDEN,
  HTTP_CONFLICT
} = require('./subscription.constants');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EXPIRING_SOON_DAYS = 7;

function normalizeCompanyId(id) {
  if (id == null) return null;
  if (id._id != null && !(id instanceof mongoose.Types.ObjectId)) return id._id;
  return id;
}

/**
 * Subscription valid if endDate is in the future and status !== 'expired'
 * (calendar endDate wins so stale active/trial rows still block.)
 */
exports.isExpired = function isExpired(company) {
  if (!company?.subscription?.endDate) return true;
  const endMs = new Date(company.subscription.endDate).getTime();
  const pastEnd = endMs <= Date.now();
  const flagged = company.subscription.status === 'expired';
  return pastEnd || flagged;
};

exports.computeState = function computeState(company) {
  if (!company?.subscription?.endDate) {
    return { kind: 'expired', daysRemaining: 0 };
  }
  const endMs = new Date(company.subscription.endDate).getTime();
  const now = Date.now();
  if (endMs <= now || company.subscription.status === 'expired') {
    return { kind: 'expired', daysRemaining: 0 };
  }
  const daysRemaining = Math.ceil((endMs - now) / MS_PER_DAY);
  if (daysRemaining <= EXPIRING_SOON_DAYS) {
    return { kind: 'expiring_soon', daysRemaining };
  }
  return { kind: 'active', daysRemaining };
};

exports.getCompanySubscriptionLean = async function getCompanySubscriptionLean(companyId) {
  const id = normalizeCompanyId(companyId);
  if (!id) return null;
  return Company.findOne({ _id: id, deleted: false })
    .select('name status subscription logo')
    .lean();
};

exports.verifyActiveForRequest = async function verifyActiveForRequest(companyId) {
  const company = await exports.getCompanySubscriptionLean(companyId);
  if (!company) {
    const err = new Error(SUBSCRIPTION_EXPIRED_MESSAGE);
    err.code = SUBSCRIPTION_ERROR.SUBSCRIPTION_EXPIRED;
    err.status = HTTP_FORBIDDEN;
    throw err;
  }
  if (exports.isExpired(company)) {
    const err = new Error(SUBSCRIPTION_EXPIRED_MESSAGE);
    err.code = SUBSCRIPTION_ERROR.SUBSCRIPTION_EXPIRED;
    err.status = HTTP_FORBIDDEN;
    throw err;
  }
};

exports.countSeatedUsers = async function countSeatedUsers(companyId) {
  const id = normalizeCompanyId(companyId);
  return UserModel.countDocuments({ companyId: id }).exec();
};

exports.countActiveUsers = async function countActiveUsers(companyId) {
  const id = normalizeCompanyId(companyId);
  return UserModel.countDocuments({ companyId: id, isActive: true }).exec();
};

exports.resolveUserLimit = function resolveUserLimit(company) {
  const raw = company?.subscription?.userLimit;
  if (typeof raw === 'number' && !Number.isNaN(raw) && raw >= 1) return raw;
  return 3;
};

/**
 * Validates subscription expiry and seated-user cap.
 * When at or above the plan seat limit, creation is allowed only if acceptExtraSeatBeyondPlan is true.
 * @returns {{ company: object, seatedCount: number, resolvedLimit: number }}
 */
exports.assertSeatCreateAllowed =
  async function assertSeatCreateAllowed(companyId, options = {}) {
    const acceptExtraSeatBeyondPlan =
      options.acceptExtraSeatBeyondPlan === true;
    const company = await exports.getCompanySubscriptionLean(companyId);
    if (!company || exports.isExpired(company)) {
      const err = new Error(SUBSCRIPTION_EXPIRED_MESSAGE);
      err.code = SUBSCRIPTION_ERROR.SUBSCRIPTION_EXPIRED;
      err.status = HTTP_FORBIDDEN;
      throw err;
    }
    const resolvedLimit = exports.resolveUserLimit(company);
    const seatedCount = await exports.countSeatedUsers(companyId);

    if (seatedCount < resolvedLimit) {
      return { company, seatedCount, resolvedLimit };
    }

    if (!acceptExtraSeatBeyondPlan) {
      const err = new Error(USER_LIMIT_EXCEEDED_MESSAGE);
      err.code = SUBSCRIPTION_ERROR.USER_LIMIT_EXCEEDED;
      err.status = HTTP_CONFLICT;
      throw err;
    }

    return { company, seatedCount, resolvedLimit };
  };

exports.assertUserLimitAllowsCreate = async function assertUserLimitAllowsCreate(companyId) {
  await exports.assertSeatCreateAllowed(companyId, {
    acceptExtraSeatBeyondPlan: false
  });
};
