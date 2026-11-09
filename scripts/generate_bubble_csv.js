const fs = require('fs');
const path = require('path');

const sampleDataPath = path.join(__dirname, '..', 'data', 'bookleaf_sample_data.json');
const rawData = fs.readFileSync(sampleDataPath, 'utf8');
const data = JSON.parse(rawData);

// Reference date for evaluating cycle aging relative to dataset records (e.g. late 2025 / early 2026)
const refDate = new Date('2026-01-15');

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// 1. Authors
const authorHeaders = [
  'author_id',
  'name',
  'email',
  'phone',
  'city',
  'joined_date',
  'total_books',
  'total_royalty_earned',
  'total_royalty_paid',
  'total_royalty_pending',
  'payout_status',
  'last_payout_date'
];

const authorRows = [];
const bookRows = [];
const userRows = [];

// Admin user row
userRows.push({
  email: 'admin@bookleafpub.com',
  name: 'BookLeaf Ops Admin',
  role: 'Admin',
  author_id: '',
  password: 'AdminPassword123!'
});

data.authors.forEach(author => {
  let totalEarned = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let latestPayoutDate = null;
  let hasOverdue = false;
  let hasPending = false;

  author.books.forEach(b => {
    totalEarned += b.total_royalty_earned || 0;
    totalPaid += b.royalty_paid || 0;
    totalPending += b.royalty_pending || 0;

    if (b.last_royalty_payout_date) {
      const pDate = new Date(b.last_royalty_payout_date);
      if (!latestPayoutDate || pDate > latestPayoutDate) {
        latestPayoutDate = pDate;
      }
    }

    let badge = 'Green';
    let statusExplanation = 'All royalties paid in full.';

    if (b.status && b.status.startsWith('In Production')) {
      badge = 'Gray';
      statusExplanation = 'In Production - No commercial sales yet.';
    } else if (b.royalty_pending === 0) {
      badge = 'Green';
      statusExplanation = 'All royalties paid in full.';
    } else {
      hasPending = true;
      if (!b.last_royalty_payout_date) {
        if (b.publication_date) {
          const daysSincePub = Math.floor((refDate - new Date(b.publication_date)) / (1000 * 60 * 60 * 24));
          if (daysSincePub > 90) {
            badge = 'Red';
            statusExplanation = `Overdue: No payout recorded since publication (${daysSincePub} days ago).`;
            hasOverdue = true;
          } else {
            badge = 'Yellow';
            statusExplanation = `Pending: Within first 90-day cycle (${daysSincePub} days since publication).`;
          }
        } else {
          badge = 'Yellow';
          statusExplanation = 'Pending first payout cycle.';
        }
      } else {
        const daysSincePayout = Math.floor((refDate - new Date(b.last_royalty_payout_date)) / (1000 * 60 * 60 * 24));
        if (daysSincePayout > 90) {
          badge = 'Red';
          statusExplanation = `Overdue: Last payout was ${daysSincePayout} days ago (>90 days).`;
          hasOverdue = true;
        } else {
          badge = 'Yellow';
          statusExplanation = `Pending: Within normal 90-day cycle (${daysSincePayout} days ago).`;
        }
      }
    }

    bookRows.push({
      book_id: b.book_id,
      author_id: author.author_id,
      author_name: author.name,
      title: b.title,
      isbn: b.isbn || 'Pending Assignment',
      genre: b.genre || '',
      publication_date: b.publication_date || '',
      status: b.status,
      mrp: b.mrp !== null && b.mrp !== undefined ? b.mrp : 0,
      author_royalty_per_copy: b.author_royalty_per_copy !== null && b.author_royalty_per_copy !== undefined ? b.author_royalty_per_copy : 0,
      total_copies_sold: b.total_copies_sold || 0,
      total_royalty_earned: b.total_royalty_earned || 0,
      royalty_paid: b.royalty_paid || 0,
      royalty_pending: b.royalty_pending || 0,
      last_royalty_payout_date: b.last_royalty_payout_date || '',
      print_partner: b.print_partner || 'In-House',
      available_on: Array.isArray(b.available_on) ? b.available_on.join(', ') : (b.available_on || ''),
      royalty_status_badge: badge,
      status_explanation: statusExplanation
    });
  });

  let authorPayoutStatus = 'Fully Paid';
  if (totalPending > 0) {
    authorPayoutStatus = hasOverdue ? 'Overdue' : 'Pending';
  }

  authorRows.push({
    author_id: author.author_id,
    name: author.name,
    email: author.email,
    phone: author.phone || '',
    city: author.city || '',
    joined_date: author.joined_date || '',
    total_books: author.books.length,
    total_royalty_earned: totalEarned,
    total_royalty_paid: totalPaid,
    total_royalty_pending: totalPending,
    payout_status: authorPayoutStatus,
    last_payout_date: latestPayoutDate ? latestPayoutDate.toISOString().split('T')[0] : ''
  });

  // User account for author
  userRows.push({
    email: author.email,
    name: author.name,
    role: 'Author',
    author_id: author.author_id,
    password: 'AuthorPassword123!'
  });
});

