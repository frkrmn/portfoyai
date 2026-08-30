import { getAuthenticatedUser } from "./api-utils.mjs";

export const adminEmails = () => new Set(
  String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLocaleLowerCase("en-US"))
    .filter(Boolean),
);

export const requireAdmin = async (request) => {
  const user = await getAuthenticatedUser(request);
  if (!adminEmails().has(String(user.email || "").toLocaleLowerCase("en-US"))) throw new Error("ADMIN_REQUIRED");
  return user;
};
