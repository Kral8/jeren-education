import { jsonResponse } from './cors.js';
import { requireRole } from './auth.js';
import { randomToken } from './crypto.js';
import { createTeacherRecord } from './teachers.js';
import { maskEmail, sendAccessCodeEmail } from './email.js';

async function getRequestIds(env) {
  const listRaw = await env.TEACHERS_KV.get('access-requests:list');
  return listRaw ? JSON.parse(listRaw) : [];
}

async function getRequest(env, id) {
  const raw = await env.TEACHERS_KV.get(`access-request:${id}`);
  return raw ? JSON.parse(raw) : null;
}

async function saveRequest(env, request) {
  await env.TEACHERS_KV.put(`access-request:${request.id}`, JSON.stringify(request));
}

function normalizeDeliveryMethod(method) {
  if (method === 'email' || method === 'sms') return 'email';
  return 'screen';
}

function sanitizeRequest(request) {
  return {
    id: request.id,
    lastName: request.lastName,
    firstName: request.firstName,
    country: request.country || '',
    region: request.region || '',
    city: request.city || '',
    phone: request.phone || '',
    email: request.email || '',
    organization: request.organization,
    specialty: request.specialty || '',
    deliveryMethod: normalizeDeliveryMethod(request.deliveryMethod),
    status: request.status,
    autoApproved: Boolean(request.autoApproved),
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    resolvedAt: request.resolvedAt || null,
    teacherId: request.teacherId || null,
    emailSent: Boolean(request.emailSent),
    emailFailed: Boolean(request.emailFailed),
    emailError: request.emailError || null,
  };
}

function validatePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function validateCreateBody(body) {
  const lastName = String(body.lastName || '').trim();
  const firstName = String(body.firstName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '').trim();
  const country = String(body.country || '').trim();
  const region = String(body.region || '').trim();
  const city = String(body.city || '').trim();
  const organization = String(body.organization || '').trim();

  if (!lastName || !firstName) return { error: 'Name required' };
  if (!country || !region || !city) return { error: 'Location required' };
  if (!validatePhone(phone)) return { error: 'Invalid phone' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: 'Invalid email' };
  if (!organization) return { error: 'Organization required' };

  return {
    lastName,
    firstName,
    country,
    countryId: String(body.countryId || '').trim(),
    region,
    regionId: String(body.regionId || '').trim(),
    city,
    cityId: String(body.cityId || '').trim(),
    phone,
    email,
    organization,
    specialty: String(body.specialty || '').trim(),
    deliveryMethod: normalizeDeliveryMethod(body.deliveryMethod),
  };
}

async function deliverAccessCode(env, accessRequest, code) {
  if (normalizeDeliveryMethod(accessRequest.deliveryMethod) !== 'email') {
    return { delivered: false };
  }

  const emailResult = await sendAccessCodeEmail(
    env,
    accessRequest.email,
    code,
    accessRequest.firstName,
    accessRequest.lastName,
  );

  if (emailResult.success) {
    accessRequest.emailSent = true;
    accessRequest.emailFailed = false;
    accessRequest.emailError = null;
    accessRequest.emailMessageId = emailResult.messageId || null;
  } else {
    accessRequest.emailSent = false;
    accessRequest.emailFailed = true;
    accessRequest.emailError = emailResult.error || 'Email send failed';
    console.error('[AccessRequest] Email failed', accessRequest.id, accessRequest.emailError);
  }

  return { delivered: true, emailResult };
}

async function approveAccessRequest(env, accessRequest) {
  const now = Date.now();
  const teacher = await createTeacherRecord(env, {
    firstName: accessRequest.firstName,
    lastName: accessRequest.lastName,
    organization: accessRequest.organization,
    specialty: accessRequest.specialty,
    email: accessRequest.email,
    phone: accessRequest.phone,
    country: accessRequest.country,
    region: accessRequest.region,
    city: accessRequest.city,
    fromRequestId: accessRequest.id,
  });

  accessRequest.status = 'approved';
  accessRequest.updatedAt = now;
  accessRequest.resolvedAt = now;
  accessRequest.teacherId = teacher.id;
  accessRequest.accessCode = teacher.plainCode;

  await deliverAccessCode(env, accessRequest, teacher.plainCode);
  await saveRequest(env, accessRequest);

  return { teacher, accessRequest };
}

