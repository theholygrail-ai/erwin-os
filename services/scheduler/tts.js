const { logger } = require('@erwin-os/shared/logger');
const { config } = require('@erwin-os/shared/config');

async function generateStandupAudio(text) {
  try {
    return await generateWithGoogleTTS(text);
  } catch (err) {
    logger.warn('tts', 'Google TTS failed, trying AWS Polly', { error: err.message });
    try {
      return await generateWithPolly(text);
    } catch (pollyErr) {
      logger.error('tts', 'All TTS engines failed', { error: pollyErr.message });
      return null;
    }
  }
}

async function generateWithGoogleTTS(text) {
  const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
  const client = new TextToSpeechClient();

  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice: {
      languageCode: 'en-US',
      name: 'en-US-Neural2-D',
      ssmlGender: 'MALE',
    },
    audioConfig: {
      audioEncoding: 'OGG_OPUS',
      speakingRate: 1.05,
      pitch: -1.0,
    },
  });

  return response.audioContent;
}

async function generateWithPolly(text) {
  const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');
  const polly = new PollyClient({ region: config.aws.region });

  const chunks = splitTextForPolly(text);
  const audioBuffers = [];

  for (const chunk of chunks) {
    const result = await polly.send(new SynthesizeSpeechCommand({
      Text: chunk,
      OutputFormat: 'ogg_vorbis',
      VoiceId: 'Matthew',
      Engine: 'neural',
    }));

    const buffer = await streamToBuffer(result.AudioStream);
    audioBuffers.push(buffer);
  }

  return Buffer.concat(audioBuffers);
}

function splitTextForPolly(text, maxLength = 3000) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }
    let splitPoint = remaining.lastIndexOf('. ', maxLength);
    if (splitPoint === -1) splitPoint = maxLength;
    else splitPoint += 2;
    chunks.push(remaining.substring(0, splitPoint));
    remaining = remaining.substring(splitPoint);
  }
  return chunks;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = { generateStandupAudio };
