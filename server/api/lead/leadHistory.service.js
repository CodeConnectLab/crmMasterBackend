const LeadHistory = require('./leadHistory.model');
const LeadStatus = require('../leadStatus/leadStatus.model');

const mongoose = require('mongoose');


const leadHistoryController = {
  getLeadHistory: async (leadId, companyId) => {
    try {
      const history = await LeadHistory.aggregate([
        { 
          $match: { 
            leadId: new mongoose.Types.ObjectId(leadId),
            companyId: new mongoose.Types.ObjectId(companyId)
          } 
        },
        {
          $lookup: {
            from: 'users',
            localField: 'commentedBy',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $lookup: {
            from: 'leadstatuses',
            localField: 'status',
            foreignField: '_id',
            as: 'statusInfo'
          }
        },
        { $unwind: '$user' },
        { $unwind: '$statusInfo' },
        {
          $project: {
            COMMENTED_BY: '$user.name',
            DATE: '$date',
            STATUS: '$statusInfo.name',
            FOLLOWUP_DATE: '$followupDate',
            COMMENT: '$comment'
          }
        },
        { $sort: { DATE: -1 } }
      ]);
      
      return {
        history,
        count: history.length
      };
    } catch (error) {
      throw new Error('Failed to fetch lead history');
    }
  },

  addLeadHistory: async (data) => {
    try {
      // First verify if the status exists
      const statusExists = await LeadStatus.findOne({
        _id: new mongoose.Types.ObjectId(data.status),
        companyId: new mongoose.Types.ObjectId(data.companyId)
      });

      if (!statusExists) {
        throw new Error('Invalid lead status');
      }

      const historyEntry = new LeadHistory({
        followupDate: data.followupDate,
        comment: data.comment,
        commentedBy: new mongoose.Types.ObjectId(data.commentedBy),
        companyId: new mongoose.Types.ObjectId(data.companyId),
        leadId: new mongoose.Types.ObjectId(data.leadId),
        status: new mongoose.Types.ObjectId(data.status)
      });
      await historyEntry.save();

      // Get the created entry with populated fields
      const formattedEntry = await LeadHistory.findById(historyEntry._id)
        .populate('commentedBy', 'name')
        .populate('status', 'name')
        .lean();

      if (!formattedEntry) {
        throw new Error('Failed to retrieve created history entry');
      }

      // Format the response
      return { 
        COMMENTED_BY: formattedEntry.commentedBy.name,
        DATE: formattedEntry.date,
        STATUS: formattedEntry.status.name,
        FOLLOWUP_DATE: formattedEntry.followupDate,
        COMMENT: formattedEntry.comment
      };

    } catch (error) {
      console.error('Add lead history error:', error);
      throw new Error('Failed to add lead history');
    }
  }
};

module.exports = { leadHistoryController };