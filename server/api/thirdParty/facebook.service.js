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
 * Verify token permissions (for debugging)
 */
async function verifyTokenPermissions(accessToken) {
  try {
    console.log('🔍 Checking token permissions...');
    const response = await axios.get(`${FACEBOOK_GRAPH_API}/me/permissions`, {
      params: {
        access_token: accessToken
      }
    });

    const permissions = response.data.data || [];
    const permissionNames = permissions
      .filter(p => p.status === 'granted')
      .map(p => p.permission);

    console.log('📋 Token has permissions:', permissionNames);
    console.log('📋 All permission statuses:', permissions.map(p => `${p.permission}: ${p.status}`));

    const requiredPermissions = ['pages_read_engagement', 'pages_show_list', 'leads_retrieval', 'pages_manage_metadata'];
    const missingPermissions = requiredPermissions.filter(
      perm => !permissionNames.includes(perm)
    );

    if (missingPermissions.length > 0) {
      console.warn('⚠️ Missing permissions:', missingPermissions);
      console.warn('⚠️ Available permissions:', permissionNames);
      // Don't throw error - let the actual API call determine if it's a problem
      return { hasAll: false, missing: missingPermissions, available: permissionNames };
    }

    console.log('✅ All required permissions are granted');
    return { hasAll: true, available: permissionNames };
  } catch (error) {
    console.warn('⚠️ Could not verify permissions:', error.response?.data || error.message);
    // Continue anyway - permissions might be checked at page level
    return { hasAll: false, error: error.message };
  }
}

/**
 * Get user's pages with access tokens
 */
