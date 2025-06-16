import * as express from 'express';
import * as morgan from 'morgan';
import Options from './class/options';
import { renderStreamingConfig } from './config';

const cors = require('cors');

export const createServer = (config: Options): express.Application => {
  const app: express.Application = express();

  if (config.logging != "none") {
    app.use(morgan(config.logging));
  }

  app.use(cors({origin: '*'}));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.post('/api/numberOfStreams', (req, res) => {
    const { numberOfStreams } = req.body;
    if (typeof numberOfStreams !== 'number' || numberOfStreams <= 0) {
      return res.status(400).json({ success: false, message: 'numberOfStreams 必须为正整数' });
    }
    renderStreamingConfig.numberOfStreams = numberOfStreams;
    res.json({ success: true, numberOfStreams });
  });

  app.get('/api/numberOfStreams', (req, res) => {
    res.json({ numberOfStreams: renderStreamingConfig.numberOfStreams });
  });

  return app;
};
