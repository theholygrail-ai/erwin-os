const { Router } = require('express');
const { dynamoClient, s3Client } = require('@erwin-os/shared/aws-clients');
const { config } = require('@erwin-os/shared/config');
const { logger } = require('@erwin-os/shared/logger');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const artifacts = await dynamoClient.scan(config.aws.tables.artifacts);
    artifacts.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    res.json({ artifacts, total: artifacts.length });
  } catch (err) {
    logger.error('api-artifacts', 'Failed to list artifacts', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const artifact = await dynamoClient.get(config.aws.tables.artifacts, { artifact_id: req.params.id });
    if (!artifact) return res.status(404).json({ error: 'Artifact not found' });
    res.json(artifact);
  } catch (err) {
    logger.error('api-artifacts', 'Failed to get artifact', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/content', async (req, res) => {
  try {
    const artifact = await dynamoClient.get(config.aws.tables.artifacts, { artifact_id: req.params.id });
    if (!artifact) return res.status(404).json({ error: 'Artifact not found' });

    const s3Key = artifact.s3_uri.replace(`s3://${config.aws.s3Bucket}/`, '');
    const content = await s3Client.getObject(s3Key);

    const contentType = artifact.type === 'markdown' ? 'text/markdown' :
                        artifact.type === 'pdf' ? 'application/pdf' :
                        'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.send(content);
  } catch (err) {
    logger.error('api-artifacts', 'Failed to get artifact content', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
