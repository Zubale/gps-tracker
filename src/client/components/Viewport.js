// @flow
import React, { useState } from 'react';
import { connect } from 'react-redux';
import clsx from 'classnames';
import CssBaseline from '@material-ui/core/CssBaseline';
import Drawer from '@material-ui/core/Drawer';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import IconButton from '@material-ui/core/IconButton';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';

import type { GlobalState } from 'reducer/state';
import {
  changeActiveTab,
  type Tab as TabType,
  type Location,
} from 'reducer/dashboard';

import { logout as logoutAction } from 'reducer/auth';

import moment from 'moment'
import HeaderView from './HeaderView';
import FilterView from './FilterView';
import TabPanel from './TabPanel';
import LocationView, { getLocation } from './LocationView';
import MapView from './MapView';
import ListView from './ListView';
import LoadingIndicator from './LoadingIndicator';
import WatchModeWarning from './WatchModeWarning';
import useStyles from './ViewportStyle';
import TooManyPointsWarning from './TooManyPointsWarning';

type StateProps = {|
  isLocationSelected: boolean,
  activeTabIndex: 0 | 1,
  location: ?Location,
  quest: ?Object,
|};
type DispatchProps = {|
  onChangeActiveTab: (tab: TabType) => any,
|};
const shared = !!process.env.SHARED_DASHBOARD;
type Props = {|
  ...StateProps,
  ...DispatchProps,
|};

const Viewport = ({
  activeTabIndex,
  accessToken,
  location,
  logout,
  quest,
}: Props) => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const hide_drawer = urlParams.get('hide_drawer');
  const has_token = token != null && String(token).length

  const [tabIndex, setTabIndex] = useState(activeTabIndex);
  const [open, setOpen] = React.useState(hide_drawer === '1' || has_token > 0 ? false : true);
  const classes = useStyles();

  const details = has_token && quest ? [
    {title: "Orden", value: quest.pickingAndDelivery.externalOrderId},
    {title: "Referencia", value: quest.pickingAndDelivery.checkoutNote || quest.pickingAndDelivery.externalOrderId},
    {title: "Hora de entrega", value: moment(quest.pickingAndDelivery.deliveryWindowEndTime).format('LLL')},
    {title: "Tienda que despacha", value: `${quest.store.retailer.name} ${quest.store.name}`},

    {title: "Cliente", value: quest.pickingAndDelivery.customerInfo.name},
    {title: "Dirección", value: quest.pickingAndDelivery.customerInfo.address},
    {title: "Distancia aproximada", value: (quest.deliveryDistance || 'N/A') + ' Kms'},
    {title: "Teléfono", value: quest.pickingAndDelivery.customerInfo.phoneNumber},
    
    {title: "Tipo de pago", value: quest.pickingAndDelivery.paymentInfo.paymentMode},

    
  ] : []

  return (
    <div className={classes.root}>
      <CssBaseline />
      <HeaderView
        classes={classes}
        setOpen={setOpen}
        location={location}
        open={open}
        showMenu={!has_token}
      >
        <div className={classes.actionRow}>
          <Tabs
            TabIndicatorProps={{ style: { background: "#FFFD37", height: 4 } }}
            className={classes.tabs}
            value={tabIndex}
            onChange={(e: Event, index: number) => setTabIndex(index)}
          >
            <Tab label='Mapa' />
            <Tab label={has_token ? 'Información' : 'Coordenadas'} />
          </Tabs>
          {/* {accessToken && shared && (
            <IconButton onClick={logout} className={classes.logout} aria-label='logout'>
              <ExitToAppIcon />
            </IconButton>
          )} */}
        </div>
      </HeaderView>
      {
        !has_token && 
        <Drawer
          className={classes.drawer}
          variant='persistent'
          anchor='left'
          open={open}
          classes={{ paper: classes.drawerPaper }}
        >
          <FilterView setOpen={setOpen} />
        </Drawer>
      }
      <main
        className={clsx(classes.content, {
          [classes.contentShift]: open,
          [classes.contentShiftLocation]: !!location,
        })}
      >
        <LoadingIndicator />
        <TooManyPointsWarning />
        <TabPanel value={tabIndex} index={0} className={classes.tabPanel}>
          <MapView open={open} />
        </TabPanel>
        <TabPanel
          value={tabIndex}
          index={1}
          className={clsx(
            classes.tabPanel,
            classes.overflowAuto,
            classes.whiteBackground,
          )}
        >
          {
            has_token ? 
              <div className={''} style={{padding: 20, maxWidth: 500,}}>
                <h3>DETALLES DE LA ORDEN</h3>
                {
                  details.map((detail, index) => 
                  <div style={{marginBottom: 1, width: '100%', display: 'flex', backgroundColor: index % 2 ? '#ffffff' : '#f0f0f0', padding: 5}}>
                    <div style={{width: 100}}>
                      {detail.title}
                    </div>
                    <div style={{display: 'flex', flex: 1}}>
                    {detail.value}
                    </div>
                  </div>)
                }
              </div>
            :
            [
              <WatchModeWarning />,
              <ListView style={{ width: 1300 }} />
            ]
          }
          
        </TabPanel>
      </main>
      <Drawer
        className={classes.locationDrawer}
        variant='persistent'
        anchor='right'
        open={!!location}
        classes={{ paper: classes.drawerLocationPaper }}
      >
        <LocationView classes={classes} />
      </Drawer>
    </div>
  );
};

const mapStateToProps = (state: GlobalState): StateProps => ({
  accessToken: state.auth.accessToken,
  activeTabIndex: state.dashboard.activeTab === 'map' ? 0 : 1,
  isLocationSelected: !!state.dashboard.selectedLocationId,
  location: getLocation(state),
  quest: state.dashboard.quest,
});
const mapDispatchToProps: DispatchProps = {
  onChangeActiveTab: changeActiveTab,
  logout: logoutAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(Viewport);
