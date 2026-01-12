# Facebook Integration - Frontend Implementation Guide

## Overview

This guide explains how to implement the Facebook Lead Generation integration in your frontend application. The integration allows users to connect their Facebook accounts and automatically receive leads from Facebook Lead Ads.

## Prerequisites

1. **Facebook App Setup**: You need a Facebook App with:
   - App ID and App Secret
   - OAuth redirect configured
   - Webhook configured (backend handles this)
   - Required permissions: `pages_read_engagement`, `leads_retrieval`, `pages_manage_metadata`

2. **Backend API**: Ensure backend is running and accessible

3. **User Authentication**: User must be authenticated to access these endpoints

## Integration Flow

```
1. User clicks "Connect Facebook"
   ↓
2. Redirect to Facebook OAuth
   ↓
3. User authorizes app
   ↓
4. Receive short-lived access token
   ↓
5. Create Simple Account (POST /api/v1/facebook/simple-account)
   ↓
6. Process Account (POST /api/v1/facebook/process-account/:id)
   ↓
7. Display success/error message
   ↓
8. Show connected accounts list
```

## Step-by-Step Implementation

### Step 1: Facebook OAuth Integration

First, you need to implement Facebook OAuth to get the user access token.

#### Option A: Using Facebook SDK

```javascript
// Install: npm install react-facebook-login
import FacebookLogin from 'react-facebook-login';

const FacebookConnect = () => {
  const responseFacebook = async (response) => {
    if (response.accessToken) {
      // response.accessToken is the short-lived token
      await createSimpleAccount(response.accessToken);
    }
  };

  return (
    <FacebookLogin
      appId="YOUR_FACEBOOK_APP_ID"
      autoLoad={false}
      fields="name,email"
      scope="pages_read_engagement,leads_retrieval,pages_manage_metadata"
      callback={responseFacebook}
      icon="fa-facebook"
    />
  );
};
```

#### Option B: Manual OAuth Flow

```javascript
const initiateFacebookOAuth = () => {
  const appId = 'YOUR_FACEBOOK_APP_ID';
  const redirectUri = encodeURIComponent('https://yourdomain.com/facebook/callback');
  const scope = 'pages_read_engagement,leads_retrieval,pages_manage_metadata';
  
  const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=token`;
  
  window.location.href = url;
};

// In callback page
const handleCallback = () => {
  const urlParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = urlParams.get('access_token');
  
  if (accessToken) {
    createSimpleAccount(accessToken);
  }
};
```

### Step 2: Create Simple Account API Call

```javascript
const API_BASE_URL = 'https://yourdomain.com/api/v1';

