import BaseModal from "./BaseModal";

const CONTENT = {
  terms: {
    title: "Terms & Conditions",
    icon: "📋",
    body: `
**Effective Date: January 1, 2025**

By creating an account on Spirit Revival Africa (SRA), you agree to the following terms:

**1. Acceptance**
By registering, you confirm that you are at least 16 years of age and agree to be bound by these Terms.

**2. Use of Platform**
SRA is a Christian revival network. You agree to use the platform for spiritual growth, ministry collaboration, and revivalist activity. Misuse will result in account termination.

**3. Content Standards**
All content shared must be Christ-centered, respectful, and free from hate, discrimination, or heretical doctrine as determined by the platform moderators.

**4. Privacy**
Your personal data is handled in accordance with our Privacy Policy. We will never sell your information to third parties.

**5. Account Security**
You are responsible for maintaining the confidentiality of your login credentials. Report any unauthorized access immediately.

**6. Intellectual Property**
Content you share remains yours, but you grant SRA a non-exclusive license to display it on the platform.

**7. Termination**
SRA reserves the right to suspend or terminate accounts that violate these terms without prior notice.

**8. Amendments**
We may update these terms periodically. Continued use of the platform constitutes acceptance of the updated terms.

**Contact:** spiritrevivalafrica@gmail.com
    `,
  },
  faith: {
    title: "Statement of Faith",
    icon: "✝️",
    body: `
We at Spirit Revival Africa affirm:

**1. The Scripture**
We believe the entire Bible is the inspired, infallible, authoritative Word of God (2 Timothy 3:16-17).

**2. The Trinity**
We believe in one God, eternally existing in three persons: Father, Son, and Holy Spirit (Matthew 28:19).

**3. Jesus Christ**
We believe in the deity of Jesus Christ, His virgin birth, sinless life, atoning death, bodily resurrection, ascension, and return (John 1:1, 14; 1 Corinthians 15:3-4).

**4. Salvation**
We believe that salvation is by grace through faith in Jesus Christ alone, not by works (Ephesians 2:8-9).

**5. The Holy Spirit**
We believe in the present-day ministry of the Holy Spirit — regeneration, sanctification, and empowerment for service (Acts 1:8; John 3:5-8).

**6. The Church**
We believe the Church is the body of Christ, called to worship, fellowship, discipleship, ministry, and evangelism (Matthew 16:18; Ephesians 1:22-23).

**7. The Great Commission**
We believe every believer is commissioned to go and make disciples of all nations (Matthew 28:18-20).

**8. The Return of Christ**
We believe in the personal, visible, and imminent return of Jesus Christ (Acts 1:11; Revelation 22:20).
    `,
  },
  conduct: {
    title: "Code of Conduct",
    icon: "🤝",
    body: `
All Spirit Revival Africa members and contributors are expected to adhere to this Code of Conduct:

**1. Respect & Honor**
Treat every member with dignity and respect regardless of denomination, race, nationality, or background (Romans 12:10).

**2. Doctrinal Humility**
While we stand on core biblical truths, we embrace unity in diversity on non-essential matters. Avoid divisive doctrinal debates.

**3. Language & Tone**
Use wholesome speech at all times. Avoid profanity, slander, gossip, and inflammatory language (Ephesians 4:29).

**4. Content Integrity**
Do not share false teachings, unverified prophecies, or content that promotes division within the body of Christ.

**5. Sexual Purity**
Do not share sexually explicit or suggestive content of any kind. Zero tolerance.

**6. Privacy**
Respect the privacy of other members. Do not share personal conversations without consent.

**7. Accountability**
Accept correction gracefully. We are a community that helps each other grow in Christ.

**8. Digital Integrity**
No spam, hacking, impersonation, or malicious link sharing. Report suspicious activity to moderators.

**9. Consequences**
Violations of this code may result in warning, suspension, or permanent removal from the platform.

**We are one body, many members, united for revival.**
    `,
  },
};

function renderMarkdown(text) {
  return text
    .trim()
    .split("\n\n")
    .map((para, i) =>
      para.startsWith("**") && para.endsWith("**") && para.indexOf("**", 2) === para.length - 2 ? (
        <h3 key={i} className="mt-4 mb-1 text-sm font-bold text-amber-400">
          {para.replace(/\*\*/g, "")}
        </h3>
      ) : (
        <p
          key={i}
          className="text-sm text-zinc-400 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: para
              .replace(/\n/g, "<br/>")
              .replace(/\*\*(.+?)\*\*/g, "<strong class='text-zinc-200'>$1</strong>"),
          }}
        />
      )
    );
}

export default function InfoModal({ type, open, onClose }) {
  const content = CONTENT[type];
  if (!content) return null;

  return (
    <BaseModal open={open} onClose={onClose} maxWidth="max-w-xl">
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{content.icon}</span>
            <h2 className="text-lg font-black text-white">{content.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-white transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-1 max-h-[60vh]">
          {renderMarkdown(content.body)}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-6 py-4">
          <button onClick={onClose} className="btn-gold w-full py-2.5 text-sm">
            I Understand
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
