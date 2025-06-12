import * as express from 'express';
import * as morgan from 'morgan';
import Options from './class/options';

const cors = require('cors');

export const createServer = (config: Options): express.Application => {
  const app: express.Application = express();

  if (config.logging != "none") {
    app.use(morgan(config.logging));
  }

  app.use(cors({origin: '*'}));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  return app;
};
