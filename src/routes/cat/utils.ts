export const formatResults = (res: any, req: any, data: any[], headers: string[]) => {
  const isJson = req.query.format === 'json';
  if (isJson) {
    return res.json(data);
  }

  const isVerbose = req.query.v !== undefined;
  let output = '';

  if (isVerbose) {
    output += headers.join('\t') + '\n';
  }

  data.forEach((row) => {
    output += headers.map((h) => row[h]).join('\t') + '\n';
  });

  res.type('text/plain').send(output);
};
