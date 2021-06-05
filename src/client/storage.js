// @flow
import queryString from 'query-string';
import isUndefined from 'lodash/isUndefined';
import omitBy from 'lodash/omitBy';

import { type Tab } from 'reducer/state';
import { type AuthInfo, type AuthSettings } from 'reducer/types';
import cloneState from 'utils/cloneState';
import axios from 'axios'
import get from 'lodash/get';
import { API_URL } from './constants';

export type StoredSettings = {|
  activeTab: Tab,
  startDate: Date,
  endDate: Date,
  isWatching: boolean,
  deviceId: ?string,
  orgToken: string,
  showGeofenceHits: boolean,
  showPolyline: boolean,
  showMarkers: boolean,
  maxMarkers: number,
|};


const getLocalStorageKey = (key: string) => (key ? `settings#${key}` : 'settings');

export function getAuth(): AuthSettings {
  const encodedSettings = localStorage.getItem(getLocalStorageKey('auth'));
  if (encodedSettings) {
    const parsed = JSON.parse(encodedSettings);
    return parsed;
  }
  return null;
}

export function setAuth(settings: AuthSettings): AuthSettings {
  if (!settings) {
    return null;
  }
  localStorage.setItem(getLocalStorageKey('auth'), JSON.stringify(settings));

  return settings;
}

export function getSettings(key: string): $Shape<StoredSettings> {
  const encodedSettings = localStorage.getItem(getLocalStorageKey(key));
  if (encodedSettings) {
    const parsed = JSON.parse(encodedSettings);
    // convert start/endDate to Date if they are present
    const result = omitBy(
      cloneState(parsed, {
        startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
        endDate: parsed.endDate ? new Date(parsed.endDate) : undefined,
        showGeofenceHits: parsed.showGeofenceHits,
        showMarkers: parsed.showMarkers,
        showPolyline: parsed.showPolyline,
        maxMarkers: parsed.maxMarkers,
      }),
      isUndefined,
    );
    return result;
  }
  return {};
}

function parseStartDate(date: ?string) {
  if (!date) {
    return undefined;
  }
  if (new Date(date).toString() === 'Invalid Date') {
    return undefined;
  }
  return new Date(date);
}
function parseEndDate(date: ?string) {
  if (!date) {
    return undefined;
  }
  if (new Date(date).toString() === 'Invalid Date') {
    return undefined;
  }
  if (date.split(' ').length === 1) {
    return new Date(`${date} 23:59`);
  }
  return new Date(date);
}

function encodeStartDate(date: ?Date) {
  if (!date) {
    return undefined;
  }
  const y = date.getFullYear();
  const mon = date.getMonth() + 1;
  const d = date.getDate();
  const h = date.getHours();
  const min = date.getMinutes();
  if (h === 0 && min === 0) {
    return `${y}-${mon}-${d}`;
  }
  return `${y}-${mon}-${d} ${h}:${min}`;
}
function encodeEndDate(date: ?Date) {
  if (!date) {
    return undefined;
  }
  const y = date.getFullYear();
  const mon = date.getMonth() + 1;
  const d = date.getDate();
  const h = date.getHours();
  const min = date.getMinutes();
  if (h === 23 && min === 59) {
    return `${y}-${mon}-${d}`;
  }
  return `${y}-${mon}-${d} ${h}:${min}`;
}

export async function getUrlSettings(): $Shape<StoredSettings> {

  const params = queryString.parse(window.location.search);
  let result = omitBy(
    {
      token: params.token,
      deviceId: params.user,
      startDate: parseStartDate(params.start),
      endDate: parseEndDate(params.end),
    },
    isUndefined,
  );
  console.log('result', result)
  if ( !result.token && !result.deviceId && !result.startDate && !result.endDate){
    console.log('some alert, really we don\'t have issues')
    window.location.replace("https://zubale.com");
  }
  let quest = null
  let events = null
  console.log('result.token is', result.token)
  if ( result.token ) {
    try {
      try {
        const response = await axios.post(`${API_URL}/quest/token`, {token: result.token})
        quest = response.data.data.quest
        events = response.data.data.events
      } catch (e) {
        console.error('token error', e);
      }
      console.log('quest is', quest)
      console.log('events is', events)

    } catch (error) {
      console.log({error})
    }
  }
  if ( get(quest, 'pickingAndDelivery', false) ) {
    result.quest = quest
    result.events = events
    let startTime = quest.pickingAndDelivery.pickupWindowStartTime
    let entdTime = quest.pickingAndDelivery.deliveryWindowEndTime
    if ( events['READY_FOR_DELIVERY'] ) {
      startTime = events['READY_FOR_DELIVERY'].created_at
      console.log('we have READY_FOR_DELIVERY', startTime)
    } else if ( events['ENROUTE_TO_DROPOFF'] ) {
      startTime = events['ENROUTE_TO_DROPOFF'].created_at
      console.log('we have ENROUTE_TO_DROPOFF', startTime)
    }
    if ( events['AT_DROPOFF'] ) {
      entdTime = events['AT_DROPOFF'].created_at
      console.log('we have AT_DROPOFF', entdTime)
    }
    result.device_id = events['TASK_ASSIGNED'].payload.shopperDetails.id
    result.deviceId = events['TASK_ASSIGNED'].payload.shopperDetails.id
    result.startDate = new Date(startTime) //.replace('15:00', '12:00'))
    result.endDate = new Date(entdTime) //.replace('21:00', '20:41'))
    console.log('quest.pickingAndDelivery.pickupWindowStartTime', result.startDate)
    console.log('quest.pickingAndDelivery.deliveryWindowEndTime', result.endDate)
  }
  console.log('attention',{result})
  return result;
}
export function setUrlSettings(
  settings: {|
    deviceId: ?string,
    startDate: ?Date,
    endDate: ?Date,
    orgTokenFromSearch: string,
  |},
  auth: AuthInfo,
) {
  const {
    orgTokenFromSearch, startDate, endDate, deviceId,
  } = settings;
  const { accessToken, org } = auth;
  const shared = !!process.env.SHARED_DASHBOARD;
  const hasToken = accessToken || org;
  const mainPart = orgTokenFromSearch ? `/${orgTokenFromSearch}` : '';
  const search = {
    user: deviceId,
    end: encodeEndDate(endDate),
    start: encodeStartDate(startDate),
  };
  const url = `${!hasToken || shared ? mainPart : ''}?${queryString.stringify(search)}`;

  window.history.replaceState({}, '', url);
}

export function setSettings(key: string, settings: $Shape<StoredSettings>) {
  const existingSettings = getSettings(key);
  const newSettings = cloneState(existingSettings, settings);
  // convert start/endDate to string if they are present
  const stringifiedNewSettings = omitBy(
    {
      startDate: newSettings.startDate
        ? newSettings.startDate.toISOString()
        : undefined,
      endDate: newSettings.endDate
        ? newSettings.endDate.toISOString()
        : undefined,
      showGeofenceHits: newSettings.showGeofenceHits,
      showMarkers: newSettings.showMarkers,
      showPolyline: newSettings.showPolyline,
      maxMarkers: newSettings.maxMarkers,
    },
    isUndefined,
  );

  localStorage.setItem(
    getLocalStorageKey(key),
    JSON.stringify(stringifiedNewSettings),
  );
}
