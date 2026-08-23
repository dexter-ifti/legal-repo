import { z } from 'zod';

/**
 * Minimal LLM client for semantic tasks (spec §24-§26).
 * Used ONLY for classification/metadata normalization — never trivial
 * string cleanup. Fully decoupled from any future legal-RAG model.
 *
 * Degrades gracefully: without MISTRAL_API_KEY every call returns null
 * and the pipeline completes with raw text + regex metadata only.
 */

export interface SegmentClassification {
  segment_type: string;
  title: string | null;
  court: string | null;
  petitioners: string[] | null;
  respondents: string[] | null;
  language: string | null;
  confidence: number;
}

const ClassificationSchema = z.object({
  segment_type: z.string().min(2).max(60),
  title: z.string().max(200).nullable().optional(),
  court: z.string().max(200).nullable().optional(),
  petitioners: z.array(z.string().min(1)).nullable().optional(),
  respondents: z.array(z.string().min(1)).nullable().optional(),
  language: z.enum(['en', 'hi', 'mixed']).nullable().optional(),
  confidence: z.number().min(0).max(1),
});

export class MistralSmallClient {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api.mistral.ai/v1/chat/completions';

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.MISTRAL_API_KEY || '';
    this.model = model || process.env.MISTRAL_SMALL_MODEL || 'mistral-small-latest';
  }

  get available(): boolean {
    return !!this.apiKey && process.env.NODE_ENV !== 'test';
  }

  /**
   * Sends a structured-output request and validates the response against a
   * zod schema. Returns null on any failure — callers must treat null as
   * "semantic enrichment unavailable" and proceed deterministically.
   */
  async completeJson<T extends z.ZodTypeAny>(
    systemPrompt: string,
    userPrompt: string,
    schema: T
  ): Promise<z.infer<T> | null> {
    if (!this.available) {
      return null;
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return null;
      }

      const parsed = schema.safeParse(JSON.parse(content));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  /**
   * Classifies one logical document segment from its opening pages.
   * The model must not invent values — unknown fields are null.
   */
  async classifySegment(
    segmentTitleHint: string,
    openingPagesText: string
  ): Promise<SegmentClassification | null> {
    const result = await this.completeJson(
      'You are a legal document analysis assistant for Indian court documents. Extract structured metadata from the provided document text. Never invent values; use null when information is not reliably present.',
      `The following text comes from the start of a legal document${segmentTitleHint ? ` (possibly titled "${segmentTitleHint}")` : ''}. Classify it.\n\nReturn JSON with keys: segment_type (snake_case document type like writ_petition, affidavit, vakalatnama, caveat_application, court_order, government_letter, receipt, annexure, pleading), title, court, petitioners (array of names or null), respondents (array of names or null), language ("en", "hi", or "mixed"), confidence (0-1).\n\nDocument text:\n"""\n${openingPagesText.slice(0, 8000)}\n"""`,
      ClassificationSchema
    );

    if (!result) return null;

    return {
      segment_type: result.segment_type.toLowerCase().replace(/\s+/g, '_'),
      title: result.title ?? null,
      court: result.court ?? null,
      petitioners: result.petitioners ?? null,
      respondents: result.respondents ?? null,
      language: result.language ?? null,
      confidence: result.confidence,
    };
  }
}
