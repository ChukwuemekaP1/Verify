import { CertificatesRepository } from './certificates.repository.js';
import { CertificatesService } from './certificates.service.js';
import { GraduatesRepository } from '../graduates/graduates.repository.js';
import { InstitutionsRepository } from '../institutions/institutions.repository.js';

const certificatesService = new CertificatesService({
  certificatesRepository: new CertificatesRepository(),
  graduatesRepository: new GraduatesRepository(),
  institutionsRepository: new InstitutionsRepository(),
});

export async function listCertificatesController(req, res) {
  const result = await certificatesService.listCertificates(req.query, req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function getCertificateFiltersMetadataController(req, res) {
  const result = await certificatesService.getCertificateFiltersMetadata(req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function getCertificateController(req, res) {
  const result = await certificatesService.getCertificate(req.params.certificateId, req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function getCertificatePreviewController(req, res) {
  const result = await certificatesService.getCertificatePreview(req.params.certificateId, req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function createCertificateController(req, res) {
  const result = await certificatesService.createCertificate(req.body, req.user);
  res.status(201).json({ status: 'success', data: result });
}

export async function uploadCertificateMetadataController(req, res) {
  const result = await certificatesService.uploadCertificateMetadata(req.body, req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function updateCertificateController(req, res) {
  const result = await certificatesService.updateCertificate(req.params.certificateId, req.body, req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function publishCertificateController(req, res) {
  const result = await certificatesService.publishCertificate(req.params.certificateId, req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function revokeCertificateController(req, res) {
  const result = await certificatesService.revokeCertificate(req.params.certificateId, req.body, req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function deleteCertificateController(req, res) {
  const result = await certificatesService.deleteCertificate(req.params.certificateId, req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function listCertificatesByGraduateController(req, res) {
  const result = await certificatesService.listCertificatesByGraduate(
    req.params.graduateId,
    req.query,
    req.user,
  );
  res.status(200).json({ status: 'success', data: result });
}
