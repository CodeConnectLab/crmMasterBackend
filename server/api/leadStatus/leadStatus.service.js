const leadStatusModel = require('./leadStatus.model');


exports.createLeadStatus = async ({ displayName, name, color }, user) => {
  try {
    if (!user?._id || !user?.companyId) {
      throw new Error('Invalid user data');
    }
    // Check for duplicate name
    const existingProduct = await leadStatusModel.findOne({
      name,
      companyId: user.companyId
    });
    if (existingProduct) {
      throw new Error('Lead Status name already exists for this company');
    }
    // Get max order for the company
    const maxOrder = await leadStatusModel.findOne({
      companyId: user.companyId
    })
    .sort('-order')
    .lean();
    // Create new product service
    return leadStatusModel.create({
      name,
      displayName,
      color,
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
  
      return leadStatusModel.find({
        companyId: user.companyId,
        deleted: false
      })
      .sort('order')
      .lean();
  
    } catch (error) {
      return Promise.reject(error);
    }
  };

exports.updateLeadStatus = async (contentId, { displayName, name, color }, user) => {
    try {
      // Check if product exists and belongs to the company
      const existingProduct = await leadStatusModel.findOne({
        _id: contentId,
        companyId: user.companyId,
        deleted: false
      });
  
      if (!existingProduct) {
        throw new Error('Lead Status not found');
      }
  
      // Check for duplicate name if name is being updated
      if (name && name !== existingProduct.name) {
        const duplicateProduct = await leadStatusModel.findOne({
          name,
          companyId: user.companyId,
          _id: { $ne: contentId },
          deleted: false
        });
  
        if (duplicateProduct) {
          throw new Error('Lead Status name already exists for this company');
        }
      }
  
      // Update the product
      return leadStatusModel.findByIdAndUpdate(
        contentId,  // Fixed: removed _id: syntax
        {
          $set: {
            ...(name && { name }),
            ...(displayName && { displayName }),
            ...(color && { color }),
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


exports.toggleLeadStatus = async (contentId, user) => {
    try {
      // Check if product exists and belongs to company
      const currentDoc = await leadStatusModel.findOne({
        _id: contentId,
        companyId: user.companyId,
        deleted: false
      });
  
      if (!currentDoc) {
        throw new Error('Lead Status not found');
      }
  
      // Toggle active status
      return leadStatusModel.findByIdAndUpdate(
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

