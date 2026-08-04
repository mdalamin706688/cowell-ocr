# AWS Cognito (frontend email/password login + user admin)

## What FE needs

| Env | Example |
|-----|---------|
| `NEXT_PUBLIC_COGNITO_REGION` | `ap-northeast-1` (Tokyo) |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | `ap-northeast-1_xxxxx` |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | app client id (public, no secret) |
| `NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID` | `ap-northeast-1:xxxx` (for user list / add / delete) |

Current Tokyo pool (FE):

- Region: `ap-northeast-1`
- User Pool ID: `ap-northeast-1_PSwT62Lds`
- App Client ID: `2frh9fsa5srig3jed2v4seh45a`

## App client setting (required)

User pool → App integration → App client → **Edit** → Authentication flows:

- Enable **`ALLOW_USER_PASSWORD_AUTH`**
- Keep **`ALLOW_REFRESH_TOKEN_AUTH`**
- Enable **Forgot password** (if shown)

Without `USER_PASSWORD_AUTH`, the custom login form cannot sign in.

## User groups (roles)

Create groups in the User Pool:

| Group | Purpose |
|-------|---------|
| `users` | Default group for new accounts |
| `super_admin` | Can delete users (e.g. `admin@cowell.co.jp`) |

Add the first super admin manually in Cognito → Users → Add to group `super_admin`.

The FE reads `cognito:groups` from the id token to show/hide delete.

## Identity Pool (user admin from browser)

User **list / add / delete** use Cognito Admin APIs. The browser gets **temporary AWS credentials** via an Identity Pool (no long-lived access keys in the FE).

### Setup steps

1. **Cognito → Identity pools → Create identity pool**
2. Authenticated identities → link your **User pool** + **App client**
3. Create IAM role for authenticated users
4. Attach a policy like:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:ListUsers",
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminAddUserToGroup"
      ],
      "Resource": "arn:aws:cognito-idp:ap-northeast-1:ACCOUNT_ID:userpool/ap-northeast-1_PSwT62Lds"
    }
  ]
}
```

5. For **super_admin** only, use a separate role (group role mapping) that also allows:

```json
"cognito-idp:AdminDeleteUser"
```

6. Copy **Identity pool ID** → `NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID`

### FE behaviour

| Feature | API | Who |
|---------|-----|-----|
| Login / logout | InitiateAuth, GlobalSignOut | All |
| Forgot / change password | ForgotPassword, ChangePassword | All |
| User list / add | ListUsers, AdminCreateUser | All authenticated (IAM) |
| Delete user | AdminDeleteUser | `super_admin` group only (IAM + UI) |

## GitHub Actions (CloudFront deploy)

Add repository secrets:

- `NEXT_PUBLIC_COGNITO_REGION`
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- `NEXT_PUBLIC_COGNITO_CLIENT_ID`
- `NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID`

## Behaviour

- If Cognito env is set → real email/password login (CloudFront included)
- If Cognito env is empty on static preview → demo login fallback
- Tokens stored in `localStorage`; session cookie kept for routing
- Access/ID token refresh cadence: **15 minutes** (FE refreshes when &lt;60s left)
- Cognito app client should set **Access token** and **ID token** validity to **15 minutes** (User pool → App client → App client information). Refresh token stays longer (AWS minimum 1 hour; typically days).
- `getCognitoAccessToken()` used by remote OCR (`Authorization: Bearer <accessToken>`)
- **Users page** (`/users/`) — list, add, change password; delete for super admin

## Create a test user

Cognito → Users → Create user → email + temporary password.  
First login may ask to set a new password (handled in the login UI).

Or use **Users** page in the app after Identity Pool is configured.
