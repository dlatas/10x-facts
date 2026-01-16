import type { Profile } from '@/types/entities';

// Profiles
export type ProfileDto = Pick<
  Profile,
  'id' | 'is_admin' | 'created_at' | 'updated_at'
>;
export type GetProfileResponseDto = ProfileDto;
