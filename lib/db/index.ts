/* The server's repository: Supabase, from SUPABASE_URL and SUPABASE_SECRET_KEY (a ConfigError names a missing one). */
import 'server-only';
import { getAdminClient } from './client';
import type { Repository } from './repository';
import { SupabaseRepository } from './supabase-repository';

export { ConfigError } from './client';
export { RepositoryError, StateError, type Repository } from './repository';
export { signedPhotoUrl, uploadDraftPhoto, PHOTO_BUCKET, type PhotoExt } from './photos';

let repo: Repository | null = null;

/** One repository per server process. */
export function getRepository(): Repository {
  repo ??= new SupabaseRepository(getAdminClient());
  return repo;
}
