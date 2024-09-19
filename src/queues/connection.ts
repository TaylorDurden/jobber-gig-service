import { config } from '@gig/config';
import { winstonLogger } from '@taylordurden/jobber-shared';
import client, { Channel, Connection } from 'amqplib';
import { Logger } from 'winston';

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'gigQueueConnection', 'debug');

async function createMQConnection(): Promise<Channel | undefined> {
  try {
    const connection: Connection = await client.connect(`${config.RABBITMQ_ENDPOINT}`);
    const channel: Channel = await connection.createChannel();
    log.info('Gig server connected to queue successfully...');
    closeMQConnection(channel, connection);
    return channel;
  } catch (error) {
    log.log('error', 'GigService createMQConnection() method error:', error);
    return undefined;
  }
}

function closeMQConnection(channel: Channel, connection: Connection): void {
  process.once('SIGINT', async () => {
    await channel.close();
    await connection.close();
  });
}

export { createMQConnection };
