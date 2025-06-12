import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import * as morgan from 'morgan';
import { log, LogLevel } from './log';
import Options from './class/options';
import { reset as resetHandler }from './class/httphandler';

const cors = require('cors');

export const createServer = (config: Options): express.Application => {
  const app: express.Application = express();
  resetHandler(config.mode);

  if (config.logging != "none") {
    app.use(morgan(config.logging));
  }

  app.use(cors({origin: '*'}));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  
  // app.use('/signaling', signaling);

  app.use(express.static(path.join(__dirname, '../client/public')));

  app.use('/module', express.static(path.join(__dirname, '../client/src')));

  app.get('/', (req, res) => {
    const indexPagePath: string = path.join(__dirname, '../client/public/index.html');
    fs.access(indexPagePath, (err) => {
      if (err) {
        log(LogLevel.warn, `Can't find file ' ${indexPagePath}`);
        res.status(404).send(`Can't find file ${indexPagePath}`);
      } else {
        res.sendFile(indexPagePath);
      }
    });
  });
  
  return app;
};
