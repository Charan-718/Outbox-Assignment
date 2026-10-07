import { Client } from '@elastic/elasticsearch';
import { config } from './env';

export const esClient = new Client({
  node: config.elasticsearch.node,
  // Add resilient timeout
  maxRetries: 3,
  requestTimeout: 5000,
});

export const ES_INDEX_NAME = config.elasticsearch.index;

export async function initElasticsearch() {
  try {
    const ping = await esClient.ping();
    if (!ping) {
      console.warn('[Elasticsearch] Ping failed. Search fallback to PostgreSQL enabled.');
      return false;
    }

    const indexExists = await esClient.indices.exists({ index: ES_INDEX_NAME });

    if (!indexExists) {
      await esClient.indices.create({
        index: ES_INDEX_NAME,
        body: {
          settings: {
            analysis: {
              analyzer: {
                email_analyzer: {
                  type: 'custom',
                  tokenizer: 'uax_url_email',
                  filter: ['lowercase'],
                },
              },
            },
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              recipient: {
                type: 'text',
                analyzer: 'email_analyzer',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              senderEmail: {
                type: 'text',
                analyzer: 'email_analyzer',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              subject: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              body: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
      console.log(`[Elasticsearch] Index "${ES_INDEX_NAME}" created successfully.`);
    } else {
      console.log(`[Elasticsearch] Index "${ES_INDEX_NAME}" already exists.`);
    }

    return true;
  } catch (err: any) {
    console.warn(`[Elasticsearch] Initialization warning: ${err.message}. Full-text search fallback enabled.`);
    return false;
  }
}