// Write Authors CSV
const authorCsvContent = [
  authorHeaders.join(','),
  ...authorRows.map(row => authorHeaders.map(h => escapeCSV(row[h])).join(','))
].join('\n');

fs.writeFileSync(path.join(__dirname, '..', 'data', 'bubble_import_authors.csv'), authorCsvContent, 'utf8');

// Write Books CSV
const bookHeaders = [
  'book_id',
  'author_id',
  'author_name',
  'title',
  'isbn',
  'genre',
  'publication_date',
  'status',
  'mrp',
  'author_royalty_per_copy',
  'total_copies_sold',
  'total_royalty_earned',
  'royalty_paid',
  'royalty_pending',
  'last_royalty_payout_date',
  'print_partner',
  'available_on',
  'royalty_status_badge',
  'status_explanation'
];

const bookCsvContent = [
  bookHeaders.join(','),
  ...bookRows.map(row => bookHeaders.map(h => escapeCSV(row[h])).join(','))
].join('\n');

fs.writeFileSync(path.join(__dirname, '..', 'data', 'bubble_import_books.csv'), bookCsvContent, 'utf8');

// Write Users CSV
const userHeaders = ['email', 'name', 'role', 'author_id', 'password'];
const userCsvContent = [
  userHeaders.join(','),
  ...userRows.map(row => userHeaders.map(h => escapeCSV(row[h])).join(','))
].join('\n');

fs.writeFileSync(path.join(__dirname, '..', 'data', 'bubble_import_users.csv'), userCsvContent, 'utf8');

// Initial Notification Logs CSV (sample starter log)
const logHeaders = [
  'log_id',
  'author_id',
  'author_name',
  'recipient_email',
  'trigger_type',
  'triggered_at',
  'status',
  'email_subject',
  'email_preview',
  'completed_at',
  'error_message'
];

const sampleLogRows = [
  {
    log_id: 'LOG-INIT-001',
    author_id: 'AUTH001',
    author_name: 'Priya Sharma',
    recipient_email: 'priya.sharma@email.com',
    trigger_type: 'Manual Single',
    triggered_at: '2026-01-16T10:00:00Z',
    status: 'Success',
    email_subject: 'Your BookLeaf Royalty Statement & Upcoming Payout Summary',
    email_preview: 'Dear Priya Sharma, We are pleased to provide your quarterly royalty statement. Across your 2 titles...',
    completed_at: '2026-01-16T10:00:04Z',
    error_message: ''
  }
];

const logCsvContent = [
  logHeaders.join(','),
  ...sampleLogRows.map(row => logHeaders.map(h => escapeCSV(row[h])).join(','))
].join('\n');

fs.writeFileSync(path.join(__dirname, '..', 'data', 'bubble_import_notification_logs.csv'), logCsvContent, 'utf8');

console.log('Successfully generated Bubble import CSV files:');
console.log('- data/bubble_import_authors.csv (10 authors)');
console.log('- data/bubble_import_books.csv (18 books)');
console.log('- data/bubble_import_users.csv (11 user credentials: 1 admin + 10 authors)');
console.log('- data/bubble_import_notification_logs.csv');
