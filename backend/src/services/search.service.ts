import { esClient, ES_INDEX_NAME } from '../config/elasticsearch';
import { prisma } from '../config/db';
import { EmailJob } from '@prisma/client';

export class SearchService {
  /**
   * Index or update a single email job in Elasticsearch
   */
  async indexEmail(job: EmailJob): Promise<boolean> {
    try {
      await esClient.index({
        index: ES_INDEX_NAME,
        id: job.id,
        document: {
          id: job.id,
          userId: job.userId,
          recipient: job.recipient,
          senderEmail: job.senderEmail,
          subject: job.subject,
          body: job.body,
          status: job.status,
          scheduledAt: job.scheduledAt.toISOString(),
          sentAt: job.sentAt ? job.sentAt.toISOString() : null,
          createdAt: job.createdAt.toISOString(),
        },
      });
      return true;
    } catch (err: any) {
      console.warn(`[Elasticsearch] Failed to index job ${job.id}:`, err.message);
      return false;
    }
  }

  /**
   * Bulk index multiple email jobs into Elasticsearch
   */
  async bulkIndexEmails(jobs: EmailJob[]): Promise<boolean> {
    if (jobs.length === 0) return true;

    try {
      const operations = jobs.flatMap((job) => [
        { index: { _index: ES_INDEX_NAME, _id: job.id } },
        {
          id: job.id,
          userId: job.userId,
          recipient: job.recipient,
          senderEmail: job.senderEmail,
          subject: job.subject,
          body: job.body,
          status: job.status,
          scheduledAt: job.scheduledAt.toISOString(),
          sentAt: job.sentAt ? job.sentAt.toISOString() : null,
          createdAt: job.createdAt.toISOString(),
        },
      ]);

      const response = await esClient.bulk({ operations });
      if (response.errors) {
        console.warn('[Elasticsearch] Some documents failed bulk indexing');
      }
      return true;
    } catch (err: any) {
      console.warn('[Elasticsearch] Bulk indexing error:', err.message);
      return false;
    }
  }

  /**
   * Remove document from Elasticsearch index
   */
  async deleteIndexedEmail(id: string): Promise<boolean> {
    try {
      await esClient.delete({
        index: ES_INDEX_NAME,
        id,
      });
      return true;
    } catch (err: any) {
      return false;
    }
  }

  /**
   * Search emails across recipient, sender, subject, and body.
   * Uses Elasticsearch full-text queries, with graceful fallback to PostgreSQL.
   */
  async searchEmails(params: {
    query?: string;
    status?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ emails: any[]; total: number; source: 'elasticsearch' | 'database' }> {
    const limit = params.limit || 50;
    const offset = params.offset || 0;

    // Try Elasticsearch search first
    try {
      const mustClauses: any[] = [];

      if (params.userId) {
        mustClauses.push({ term: { userId: params.userId } });
      }

      if (params.status) {
        mustClauses.push({ term: { status: params.status } });
      }

      if (params.query && params.query.trim().length > 0) {
        const q = params.query.trim();
        mustClauses.push({
          multi_match: {
            query: q,
            fields: ['subject^3', 'recipient^2', 'senderEmail^2', 'body'],
            fuzziness: 'AUTO',
            prefix_length: 2,
          },
        });
      }

      const esResult = await esClient.search({
        index: ES_INDEX_NAME,
        from: offset,
        size: limit,
        sort: [{ scheduledAt: { order: 'desc' } }],
        query: mustClauses.length > 0 ? { bool: { must: mustClauses } } : { match_all: {} },
      });

      const hits = esResult.hits.hits;
      const totalHits = typeof esResult.hits.total === 'number' ? esResult.hits.total : esResult.hits.total?.value || 0;

      // Extract ids and fetch full DB records to include all metadata (e.g. ethereal preview URLs)
      const ids = hits.map((h: any) => h._id);
      if (ids.length === 0) {
        return { emails: [], total: 0, source: 'elasticsearch' };
      }

      const dbRecords = await prisma.emailJob.findMany({
        where: { id: { in: ids } },
      });

      // Preserve ES relevance order
      const recordMap = new Map(dbRecords.map((r) => [r.id, r]));
      const sortedEmails = ids.map((id) => recordMap.get(id)).filter(Boolean);

      return {
        emails: sortedEmails,
        total: totalHits,
        source: 'elasticsearch',
      };
    } catch (esError: any) {
      console.warn('[Elasticsearch] Search query failed, falling back to PostgreSQL:', esError.message);

      // Resilient fallback to PostgreSQL
      const where: any = {};
      if (params.userId) where.userId = params.userId;
      if (params.status) where.status = params.status;

      if (params.query && params.query.trim().length > 0) {
        const q = params.query.trim();
        where.OR = [
          { subject: { contains: q, mode: 'insensitive' } },
          { recipient: { contains: q, mode: 'insensitive' } },
          { senderEmail: { contains: q, mode: 'insensitive' } },
          { body: { contains: q, mode: 'insensitive' } },
        ];
      }

      const [total, emails] = await Promise.all([
        prisma.emailJob.count({ where }),
        prisma.emailJob.findMany({
          where,
          orderBy: { scheduledAt: 'desc' },
          skip: offset,
          take: limit,
        }),
      ]);

      return {
        emails,
        total,
        source: 'database',
      };
    }
  }
}

export const searchService = new SearchService();
