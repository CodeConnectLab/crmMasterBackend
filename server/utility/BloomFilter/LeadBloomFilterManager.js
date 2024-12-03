// const BloomFilter = require('./BloomFilter');
// const Lead = require('../../api/lead/lead.model');  // Updated path

// class LeadBloomFilterManager {
//   constructor() {
//     this.filters = new Map();
//   }

//   static getInstance() {
//     if (!LeadBloomFilterManager.instance) {
//       LeadBloomFilterManager.instance = new LeadBloomFilterManager();
//     }
//     return LeadBloomFilterManager.instance;
//   }

//   async initializeFilter(companyId) {
//     if (!this.filters.has(companyId)) {
//       const filter = new BloomFilter();
      
//       const existingLeads = await Lead.find(
//         { companyId },
//         { contactNumber: 1 }
//       ).lean();
      
//       existingLeads.forEach(lead => {
//         if (lead.contactNumber) {
//           filter.add(`${companyId}:${lead.contactNumber}`);
//         }
//       });
      
//       this.filters.set(companyId, filter);
//     }
//   }

//   async mightHaveDuplicate(companyId, contactNumber) {
//     await this.initializeFilter(companyId);
//     const filter = this.filters.get(companyId);
//     if (!filter) return false;
//     return filter.mightContain(`${companyId}:${contactNumber}`);
//   }

//   addContactNumber(companyId, contactNumber) {
//     const filter = this.filters.get(companyId);
//     if (filter) {
//       filter.add(`${companyId}:${contactNumber}`);
//     }
//   }

//   clearFilter(companyId) {
//     const filter = this.filters.get(companyId);
//     if (filter) {
//       filter.clear();
//     }
//   }
// }

// module.exports = LeadBloomFilterManager;


const BloomFilter = require('./BloomFilter');
const Lead = require('../../api/lead/lead.model');

class LeadBloomFilterManager {
  constructor() {
    this.filters = new Map();
  }

  static getInstance() {
    if (!LeadBloomFilterManager.instance) {
      LeadBloomFilterManager.instance = new LeadBloomFilterManager();
    }
    return LeadBloomFilterManager.instance;
  }

  async initializeFilter(companyId) {
    if (!this.filters.has(companyId)) {
      const filter = new BloomFilter();
      
      const existingLeads = await Lead.find(
        { companyId },
        { contactNumber: 1 }
      );
      
      existingLeads.forEach(lead => {
        if (lead.contactNumber) {
          filter.add(`${companyId}:${lead.contactNumber}`);
        }
      });

      this.filters.set(companyId, filter);
    }
  }

  async mightHaveDuplicate(companyId, contactNumber) {
    await this.initializeFilter(companyId);
    const filter = this.filters.get(companyId);
    if (!filter) return false;
    return filter.mightContain(`${companyId}:${contactNumber}`);
  }

  addContactNumber(companyId, contactNumber) {
    const filter = this.filters.get(companyId);
    if (filter) {
      filter.add(`${companyId}:${contactNumber}`);
    }
  }

  clearFilter(companyId) {
    const filter = this.filters.get(companyId);
    if (filter) {
      filter.clear();
    }
  }
}

// Create single instance
LeadBloomFilterManager.instance = null;

module.exports = LeadBloomFilterManager;