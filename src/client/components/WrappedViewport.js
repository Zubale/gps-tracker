// @flow
import React, { useEffect } from 'react';
import { connect } from 'react-redux';

import queryString from 'query-string';
import isUndefined from 'lodash/isUndefined';
import omitBy from 'lodash/omitBy';
import type { GlobalState } from 'reducer/state';
import { prepareView as prepareAction } from 'reducer/auth';

import Viewport from './Viewport';
import Loading from './Loading';
import AuthForm from './AuthForm';

type StateProps = {|
  org: string,
  match: { params?: { token: string } },
  prepare: (string) => void,
  loading: boolean,
|};
const shared = !!process.env.SHARED_DASHBOARD;

export const base64 = {_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/\r\n/g,"\n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}}

const WrappedViewport = ({
  loading,
  match,
  org,
  prepare,
}: StateProps) => {
  let { token } = match.params;

  const urlParams = new URLSearchParams(window.location.search);
  const urlParamsToken = urlParams.get('token');
  const has_token = urlParamsToken != null && String(urlParamsToken).length

  const params = queryString.parse(window.location.search);
  let result = omitBy(
    {
      token: params.token,
      deviceId: params.user,
      startDate: params.start,
      endDate: params.end,
    },
    isUndefined,
  );
  console.log('result 1', result)
  if ( !result.token && !result.deviceId && !result.startDate && !result.endDate){
    console.log('some alert, really we don\'t have issues')
    window.location.replace("https://zubale.com");
  }

  if ( !token && has_token && String(urlParamsToken).length == 24 ) { // quest id
    token = 'zubale'
  }

  const isAdminPath = token === 'admin';
  const hasToken = (!!org || (!isAdminPath && !!token));

  useEffect(() => {
    prepare(token);
  }, [token, org]);

  return isAdminPath && !hasToken && shared
    ? <AuthForm />
    : (!loading ? <Viewport /> : <Loading />);
};

const mapStateToProps = (state: GlobalState): StateProps => (
  {
    accessToken: state.auth.accessToken,
    loading: state.auth.loading,
    org: state.auth.org,
  }
);

export default connect(
  mapStateToProps,
  { prepare: prepareAction },
)(WrappedViewport);
