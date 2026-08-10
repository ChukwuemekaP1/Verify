import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { Institution, INSTITUTION_STATUS, INSTITUTION_TYPE } from './models/institution.model.js';
import { User, USER_ROLES, USER_STATUS } from './models/user.model.js';
import { Graduate, GRADUATE_LEVEL, GRADUATE_STATUS } from './models/graduate.model.js';
import { Certificate, CERTIFICATE_STATUS, CERTIFICATE_TYPE, VERIFICATION_METHOD as CERT_VERIFICATION_METHOD } from './models/certificate.model.js';
import { AuditLog, AUDIT_ACTION, AUDIT_ENTITY, AUDIT_SEVERITY } from './models/audit-log.model.js';

const DEMO_INSTITUTIONS = [
  {
    name: 'University of Nigeria, Nsukka',
    type: INSTITUTION_TYPE.UNIVERSITY,
    country: 'Nigeria',
    state: 'Enugu',
    city: 'Nsukka',
    address: 'University of Nigeria, Nsukka, Enugu State, Nigeria',
    publicContactEmail: 'registrar@unn.edu.ng',
    website: 'https://www.unn.edu.ng',
    about: 'The University of Nigeria, Nsukka (UNN) is a public research university in Nsukka, Enugu State, Nigeria. Founded in 1960, it was the first autonomous university in Nigeria.',
    status: INSTITUTION_STATUS.ACTIVE,
    verificationPrefix: 'UNN',
    accreditationRef: 'NUC-UNN-2024',
    admin: {
      email: 'admin@unn.edu.ng',
      firstName: 'Chukwuemeka',
      lastName: 'Okonkwo',
      password: 'UnnAdmin123!',
    },
  },
  {
    name: 'Nnamdi Azikiwe University',
    type: INSTITUTION_TYPE.UNIVERSITY,
    country: 'Nigeria',
    state: 'Anambra',
    city: 'Awka',
    address: 'Nnamdi Azikiwe University, Awka, Anambra State, Nigeria',
    publicContactEmail: 'registrar@unizik.edu.ng',
    website: 'https://www.unizik.edu.ng',
    about: 'Nnamdi Azikiwe University (UNIZIK) is a public research university in Awka, Anambra State, Nigeria. Established in 1991, it is named after Nigeria\'s first president.',
    status: INSTITUTION_STATUS.ACTIVE,
    verificationPrefix: 'UNIZIK',
    accreditationRef: 'NUC-UNIZIK-2024',
    admin: {
      email: 'admin@unizik.edu.ng',
      firstName: 'Adaeze',
      lastName: 'Nwankwo',
      password: 'UnizikAdmin123!',
    },
  },
  {
    name: 'University of Lagos',
    type: INSTITUTION_TYPE.UNIVERSITY,
    country: 'Nigeria',
    state: 'Lagos',
    city: 'Akoka',
    address: 'University of Lagos, Akoka, Lagos State, Nigeria',
    publicContactEmail: 'registrar@unilag.edu.ng',
    website: 'https://www.unilag.edu.ng',
    about: 'The University of Lagos (UNILAG) is a public research university in Lagos, Nigeria. Established in 1962, it is one of the first generation universities in Nigeria.',
    status: INSTITUTION_STATUS.ACTIVE,
    verificationPrefix: 'UNILAG',
    accreditationRef: 'NUC-UNILAG-2024',
    admin: {
      email: 'admin@unilag.edu.ng',
      firstName: 'Oluwaseun',
      lastName: 'Adebayo',
      password: 'UnilagAdmin123!',
    },
  },
];

