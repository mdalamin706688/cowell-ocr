/** Public Cognito SPA settings (no client secret). */

export const COGNITO_SUPER_ADMIN_GROUP = "super_admin";

export function getCognitoRegion(): string {
  return (process.env.NEXT_PUBLIC_COGNITO_REGION || "ap-northeast-1").trim();
}

export function getCognitoUserPoolId(): string {
  return (process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "").trim();
}

export function getCognitoClientId(): string {
  return (process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "").trim();
}

/** Identity Pool — required for ListUsers / AdminCreateUser / AdminDeleteUser from the browser */
export function getCognitoIdentityPoolId(): string {
  return (process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID || "").trim();
}

export function isCognitoConfigured(): boolean {
  return Boolean(getCognitoUserPoolId() && getCognitoClientId());
}

/** Admin user APIs need Identity Pool + IAM roles on the authenticated role */
export function isCognitoAdminConfigured(): boolean {
  return isCognitoConfigured() && Boolean(getCognitoIdentityPoolId());
}

export function cognitoIdpEndpoint(): string {
  return `https://cognito-idp.${getCognitoRegion()}.amazonaws.com/`;
}

/** Login provider key for Identity Pool `logins` map */
export function cognitoUserPoolProviderName(): string {
  return `cognito-idp.${getCognitoRegion()}.amazonaws.com/${getCognitoUserPoolId()}`;
}
