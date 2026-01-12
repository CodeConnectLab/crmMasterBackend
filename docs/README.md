# Facebook Integration Documentation

This directory contains comprehensive documentation for the Facebook Lead Generation integration system.

## Documentation Files

### 📘 [Backend Documentation](./FACEBOOK_INTEGRATION_BACKEND.md)
Complete guide for backend developers covering:
- System architecture and flow
- API endpoints and request/response formats
- Models and data structures
- Token exchange process
- Webhook handling
- Error handling and troubleshooting

### 🎨 [Frontend Documentation](./FACEBOOK_INTEGRATION_FRONTEND.md)
Complete guide for frontend developers covering:
- Step-by-step implementation guide
- React component examples
- API integration code
- UI/UX best practices
- Error handling
- Security considerations

## Quick Start

1. **Backend Setup**: Review [Backend Documentation](./FACEBOOK_INTEGRATION_BACKEND.md) to understand the API
2. **Frontend Implementation**: Follow [Frontend Documentation](./FACEBOOK_INTEGRATION_FRONTEND.md) to integrate in your app
3. **Facebook App Setup**: Configure your Facebook App with required permissions
4. **Test Integration**: Use the provided examples to test the flow

## Integration Flow Summary

```
Frontend                    Backend                    Facebook
   │                           │                           │
   ├─ OAuth ───────────────────┼──────────────────────────>│
   │<─ Token ──────────────────┼───────────────────────────┤
   │                           │                           │
   ├─ Create Simple Account ───>│                           │
   │<─ Account ID ─────────────┤                           │
   │                           │                           │
   ├─ Process Account ──────────>│                           │
   │                           ├─ Exchange Token ───────────>│
   │                           ├─ Get Pages ────────────────>│
   │                           ├─ Subscribe Webhook ────────>│
   │<─ Success ────────────────┤                           │
   │                           │                           │
   │                           │<─ Lead Event ──────────────┤
   │                           ├─ Fetch Lead Details ───────>│
   │                           ├─ Save Lead ────────────────┤
   │                           │                           │
```

## Key Features

✅ Automatic token exchange (short-lived → long-lived)  
✅ Automatic page discovery  
✅ Automatic webhook subscription  
✅ Automatic lead processing  
✅ Duplicate lead prevention  
✅ Comprehensive error handling  

## Support

For questions or issues:
1. Check the relevant documentation file
2. Review error logs
3. Verify Facebook App configuration
4. Test API endpoints independently
