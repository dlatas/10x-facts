import type { OkResponse } from '@/types/common';
import type { Profile } from '@/types/entities';

export interface AuthSignupCommand {
  email: string;
  password: string;
}

export interface AuthLoginCommand {
  email: string;
  password: string;
}

export type AuthLogoutResponse = OkResponse;

export interface AuthUserDto {
  id: Profile['id'];
  email: string;
}

export interface AuthSessionDto {
  access_token: string;
  refresh_token?: string;
}

export interface AuthSignupResponseDto {
  user: AuthUserDto;
  session: Required<AuthSessionDto>;
}

export interface AuthLoginResponseDto {
  user: Pick<AuthUserDto, 'id'>;
  session: Pick<AuthSessionDto, 'access_token'>;
}
