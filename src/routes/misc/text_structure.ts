import { Router } from 'express';

export function createTextStructureRouter() {
  const router = Router();

  router.get('/_text_structure/find_field_structure', (req, res) => {
    res.json({
      num_lines_analyzed: 3,
      num_messages_analyzed: 3,
      sample_start: '',
      charset: 'UTF-8',
      has_header_row: true,
      has_byte_order_marker: false,
      format: 'delimited',
      field_stats: {},
    });
  });

  router.post('/_text_structure/find_message_structure', (req, res) => {
    res.json({
      num_lines_analyzed: 3,
      num_messages_analyzed: 3,
      sample_start: '',
      charset: 'UTF-8',
      format: 'semi_structured_text',
    });
  });

  router.post('/_text_structure/find_structure', (req, res) => {
    res.json({
      num_lines_analyzed: 3,
      num_messages_analyzed: 3,
      sample_start: '',
      charset: 'UTF-8',
      format: 'ndjson',
    });
  });

  router.post('/_text_structure/test_grok_pattern', (req, res) => {
    res.json({
      matches: [
        {
          matched: true,
          fields: {
            first_name: [{ match: 'Dave', offset: 8, length: 4 }],
            last_name: [{ match: 'Roberts', offset: 13, length: 7 }],
          },
        },
        { matched: false },
      ],
    });
  });

  return router;
}