const DEMO_GRADUATES = [
  {
    firstName: 'Chidinma',
    lastName: 'Okafor',
    middleName: 'Grace',
    matricNumber: 'UNN/2018/001234',
    email: 'chidinma.okafor@email.com',
    programme: 'Computer Science',
    level: GRADUATE_LEVEL.UNDERGRADUATE,
    graduationYear: '2023',
    graduationDate: new Date('2023-07-15'),
    classification: 'First Class',
    institutionIndex: 0,
  },
  {
    firstName: 'Emeka',
    lastName: 'Eze',
    middleName: 'Anthony',
    matricNumber: 'UNN/2017/005678',
    email: 'emeka.eze@email.com',
    programme: 'Electrical Engineering',
    level: GRADUATE_LEVEL.UNDERGRADUATE,
    graduationYear: '2022',
    graduationDate: new Date('2022-07-20'),
    classification: 'Second Class Upper',
    institutionIndex: 0,
  },
  {
    firstName: 'Ngozi',
    lastName: 'Ibe',
    middleName: 'Chiamaka',
    matricNumber: 'UNN/2019/009012',
    email: 'ngozi.ibe@email.com',
    programme: 'Medicine and Surgery',
    level: GRADUATE_LEVEL.DOCTORATE,
    graduationYear: '2024',
    graduationDate: new Date('2024-12-10'),
    classification: 'Distinction',
    institutionIndex: 0,
  },
  {
    firstName: 'Kelechi',
    lastName: 'Udo',
    middleName: 'Promise',
    matricNumber: 'UNN/2020/003456',
    email: 'kelechi.udo@email.com',
    programme: 'Biochemistry',
    level: GRADUATE_LEVEL.POSTGRADUATE,
    graduationYear: '2023',
    graduationDate: new Date('2023-11-05'),
    classification: 'Second Class Lower',
    institutionIndex: 0,
  },
  {
    firstName: 'Obinna',
    lastName: 'Nwachukwu',
    middleName: 'David',
    matricNumber: 'UNIZIK/2018/002345',
    email: 'obinna.nwachukwu@email.com',
    programme: 'Mechanical Engineering',
    level: GRADUATE_LEVEL.UNDERGRADUATE,
    graduationYear: '2023',
    graduationDate: new Date('2023-07-22'),
    classification: 'Second Class Upper',
    institutionIndex: 1,
  },
  {
    firstName: 'Chiamaka',
    lastName: 'Ezeani',
    middleName: 'Joy',
    matricNumber: 'UNIZIK/2019/006789',
    email: 'chiamaka.ezeani@email.com',
    programme: 'Pharmacy',
    level: GRADUATE_LEVEL.DOCTORATE,
    graduationYear: '2024',
    graduationDate: new Date('2024-07-18'),
    classification: 'First Class',
    institutionIndex: 1,
  },
  {
    firstName: 'Ikenna',
    lastName: 'Oguegbu',
    middleName: 'Samuel',
    matricNumber: 'UNIZIK/2020/001122',
    email: 'ikenna.oguegbu@email.com',
    programme: 'Mass Communication',
    level: GRADUATE_LEVEL.UNDERGRADUATE,
    graduationYear: '2024',
    graduationDate: new Date('2024-12-05'),
    classification: 'Second Class Upper',
    institutionIndex: 1,
  },
  {
    firstName: 'Folake',
    lastName: 'Adeyemi',
    middleName: 'Olufunmi',
    matricNumber: 'UNILAG/2017/004567',
    email: 'folake.adeyemi@email.com',
    programme: 'Law',
    level: GRADUATE_LEVEL.UNDERGRADUATE,
    graduationYear: '2022',
    graduationDate: new Date('2022-07-30'),
    classification: 'First Class',
    institutionIndex: 2,
  },
  {
    firstName: 'Tunde',
    lastName: 'Bakare',
    middleName: 'Akinwale',
    matricNumber: 'UNILAG/2018/008901',
    email: 'tunde.bakare@email.com',
    programme: 'Economics',
    level: GRADUATE_LEVEL.POSTGRADUATE,
    graduationYear: '2023',
    graduationDate: new Date('2023-11-20'),
    classification: 'Second Class Upper',
    institutionIndex: 2,
  },
  {
    firstName: 'Amaka',
    lastName: 'Obi',
    middleName: 'Chinyere',
    matricNumber: 'UNILAG/2019/003344',
    email: 'amaka.obi@email.com',
    programme: 'Architecture',
    level: GRADUATE_LEVEL.UNDERGRADUATE,
    graduationYear: '2024',
    graduationDate: new Date('2024-07-25'),
    classification: 'Second Class Lower',
    institutionIndex: 2,
  },
];

function generateCertificateNumber(prefix, index) {
  return `${prefix}-CERT-${String(index).padStart(4, '0')}-${new Date().getFullYear()}`;
}

