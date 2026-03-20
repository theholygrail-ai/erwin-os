const { Router } = require('express');
const { dynamoClient } = require('@erwin-os/shared/aws-clients');
const { config } = require('@erwin-os/shared/config');
const { logger } = require('@erwin-os/shared/logger');
const { JOB_STATUSES } = require('@erwin-os/schemas');

const router = Router();

router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const allJobs = await dynamoClient.scan(config.aws.tables.jobs);

    const todayJobs = allJobs.filter(j => j.created_at?.startsWith(today));
    const byStatus = {};
    for (const job of allJobs) {
      const status = job.status || 'unknown';
      if (!byStatus[status]) byStatus[status] = [];
      byStatus[status].push(job);
    }

    const standup = {
      date: today,
      generated_at: new Date().toISOString(),
      summary: {
        new_today: todayJobs.length,
        in_progress: (byStatus[JOB_STATUSES.IN_PROGRESS] || []).length,
        completed: (byStatus[JOB_STATUSES.COMPLETED] || []).length,
        verification_failed: (byStatus[JOB_STATUSES.VERIFICATION_FAILED] || []).length,
        awaiting_review: (byStatus[JOB_STATUSES.COMPLETED] || []).length,
        total_active: allJobs.filter(j =>
          ![JOB_STATUSES.SUBMITTED, JOB_STATUSES.ARCHIVED].includes(j.status)
        ).length,
      },
      new_tasks: todayJobs.map(j => ({ job_id: j.job_id, title: j.title, source: j.source_system, priority: j.priority })),
      in_progress: (byStatus[JOB_STATUSES.IN_PROGRESS] || []).map(j => ({ job_id: j.job_id, title: j.title })),
      completed: (byStatus[JOB_STATUSES.COMPLETED] || []).map(j => ({ job_id: j.job_id, title: j.title })),
      blocked: (byStatus[JOB_STATUSES.VERIFICATION_FAILED] || []).map(j => ({
        job_id: j.job_id,
        title: j.title,
        reason: j.review_notes,
      })),
      top_priorities: allJobs
        .filter(j => ![JOB_STATUSES.SUBMITTED, JOB_STATUSES.ARCHIVED, JOB_STATUSES.COMPLETED].includes(j.status))
        .sort((a, b) => (a.priority || 99) - (b.priority || 99))
        .slice(0, 3)
        .map(j => ({ job_id: j.job_id, title: j.title, priority: j.priority })),
      standup_text: null,
    };

    standup.standup_text = generateStandupText(standup);

    res.json(standup);
  } catch (err) {
    logger.error('api-standup', 'Failed to generate standup', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.get('/today/audio', async (req, res) => {
  try {
    res.json({
      audio_url: null,
      message: 'Audio standup generation is handled by the scheduler service',
      fallback_text: 'Use GET /standup/today for text summary',
    });
  } catch (err) {
    logger.error('api-standup', 'Failed to get audio', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

function generateStandupText(standup) {
  const lines = [
    `Good morning Erwin. Here is your daily documentation standup for ${standup.date}.`,
    '',
  ];

  if (standup.summary.new_today > 0) {
    lines.push(`You have ${standup.summary.new_today} new task${standup.summary.new_today > 1 ? 's' : ''} today.`);
    for (const task of standup.new_tasks.slice(0, 5)) {
      lines.push(`  New: ${task.title} from ${task.source}`);
    }
  } else {
    lines.push('No new tasks today.');
  }

  lines.push('');

  if (standup.summary.in_progress > 0) {
    lines.push(`${standup.summary.in_progress} task${standup.summary.in_progress > 1 ? 's are' : ' is'} currently in progress.`);
  }

  if (standup.summary.completed > 0) {
    lines.push(`${standup.summary.completed} document${standup.summary.completed > 1 ? 's are' : ' is'} ready for your review.`);
  }

  if (standup.blocked.length > 0) {
    lines.push('');
    lines.push(`Attention: ${standup.blocked.length} task${standup.blocked.length > 1 ? 's are' : ' is'} blocked.`);
    for (const task of standup.blocked.slice(0, 3)) {
      lines.push(`  Blocked: ${task.title}. Reason: ${task.reason || 'verification failed'}`);
    }
  }

  if (standup.top_priorities.length > 0) {
    lines.push('');
    lines.push('Your top priorities today are:');
    standup.top_priorities.forEach((p, i) => {
      lines.push(`  ${i + 1}. ${p.title}`);
    });
  }

  lines.push('');
  lines.push(`Total active tasks: ${standup.summary.total_active}. Have a productive day.`);

  return lines.join('\n');
}

module.exports = router;
