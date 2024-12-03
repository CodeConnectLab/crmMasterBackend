const lostReasonModel = require('./lostReason.model');


exports.createLostReason = async ({ reason }, user) => {
  try {
    if (!user?._id || !user?.companyId) {
      throw new Error('Invalid user data');
    }
    // Check for duplicate name
    const existingProduct = await lostReasonModel.findOne({
      reason,
      companyId: user.companyId
    });
    if (existingProduct) {
      throw new Error('Lost Reason name already exists for this company');
    }
    // Get max order for the company
    const maxOrder = await lostReasonModel.findOne({
      companyId: user.companyId
    })
    .sort('-order')
    .lean();
    // Create new product service
    return lostReasonModel.create({
      reason,
      companyId: user.companyId,
      order: maxOrder ? maxOrder.order + 1 : 1,
      createdBy: user._id,
      isActive: true
    });
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.getAllByCompany = async ({},user) => {
    try {
      if (!user?.companyId) {
        throw new Error('Company ID is required');
      }
  
      return lostReasonModel.find({
        companyId: user.companyId,
        deleted: false
      })
      .sort('order')
      .lean();
  
    } catch (error) {
      return Promise.reject(error);
    }
  };

exports.updateLeadSources = async (contentId, { reason }, user) => {
    try {
      // Check if product exists and belongs to the company
      const existingProduct = await lostReasonModel.findOne({
        _id: contentId,
        companyId: user.companyId,
        deleted: false
      });
  
      if (!existingProduct) {
        throw new Error('Product/Service not found');
      }
  
      // Check for duplicate name if name is being updated
      if (reason && reason !== existingProduct.reason) {
        const duplicateProduct = await lostReasonModel.findOne({
          reason,
          companyId: user.companyId,
          _id: { $ne: contentId },
          deleted: false
        });
  
        if (duplicateProduct) {
          throw new Error('Product/Service name already exists for this company');
        }
      }
  
      // Update the product
      return lostReasonModel.findByIdAndUpdate(
        contentId,  // Fixed: removed _id: syntax
        {
          $set: {
            ...(reason && { reason }),
            updatedBy: user._id
          }
        },
        {
          new: true,
          runValidators: true
        }
      ).lean();
  
    } catch (error) {
      return Promise.reject(error);
    }
  };


exports.toggleLeadSources = async (contentId, user) => {
    try {
      // Check if product exists and belongs to company
      const currentDoc = await lostReasonModel.findOne({
        _id: contentId,
        companyId: user.companyId,
        deleted: false
      });
      if (!currentDoc) {
        throw new Error('Lost Reason not found');
      }
      // Toggle active status
      return lostReasonModel.findByIdAndUpdate(
        contentId,
        {
          $set: {
            isActive: !currentDoc.isActive,
            updatedBy: user._id
          }
        },
        {
          new: true,
          runValidators: true
        }
      ).lean();
    } catch (error) {
      return Promise.reject(error);
    }
  };  

