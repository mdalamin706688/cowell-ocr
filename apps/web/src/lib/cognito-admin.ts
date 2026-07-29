import { signedJsonPost } from "./aws-sigv4";
import { getCognitoIdToken } from "./cognito-auth";
import { getIdentityPoolCredentials } from "./cognito-identity-credentials";
import {
  COGNITO_SUPER_ADMIN_GROUP,
  cognitoIdpEndpoint,
  getCognitoRegion,
  getCognitoUserPoolId,
  isCognitoAdminConfigured,
} from "./cognito-config";

export interface CognitoUserRow {
  username: string;
  email: string;
  status: string;
  enabled: boolean;
  createdAt?: Date;
  groups: string[];
}

interface AttributeType {
  Name?: string;
  Value?: string;
}

interface UserType {
  Username?: string;
  Attributes?: AttributeType[];
  UserStatus?: string;
  Enabled?: boolean;
  UserCreateDate?: string;
}

interface ListUsersResponse {
  Users?: UserType[];
  PaginationToken?: string;
}

function attr(user: UserType, name: string): string {
  const hit = user.Attributes?.find((a) => a.Name === name);
  return hit?.Value?.trim() || "";
}

function mapUser(user: UserType): CognitoUserRow {
  const email = attr(user, "email") || user.Username || "";
  return {
    username: user.Username || email,
    email,
    status: user.UserStatus || "UNKNOWN",
    enabled: user.Enabled !== false,
    createdAt: user.UserCreateDate ? new Date(user.UserCreateDate) : undefined,
    groups: [],
  };
}

async function adminCall<T>(target: string, body: Record<string, unknown>): Promise<T> {
  if (!isCognitoAdminConfigured()) {
    throw new Error("ユーザー管理が設定されていません（Identity Pool が必要です）");
  }
  const idToken = await getCognitoIdToken();
  if (!idToken) {
    throw new Error("セッションが切れています。再度ログインしてください。");
  }
  const credentials = await getIdentityPoolCredentials(idToken);
  return signedJsonPost<T>(
    cognitoIdpEndpoint(),
    `AWSCognitoIdentityProviderService.${target}`,
    body,
    credentials,
    getCognitoRegion()
  );
}

export async function listCognitoUsers(): Promise<CognitoUserRow[]> {
  const poolId = getCognitoUserPoolId();
  const users: CognitoUserRow[] = [];
  let paginationToken: string | undefined;

  do {
    const res = await adminCall<ListUsersResponse>("ListUsers", {
      UserPoolId: poolId,
      Limit: 60,
      ...(paginationToken ? { PaginationToken: paginationToken } : {}),
    });
    for (const user of res.Users || []) {
      users.push(mapUser(user));
    }
    paginationToken = res.PaginationToken;
  } while (paginationToken);

  users.sort((a, b) => a.email.localeCompare(b.email, "ja"));
  return users;
}

export async function createCognitoUser(input: {
  email: string;
  temporaryPassword: string;
  name?: string;
}): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("メールアドレスを入力してください");

  const poolId = getCognitoUserPoolId();
  const attributes: AttributeType[] = [
    { Name: "email", Value: email },
    { Name: "email_verified", Value: "true" },
  ];
  const displayName = input.name?.trim();
  if (displayName) {
    attributes.push({ Name: "name", Value: displayName });
  }

  await adminCall("AdminCreateUser", {
    UserPoolId: poolId,
    Username: email,
    TemporaryPassword: input.temporaryPassword,
    MessageAction: "SUPPRESS",
    UserAttributes: attributes,
  });

  try {
    await adminCall("AdminAddUserToGroup", {
      UserPoolId: poolId,
      Username: email,
      GroupName: "users",
    });
  } catch {
    // Group may not exist yet — user is still created
  }
}

export async function deleteCognitoUser(username: string): Promise<void> {
  await adminCall("AdminDeleteUser", {
    UserPoolId: getCognitoUserPoolId(),
    Username: username,
  });
}

export function formatUserStatus(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "有効";
    case "FORCE_CHANGE_PASSWORD":
      return "初回パスワード変更待ち";
    case "RESET_REQUIRED":
      return "リセット必要";
    case "UNCONFIRMED":
      return "未確認";
    default:
      return status;
  }
}

export { COGNITO_SUPER_ADMIN_GROUP };
