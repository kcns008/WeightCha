# WeightCha Demo - Vercel Deployment Guide

This guide will help you deploy the WeightCha demo site to Vercel at https://demo.weightcha.com

## 📁 Project Structure for Vercel

```
WeightCha/
├── api/
│   ├── index.js          # Serverless function for API endpoints
│   └── package.json      # API dependencies
├── demo/
│   ├── index.html        # Main demo page (will be served as root)
│   └── *.html           # Other demo pages
├── vercel.json           # Vercel configuration
└── README-VERCEL.md     # This file
```

## 🚀 Manual Steps for Vercel Deployment

### 1. **Import Repository to Vercel**
1. Go to [https://vercel.com](https://vercel.com)
2. Click "Import Project" or "New Project"
3. Import from GitHub: `https://github.com/kcns008/WeightCha`
4. Select the repository when it appears

### 2. **Configure Project Settings**
When importing, configure these settings:

**Framework Preset:** Other (or None)
**Root Directory:** `/` (leave as default)
**Build Command:** Leave empty
**Output Directory:** Leave empty
**Install Command:** Leave empty

### 3. **Environment Variables** (Optional)
No environment variables are required for the demo, but you can add these for enhanced functionality:

```
NODE_ENV=production
VERCEL_URL=demo.weightcha.com
```

### 4. **Custom Domain Setup**
1. In Vercel Dashboard → Your Project → Settings → Domains
2. Add custom domain: `demo.weightcha.com`
3. Configure DNS with your domain provider:
   - Add CNAME record: `demo` → `cname.vercel-dns.com`
   - Or follow Vercel's DNS configuration instructions

### 5. **Deploy**
1. Click "Deploy" 
2. Wait for deployment to complete
3. Your demo will be available at the provided Vercel URL

## 🔧 Technical Configuration

### **vercel.json Configuration**
The project includes a `vercel.json` file with:
- Serverless function routing for `/api/*` endpoints
- Static file serving for demo pages
- Proper build configuration

### **API Endpoints Available**
- `GET /api/health` - Health check
- `GET /api/weightcha/config` - WeightCha configuration
- `POST /api/contact` - Contact form submission

### **Demo Features**
- ✅ Trackpad pressure simulation
- ✅ Contact form with validation
- ✅ Rate limiting (5 submissions per 15 minutes per IP)
- ✅ Human verification workflow
- ✅ Responsive design
- ✅ Professional UI/UX

## 🎯 What Works in Demo Mode

1. **Pressure Detection Simulation**: Uses mouse/touch events to simulate pressure
2. **Human Pattern Analysis**: Analyzes timing and pressure variations
3. **Form Validation**: Full client and server-side validation
4. **Rate Limiting**: Prevents spam submissions
5. **Success/Error Handling**: Proper user feedback

## 🚨 Important Notes

### **Demo Limitations**
- No actual emails are sent (demo mode only)
- No database storage (submissions are logged to console)
- Uses in-memory rate limiting (resets on function cold starts)
- Simplified WeightCha validation (production would use real API)

### **For Production Use**
To convert this to a real production site:
1. Replace demo WeightCha validation with real API calls
2. Add database storage for form submissions
3. Configure email sending (SMTP settings)
4. Use Redis for proper rate limiting
5. Add proper error monitoring

## 🔍 Testing Your Deployment

### **Test the Demo**
1. Visit your deployed URL
2. Fill out the contact form
3. Complete the pressure verification by clicking and holding
4. Submit the form
5. Check Vercel Function logs for submission data

### **Test API Endpoints**
```bash
# Health check
curl https://demo.weightcha.com/api/health

# WeightCha config
curl https://demo.weightcha.com/api/weightcha/config

# Contact form (with valid data)
curl -X POST https://demo.weightcha.com/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "message": "This is a test message from the API",
    "weightchaToken": "demo_token_12345"
  }'
```

## 📊 Monitoring

### **Vercel Analytics**
- Function execution logs in Vercel Dashboard
- Performance metrics automatically tracked
- Error rates and response times monitored

### **Custom Logging**
All form submissions are logged with:
- Timestamp
- User information (name, email)
- IP address
- Verification status
- User agent

## 🔄 Updating the Demo

To update the demo after changes:
1. Push changes to the GitHub repository
2. Vercel will automatically deploy the changes
3. Monitor the deployment in Vercel Dashboard

## 🆘 Troubleshooting

### **Common Issues**

**Build Fails:**
- Check that `api/package.json` exists
- Verify `vercel.json` syntax is valid

**API Endpoints Don't Work:**
- Ensure `api/index.js` exports the handler function
- Check function logs in Vercel Dashboard

**Static Files Not Loading:**
- Verify files are in the `demo/` directory
- Check routing configuration in `vercel.json`

**Rate Limiting Too Aggressive:**
- Modify rate limits in `api/index.js`
- Consider using Redis for production

### **Getting Help**
- Check Vercel Function logs for errors
- Review Network tab in browser dev tools
- Test API endpoints directly with curl
- Monitor deployment logs in Vercel Dashboard

## 🎉 Success!

Once deployed, you'll have a fully functional WeightCha demo at `https://demo.weightcha.com` that showcases:

- Next-generation human verification
- Seamless user experience
- Professional design and functionality
- Real-time pressure pattern analysis
- Production-ready architecture (in demo mode)

The demo effectively demonstrates WeightCha's capabilities and provides a great starting point for potential users to evaluate the technology.
