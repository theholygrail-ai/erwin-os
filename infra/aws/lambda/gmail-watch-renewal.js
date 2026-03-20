const { execSync } = require('child_process');
const path = require('path');

exports.handler = async (event) => {
  console.log('Gmail watch renewal triggered', JSON.stringify(event));

  try {
    const schedulerPath = path.resolve(__dirname, '../../../services/scheduler');
    execSync(`node ${schedulerPath}/index.js gmail-renew`, {
      timeout: 30000,
      stdio: 'inherit',
    });

    return { statusCode: 200, body: 'Gmail watch renewed' };
  } catch (err) {
    console.error('Gmail watch renewal failed:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