export async function handleAccessRequestCreate(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400, origin);
  }

  const validated = validateCreateBody(body);
  if (validated.error) {
    return jsonResponse({ success: false, error: validated.error }, 400, origin);
  }

  const id = randomToken(10);
  const clientToken = randomToken(24);
  const now = Date.now();
  const accessRequest = {
    id,
    clientToken,
    ...validated,
    status: 'pending',
    autoApproved: false,
    createdAt: now,
    updatedAt: now,
  };

  await saveRequest(env, accessRequest);
  const ids = await getRequestIds(env);
  ids.unshift(id);
  await env.TEACHERS_KV.put('access-requests:list', JSON.stringify(ids.slice(0, 500)));

  const deliveryMethod = normalizeDeliveryMethod(validated.deliveryMethod);

  if (deliveryMethod === 'email') {
    accessRequest.autoApproved = true;
    const { accessRequest: approvedRequest } = await approveAccessRequest(env, accessRequest);

    return jsonResponse({
      success: true,
      requestId: id,
      clientToken,
      status: 'approved',
      deliveryMethod,
      emailSent: Boolean(approvedRequest.emailSent),
      emailFailed: Boolean(approvedRequest.emailFailed),
      emailMasked: maskEmail(approvedRequest.email),
      emailError: approvedRequest.emailError || null,
      accessCode: approvedRequest.emailFailed ? approvedRequest.accessCode : undefined,
    }, 201, origin);
  }

  return jsonResponse({
    success: true,
    requestId: id,
    clientToken,
    status: 'pending',
    deliveryMethod,
  }, 201, origin);
}

export async function handleAccessRequestStatus(request, env, origin) {
  const url = new URL(request.url);
  const requestId = String(url.searchParams.get('requestId') || '').trim();
  const clientToken = String(url.searchParams.get('clientToken') || '').trim();

  if (!requestId || !clientToken) {
    return jsonResponse({ success: false, error: 'Missing parameters' }, 400, origin);
  }

  const accessRequest = await getRequest(env, requestId);
  if (!accessRequest || accessRequest.clientToken !== clientToken) {
    return jsonResponse({ success: false, error: 'Not found' }, 404, origin);
  }

  const deliveryMethod = normalizeDeliveryMethod(accessRequest.deliveryMethod);
  const payload = {
    success: true,
    status: accessRequest.status,
    request: sanitizeRequest(accessRequest),
    deliveryMethod,
    emailSent: Boolean(accessRequest.emailSent),
    emailMasked: maskEmail(accessRequest.email),
  };

  if (accessRequest.status === 'approved') {
    if (deliveryMethod === 'email' && accessRequest.emailSent) {
      payload.message = 'code_sent_email';
    } else if (accessRequest.accessCode) {
      payload.accessCode = accessRequest.accessCode;
      if (accessRequest.emailFailed) {
        payload.emailFailed = true;
      }
    }
  }

  return jsonResponse(payload, 200, origin);
}

export async function handleAccessRequestsList(request, env, origin, session) {
  if (!requireRole(session, ['admin'])) {
    return jsonResponse({ success: false, error: 'Forbidden' }, 403, origin);
  }

  const ids = await getRequestIds(env);
  const requests = [];
  for (const id of ids) {
    const accessRequest = await getRequest(env, id);
    if (accessRequest) requests.push(sanitizeRequest(accessRequest));
  }

  requests.sort((a, b) => b.createdAt - a.createdAt);
  return jsonResponse({ success: true, requests }, 200, origin);
}

export async function handleAccessRequestUpdate(request, env, origin, session, requestId) {
  if (!requireRole(session, ['admin'])) {
    return jsonResponse({ success: false, error: 'Forbidden' }, 403, origin);
  }

  const accessRequest = await getRequest(env, requestId);
  if (!accessRequest) {
    return jsonResponse({ success: false, error: 'Not found' }, 404, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400, origin);
  }

  const action = body.action;
  const now = Date.now();

  if (action === 'resend-email') {
    if (accessRequest.status !== 'approved' || !accessRequest.accessCode) {
      return jsonResponse({ success: false, error: 'Code not available' }, 409, origin);
    }
    if (!accessRequest.email || !accessRequest.email.includes('@')) {
      return jsonResponse({ success: false, error: 'Email not available' }, 400, origin);
    }
    await deliverAccessCode(env, accessRequest, accessRequest.accessCode);
    accessRequest.updatedAt = now;
    await saveRequest(env, accessRequest);
    return jsonResponse({
      success: accessRequest.emailSent,
      request: sanitizeRequest(accessRequest),
      emailSent: accessRequest.emailSent,
      emailError: accessRequest.emailError || null,
    }, accessRequest.emailSent ? 200 : 502, origin);
  }

  if (accessRequest.status !== 'pending') {
    return jsonResponse({ success: false, error: 'Already resolved' }, 409, origin);
  }

  if (action === 'reject') {
    accessRequest.status = 'rejected';
    accessRequest.updatedAt = now;
    accessRequest.resolvedAt = now;
    await saveRequest(env, accessRequest);
    return jsonResponse({ success: true, request: sanitizeRequest(accessRequest) }, 200, origin);
  }

  if (action === 'approve') {
    const { teacher, accessRequest: approvedRequest } = await approveAccessRequest(env, accessRequest);

    return jsonResponse({
      success: true,
      request: sanitizeRequest(approvedRequest),
      accessCode: normalizeDeliveryMethod(approvedRequest.deliveryMethod) === 'screen' || approvedRequest.emailFailed
        ? teacher.plainCode
        : undefined,
      emailSent: Boolean(approvedRequest.emailSent),
      emailFailed: Boolean(approvedRequest.emailFailed),
      emailError: approvedRequest.emailError || null,
    }, 200, origin);
  }

  return jsonResponse({ success: false, error: 'Invalid action' }, 400, origin);
}
