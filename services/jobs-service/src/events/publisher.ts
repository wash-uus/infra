import { PubSub } from '@google-cloud/pubsub';
import { env } from '../config/env';
import { logger } from '../config/logger';

export const Topics = {
  JOB_CREATED:          env.PUBSUB_JOB_CREATED_TOPIC,
  JOB_UPDATED:          env.PUBSUB_JOB_UPDATED_TOPIC,
  APPLICATION_CREATED:  env.PUBSUB_APPLICATION_CREATED_TOPIC,
} as const;

let pubsub: PubSub | null = null;

function getPubSub(): PubSub {
  if (!pubsub) pubsub = new PubSub({ projectId: env.GCP_PROJECT_ID });
  return pubsub;
}

export async function ensureTopics(): Promise<void> {
  const ps = getPubSub();
  for (const topicName of Object.values(Topics)) {
    try {
      await ps.createTopic(topicName);
      logger.info(`Pub/Sub topic ensured: ${topicName}`);
    } catch (err: any) {
      if (err.code !== 6) { // 6 = ALREADY_EXISTS
        logger.warn(`Cannot create topic ${topicName}`, { error: err.message });
      }
    }
  }
}

export async function publish(
  topicName: string,
  data: Record<string, any>,
): Promise<void> {
  const ps = getPubSub();
  const msg = Buffer.from(JSON.stringify({ ...data, source: 'jobs-service', ts: Date.now() }));
  await ps.topic(topicName).publishMessage({ data: msg });
  logger.debug('Published Pub/Sub message', { topic: topicName });
}

export async function closePubSub(): Promise<void> {
  if (pubsub) {
    await pubsub.close();
    pubsub = null;
  }
}
