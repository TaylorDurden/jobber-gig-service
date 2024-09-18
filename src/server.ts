import http from 'http';

import { Application, Request, Response, NextFunction, json, urlencoded } from 'express';
import { Channel } from 'amqplib';
import hpp from 'hpp';
import helmet from 'helmet';
import cors from 'cors';
import { verify } from 'jsonwebtoken';
import compression from 'compression';
import { CustomError, IAuthPayload, IErrorResponse, winstonLogger } from '@taylordurden/jobber-shared';
import { config } from '@gig/config';
import { checkConnection, createIndex } from '@gig/elasticsearch';
import { useAppRoutes } from '@gig/routes';
import { createMQConnection } from '@gig/queues/connection';
import { consumeGigDirectMessage, consumeSeedDirectMessages } from '@gig/queues/gig.consumer';

const SERVER_PORT = 4004;
const log = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'gigServer', 'debug');
let gigChannel: Channel;

const start = (app: Application): void => {
  securityMiddleware(app);
  standardMiddleware(app);
  routesMiddleware(app);
  startQueues();
  startElasticSearch();
  gigErrorHandler(app);
  startServer(app);
};

function securityMiddleware(app: Application) {
  app.set('trust proxy', 1);
  app.use(hpp());
  app.use(helmet());
  app.use(
    cors({
      origin: config.API_GATEWAY_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    })
  );
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      const payload: IAuthPayload = verify(token, config.JWT_TOKEN!) as IAuthPayload;
      req.currentUser = payload;
    }
    next();
  });
}

function standardMiddleware(app: Application) {
  app.use(compression());
  app.use(json({ limit: '200mb' }));
  app.use(urlencoded({ extended: true, limit: '200mb' }));
}

function routesMiddleware(app: Application) {
  useAppRoutes(app);
}

async function startQueues() {
  gigChannel = (await createMQConnection()) as Channel;
  await consumeGigDirectMessage(gigChannel);
  await consumeSeedDirectMessages(gigChannel);
}

function startElasticSearch() {
  checkConnection();
  createIndex('gigs');
}

function gigErrorHandler(app: Application) {
  app.use((error: IErrorResponse, _req: Request, res: Response, next: NextFunction) => {
    log.log('error', `GigService ${error.comingFrom}:`, error);
    if (error instanceof CustomError) {
      res.status(error.statusCode).json(error.serializeErrors());
    }
    next();
  });
}

function startServer(app: Application) {
  try {
    const httpServer: http.Server = new http.Server(app);
    log.info(`Gig server has started with process id ${process.pid}`);
    httpServer.listen(SERVER_PORT, () => {
      log.info(`Gig server running on port ${SERVER_PORT}`);
    });
  } catch (error) {
    log.log('error', 'GigService startServer() method error:', error);
  }
}

export { start, gigChannel };
