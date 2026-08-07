import { AppError } from '../../shared/errors/app-error.js';

export class ProfileService {
  constructor({ profileRepository }) {
    this.profileRepository = profileRepository;
  }

  async getProfile() {
    void this.profileRepository;
    throw AppError.notImplemented('Profile retrieval is scaffolded but not implemented yet.');
  }

  async updateUserProfile(payload) {
    void this.profileRepository;
    void payload;
    throw AppError.notImplemented('User profile update is scaffolded but not implemented yet.');
  }

  async updateInstitutionProfile(payload) {
    void this.profileRepository;
    void payload;
    throw AppError.notImplemented('Institution profile update is scaffolded but not implemented yet.');
  }

  async updatePassword(payload) {
    void this.profileRepository;
    void payload;
    throw AppError.notImplemented('Profile password update is scaffolded but not implemented yet.');
  }
}
