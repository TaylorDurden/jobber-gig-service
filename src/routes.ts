// import { verifyGatewayRequest } from '@taylordurden/jobber-shared';
import { Application } from 'express';
import { healthRoutes } from '@gig/routes/health';
import { verifyGatewayRequest } from '@taylordurden/jobber-shared';
import { gigRoutes } from '@gig/routes/gig';

const BASE_PATH = '/api/v1/gig';

const useAppRoutes = (app: Application): void => {
  app.use('', healthRoutes());
  app.use(BASE_PATH, verifyGatewayRequest, gigRoutes());
};

export { useAppRoutes };
