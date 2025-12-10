// Common user object interface used across the application
export interface UserObject {
  username: string;
  email: string;
  role: string;
  avatar_url: string;
  [key: string]: unknown; // Allow additional properties
}

// Legacy format for backward compatibility (if needed)
export interface LegacyUserObject {
  name: string;
  avatarUrl: string;
  [key: string]: string | undefined;
}
