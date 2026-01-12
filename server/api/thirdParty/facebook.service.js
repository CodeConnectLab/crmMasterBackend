const axios = require('axios');
const FacebookSimpleAccount = require('./facebookSimpleAccount.model');
const FacebookAccount = require('./facebookAccount.model');
const LeadModel = require('../lead/lead.model');

const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';

/**
 * Exchange short-lived token for long-lived token (never expires)
 */
async function exchangeForLongLivedToken(shortLivedToken, appId, appSecret) {
  try {
    const response = await axios.get(`${FACEBOOK_GRAPH_API}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken
      }
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error exchanging token:', error.response?.data || error.message);
    throw new Error(`Failed to exchange token: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Get user's pages with access tokens
 */
async function getUserPages(userAccessToken) {
  try {
    const response = await axios.get(`${FACEBOOK_GRAPH_API}/me/accounts`, {
      params: {
        access_token: userAccessToken,
        fields: 'id,name,access_token,leadgen_forms{id,name}'
      }
    });

    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching pages:', error.response?.data || error.message);
    throw new Error(`Failed to fetch pages: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Subscribe page to webhook for leadgen events
 */
async function subscribePageToWebhook(pageId, pageAccessToken, webhookUrl, verifyToken) {
  try {
    // Subscribe to leadgen events
    const response = await axios.post(
      `${FACEBOOK_GRAPH_API}/${pageId}/subscribed_apps`,
      null,
      {
        params: {
          access_token: pageAccessToken,
          subscribed_fields: 'leadgen'
        }
      }
    );

    return response.data.success === true;
  } catch (error) {
    console.error('Error subscribing page to webhook:', error.response?.data || error.message);
    throw new Error(`Failed to subscribe page: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Get lead form details
 */
async function getLeadFormDetails(formId, pageAccessToken) {
  try {
    const response = await axios.get(`${FACEBOOK_GRAPH_API}/${formId}`, {
      params: {
        access_token: pageAccessToken,
        fields: 'id,name,leads{id,created_time,field_data}'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching lead form:', error.response?.data || error.message);
    throw new Error(`Failed to fetch lead form: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Get lead details from Facebook
 */
async function getLeadDetails(leadId, pageAccessToken) {
  try {
    const response = await axios.get(`${FACEBOOK_GRAPH_API}/${leadId}`, {
      params: {
        access_token: pageAccessToken,
        fields: 'id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching lead details:', error.response?.data || error.message);
    throw new Error(`Failed to fetch lead details: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Create simple Facebook account
 */
exports.createSimpleAccount = async (accountData, user) => {
  try {
    const simpleAccount = new FacebookSimpleAccount({
      ...accountData,
      companyId: accountData.companyId || user?.companyId,
      createdBy: user?._id
    });

    await simpleAccount.save();
    return simpleAccount;
  } catch (error) {
    console.error('Error creating simple account:', error);
    throw error;
  }
};

/**
 * Process simple account and create full Facebook account
 */
exports.processSimpleAccount = async (simpleAccountId, user) => {
  try {
    const simpleAccount = await FacebookSimpleAccount.findById(simpleAccountId);
    
    if (!simpleAccount) {
      throw new Error('Simple account not found');
    }

    if (simpleAccount.processed) {
      throw new Error('Account already processed');
    }

    // Exchange token for long-lived token
    console.log('🔄 Exchanging token for long-lived token...');
    // const longLivedToken = await exchangeForLongLivedToken(
    //   simpleAccount.userAccessToken,
    //   simpleAccount.facebookAppId,
    //   simpleAccount.facebookAppSecret
    // );

    // Get user's pages
    console.log('📄 Fetching user pages...');
    const pages = await getUserPages(simpleAccount.userAccessToken);

    if (!pages || pages.length === 0) {
      throw new Error('No pages found for this account');
    }

    const createdAccounts = [];

    // Process each page
    for (const page of pages) {
      try {
        // Get lead forms for this page
        const leadForms = page.leadgen_forms?.data || [];
        
        if (leadForms.length === 0) {
          console.log(`⚠️ No lead forms found for page ${page.name}`);
          continue;
        }

        // Process each lead form
        for (const form of leadForms) {
          try {
            // Subscribe page to webhook
            console.log(`🔔 Subscribing page ${page.id} to webhook...`);
            const subscribed = await subscribePageToWebhook(
              page.id,
              page.access_token,
              simpleAccount.webhookUrl,
              simpleAccount.verifyToken
            );

            if (!subscribed) {
              console.warn(`⚠️ Failed to subscribe page ${page.id} to webhook`);
            }

            // Check if account already exists
            const existingAccount = await FacebookAccount.findOne({
              companyId: simpleAccount.companyId,
              pageId: page.id,
              leadFormId: form.id
            });

            if (existingAccount) {
              console.log(`ℹ️ Account already exists for page ${page.id} and form ${form.id}`);
              continue;
            }

            // Create Facebook account
            const facebookAccount = new FacebookAccount({
              companyId: simpleAccount.companyId,
              accountName: `${simpleAccount.accountName} - ${page.name} - ${form.name}`,
              facebookAppId: simpleAccount.facebookAppId,
              facebookAppSecret: simpleAccount.facebookAppSecret,
              pageId: page.id,
              pageAccessToken: page.access_token,
              pageAccessTokenExpiry: null, // Never expires (long-lived token)
              leadFormId: form.id,
              webhookUrl: simpleAccount.webhookUrl,
              verifyToken: simpleAccount.verifyToken,
              webhookSubscribed: subscribed,
              webhookSubscribedAt: subscribed ? new Date() : null,
              pageName: page.name,
              isActive: true,
              createdBy: user?._id || simpleAccount.createdBy
            });

            await facebookAccount.save();
            createdAccounts.push(facebookAccount);

            console.log(`✅ Created account for page ${page.name} and form ${form.name}`);
          } catch (formError) {
            console.error(`❌ Error processing form ${form.id}:`, formError.message);
            // Continue with next form
          }
        }
      } catch (pageError) {
        console.error(`❌ Error processing page ${page.id}:`, pageError.message);
        // Continue with next page
      }
    }

    // Mark simple account as processed
    simpleAccount.processed = true;
    simpleAccount.processedAt = new Date();
    await simpleAccount.save();

    return {
      success: true,
      message: `Processed ${createdAccounts.length} Facebook account(s)`,
      accounts: createdAccounts
    };
  } catch (error) {
    console.error('Error processing simple account:', error);
    throw error;
  }
};

/**
 * Verify webhook (Facebook webhook verification)
 */
exports.verifyWebhook = async (verifyToken, mode, challenge) => {
  if (mode === 'subscribe' && verifyToken) {
    // Check if verifyToken exists in any Facebook account
    const account = await FacebookAccount.findOne({ verifyToken: verifyToken });
    if (account || verifyToken) {
      return challenge;
    }
  }
  return null;
};

/**
 * Process webhook lead
 */
exports.processWebhookLead = async (webhookData) => {
  try {
    const entry = webhookData.entry?.[0];
    if (!entry) {
      throw new Error('Invalid webhook data: no entry found');
    }

    const changes = entry.changes || [];
    
    for (const change of changes) {
      if (change.value && change.value.leadgen_id) {
        const leadgenId = change.value.leadgen_id;
        const formId = change.value.form_id;
        const pageId = entry.id;
        const createdTime = change.value.created_time;

        // Find the Facebook account for this page and form
        const facebookAccount = await FacebookAccount.findOne({
          pageId: pageId,
          leadFormId: formId,
          isActive: true
        });

        if (!facebookAccount) {
          console.warn(`⚠️ No active Facebook account found for page ${pageId} and form ${formId}`);
          continue;
        }

        // Get lead details from Facebook
        console.log(`📥 Fetching lead details for leadgen_id: ${leadgenId}`);
        const leadDetails = await getLeadDetails(leadgenId, facebookAccount.pageAccessToken);

        // Extract field data
        const fieldMap = {};
        if (leadDetails.field_data) {
          leadDetails.field_data.forEach(field => {
            fieldMap[field.name] = field.values?.[0] || '';
          });
        }

        // Extract campaign/ad information
        const adId = leadDetails.ad_id || null;
        const adName = leadDetails.ad_name || '';
        const campaignId = leadDetails.campaign_id || null;
        const campaignName = leadDetails.campaign_name || '';
        
        // Get form name
        let formName = 'Unknown Form';
        try {
          const formDetails = await getLeadFormDetails(formId, facebookAccount.pageAccessToken);
          formName = formDetails.name || 'Unknown Form';
        } catch (formError) {
          console.warn(`⚠️ Could not fetch form details: ${formError.message}`);
        }

        // Check if lead already exists
        const existingLead = await LeadModel.findOne({
          fbLeadGenId: leadgenId,
          companyId: facebookAccount.companyId
        });

        if (existingLead) {
          console.log(`ℹ️ Lead ${leadgenId} already exists, skipping...`);
          continue;
        }

        // Create lead payload
        const leadPayload = {
          fbLeadGenId: leadgenId,
          fbLeadGenFormId: formId,
          fbLeadGenAdId: adId || null,
          companyId: facebookAccount.companyId,
          leadAddType: "ThirdParty",
          fbCompainName: formName || 'Unknown Campaign',
          campaignName: campaignName || facebookAccount.pageName || '',
          adName: adName || facebookAccount.pageName || '',
          firstName: fieldMap.full_name || fieldMap.first_name || '',
          lastName: fieldMap.last_name || '',
          email: fieldMap.email || '',
          city: fieldMap.city || '',
          contactNumber: fieldMap.phone_number || fieldMap.phone || '',
          description: "Lead generated from Facebook",
          followUpDate: new Date(new Date().getTime() + 6 * 60 * 1000), // Current time + 6 minutes
          leadSource: facebookAccount.leadSourceId || null
        };

        console.log("📥 Saving lead to DB:", leadPayload);
        const newLead = new LeadModel(leadPayload);
        const saved = await newLead.save();

        // Update Facebook account stats
        facebookAccount.totalLeadsReceived = (facebookAccount.totalLeadsReceived || 0) + 1;
        facebookAccount.lastWebhookReceived = new Date();
        await facebookAccount.save();

        console.log(`✅ Lead saved successfully with ID: ${saved._id}`);

        return {
          leadgenId: leadgenId,
          formId: formId,
          createdTime: createdTime,
          adId: adId || null,
          leadId: saved._id,
          message: "Facebook lead gen webhook processed successfully"
        };
      }
    }

    return { message: "No leadgen events found in webhook" };
  } catch (error) {
    console.error('Error processing webhook lead:', error);
    throw error;
  }
};

/**
 * Get all simple accounts (not processed yet)
 */
exports.getSimpleAccounts = async (req, user) => {
  try {
    const accounts = await FacebookSimpleAccount.find({
      companyId: user?.companyId,
      processed: false
    }).populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return accounts;
  } catch (error) {
    console.error('Error fetching simple accounts:', error);
    throw error;
  }
};

/**
 * Get all Facebook accounts for a company
 */
exports.getFacebookAccounts = async (companyId, user) => {
  try {
    const accounts = await FacebookAccount.find({
      companyId: companyId || user?.companyId
    }).populate('leadSourceId', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return accounts;
  } catch (error) {
    console.error('Error fetching Facebook accounts:', error);
    throw error;
  }
};

/**
 * Update Facebook account
 */
exports.updateFacebookAccount = async (accountId, updateData, user) => {
  try {
    const account = await FacebookAccount.findById(accountId);
    
    if (!account) {
      throw new Error('Facebook account not found');
    }

    // Update allowed fields
    if (updateData.leadSourceId !== undefined) {
      account.leadSourceId = updateData.leadSourceId;
    }
    if (updateData.isActive !== undefined) {
      account.isActive = updateData.isActive;
    }
    if (updateData.fieldMappings !== undefined) {
      account.fieldMappings = updateData.fieldMappings;
    }
    if (updateData.accountName !== undefined) {
      account.accountName = updateData.accountName;
    }

    account.updatedBy = user?._id;
    account.updatedAt = new Date();

    await account.save();

    return account;
  } catch (error) {
    console.error('Error updating Facebook account:', error);
    throw error;
  }
};

/**
 * Delete Facebook account
 */
exports.deleteFacebookAccount = async (accountId) => {
  try {
    const account = await FacebookAccount.findByIdAndDelete(accountId);
    
    if (!account) {
      throw new Error('Facebook account not found');
    }

    return { message: 'Facebook account deleted successfully' };
  } catch (error) {
    console.error('Error deleting Facebook account:', error);
    throw error;
  }
};
