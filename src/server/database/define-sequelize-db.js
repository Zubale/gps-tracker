import path from 'path'; import Sequelize from 'sequelize';

import {
  isPostgres, pgConnectionString, firebaseURL,
} from '../config';

export default 
  new Sequelize(
    pgConnectionString, {
      dialect: 'postgres',
      protocol: 'postgres',
      dialectOptions: {}, //removed ssl
    })