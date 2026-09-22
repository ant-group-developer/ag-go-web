import { Permission, UserType } from '../../../constants/permissions';

export interface Account {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Permissions fields
  user_type: UserType;
  permissions: Permission[];
  auth0_user_id: string;
}

export interface AccountMeResponse {
  statusCode: number;
  message: string;
  data: Account;
}