function generateVerificationReference(prefix, index) {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}V${String(index).padStart(3, '0')}${random}`;
}

async function seedSuperAdmin() {
  const existing = await User.findOne({ role: USER_ROLES.SUPER_ADMIN });
  if (existing) {
    logger.info({ email: existing.email }, 'Super admin already exists');
    return existing;
  }

  const user = await User.create({
    firstName: 'Super',
    lastName: 'Admin',
    email: env.SUPER_ADMIN_EMAIL,
    password: env.SUPER_ADMIN_PASSWORD,
    role: USER_ROLES.SUPER_ADMIN,
    status: USER_STATUS.ACTIVE,
    institution: null,
  });

  logger.info({ email: user.email }, 'Super admin created');
  return user;
}

async function seedInstitutions() {
  const results = [];

  for (const data of DEMO_INSTITUTIONS) {
    const { admin, ...institutionData } = data;

    let institution = await Institution.findOne({ name: institutionData.name });
    if (institution) {
      logger.info({ name: institution.name }, 'Institution already exists, skipping');
    } else {
      institution = await Institution.create(institutionData);
      logger.info({ name: institution.name, id: institution._id }, 'Institution created');

      await AuditLog.create({
        action: AUDIT_ACTION.CREATE,
        entityType: AUDIT_ENTITY.INSTITUTION,
        entityId: institution._id,
        entityLabel: institution.name,
        severity: AUDIT_SEVERITY.INFO,
        actorLabel: 'Seed Script',
        actorRole: 'SYSTEM',
        institution: institution._id,
        newValues: { name: institution.name },
      });
    }

    let adminUser = await User.findOne({ email: admin.email });
    if (adminUser) {
      logger.info({ email: admin.email }, 'Institution admin already exists, skipping');
    } else {
      adminUser = await User.create({
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        password: admin.password,
        role: USER_ROLES.INSTITUTION_ADMIN,
        status: USER_STATUS.ACTIVE,
        institution: institution._id,
      });
      logger.info({ email: adminUser.email, institution: institution.name }, 'Institution admin created');
    }

    results.push({ institution, admin: adminUser });
  }

  return results;
}

async function seedGraduates(institutions) {
  const results = [];

  for (const data of DEMO_GRADUATES) {
    const { institutionIndex, ...graduateData } = data;
    const institution = institutions[institutionIndex].institution;

    let graduate = await Graduate.findOne({
      matricNumber: graduateData.matricNumber,
      institution: institution._id,
    });

    if (graduate) {
      logger.info({ matricNumber: graduate.matricNumber }, 'Graduate already exists, skipping');
    } else {
      graduate = await Graduate.create({
        ...graduateData,
        institution: institution._id,
        status: GRADUATE_STATUS.ACTIVE,
      });
      logger.info(
        { name: graduate.fullName, matricNumber: graduate.matricNumber, institution: institution.name },
        'Graduate created',
      );

      await AuditLog.create({
        action: AUDIT_ACTION.CREATE,
        entityType: AUDIT_ENTITY.GRADUATE,
        entityId: graduate._id,
        entityLabel: graduate.fullName,
        severity: AUDIT_SEVERITY.INFO,
        actorLabel: 'Seed Script',
        actorRole: 'SYSTEM',
        institution: institution._id,
        newValues: { fullName: graduate.fullName, matricNumber: graduate.matricNumber },
      });
    }

    results.push({ graduate, institution });
  }

  return results;
}

async function seedCertificates(graduateRecords) {
  const results = [];

  for (let i = 0; i < graduateRecords.length; i++) {
    const { graduate, institution } = graduateRecords[i];
    const certNumber = generateCertificateNumber(institution.verificationPrefix || 'CERT', i + 1);
    const verRef = generateVerificationReference(institution.verificationPrefix || 'V', i + 1);

    let certificate = await Certificate.findOne({
      certificateNumber: certNumber,
      institution: institution._id,
    });

    if (certificate) {
      logger.info({ certificateNumber: certNumber }, 'Certificate already exists, skipping');
    } else {
      certificate = await Certificate.create({
        certificateNumber: certNumber,
        type: CERTIFICATE_TYPE.DEGREE,
        status: CERTIFICATE_STATUS.PUBLISHED,
        issueDate: graduate.graduationDate || new Date(`${graduate.graduationYear}-07-15`),
        awardTitle: `${graduate.classification || 'Bachelor'} in ${graduate.programme}`,
        programme: graduate.programme,
        classification: graduate.classification,
        graduate: graduate._id,
        institution: institution._id,
        issuedBy: institution.name,
        signatoryName: 'Registrar',
        signatoryTitle: 'University Registrar',
        verificationReference: verRef,
        verificationMethod: CERT_VERIFICATION_METHOD.BOTH,
        publishedAt: new Date(),
        verificationCount: 0,
      });
      logger.info(
        { certificateNumber: certNumber, graduate: graduate.fullName, reference: verRef },
        'Certificate created',
      );

      await AuditLog.create({
        action: AUDIT_ACTION.CREATE,
        entityType: AUDIT_ENTITY.CERTIFICATE,
        entityId: certificate._id,
        entityLabel: certNumber,
        severity: AUDIT_SEVERITY.INFO,
        actorLabel: 'Seed Script',
        actorRole: 'SYSTEM',
        institution: institution._id,
        newValues: { certificateNumber: certNumber, verificationReference: verRef },
      });
    }

    results.push({ certificate, graduate, institution });
  }

  return results;
}

async function runSeed() {
  logger.info('Starting VeriFlow demo seed...');

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    logger.info('MongoDB connected for seeding');
  }

  const superAdmin = await seedSuperAdmin();
  const institutions = await seedInstitutions();
  const graduates = await seedGraduates(institutions);
  const certificates = await seedCertificates(graduates);

  logger.info('--- Seed Summary ---');
  logger.info({ email: superAdmin.email }, 'Super Admin');
  for (const { institution, admin } of institutions) {
    logger.info(
      { institution: institution.name, adminEmail: admin.email },
      'Institution + Admin',
    );
  }
  logger.info({ count: graduates.length }, 'Graduates');
  logger.info({ count: certificates.length }, 'Certificates');
  logger.info('Seed completed successfully');

  return { superAdmin, institutions, graduates, certificates };
}

export { runSeed };

if (process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .then(() => {
      mongoose.disconnect();
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ err: error }, 'Seed failed');
      mongoose.disconnect();
      process.exit(1);
    });
}
