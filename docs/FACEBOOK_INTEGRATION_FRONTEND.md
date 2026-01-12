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
6. Simple Account appears in list with "Connect All Campaigns/Pages" button
   ↓
7. User clicks "Connect All Campaigns/Pages" button
   ↓
8. Process Account (POST /api/v1/facebook/process-account/:id)
   ↓
9. Display success/error message
   ↓
10. Show connected Facebook accounts list (full accounts with pages)
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
const API_BASE_URL = 'https://api.codeconnect.in/api/v1';

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
        webhookUrl: 'https://api.codeconnect.in/api/v1/facebook/webhook',
        userAccessToken: userAccessToken, // From OAuth
        // companyId is optional, will use user's company if not provided
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.message);
    }

    // Simple account created - it will appear in the list
    // User needs to click "Connect All Campaigns/Pages" button to process it
    return data.data;
  } catch (error) {
    console.error('Error creating simple account:', error);
    throw error;
  }
};
```

### Step 3: Get Simple Accounts List

```javascript
const getSimpleAccounts = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/facebook/simple-accounts`, {
      headers: {
        'Authorization': `Bearer ${yourAuthToken}`,
      },
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.message);
    }

    return data.data; // Array of simple accounts
  } catch (error) {
    console.error('Error fetching simple accounts:', error);
    throw error;
  }
};
```

### Step 4: Process Account API Call (Connect All Campaigns/Pages)

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

### Step 5: Complete Integration Component

Here's a complete React component example:

```jsx
import React, { useState, useEffect } from 'react';
import FacebookLogin from 'react-facebook-login';

const FacebookIntegration = () => {
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [simpleAccounts, setSimpleAccounts] = useState([]);
  const [facebookAccounts, setFacebookAccounts] = useState([]);

  const FACEBOOK_APP_ID = 'YOUR_FACEBOOK_APP_ID';
  const FACEBOOK_APP_SECRET = 'YOUR_FACEBOOK_APP_SECRET'; // Store in env
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.codeconnect.in/api/v1';

  // Get auth token (adjust based on your auth implementation)
  const getAuthToken = () => {
    return localStorage.getItem('authToken');
  };

  // Step 1: Handle Facebook OAuth Response and Create Simple Account
  const handleFacebookResponse = async (response) => {
    if (!response.accessToken) {
      setError('Failed to get Facebook access token');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Create simple account
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
          webhookUrl: 'https://api.codeconnect.in/api/v1/facebook/webhook',
          userAccessToken: response.accessToken,
        }),
      });

      const createData = await createResponse.json();

      if (createData.error) {
        throw new Error(createData.message);
      }

      setSuccess(true);
      setError(null);
      
      // Refresh simple accounts list
      await fetchSimpleAccounts();
      
      alert('Facebook account added! Now click "Connect All Campaigns/Pages" to process it.');
    } catch (err) {
      setError(err.message);
      setSuccess(false);
      console.error('Integration error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Fetch Simple Accounts (Not Processed Yet)
  const fetchSimpleAccounts = async () => {
    try {
      // Note: You may need to create this endpoint or filter in your backend
      // For now, assuming you'll filter by processed: false
      const response = await fetch(`${API_BASE_URL}/facebook/simple-accounts`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      const data = await response.json();
      
      if (!data.error) {
        // Filter only unprocessed accounts
        const unprocessed = data.data.filter(acc => !acc.processed);
        setSimpleAccounts(unprocessed);
      }
    } catch (err) {
      console.error('Error fetching simple accounts:', err);
    }
  };

  // Step 3: Process Simple Account (Connect All Campaigns/Pages)
  const handleProcessAccount = async (simpleAccountId) => {
    if (!window.confirm('This will connect all your Facebook pages and campaigns. Continue?')) {
      return;
    }

    setProcessingId(simpleAccountId);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/facebook/process-account/${simpleAccountId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
          },
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.message);
      }

      alert(`Successfully connected! Processed ${data.data.accounts.length} Facebook account(s).`);
      
      // Refresh both lists
      await fetchSimpleAccounts();
      await fetchFacebookAccounts();
    } catch (err) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  // Step 4: Fetch Processed Facebook Accounts
  const fetchFacebookAccounts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/facebook/accounts`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      const data = await response.json();
      
      if (!data.error) {
        setFacebookAccounts(data.data);
      }
    } catch (err) {
      console.error('Error fetching Facebook accounts:', err);
    }
  };

  useEffect(() => {
    fetchSimpleAccounts();
    fetchFacebookAccounts();
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

      await fetchFacebookAccounts();
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
          Facebook account added! Click "Connect All Campaigns/Pages" to process it.
        </div>
      )}

      {/* Step 1: Connect Facebook Button */}
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
        
        {loading && <p>Adding account... Please wait.</p>}
      </div>

      {/* Step 2: Simple Accounts List (Not Processed) */}
      <div className="simple-accounts-list">
        <h3>Pending Accounts (Click to Connect All Campaigns/Pages)</h3>
        {simpleAccounts.length === 0 ? (
          <p>No pending accounts. Connect a Facebook account above.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Account Name</th>
                <th>App ID</th>
                <th>Created At</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {simpleAccounts.map((account) => (
                <tr key={account._id}>
                  <td>{account.accountName}</td>
                  <td>{account.facebookAppId}</td>
                  <td>{new Date(account.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className="badge warning">Pending</span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleProcessAccount(account._id)}
                      disabled={processingId === account._id}
                      className="btn btn-success btn-sm"
                    >
                      {processingId === account._id ? 'Processing...' : 'Connect All Campaigns/Pages'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Step 3: Connected Facebook Accounts List (Processed) */}
      <div className="facebook-accounts-list">
        <h3>Connected Accounts</h3>
        {facebookAccounts.length === 0 ? (
          <p>No Facebook accounts connected yet. Process a pending account above.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Page Name</th>
                <th>Status</th>
                <th>Leads Received</th>
                <th>Last Lead</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {facebookAccounts.map((account) => (
                <tr key={account._id}>
                  <td>{account.accountName}</td>
                  <td>{account.pageName || 'N/A'}</td>
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
                    {account.lastWebhookReceived 
                      ? new Date(account.lastWebhookReceived).toLocaleDateString()
                      : 'Never'}
                  </td>
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

#### 3. Get Simple Accounts (Pending Processing)
```http
GET /facebook/simple-accounts?companyId={id}
Authorization: Bearer {token}
```

#### 4. Get Facebook Accounts (Processed)
```http
GET /facebook/accounts?companyId={id}
Authorization: Bearer {token}
```

#### 5. Update Account
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

#### 6. Delete Account
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
