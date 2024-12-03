const productServiceModel = require('./productService.model');


exports.createProductService = async ({ name, setupFee, price }, user) => {
  try {
    if (!user?._id || !user?.companyId) {
      throw new Error('Invalid user data');
    }
    // Check for duplicate name
    const existingProduct = await productServiceModel.findOne({
      name,
      companyId: user.companyId
    });
    if (existingProduct) {
      throw new Error('Product/Service name already exists for this company');
    }
    // Get max order for the company
    const maxOrder = await productServiceModel.findOne({
      companyId: user.companyId
    })
    .sort('-order')
    .lean();
    // Create new product service
    return productServiceModel.create({
      name,
      setupFee,
      price,
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
  
      return productServiceModel.find({
        companyId: user.companyId,
        deleted: false
      })
      .sort('order')
      .lean();
  
    } catch (error) {
      return Promise.reject(error);
    }
  };

exports.updateProductService = async (contentId, { name, setupFee, price }, user) => {
    try {
      // Check if product exists and belongs to the company
      const existingProduct = await productServiceModel.findOne({
        _id: contentId,
        companyId: user.companyId,
        deleted: false
      });
  
      if (!existingProduct) {
        throw new Error('Product/Service not found');
      }
  
      // Check for duplicate name if name is being updated
      if (name && name !== existingProduct.name) {
        const duplicateProduct = await productServiceModel.findOne({
          name,
          companyId: user.companyId,
          _id: { $ne: contentId },
          deleted: false
        });
  
        if (duplicateProduct) {
          throw new Error('Product/Service name already exists for this company');
        }
      }
  
      // Update the product
      return productServiceModel.findByIdAndUpdate(
        contentId,  // Fixed: removed _id: syntax
        {
          $set: {
            ...(name && { name }),
            ...(setupFee !== undefined && { setupFee }),
            ...(price !== undefined && { price }),
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


exports.toggleProductService = async (contentId, user) => {
    try {
      // Check if product exists and belongs to company
      const currentDoc = await productServiceModel.findOne({
        _id: contentId,
        companyId: user.companyId,
        deleted: false
      });
  
      if (!currentDoc) {
        throw new Error('Product/Service not found');
      }
  
      // Toggle active status
      return productServiceModel.findByIdAndUpdate(
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

