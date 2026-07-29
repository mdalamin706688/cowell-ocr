import {
  cognitoUserPoolProviderName,
  getCognitoIdentityPoolId,
  getCognitoRegion,
  isCognitoAdminConfigured,
} from "./cognito-config";
import type { AwsCredentials } from "./aws-sigv4";

interface GetIdResponse {
  IdentityId?: string;
}

interface GetCredentialsResponse {
  Credentials?: {
    AccessKeyId?: string;
    SecretKey?: string;
    SessionToken?: string;
    Expiration?: number;
  };
}

async function identityCall<T>(target: string, body: Record<string, unknown>): Promise<T> {
  const region = getCognitoRegion();
  const res = await fetch(`https://cognito-identity.${region}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityService.${target}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { message?: string };
  if (!res.ok) {
    throw new Error(data.message || `Identity Pool error (${res.status})`);
  }
  return data;
}

/** Exchange User Pool id token for temporary IAM credentials via Identity Pool */
export async function getIdentityPoolCredentials(idToken: string): Promise<AwsCredentials> {
  if (!isCognitoAdminConfigured()) {
    throw new Error("Identity Pool が設定されていません");
  }

  const identityPoolId = getCognitoIdentityPoolId();
  const provider = cognitoUserPoolProviderName();
  const logins = { [provider]: idToken };

  const idRes = await identityCall<GetIdResponse>("GetId", {
    IdentityPoolId: identityPoolId,
    Logins: logins,
  });
  const identityId = idRes.IdentityId;
  if (!identityId) {
    throw new Error("Identity Pool から ID を取得できませんでした");
  }

  const credRes = await identityCall<GetCredentialsResponse>("GetCredentialsForIdentity", {
    IdentityId: identityId,
    Logins: logins,
  });
  const creds = credRes.Credentials;
  if (!creds?.AccessKeyId || !creds.SecretKey) {
    throw new Error("一時認証情報を取得できませんでした");
  }

  return {
    accessKeyId: creds.AccessKeyId,
    secretAccessKey: creds.SecretKey,
    sessionToken: creds.SessionToken,
  };
}
