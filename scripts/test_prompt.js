const fs = require('fs');
const path = require('path');

// Test dataset
const sampleData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'bookleaf_sample_data.json'), 'utf8'));

// Test prompt constructor matching BookLeaf's prompt guidelines
function buildRoyaltyPrompt(author, books) {
  let earned = 0;
  let paid = 0;
  let pending = 0;
  let publishedBooks = [];
  let inProductionBooks = [];

  books.forEach(b => {
    earned += (b.total_royalty_earned || 0);
    paid += (b.royalty_paid || 0);
    pending += (b.royalty_pending || 0);

    if (b.status && b.status.startsWith('In Production')) {
      inProductionBooks.push(b);
    } else {
      publishedBooks.push(b);
    }
  });

  return `You are the Author Relations Specialist at BookLeaf Publishing (a premier self-publishing platform supporting 22,000+ titles).
Your task is to draft a personalized, clear, and professional Royalty Summary Email to an author based on their latest account data.

COMPANY POLICIES & KNOWLEDGE BASE:
1. Royalty Split: 80% to the author, 20% to BookLeaf Publishing on net receipts.
2. Payout Cycle: Royalties are paid quarterly within 45 days after the close of the calendar quarter:
   - Q1 (Jan-Mar): Distributed by May 15
   - Q2 (Apr-Jun): Distributed by August 15
   - Q3 (Jul-Sep): Distributed by November 15
   - Q4 (Oct-Dec): Distributed by February 15
3. Minimum Payout Threshold: ₹1,000. If accumulated pending royalties are below ₹1,000, they roll over automatically to the subsequent quarterly cycle without forfeiture.
4. Payment Method: Direct Bank Transfer (NEFT/IMPS) to verified account on file.
5. In-Production Books: Provide reassuring updates indicating that our production team is actively formatting/designing their title.
6. Tone: Warm, empathetic, professional, celebrating their authorship, transparent with figures, zero corporate jargon.

AUTHOR DETAILS:
- Name: ${author.name}
- Email: ${author.email}
- City: ${author.city || 'N/A'}
- Author ID: ${author.author_id}

ACCOUNT FINANCIAL CONSOLIDATION:
- Total Royalty Earned to Date: ₹${earned.toLocaleString('en-IN')}
- Total Royalty Already Paid: ₹${paid.toLocaleString('en-IN')}
- Total Royalty Currently Pending: ₹${pending.toLocaleString('en-IN')}

PUBLISHED TITLES (${publishedBooks.length}):
${publishedBooks.map(b => `- "${b.title}" (ISBN: ${b.isbn})
  * Copies Sold: ${b.total_copies_sold}
  * Royalty Per Copy: ₹${b.author_royalty_per_copy}
  * Lifetime Earned: ₹${(b.total_royalty_earned || 0).toLocaleString('en-IN')}
  * Paid: ₹${(b.royalty_paid || 0).toLocaleString('en-IN')}
  * Pending: ₹${(b.royalty_pending || 0).toLocaleString('en-IN')}
  * Last Payout Date: ${b.last_royalty_payout_date || 'None yet'}
  * Channels: ${Array.isArray(b.available_on) ? b.available_on.join(', ') : b.available_on}`).join('\n')}

IN-PRODUCTION TITLES (${inProductionBooks.length}):
${inProductionBooks.length > 0 ? inProductionBooks.map(b => `- "${b.title}" (Status: ${b.status}, ISBN: ${b.isbn || 'In allocation'})`).join('\n') : 'None'}

EMAIL STRUCTURE REQUIREMENTS:
1. Subject Line: Engaging and clear (e.g. "Your BookLeaf Royalty Statement & Upcoming Payout Summary").
2. Greeting: Warm, personalized greeting using the author's name.
3. Consolidated Financial Overview: Clear summary table or bullet points for Total Earned, Paid, and Pending.
4. Per-Book Breakdown: Summary for each published book including sales volume and earnings.
5. Payout Status & Next Payout Window:
   - If pending amount > ₹1,000: Clearly specify the upcoming quarterly disbursement timeline based on the calendar cycle.
   - If pending amount is between ₹1 and ₹999: Explain the ₹1,000 minimum threshold and rollover policy reassuringly.
   - If pending amount is ₹0: Commend their achievements and acknowledge that all royalties are fully settled up to date.
6. Production Status (if applicable): A brief note on upcoming titles currently in production.
7. Support & Sign-off: Mention that our author support desk is always here to assist, closed with BookLeaf's signature.

Generate the complete, ready-to-send email below:`;
}

// Generate for a couple authors and log the output
console.log('Testing prompt generation for AUTH001 (Priya Sharma):');
console.log(buildRoyaltyPrompt(sampleData.authors[0], sampleData.authors[0].books));
console.log('\n----------------------------------------\n');
console.log('Testing prompt generation for AUTH007 (Sneha Kulkarni - has In-Production book):');
console.log(buildRoyaltyPrompt(sampleData.authors[6], sampleData.authors[6].books));
