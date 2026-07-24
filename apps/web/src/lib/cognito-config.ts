/** Public Cognito SPA settings (no client secret). */

export function getCognitoRegion(): string {
  return (process.env.NEXT_PUBLIC_COGNITO_REGION || "ap-south-1").trim();
}

export function getCognitoUserPoolId(): string {
  return (process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "").trim();
}

export function getCognitoClientId(): string {
  return (process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "").trim();
}

export function isCognitoConfigured(): boolean {
  return Boolean(getCognitoUserPoolId() && getCognitoClientId());
}

export function cognitoIdpEndpoint(): string {
  return `https://cognito-idp.${getCognitoRegion()}.amazonaws.com/`;
}
