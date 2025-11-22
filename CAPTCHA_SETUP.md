# reCAPTCHA Setup Guide

This guide will help you set up Google reCAPTCHA v2 for your Sales Order Manager application to protect against bots and automated attacks.

## Why CAPTCHA?

CAPTCHA protection helps prevent:
- Bot attacks on signup and login forms
- Automated account creation
- Brute force password attempts
- Spam submissions
- DDoS attacks on authentication endpoints

## Step 1: Get reCAPTCHA Keys from Google

1. Go to the [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click on the **"+"** button to create a new site
3. Fill in the registration form:
   - **Label**: Give your site a name (e.g., "Sales Order Manager")
   - **reCAPTCHA type**: Select **"reCAPTCHA v2"** → **"I'm not a robot" Checkbox**
   - **Domains**: Add your domains:
     - For development: `localhost` or `127.0.0.1`
     - For production: Add your production domain (e.g., `yourdomain.com`)
   - **Accept the reCAPTCHA Terms of Service**
4. Click **"Submit"**
5. You'll receive two keys:
   - **Site Key** (public key - used in frontend)
   - **Secret Key** (private key - used in backend)

## Step 2: Configure Backend

1. Navigate to the `backend` directory
2. Copy the example environment file (if you haven't already):
   ```bash
   cp .env.example .env
   ```
3. Open the `.env` file and add your reCAPTCHA secret key:
   ```env
   RECAPTCHA_SECRET_KEY=your-secret-key-from-google-here
   ENVIRONMENT=production
   ```

   **Important Notes:**
   - Replace `your-secret-key-from-google-here` with your actual secret key
   - For development/testing, you can set `ENVIRONMENT=development` to bypass CAPTCHA verification
   - **NEVER commit your `.env` file to version control** (it's already in `.gitignore`)

## Step 3: Configure Frontend

1. Navigate to the `frontend` directory
2. Create a `.env` file (or copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
3. Open the `.env` file and add your reCAPTCHA site key:
   ```env
   VITE_RECAPTCHA_SITE_KEY=your-site-key-from-google-here
   ```

   **Important Notes:**
   - Replace `your-site-key-from-google-here` with your actual site key
   - The `VITE_` prefix is required for Vite to expose the variable to the browser
   - **NEVER commit your `.env` file to version control**

## Step 4: Restart Your Application

After configuring both backend and frontend:

1. **Restart the backend server:**
   ```bash
   cd backend
   # If using uvicorn directly:
   uvicorn app.main:app --reload --port 8000
   ```

2. **Restart the frontend development server:**
   ```bash
   cd frontend
   npm run dev
   ```

## Step 5: Test CAPTCHA

1. Open your application in a browser (usually `http://localhost:5173`)
2. Navigate to the **Signup** or **Login** page
3. You should now see the reCAPTCHA widget with the "I'm not a robot" checkbox
4. Try submitting the form without completing the CAPTCHA - it should show an error
5. Complete the CAPTCHA and submit - the form should work normally

## Development vs Production

### Development Mode
If you want to bypass CAPTCHA during development (not recommended for production):

```env
# backend/.env
ENVIRONMENT=development
```

This will allow signups/logins without CAPTCHA verification.

### Production Mode
For production, always use:

```env
# backend/.env
ENVIRONMENT=production
RECAPTCHA_SECRET_KEY=your-actual-secret-key
```

## Testing with Google's Test Keys

For automated testing, Google provides test keys that always pass/fail:

**Site key (always passes):**
```
6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
```

**Secret key (always passes):**
```
6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
```

These keys are already set as fallbacks in the code but should only be used for testing.

## Troubleshooting

### CAPTCHA widget not showing
- Check that `VITE_RECAPTCHA_SITE_KEY` is set in `frontend/.env`
- Verify the site key is correct
- Check browser console for errors
- Make sure your domain is registered in the reCAPTCHA admin console

### "CAPTCHA verification failed" error
- Verify `RECAPTCHA_SECRET_KEY` is set in `backend/.env`
- Check that the secret key is correct
- Ensure the keys match (site key in frontend, secret key in backend from the same reCAPTCHA site)
- Check backend logs for specific error messages

### CAPTCHA works in development but not production
- Make sure your production domain is added to the reCAPTCHA admin console
- Verify environment variables are set correctly in production
- Check CORS settings if frontend and backend are on different domains

## Security Best Practices

1. **Keep your secret key secret**: Never expose it in frontend code or commit it to version control
2. **Use HTTPS in production**: reCAPTCHA works best over HTTPS
3. **Monitor reCAPTCHA analytics**: Check the reCAPTCHA admin console for suspicious activity
4. **Don't bypass CAPTCHA in production**: Only use development mode for local testing
5. **Rotate keys periodically**: Consider regenerating keys every few months for enhanced security

## Additional Resources

- [Google reCAPTCHA Documentation](https://developers.google.com/recaptcha/docs/display)
- [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [reCAPTCHA Best Practices](https://developers.google.com/recaptcha/docs/verify)

## Support

If you encounter any issues:
1. Check the browser console for frontend errors
2. Check backend logs for verification errors
3. Verify all environment variables are set correctly
4. Ensure your domain is whitelisted in reCAPTCHA admin console
