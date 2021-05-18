/* eslint-disable no-console */
import fs from 'fs';
import { Router } from 'express';
import 'colors';

import { sign, verify } from '../libs/jwt';
import { decrypt, isEncryptedRequest } from '../libs/RNCrypto';
import {
  AccessDeniedError,
  checkAuth,
  dataLogOn,
  getAuth,
  isAdmin,
  isAdminToken,
  isDDosCompany,
  isPassword,
  return1Gbfile,
} from '../libs/utils';
import { deleteDevice, getDevices } from '../models/Device';
import {
  create,
  deleteLocations,
  removeOld,
  getLatestLocation,
  getLocations,
  getStats,
} from '../models/Location';
import { withAuth, adminToken } from '../config';
import { getOrgs, findOne } from '../models/Org';
import axios from 'axios'

const router = new Router();

/**
 * GET /company_tokens
 */
router.get('/company_tokens', checkAuth(verify), async (req, res) => {
  try {
    const { org } = req.jwt;
    const orgs = await getOrgs({ org }, isAdmin(req.jwt));
    res.send(orgs);
  } catch (err) {
    console.error('v1', '/company_tokens', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * GET /devices
 */
router.get('/devices', checkAuth(verify), async (req, res) => {
  const {
    companyId: orgId,
    org,
  } = req.jwt;
  const { company_id: companyId, device_id: deviceId } = req.query;
  const admin = isAdmin(req.jwt);
  try {
    const devices = await getDevices(
      {
        companyId: admin ? companyId : orgId,
        deviceId,
        org,
      },
      isAdmin(req.jwt),
    );
    res.send(devices);
  } catch (err) {
    console.error('v1', '/devices', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.delete('/devices/:id', checkAuth(verify), async (req, res) => {
  const {
    companyId,
    org,
  } = req.jwt;
  const admin = isAdmin(req.jwt);
  try {
    console.log(
      `DELETE /devices/${req.params.id}?${JSON.stringify(req.query)}\n`.green,
    );
    await deleteDevice(
      {
        ...req.query,
        id: req.params.id,
        org,
        companyId: !admin && companyId,
      },
      isAdmin(req.jwt),
    );
    res.send({ success: true });
  } catch (err) {
    console.error(
      'v1',
      '/devices',
      JSON.stringify(req.params),
      JSON.stringify(req.query),
      err,
    );
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.get('/stats', checkAuth(verify), async (req, res) => {
  try {
    const stats = await getStats();
    res.send(stats);
  } catch (err) {
    console.info('/stats', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.get('/locations/latest', checkAuth(verify), async (req, res) => {
  const { org, companyId: orgId } = req.jwt;
  const { company_id: companyId = orgId, user_id: deviceId } = req.query;
  const admin = isAdmin(req.jwt);
  console.log('v1: GET /locations/latest %s'.green, org, companyId, deviceId);
  try {
    const latest = await getLatestLocation(
      {
        user_id: deviceId,
        org,
        company_id: admin ? companyId : orgId,
      },
      admin,
    );
    res.send(latest);
  } catch (err) {
    console.info('v1: /locations/latest', deviceId, err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * GET /locations
 */
router.get('/locations', checkAuth(verify), async (req, res) => {
  const { org, companyId: orgId } = req.jwt;
  const { company_id: companyId } = req.query;
  const admin = isAdmin(req.jwt);
  console.log('v1: GET /locations'.green, JSON.stringify(req.query));

  try {
    const locations = await getLocations(
      {
        ...req.query,
        org,
        company_id: companyId || orgId || 1,
      },
      admin,
    );
    res.send(locations);
  } catch (err) {
    console.error('v1', 'GET /locations', JSON.stringify(req.query), err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * POST /locations
 */
router.post('/locations', getAuth(verify), async (req, res) => {
  const { body } = req;
  const data = isEncryptedRequest(req)
    ? decrypt(body.toString())
    : body;
  const { company_token: org } = data;

  if (isDDosCompany(org)) {
    return return1Gbfile(res);
  }

  dataLogOn && console.log('v1:post:locations'.yellow, org, JSON.stringify(data));

  try {
    await create(data, org);
    await removeOld(org);
    return res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    console.error('v1', 'post /locations', err);
    return res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * POST /locations
 */
router.post('/locations/:company_token', getAuth(verify), async (req, res) => {
  const { company_token: org } = req.params;

  console.info('v1:locations:post'.green, 'org:name'.green, org);

  if (isDDosCompany(org)) {
    return return1Gbfile(res);
  }

  const data = isEncryptedRequest(req)
    ? decrypt(req.body.toString())
    : req.body;

  dataLogOn && console.log(`v1:post:locations:${org}`.yellow, JSON.stringify(data));

  try {
    await create(data, org);
    await removeOld(org);

    return res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    console.error('v1', 'post /locations', org, err);
    return res.status(500).send({ error: 'Something failed!' });
  }
});

router.delete('/locations', checkAuth(verify), async (req, res) => {
  const { org, companyId: orgId } = req.jwt;
  const { company_id: companyId } = req.query;
  const admin = isAdmin(req.jwt);
  console.info('v1:locations:delete:query'.green, JSON.stringify(req.query));

  try {
    await deleteLocations(
      {
        ...req.query,
        companyId: admin ? companyId : orgId,
        org,
      },
      admin,
    );

    res.send({ success: true });
  } catch (err) {
    console.info('v1', 'delete /locations', JSON.stringify(req.query), err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.post('/locations_template', async (req, res) => {
  console.log('v1:POST /locations_template\n%s\n'.green, JSON.stringify(req.body));

  res.set('Retry-After', 5);
  res.send({ success: true });
});

router.post('/configure', async (req, res) => {
  const response = {
    access_token: 'e7ebae5e-4bea-4d63-8f28-8a104acd2f4c',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: '2a69e1cd-d7db-44f6-87fc-3d66c4505ee4',
    scope: 'openid+email+profile+phone+address+group',
  };
  res.send(response);
});

router.post('/auth', async (req, res) => {
  const { login, password } = req.body || {};

  try {
    if (isAdminToken(login) && isPassword(password)) {
      const jwtInfo = { org: login, admin: true };

      const accessToken = sign(jwtInfo);
      return res.send({
        access_token: accessToken,
        token_type: 'Bearer',
        org: login,
      });
    }
  } catch (e) {
    console.error('v1', '/auth', e);
  }

  return res.status(401)
    .send({ org: login, error: 'Await not public account and right password' });
});

const zubaleClient = () => {
  // pending caching expiration
  const getMaxAge = (res) => res.expires_in * 1000 // expires_in is seconds
  const interceptor = (getToken) => {
    return async (config) => {
      let current = null
      const now = Date.now()
      const token = await getToken()
      // console.log(`got from server(${JSON.stringify(token)})`)
      current = {
        token: token.access_token,
        // pending caching expiration
        expiration: Date.now() + getMaxAge(token),
      }
      config.headers['Authorization'] = `Bearer ${current.token}`
      // console.log('new config', config)
      return config
    }
  }

  const client = (url, data, config) => {
    return () => axios.post(url, data, config).then((res) => res.data)
  }

  const apiClient = axios.create({
    baseURL: 'https://api.zubale.com/',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const getClientCredentials = client(
    `https://api.zubale.com/oauth2/token`,
    {
      grant_type: 'client_credentials',
    },
    {
      auth: {
        username: 'y7FBQItecB52ztGHISATBVUB7rKlkmCH',
        password: 'iB2zwXQS47ZVqM0CBBYmMTEn2GRpvFbC',
      },
    },
  )
  apiClient.interceptors.request.use(interceptor(getClientCredentials))
  return apiClient
}


router.post('/quest/token', async (req, res) => {
  const { token } = req.body || {};

  const CONSTANTS = {
    GRAPHQL_USERNAME: 'graphql',
    GRAPHQL_PASSWORD: 'sFTBPpVwoOVqfFkjU1',
    GRAPHQL_BASE_URL: 'https://graphql.zubale.com/quests/graphql/ui',
  }
  const graphqlClient = axios.create({
    baseURL: CONSTANTS.GRAPHQL_BASE_URL,
    timeout: 30000,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    auth: {
      username: CONSTANTS.GRAPHQL_USERNAME,
      password: CONSTANTS.GRAPHQL_PASSWORD,
    },
  })

    let error = null
    let data = {}

  //   try {
  //     console.log('GRAPHQL ready in try')
  //     const response = await graphqlClient.post(CONSTANTS.QUEST_GRAPHQL, {
  //       query: `
  //         {
  //           getQuest(id: "${token}") {
  //           deliveryDistance
  //           id
  //           type
  //           duration
  //           rewardAmount
  //           cycle {
  //             endDate
  //             startDate
  //           }
  //           location {
  //             latitude
  //             longitude
  //           }
  //           brand {
  //               id
  //               name
  //               zubaleId
  //           }
  //           storeDepartment
  //           store {
  //               id
  //               address
  //               name
  //               storeNumber
  //               retailer {
  //                   id
  //                   name
  //                   logoUrl
  //               }
  //               mapUrl
  //           }
  //           country {
  //             currencySymbol
  //           }
  //           closed
  //           status
  //           userTypes
  //           available
  //           reservationOrder
  //           reservationType
  //           formType
  //           formInfo {
  //             formId
  //             phoneNumberFieldKey
  //             questFieldKey
  //             storeFieldKey
  //             url
  //             validGoogleForm
  //             validZubaleForm                  
  //           }
  //           reservation {
  //             date
  //             expirationDate
  //             userId
  //           }
  //           pickingAndDelivery {
  //             checkoutNote
  //             zubaleOrderId
  //             deepLinkBaseUrl
  //             deliveryWindowEndTime
  //             deliveryWindowStarTime
  //             dropOffLocation {
  //               latitude
  //               longitude
  //             }
  //             encryptedToken
  //             externalDeliveryId
  //             externalOrderId
  //             pickupWindowEndTime
  //             pickupWindowStartTime
  //             storeArrivalTime
  //             customerInfo {
  //               address
  //               name
  //               phoneNumber
  //             }
  //             orderInfo {
  //               size
  //               totalLineItems
  //               totalQuantity
  //               totalVolume
  //               totalWeight
  //             }
  //             paymentInfo {
  //               payOnDeliveryType
  //               paymentMode
  //               paymentStatus
  //             }
  //             allowResubmission
  //           }
  //         }
  //       }
  //       `,
  //       variables: null,
  //       operationName: null,
  //     })
  //   // console.log('GRAPHQL raw response', response)
  //   if (response.data && response.data.errors) {
  //     error = {
  //       message: 'Token inválido...',
  //       type: 'general',
  //     }
  //   } else {
  //     data = {quest: response.data.data.getQuest, events: {}}

  //     const responseWally = await zubaleClient().get(`jobs/events?quest_id=${data.quest.id}`, {})
  //     .catch((response) => {
  //       console.log('error responseWally', response)
  //       return response
  //       return (error = err.response.data.errors)
  //     })
  //     console.log('responseWally', responseWally.data)
  //     if (responseWally.data && responseWally.data.data && responseWally.data.data.events) {
  //       const eventsRaw = responseWally.data.data.events
  //       data.wally = responseWally.data.data
  //       let events = {}
  //       const ignoredStatus = ['APPROVED', 'DELIVERY_COMPLETED', 'SUBMITTED']
  //       eventsRaw.map(event => {
  //         if ( !ignoredStatus.includes(event.payload.status) )
  //           events[event.payload.status] = {...event, event: undefined}
  //       })
  //       quest = events.READY.created_quest
  //       data.events = events
  //     }
  //   }
  // } catch (err) {
  //   console.log('response Token inválido', err)
  //   error = err
  // }
  const responseWally = await zubaleClient().get(`jobs/events?quest_id=${token}`, {})
      .catch((response) => {
        console.log('error responseWally', response)
        return response
      })
  console.log('responseWally', responseWally.data)
  if (responseWally.data && responseWally.data.data && responseWally.data.data.events) {
    const eventsRaw = responseWally.data.data.events
    // data.wally = responseWally.data.data
    let events = {}
    const ignoredStatus = ['APPROVED', 'DELIVERY_COMPLETED', 'SUBMITTED']
    eventsRaw.map(event => {
      if ( !ignoredStatus.includes(event.payload.status) )
        events[event.payload.status] = {...event, event: undefined}
    })
    data.quest = events.READY.payload.created_quest
    data.events = events
  }

  return res.send({data, error,});
});

router.post('/jwt', async (req, res) => {
  const { org } = req.body || {};

  try {
    let id;
    // if (!isAdmin()) {
    //   ({ id } = await findOne({ org }) || {org: adminToken});

    //   if (!id) {
    //     return res.status(401).send({ org, error: 'Org not found' });
    //   }
    // }

    const jwtInfo = {
      admin: isAdmin(),
      companyId: id || 0,
      org: withAuth ? org : (org || adminToken),
    };
    const accessToken = sign(jwtInfo);
    return res.send({
      access_token: accessToken,
      org,
      token_type: 'Bearer',
    });
  } catch (e) {
    console.error('v1', '/jwt', e);
  }

  return res.status(401).send({ org, error: 'Await not public account and right password' });
});

/**
 * Fetch iOS simulator city_drive route
 */
router.get('/data/city_drive', async (req, res) => {
  console.log('v1: GET /data/city_drive.json'.green);
  fs.readFile('./data/city_drive.json', 'utf8', (_err, data) => {
    res.send(data);
  });
});

export default router;