const createSimpleAccount = async (userAccessToken) => {
  try {
    const response = await fetch(`${API_BASE_URL}/facebook/simple-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${yourAuthToken}`, // Your JWT token
      },
      body: JSON.stringify({
        accountName: 'My Facebook Account', // User can customize this
        facebookAppId: 'YOUR_FACEBOOK_APP_ID',
        facebookAppSecret: 'YOUR_FACEBOOK_APP_SECRET', // Store securely
        webhookUrl: 'https://yourdomain.com/api/v1/facebook/webhook',
        userAccessToken: userAccessToken, // From OAuth
        // companyId is optional, will use user's company if not provided
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.message);
    }

    // Store the simple account ID
    const simpleAccountId = data.data._id;
    
    // Process the account
    await processAccount(simpleAccountId);
    
    return data.data;
  } catch (error) {
    console.error('Error creating simple account:', error);
    throw error;
  }
};
```

### Step 3: Process Account API Call

```javascript
const processAccount = async (simpleAccountId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/facebook/process-account/${simpleAccountId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${yourAuthToken}`,
        },
      }
    );

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.message);
    }

    console.log('Account processed:', data.data);
    return data.data;
  } catch (error) {
    console.error('Error processing account:', error);
    throw error;
  }
};
```

### Step 4: Complete Integration Component

Here's a complete React component example:

```jsx
import React, { useState, useEffect } from 'react';
import FacebookLogin from 'react-facebook-login';

const FacebookIntegration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [accounts, setAccounts] = useState([]);

  const FACEBOOK_APP_ID = 'YOUR_FACEBOOK_APP_ID';
  const FACEBOOK_APP_SECRET = 'YOUR_FACEBOOK_APP_SECRET'; // Store in env
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://yourdomain.com/api/v1';

  // Get auth token (adjust based on your auth implementation)
  const getAuthToken = () => {
    return localStorage.getItem('authToken');
  };

  const handleFacebookResponse = async (response) => {
    if (!response.accessToken) {
      setError('Failed to get Facebook access token');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Step 1: Create simple account
      const createResponse = await fetch(`${API_BASE_URL}/facebook/simple-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          accountName: `Facebook Account - ${new Date().toLocaleDateString()}`,
          facebookAppId: FACEBOOK_APP_ID,
          facebookAppSecret: FACEBOOK_APP_SECRET,
          webhookUrl: `${window.location.origin}/api/v1/facebook/webhook`,
          userAccessToken: response.accessToken,
        }),
      });

      const createData = await createResponse.json();

      if (createData.error) {
        throw new Error(createData.message);
      }

      // Step 2: Process account
      const processResponse = await fetch(
        `${API_BASE_URL}/facebook/process-account/${createData.data._id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
          },
        }
      );

      const processData = await processResponse.json();

      if (processData.error) {
        throw new Error(processData.message);
      }

      setSuccess(true);
      setError(null);
      
      // Refresh accounts list
      await fetchAccounts();
      
      // Show success message
      alert(`Successfully connected! Processed ${processData.data.accounts.length} account(s).`);
    } catch (err) {
      setError(err.message);
      setSuccess(false);
      console.error('Integration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/facebook/accounts`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      const data = await response.json();
      
      if (!data.error) {
        setAccounts(data.data);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleDisconnect = async (accountId) => {
    if (!window.confirm('Are you sure you want to disconnect this account?')) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/facebook/accounts/${accountId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
          },
        }
      );

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.message);
      }

      await fetchAccounts();
      alert('Account disconnected successfully');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="facebook-integration">
      <h2>Facebook Lead Generation Integration</h2>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          Facebook account connected successfully!
        </div>
      )}

      <div className="connect-section">
        <FacebookLogin
          appId={FACEBOOK_APP_ID}
          autoLoad={false}
          fields="name,email"
          scope="pages_read_engagement,leads_retrieval,pages_manage_metadata"
          callback={handleFacebookResponse}
          disabled={loading}
          icon="fa-facebook"
          textButton="Connect Facebook Account"
          cssClass="btn btn-primary"
        />
        
        {loading && <p>Processing... Please wait.</p>}
      </div>

      <div className="accounts-list">
        <h3>Connected Accounts</h3>
        {accounts.length === 0 ? (
          <p>No Facebook accounts connected yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Page Name</th>
                <th>Status</th>
                <th>Leads Received</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account._id}>
                  <td>{account.accountName}</td>
                  <td>{account.pageName}</td>
                  <td>
                    <span className={`badge ${account.isActive ? 'active' : 'inactive'}`}>
                      {account.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {account.webhookSubscribed && (
                      <span className="badge success">Webhook Subscribed</span>
                    )}
                  </td>
                  <td>{account.totalLeadsReceived || 0}</td>
                  <td>
                    <button
                      onClick={() => handleDisconnect(account._id)}
                      className="btn btn-danger btn-sm"
                    >
                      Disconnect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default FacebookIntegration;
```

## API Reference for Frontend

### Base URL
```
https://yourdomain.com/api/v1
```

### Endpoints

#### 1. Create Simple Account
```http
POST /facebook/simple-account
Authorization: Bearer {token}
Content-Type: application/json

{
  "accountName": "string",
  "facebookAppId": "string",
  "facebookAppSecret": "string",
  "webhookUrl": "string",
  "userAccessToken": "string",
  "verifyToken": "string (optional)",
  "companyId": "string (optional)"
}
```

#### 2. Process Account
```http
POST /facebook/process-account/:id
Authorization: Bearer {token}
```

#### 3. Get Accounts
```http
GET /facebook/accounts?companyId={id}
Authorization: Bearer {token}
```

#### 4. Update Account
```http
PUT /facebook/accounts/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "leadSourceId": "string (optional)",
  "isActive": "boolean (optional)",
  "accountName": "string (optional)",
  "fieldMappings": "object (optional)"
}
```

#### 5. Delete Account
```http
DELETE /facebook/accounts/:id
Authorization: Bearer {token}
```

## Data Structures

### Simple Account Response
```typescript
interface SimpleAccount {
  _id: string;
  companyId: string;
  accountName: string;
  facebookAppId: string;
  webhookUrl: string;
  verifyToken: string;
  processed: boolean;
  processedAt?: string;
  createdAt: string;
}
```

### Facebook Account Response
```typescript
interface FacebookAccount {
  _id: string;
  companyId: string;
  accountName: string;
  pageId: string;
  pageName: string;
  leadFormId: string;
  webhookSubscribed: boolean;
  webhookSubscribedAt?: string;
  isActive: boolean;
  totalLeadsReceived: number;
  lastWebhookReceived?: string;
  leadSourceId?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

## Error Handling

```javascript
const handleApiError = (error, response) => {
  if (response?.data?.error) {
    // Backend returned an error
    return response.data.message || 'An error occurred';
  }
  
  if (error.response) {
    // HTTP error
    switch (error.response.status) {
      case 401:
        return 'Authentication failed. Please login again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'Resource not found.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
  
  if (error.request) {
    // Network error
    return 'Network error. Please check your connection.';
  }
  
  return error.message || 'An unexpected error occurred';
};
```

## UI/UX Best Practices

### 1. Loading States
- Show loading spinner during account processing
- Disable buttons during processing
- Display progress messages

### 2. Error Messages
- Show clear, user-friendly error messages
- Provide actionable steps to resolve errors
- Log technical details for debugging

### 3. Success Feedback
- Show success message after connection
- Display number of accounts processed
- Refresh accounts list automatically

### 4. Account Management
- Show account status clearly (Active/Inactive)
- Display webhook subscription status
- Show lead statistics
- Provide easy disconnect option

## Security Considerations

1. **Store App Secret Securely**
   - Never expose in frontend code
   - Use environment variables
   - Consider storing in backend and passing reference

2. **Token Security**
   - Never log access tokens
   - Store tokens securely if needed
   - Clear tokens after use

3. **HTTPS Only**
   - Always use HTTPS for API calls
   - Ensure webhook URLs use HTTPS

## Testing

### Test Account Creation
```javascript
// Mock Facebook OAuth response
const mockToken = 'test_token_123';
await createSimpleAccount(mockToken);
```

### Test Error Scenarios
- Invalid token
- Network errors
- Server errors
- Duplicate accounts

## Troubleshooting

### OAuth Not Working
- Verify Facebook App ID is correct
- Check redirect URI matches Facebook app settings
- Ensure required permissions are requested

### Account Not Processing
- Check network tab for API errors
- Verify token is valid
- Check backend logs

### Webhook Not Receiving Leads
- Verify webhook URL is accessible
- Check verifyToken matches
- Ensure page is subscribed in Facebook app settings

## Example: Vue.js Implementation

```vue
<template>
  <div class="facebook-integration">
    <button @click="connectFacebook" :disabled="loading">
      {{ loading ? 'Connecting...' : 'Connect Facebook' }}
    </button>
    
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="success" class="success">Connected successfully!</div>
    
    <div v-for="account in accounts" :key="account._id">
      <h4>{{ account.accountName }}</h4>
      <p>Leads: {{ account.totalLeadsReceived }}</p>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      loading: false,
      error: null,
      success: false,
      accounts: []
    };
  },
  methods: {
    async connectFacebook() {
      // Implement Facebook OAuth
      // Then call createSimpleAccount
    },
    async createSimpleAccount(token) {
      // API call implementation
    }
  }
};
</script>
```

## Support

For issues or questions:
1. Check backend logs
2. Verify API endpoints are accessible
3. Test with Postman/curl first
4. Review Facebook App settings
