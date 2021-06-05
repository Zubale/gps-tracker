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
  events: any,
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
  events,
}: Props) => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const hide_drawer = urlParams.get('hide_drawer');
  const has_token = token != null && String(token).length

  const [tabIndex, setTabIndex] = useState(activeTabIndex);
  const [open, setOpen] = React.useState(hide_drawer === '1' || has_token > 0 ? false : true);
  const classes = useStyles();

  let details = []

  if ( has_token && quest ) {
    details.push({title: "Orden", value: quest.pickingAndDelivery.externalOrderId})
    details.push({title: "Referencia", value: quest.pickingAndDelivery.checkoutNote || quest.pickingAndDelivery.externalOrderId})
    details.push({title: "Tienda que despacha", value: `${quest.store.retailer.name} ${quest.store.name}`})
    details.push({title: "Hora de entrega", value: moment(quest.pickingAndDelivery.deliveryWindowEndTime).subtract(2, 'hours').format('LLL') + ' - ' + moment(quest.pickingAndDelivery.deliveryWindowEndTime).format('LLL')})
    details.push({title: "Tipo de pago", value: quest.pickingAndDelivery.paymentInfo ? quest.pickingAndDelivery.paymentInfo.paymentMode : ''})

    // details.push({title: "Detalles de entrega", value: ''})

    console.log({events})
    if ( events ) {
      console.log({events})
      if ( events['TASK_ASSIGNED'] ) {
        let event = events['TASK_ASSIGNED']
        let {shopperDetails} = event.payload
        if ( shopperDetails.vehicle ) {
          details.push({title: 'Repartidor', value: `${shopperDetails.firstName} ${shopperDetails.lastName}`})
          details.push({title: 'Vehículo del repartidor', value: `${shopperDetails.vehicle.model} ${shopperDetails.vehicle.licensePlateNumber} ${shopperDetails.vehicle.year}`})
        }
      }
    }
    
    details.push({title: "Cliente", value: quest.pickingAndDelivery.customerInfo.name})
    details.push({title: "Dirección de entrega", value: quest.pickingAndDelivery.customerInfo.address})
    if ( quest.deliveryDistance )
      details.push({title: "Distancia aproximada", value: (quest.deliveryDistance || 'N/A') + ' Kms'})
    details.push({title: "Teléfono de cliente", value: quest.pickingAndDelivery.customerInfo.phoneNumber})
  }

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
                <div style={{background: '#dadada', borderRadius: 19, overflow: 'hidden', border: 'solid 12px #d8d8d8'}}>
                  {
                    details.map((detail, index) => 
                    <div style={{marginBottom: 1, width: '100%', display: 'flex', backgroundColor: index % 2 ? '#ffffff' : '#f7f7f7', padding: 7}}>
                      <div style={{width: 140, fontSize: 14}}>
                        <b>{detail.title.toUpperCase()}</b>
                      </div>
                      <div style={{display: 'flex', flex: 1}}>
                      {detail.value}
                      </div>
                    </div>)
                  }
                </div>
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
  events: state.dashboard.events,
});
const mapDispatchToProps: DispatchProps = {
  onChangeActiveTab: changeActiveTab,
  logout: logoutAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(Viewport);
