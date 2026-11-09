const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('n8n/bookleaf_royalty_notification_workflow.json', 'utf8'));

const code = wf.nodes.find(n => n.name === 'Process Royalty AI & Business Logic').parameters.jsCode;

const testInput = {
  json: {
    headers: { 'x-bookleaf-secret': 'bookleaf_secure_webhook_secret_2026' },
    body: {
      auth_token: 'bookleaf_secure_webhook_secret_2026',
      author_id: 'AUTH001',
      author_name: 'Priya Sharma',
      author_email: 'priya.sharma@email.com',
      author_city: 'Mumbai',
      trigger_type: 'Manual Single'
    }
  }
};

const fn = new Function('$input', code);
const res = fn({ first: () => testInput });
console.log('Result status:', res[0].json.status);
console.log('Result subject:', res[0].json.email_subject);
console.log('Keys:', Object.keys(res[0].json));
