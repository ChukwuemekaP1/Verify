import { InstitutionsRepository } from './institutions.repository.js';
import { InstitutionsService } from './institutions.service.js';

const institutionsService = new InstitutionsService({
  institutionsRepository: new InstitutionsRepository(),
});

export async function listInstitutionsController(req, res) {
  const result = await institutionsService.listInstitutions(req.query);
  res.status(200).json({ status: 'success', data: result });
}

export async function getInstitutionController(req, res) {
  const result = await institutionsService.getInstitution(req.params.institutionId);
  res.status(200).json({ status: 'success', data: result });
}

export async function createInstitutionController(req, res) {
  const result = await institutionsService.createInstitution(req.body);
  res.status(201).json({ status: 'success', data: result });
}

export async function updateInstitutionController(req, res) {
  const result = await institutionsService.updateInstitution(req.params.institutionId, req.body);
  res.status(200).json({ status: 'success', data: result });
}

export async function updateInstitutionStatusController(req, res) {
  const result = await institutionsService.updateInstitutionStatus(req.params.institutionId, req.body);
  res.status(200).json({ status: 'success', data: result });
}

export async function deleteInstitutionController(req, res) {
  const result = await institutionsService.deleteInstitution(req.params.institutionId);
  res.status(200).json({ status: 'success', data: result });
}
