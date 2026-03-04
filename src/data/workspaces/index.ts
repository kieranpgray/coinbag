import type { WorkspaceRepository } from './repo';
import { SupabaseWorkspaceRepository } from './supabaseRepo';

let _repo: WorkspaceRepository | null = null;

export function createWorkspaceRepository(): WorkspaceRepository {
  if (!_repo) {
    _repo = new SupabaseWorkspaceRepository();
  }
  return _repo;
}
