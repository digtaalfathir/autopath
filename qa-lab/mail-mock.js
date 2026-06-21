'use strict';

// Local SMTP sink for testing the Send Email node without a real mail server.
// Accepts any auth, saves each message (incl. attachments) as an .eml file in
// qa-lab/mailbox/, and prints a summary. Listens on localhost:1025.
//
// In the Send Email node use:  Host=localhost  Port=1025  SSL/TLS=off
//
// NOTE: this captures OUTGOING mail only. To also test Read Email (IMAP),
// run a combined SMTP+IMAP test server — see TESTING_GUIDE.md (GreenMail).

const { SMTPServer } = require('smtp-server');
const path = require('path');
const fs   = require('fs');

const PORT = process.env.QA_SMTP_PORT ? Number(process.env.QA_SMTP_PORT) : 1025;
const BOX  = path.join(__dirname, 'mailbox');
fs.mkdirSync(BOX, { recursive: true });

const server = new SMTPServer({
  authOptional: true,
  hideSTARTTLS: true,          // plain delivery — avoids self-signed TLS errors
  disabledCommands: ['STARTTLS'],
  onData(stream, session, callback) {
    const chunks = [];
    stream.on('data', c => chunks.push(c));
    stream.on('end', () => {
      const raw = Buffer.concat(chunks);
      const file = path.join(BOX, `mail_${Date.now()}.eml`);
      fs.writeFileSync(file, raw);
      const subject = (raw.toString('utf8').match(/^Subject: (.*)$/m) || [, '(no subject)'])[1];
      console.log(`📧 Received: "${subject}"  (${raw.length} bytes)  → ${path.basename(file)}`);
      callback();
    });
  },
});

server.on('error', err => console.error('SMTP error:', err.message));
server.listen(PORT, () => console.log(`QA Lab SMTP sink → localhost:${PORT}  (saving to ${BOX})`));
