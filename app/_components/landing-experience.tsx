'use client';

export function LandingExperience({ onEnter, onOpenSample }: { onEnter: () => void; onOpenSample: () => void }) {
  return <main className="axiom-landing">
    <nav className="landing-nav" aria-label="Axiom landing navigation">
      <a className="landing-brand" href="#top" aria-label="Axiom home"><span>A</span><b>Axiom</b></a>
      <div><a href="#journey">How it works</a><a href="#capabilities">Capabilities</a><button type="button" className="landing-nav-cta" onClick={onEnter}>Open workspace</button></div>
    </nav>

    <section className="landing-hero" id="top">
      <div className="landing-glow landing-glow-one" /><div className="landing-glow landing-glow-two" />
      <div className="landing-hero-copy">
        <span className="landing-kicker"><i /> Engineering intelligence, connected</span>
        <h1>Turn raw intent<br />into an <em>approved product<br />system.</em></h1>
        <p>Upload briefs, policies, diagrams, and conversations. Axiom turns them into reviewable requirements, living engineering documents, architecture diagrams, and product flows—without losing why.</p>
        <div className="landing-actions"><button type="button" className="primary-glow-button" onClick={onEnter}>Experience Axiom <span>→</span></button><button type="button" className="quiet-button" onClick={onOpenSample}>Explore the live sample</button></div>
        <div className="landing-proof"><span>Source grounded</span><span>Human approved</span><span>Evidence linked</span></div>
      </div>

      <div className="landing-product-visual" aria-label="Axiom product journey preview">
        <div className="visual-window">
          <div className="visual-window-bar"><span /><span /><span /><b>Project intelligence</b><small>Live</small></div>
          <div className="visual-body">
            <div className="visual-source-card"><div className="visual-icon">↑</div><strong>Drop project context</strong><small>Briefs · folders · transcripts</small><div className="visual-file"><span>PD</span><b>product-brief.pdf</b><i>Ready</i></div><div className="visual-file"><span>MT</span><b>discovery-notes.txt</b><i>Ready</i></div></div>
            <div className="visual-connector"><i /><span>AI structures context</span><i /></div>
            <div className="visual-output-card"><small>DOCUMENT SYSTEM</small><strong>Ready for review</strong><div className="visual-doc-grid"><span>SRS</span><span>NFR</span><span>HLD</span><span>ADR</span></div><div className="visual-architecture"><i /><i /><i /><b>Architecture mapped</b></div></div>
          </div>
        </div>
        <div className="floating-signal signal-one"><span>◇</span><div><b>12 gaps found</b><small>5 need a decision</small></div></div>
        <div className="floating-signal signal-two"><span>✓</span><div><b>Sources traced</b><small>Every claim has provenance</small></div></div>
      </div>
    </section>

    <section className="landing-journey" id="journey">
      <div><span>01</span><b>Bring context</b><p>Files, folders, transcripts, policies, and existing product knowledge.</p></div>
      <div><span>02</span><b>Shape the system</b><p>Requirements, SRS, NFR, proposed HLD, diagrams, gaps, and decisions.</p></div>
      <div><span>03</span><b>Review what matters</b><p>Revise with AI, approve in Axiom, publish to Notion, and keep every version.</p></div>
      <div><span>04</span><b>Design and decide</b><p>Optional wireflows, contextual tech choices, ARB, and final approved HLD.</p></div>
    </section>

    <section className="landing-capabilities" id="capabilities">
      <span className="landing-kicker"><i /> One reasoning layer</span>
      <h2>From “what are we building?”<br />to “why this design?”</h2>
      <div><article><span>01</span><h3>Document intelligence</h3><p>Detailed engineering artifacts remain linked to sources, review instructions, and truth status.</p></article><article><span>02</span><h3>Architecture clarity</h3><p>System, component, deployment, and sequence diagrams accompany every HLD direction.</p></article><article><span>03</span><h3>Product flow studio</h3><p>Twelve curated product patterns generate materially different, editable screen journeys.</p></article></div>
      <button type="button" className="primary-glow-button" onClick={onEnter}>Start with your documents <span>→</span></button>
    </section>
  </main>;
}
