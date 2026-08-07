import { GraduatesRepository } from './graduates.repository.js';
import { GraduatesService } from './graduates.service.js';
import { InstitutionsRepository } from '../institutions/institutions.repository.js';
import { CertificatesRepository } from '../certificates/certificates.repository.js';

const graduatesService = new GraduatesService({
  graduatesRepository: new GraduatesRepository(),
  institutionsRepository: new InstitutionsRepository(),
  certificatesRepository: new CertificatesRepository(),
});

export async function listGraduatesController(req, res) {
  const result = await graduatesService.listGraduates(req.query, req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function getGraduateFiltersMetadataController(req, res) {
  const result = await graduatesService.getGraduateFiltersMetadata(req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function getGraduateController(req, res) {
  const result = await graduatesService.getGraduate(req.params.graduateId, req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function getGraduateProfileController(req, res) {
  const result = await graduatesService.getGraduateProfile(req.params.graduateId, req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function createGraduateController(req, res) {
  const result = await graduatesService.createGraduate(req.body, req.user);
  res.status(201).json({ status: 'success', data: result });
}

export async function updateGraduateController(req, res) {
  const result = await graduatesService.updateGraduate(req.params.graduateId, req.body, req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function archiveGraduateController(req, res) {
  const result = await graduatesService.archiveGraduate(req.params.graduateId, req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function unarchiveGraduateController(req, res) {
  const result = await graduatesService.unarchiveGraduate(req.params.graduateId, req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function deleteGraduateController(req, res) {
  const result = await graduatesService.deleteGraduate(req.params.graduateId, req.user);
  res.status(200).json({ status: 'success', data: result });
}
