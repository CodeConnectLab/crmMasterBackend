const leadStatusModel = require('./leadStatus.model');
const notificationModel= require('../notificationSetting/notificationSetting.model');

exports.createLeadStatus = async ({  name, color }, user) => {
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
    const leadStatus = await leadStatusModel.create({
      name,
      color,
      companyId: user.companyId,
      order: maxOrder ? maxOrder.order + 1 : 1,
      createdBy: user._id,
      isActive: true
    });
// Create notification settings for the new status
await notificationModel.create({
  statusId: leadStatus._id,
  companyId: user.companyId,
  createdBy: user._id,
  isEnabled: false,
  useFollowUpTime: true,
  notificationCustomTime: [
    { time: "09:00", isEnabled: false }
  ],    
  recipients: {
    admin: false,
    teamLead: false,
    regularUser: true
  },
  titleTemplate: `${name}: {title}`,
  bodyTemplate: `Your ${name.toLowerCase()} {title} is scheduled for {time}.`
});
return leadStatus;
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
        //deleted: false
      })
      .sort('order')
      .lean();
  
    } catch (error) {
      return Promise.reject(error);
    }
  };

exports.updateLeadStatus1 = async (contentId, { showFollowUp,showOutSourced,showImported,showDashboard,sendNotification, wonStatus, lossStatus, name, color }, user) => {
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


        // Create update object
    const updateFields = {
      ...(name && { name }),
      ...(color && { color }),
      ...(typeof wonStatus !== 'undefined' && { wonStatus }),
      ...(typeof lossStatus !== 'undefined' && { lossStatus }),
      // Handle sendNotification explicitly since it can be false
      ...(typeof sendNotification !== 'undefined' && { sendNotification }),
      ...(typeof showFollowUp !== 'undefined' && { showFollowUp }),
      ...(typeof showImported !== 'undefined' && { showImported }),
      ...(typeof showOutSourced !== 'undefined' && { showOutSourced }),
      ...(typeof showDashboard !== 'undefined' && { showDashboard }),
      updatedBy: user._id
    };

    // Update the product
    return leadStatusModel.findByIdAndUpdate(
      contentId,
      {
        $set: updateFields
      },
      {
        new: true,
        runValidators: true
      }
    ).lean();
  
      // Update the product
      // return leadStatusModel.findByIdAndUpdate(
      //   contentId,  // Fixed: removed _id: syntax
      //   {
      //     $set: {
      //       ...(name && { name }),
      //       ...(color && { color }),
      //       ...(sendNotification && { sendNotification }),
      //       ...(wonStatus && { wonStatus }),
      //       ...(lossStatus && { lossStatus }),
      //       updatedBy: user._id
      //     }
      //   },
      //   {
      //     new: true,
      //     runValidators: true
      //   }
      // ).lean();
    } catch (error) {
      return Promise.reject(error);
    }
  };


  exports.updateLeadStatus = async (contentId, { showFollowUp, showImported, showOutSourced, showDashboard, sendNotification, wonStatus, lossStatus, name, color }, user) => {
    try {
      // Start a transaction
      const session = await leadStatusModel.startSession();
      session.startTransaction();
  
      try {
        // Check if product exists and belongs to the company
        const existingProduct = await leadStatusModel.findOne({
          _id: contentId,
          companyId: user.companyId,
          deleted: false
        }).session(session);
  
        if (!existingProduct) {
          throw new Error('Lead Status not found');
        }
  
        // Check for duplicate name if name is being updated
        if (name && name !== existingProduct.name) {
          const duplicateProduct = await leadStatusModel.findOne({
            name,
            companyId: user.companyId,
            _id: { $ne: contentId }, //// not take this id
            deleted: false
          }).session(session);
  
          if (duplicateProduct) {
            throw new Error('Lead Status name already exists for this company');
          }
        }
  
        // If wonStatus is being set to true, set all other wonStatus to false for the same company
        if (wonStatus === true) {
          await leadStatusModel.updateMany(
            {
              companyId: user.companyId,
              _id: { $ne: contentId },   //// not take this id
              wonStatus: true,
              deleted: false
            },
            {
              $set: { wonStatus: false }
            }
          ).session(session);
        }
  
        // If lossStatus is being set to true, set all other lossStatus to false for the same company
        if (lossStatus === true) {
          await leadStatusModel.updateMany(
            {
              companyId: user.companyId,
              _id: { $ne: contentId },  //// not take this id
              lossStatus: true,
              deleted: false
            },
            {
              $set: { lossStatus: false }
            }
          ).session(session);
        }
  
        // Create update object
        const updateFields = {
          ...(name && { name }),
          ...(color && { color }),
          ...(typeof wonStatus !== 'undefined' && { wonStatus }),
          ...(typeof lossStatus !== 'undefined' && { lossStatus }),
          ...(typeof sendNotification !== 'undefined' && { sendNotification }),
          ...(typeof showFollowUp !== 'undefined' && { showFollowUp }),
          ...(typeof showImported !== 'undefined' && { showImported }),
          ...(typeof showOutSourced !== 'undefined' && { showOutSourced }),
          ...(typeof showDashboard !== 'undefined' && { showDashboard }),
          updatedBy: user._id
        };
  
        // Update the product
        const updatedStatus = await leadStatusModel.findByIdAndUpdate(
          contentId,
          {
            $set: updateFields
          },
          {
            new: true,
            runValidators: true,
            session
          }
        ).lean();


        // Check if notification settings exist for this status
      const existingNotification = await notificationModel.findOne({
        statusId: contentId,
        companyId: user.companyId
      }).session(session);

      // If notification settings don't exist, create them
      if (!existingNotification) {
        await notificationModel.create([{
          statusId: contentId,
          companyId: user.companyId,
          createdBy: user._id,
          isEnabled: false,
          useFollowUpTime: true,
          notificationCustomTime: [
            { time: "09:00", isEnabled: false }
          ],
          recipients: {
            admin: false,
            teamLead: false,
            regularUser: true
          },
          titleTemplate: `${updatedStatus.name}: {title}`,
          bodyTemplate: `Your ${updatedStatus.name.toLowerCase()} {title} is scheduled for {time}.`
        }], { session });
      }

  
        // Commit the transaction
        await session.commitTransaction();
        return updatedStatus;
      } catch (error) {
        // If an error occurred, abort the transaction
        await session.abortTransaction();
        throw error;
      } finally {
        // End the session
        session.endSession();
      }
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
        //deleted: false
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
            deleted: !currentDoc.deleted,
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