async function getUserPages(userAccessToken) {
  try {
    // Debug: Check permissions first (but don't fail)
    try {
      const permResult = await verifyTokenPermissions(userAccessToken);
      console.log('📋 Permission check result:', permResult);
    } catch (permError) {
      console.warn('⚠️ Permission check warning (continuing anyway):', permError.message);
    }

    // Try to get pages - this is the actual test
    console.log('🔍 Making Facebook API call to /me/accounts...');
    
    // First, try to get basic page list without nested fields
    let response;
    try {
      // Try with minimal fields first
      response = await axios.get(`${FACEBOOK_GRAPH_API}/me/accounts`, {
        params: {
          access_token: userAccessToken,
          fields: 'id,name,access_token'
        }
      });
      console.log('✅ Facebook API response received (basic fields)');
      
      // Now get lead forms for each page separately
      const pages = response.data.data || [];
      console.log(`📄 Found ${pages.length} page(s), fetching lead forms...`);
      
      for (const page of pages) {
        try {
          // Get lead forms for this specific page
          const formsResponse = await axios.get(`${FACEBOOK_GRAPH_API}/${page.id}/leadgen_forms`, {
            params: {
              access_token: page.access_token,
              fields: 'id,name'
            }
          });
          ///page.access_token,  ye token never expires hoga ya nhi kyoki isme user access token hai jo long lived token hai
          ///yes it is long lived token
          page.leadgen_forms = { data: formsResponse.data.data || [] };
          console.log(`  ✅ Page ${page.name}: ${page.leadgen_forms.data.length} lead form(s)`);
        } catch (formError) {
          console.warn(`  ⚠️ Could not fetch lead forms for page ${page.name}:`, formError.response?.data?.error?.message || formError.message);
          page.leadgen_forms = { data: [] };
        }
      }
      
      return pages;
    } catch (error) {
      // If that fails, try alternative approach - get pages via business account
      console.log('⚠️ Direct /me/accounts failed, trying alternative approach...');
      
      // Try to get user's business accounts first
      try {
        const businessResponse = await axios.get(`${FACEBOOK_GRAPH_API}/me/businesses`, {
          params: {
            access_token: userAccessToken,
            fields: 'id,name'
          }
        });
        
        console.log(`📊 Found ${businessResponse.data.data?.length || 0} business account(s)`);
        
        // If we have businesses, try to get pages from them
        if (businessResponse.data.data && businessResponse.data.data.length > 0) {
          // For now, still try /me/accounts but with different error message
          throw new Error('Please ensure you are an admin of at least one Facebook Page. The token has correct permissions but you may not have any pages assigned to your account.');
        }
      } catch (businessError) {
        // Ignore business account errors, continue with original error
      }
      
      throw error; // Re-throw original error
    }
  } catch (error) {
    console.error('❌ Error fetching pages - Full error:', JSON.stringify(error.response?.data || error.message, null, 2));
    
    // Provide more helpful error messages
    if (error.response?.data?.error) {
      const fbError = error.response.data.error;
      console.error('📛 Facebook API Error Details:', {
        code: fbError.code,
        message: fbError.message,
        type: fbError.type,
        error_subcode: fbError.error_subcode
      });
      
      if (fbError.code === 10) {
        // Error 10: Insufficient privileges on the page
        // This means user is not an admin of any pages, even though token has permissions
        throw new Error(
          `You don't have admin access to any Facebook Pages. ` +
          `Error: ${fbError.message || 'Insufficient privileges on the page'}. ` +
          `Solution: Please ensure you are an ADMIN of at least one Facebook Page. ` +
          `Go to your Facebook Page → Settings → Page Roles → and verify you are listed as Admin. ` +
          `Then reconnect your Facebook account.`
        );
      } else if (fbError.code === 190) {
        throw new Error('Access token is invalid or expired. Please reconnect your Facebook account.');
      } else if (fbError.code === 200) {
        throw new Error('Permission denied. Please ensure you have admin access to the pages.');
      } else {
        throw new Error(`Facebook API Error (Code ${fbError.code}): ${fbError.message || 'Unknown error'}`);
      }
    }
    
    throw new Error(`Failed to fetch pages: ${error.message}`);
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

    // Exchange token for long-lived token first
    console.log('🔄 Exchanging token for long-lived token...');
    // const longLivedToken = await exchangeForLongLivedToken(
    //   simpleAccount.userAccessToken,
    //   simpleAccount.facebookAppId,
    //   simpleAccount.facebookAppSecret
    // );

    /////// i already uploaded the long-lived token in the simple account model
    const longLivedToken = simpleAccount.userAccessToken;

    // Get user's pages using long-lived token
    console.log('📄 Fetching user pages...');
    console.log('🔑 Using token (first 20 chars):', longLivedToken.substring(0, 20) + '...');
    
    const pages = await getUserPages(longLivedToken);
    console.log(`✅ Found ${pages.length} page(s)`);

    if (!pages || pages.length === 0) {
      throw new Error('No pages found for this account. Please ensure you are an admin of at least one Facebook page.');
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
  console.log('🔍 Webhook verification request:', { mode, hasToken: !!verifyToken, hasChallenge: !!challenge });
  
  if (mode === 'subscribe' && verifyToken) {
    // Check if verifyToken exists in any Facebook account (simple or full)
    const account = await FacebookAccount.findOne({ verifyToken: verifyToken });
    const simpleAccount = await FacebookSimpleAccount.findOne({ verifyToken: verifyToken });
    
    if (account || simpleAccount) {
      console.log('✅ Webhook verification successful');
      return challenge;
    } else {
      console.warn('⚠️ Webhook verification failed: Token not found in database');
      // Still allow if token matches - might be in another account
      if (verifyToken) {
        console.log('⚠️ Allowing webhook verification (token provided but not found in DB)');
        return challenge;
      }
    }
  }
  console.warn('❌ Webhook verification failed: Invalid mode or token');
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

/**
 * Test Facebook token and permissions (for debugging)
 */
exports.testFacebookToken = async (simpleAccountId) => {
  try {
    const simpleAccount = await FacebookSimpleAccount.findById(simpleAccountId);
    
    if (!simpleAccount) {
      throw new Error('Simple account not found');
    }

    const token = simpleAccount.userAccessToken;
    const results = {
      tokenPreview: token.substring(0, 20) + '...',
      permissions: null,
      pages: null,
      errors: []
    };

    // Test 1: Check permissions
    try {
      const permResult = await verifyTokenPermissions(token);
      results.permissions = permResult;
    } catch (error) {
      results.errors.push(`Permission check failed: ${error.message}`);
    }

    // Test 2: Try to get pages
    try {
      const pages = await getUserPages(token);
      results.pages = {
        count: pages.length,
        pageIds: pages.map(p => p.id),
        pageNames: pages.map(p => p.name)
      };
    } catch (error) {
      results.errors.push(`Get pages failed: ${error.message}`);
      if (error.response?.data?.error) {
        results.facebookError = error.response.data.error;
      }
    }

    return results;
  } catch (error) {
    console.error('Error testing token:', error);
    throw error;
  }
};
