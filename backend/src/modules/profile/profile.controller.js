import { ProfileRepository } from './profile.repository.js';
import { ProfileService } from './profile.service.js';

const profileService = new ProfileService({ profileRepository: new ProfileRepository() });

export async function getProfileController(_req, res) {
  const result = await profileService.getProfile();
  res.status(200).json({ status: 'success', data: result });
}

export async function updateUserProfileController(req, res) {
  const result = await profileService.updateUserProfile(req.body);
  res.status(200).json({ status: 'success', data: result });
}

export async function updateInstitutionProfileController(req, res) {
  const result = await profileService.updateInstitutionProfile(req.body);
  res.status(200).json({ status: 'success', data: result });
}

export async function updateProfilePasswordController(req, res) {
  const result = await profileService.updatePassword(req.body);
  res.status(200).json({ status: 'success', data: result });
}
