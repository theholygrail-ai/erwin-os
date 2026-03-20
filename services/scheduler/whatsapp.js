const { config } = require('@erwin-os/shared/config');
const { logger } = require('@erwin-os/shared/logger');
const { s3Client } = require('@erwin-os/shared/aws-clients');

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';

async function sendWhatsAppAudio(s3Key, standupText) {
  if (!config.whatsapp.accessToken || !config.whatsapp.phoneNumberId) {
    logger.warn('whatsapp', 'WhatsApp not configured, skipping');
    return;
  }

  try {
    const mediaId = await uploadMedia(s3Key);

    if (mediaId) {
      await sendAudioMessage(mediaId);
      logger.info('whatsapp', 'Audio message sent');
    } else {
      await sendTextMessage(standupText);
      logger.info('whatsapp', 'Fallback text message sent');
    }
  } catch (err) {
    logger.error('whatsapp', 'Failed to send WhatsApp message', { error: err.message });
    try {
      await sendTextMessage(standupText.substring(0, 4096));
    } catch {
      logger.error('whatsapp', 'Text fallback also failed');
    }
  }
}

async function uploadMedia(s3Key) {
  try {
    const audioContent = await s3Client.getObject(s3Key);
    const blob = new Blob([audioContent], { type: 'audio/ogg' });

    const formData = new FormData();
    formData.append('file', blob, 'standup.ogg');
    formData.append('type', 'audio/ogg');
    formData.append('messaging_product', 'whatsapp');

    const response = await fetch(
      `${WHATSAPP_API_URL}/${config.whatsapp.phoneNumberId}/media`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.whatsapp.accessToken}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Media upload failed: ${error}`);
    }

    const data = await response.json();
    return data.id;
  } catch (err) {
    logger.warn('whatsapp', 'Media upload failed', { error: err.message });
    return null;
  }
}

async function sendAudioMessage(mediaId) {
  const response = await fetch(
    `${WHATSAPP_API_URL}/${config.whatsapp.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.whatsapp.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: config.whatsapp.recipientNumber,
        type: 'audio',
        audio: { id: mediaId },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Audio message failed: ${error}`);
  }
}

async function sendTextMessage(text) {
  const response = await fetch(
    `${WHATSAPP_API_URL}/${config.whatsapp.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.whatsapp.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: config.whatsapp.recipientNumber,
        type: 'text',
        text: { body: text },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Text message failed: ${error}`);
  }
}

module.exports = { sendWhatsAppAudio, sendTextMessage };
