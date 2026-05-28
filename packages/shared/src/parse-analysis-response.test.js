import { describe, it, expect } from 'vitest';
import {
  parseAnalysisResponse,
  AnalysisResponseError,
} from './parse-analysis-response.js';
import { EXAMPLE_RESPONSE } from './example-data.js';

const VALID_JSON = JSON.stringify(EXAMPLE_RESPONSE);
const FENCED = '```json\n' + VALID_JSON + '\n```';
const FENCED_NO_LANG = '```\n' + VALID_JSON + '\n```';
const WITH_PROSE =
  'Aqui está sua análise:\n\n' + VALID_JSON + '\n\nEspero ter ajudado.';

describe('parseAnalysisResponse', () => {
  it('parses unfenced JSON into the canonical envelope', () => {
    // Arrange
    const input = VALID_JSON;

    // Act
    const out = parseAnalysisResponse(input);

    // Assert
    expect(out.metadata.total_duration).toBe('09:55');
    expect(out.analysis_summary.top_moments_selected).toBe(5);
    expect(out.top_moments).toHaveLength(5);
    expect(out.top_moments[0].hook_title).toBe(
      EXAMPLE_RESPONSE.top_moments[0].hook_title,
    );
  });

  it('strips ```json fences before parsing', () => {
    // Arrange
    const input = FENCED;

    // Act
    const out = parseAnalysisResponse(input);

    // Assert
    expect(out.top_moments).toHaveLength(5);
  });

  it('strips bare ``` fences (no language tag)', () => {
    // Arrange + Act
    const out = parseAnalysisResponse(FENCED_NO_LANG);

    // Assert
    expect(out.top_moments).toHaveLength(5);
  });

  it('slices from first { to last } when surrounded by prose', () => {
    // Arrange + Act
    const out = parseAnalysisResponse(WITH_PROSE);

    // Assert
    expect(out.metadata.overall_topic).toBe(EXAMPLE_RESPONSE.metadata.overall_topic);
  });

  it('slices top_moments down to exactly 5 entries', () => {
    // Arrange
    const oversized = {
      ...EXAMPLE_RESPONSE,
      top_moments: [
        ...EXAMPLE_RESPONSE.top_moments,
        { ...EXAMPLE_RESPONSE.top_moments[0], rank: 6 },
        { ...EXAMPLE_RESPONSE.top_moments[0], rank: 7 },
      ],
    };

    // Act
    const out = parseAnalysisResponse(JSON.stringify(oversized));

    // Assert
    expect(out.top_moments).toHaveLength(5);
    expect(out.top_moments[4].rank).toBe(5);
  });

  it('throws AnalysisResponseError with code=no_json_braces on plain prose', () => {
    // Arrange
    const input = 'apenas texto sem JSON';

    // Act + Assert
    expect.assertions(2);
    try {
      parseAnalysisResponse(input);
    } catch (err) {
      expect(err).toBeInstanceOf(AnalysisResponseError);
      expect(err.code).toBe('no_json_braces');
    }
  });

  it('throws code=invalid_json on malformed JSON body', () => {
    // Arrange — has `{` and `}` so slice succeeds, but body is not valid JSON
    const input = '{ this is not valid json at all }';

    // Act + Assert
    expect(() => parseAnalysisResponse(input)).toThrow(AnalysisResponseError);
    try {
      parseAnalysisResponse(input);
    } catch (err) {
      expect(err.code).toBe('invalid_json');
    }
  });

  it('throws code=missing_top_moments when key absent', () => {
    // Arrange
    const input = JSON.stringify({
      metadata: EXAMPLE_RESPONSE.metadata,
      analysis_summary: EXAMPLE_RESPONSE.analysis_summary,
    });

    // Act + Assert
    try {
      parseAnalysisResponse(input);
    } catch (err) {
      expect(err.code).toBe('missing_top_moments');
      expect(err.message).not.toContain(EXAMPLE_RESPONSE.metadata.overall_topic);
    }
  });

  it('throws code=missing_metadata when metadata key absent', () => {
    // Arrange
    const { metadata: _ignored, ...rest } = EXAMPLE_RESPONSE;

    // Act + Assert
    try {
      parseAnalysisResponse(JSON.stringify(rest));
    } catch (err) {
      expect(err.code).toBe('missing_metadata');
    }
  });

  it('throws code=top_moments_not_array when shape wrong', () => {
    // Arrange
    const broken = { ...EXAMPLE_RESPONSE, top_moments: 'not-an-array' };

    // Act + Assert
    try {
      parseAnalysisResponse(JSON.stringify(broken));
    } catch (err) {
      expect(err.code).toBe('top_moments_not_array');
    }
  });

  it('throws code=empty_input on empty string', () => {
    // Arrange + Act + Assert
    try {
      parseAnalysisResponse('');
    } catch (err) {
      expect(err.code).toBe('empty_input');
    }
  });

});
