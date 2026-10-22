// Builds a plain-text research memo from data already fetched by the page —
// no extra API call, no server-side rendering. Pure formatting of the same
// grounded data the page already displays, so the memo can never contain
// anything the user hasn't already seen on screen.

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const DISCLAIMER =
  'Verilex is not a lawyer and does not provide legal advice or predict outcomes. This memo ' +
  'reflects cached, provider-sourced legal material and automated relevance analysis — verify ' +
  'every citation against the original external source before relying on it.';

export function downloadSearchMemo({ search, scenario, results }) {
  const lines = [];
  lines.push('VERILEX — RESEARCH MEMO');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Scenario Reference: ${search?.id || 'unknown'}`);
  lines.push('');
  lines.push('SITUATION DESCRIBED');
  lines.push(`"${search?.raw_query || ''}"`);
  lines.push('');

  const concepts = scenario?.concepts || [];
  if (concepts.length) {
    lines.push('DETECTED CONCEPTS');
    for (const c of concepts) lines.push(`- ${c}`);
    lines.push('');
  }

  lines.push(`RETRIEVED LEGAL SOURCES (${results?.length || 0})`);
  lines.push('');
  (results || []).forEach((r, i) => {
    const s = r.source;
    lines.push(`${i + 1}. ${s.title}`);
    const meta = [s.act, s.section ? `§${s.section}` : null, s.jurisdiction, s.current_status]
      .filter(Boolean)
      .join(' · ');
    if (meta) lines.push(`   ${meta}`);
    lines.push(`   Provider: ${s.provider}`);
    lines.push(`   Source URL: ${s.url || 'not available'}`);
    lines.push(`   Why retrieved: ${r.reason}`);
    lines.push('');
  });

  lines.push('---');
  lines.push(DISCLAIMER);

  downloadTextFile(`verilex-memo-${search?.id?.slice(0, 8) || 'search'}.txt`, lines.join('\n'));
}

export function downloadExplanationMemo({ explanation, source, relatedJudgments }) {
  const lines = [];
  lines.push('VERILEX — EXPLANATION MEMO');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Model: ${explanation.model}`);
  if (source) {
    const meta = [source.act, source.section ? `§${source.section}` : null].filter(Boolean).join(' ');
    lines.push(`Source: ${source.title}${meta ? ` (${meta})` : ''}`);
  }
  lines.push('');
  lines.push('SCENARIO ON FILE');
  lines.push(`"${explanation.scenario_text}"`);
  lines.push('');

  const sections = [
    ['WHAT THE LAW SAYS', explanation.what_it_says],
    ['WHAT IN YOUR SCENARIO RELATES TO IT', explanation.what_relates],
    ['WHERE THE RELATIONSHIP IS STRONG', explanation.strong_relationship],
    ['WHAT IS UNCERTAIN', explanation.uncertain],
    ['EXCEPTIONS / LIMITATIONS', explanation.exceptions],
    ['WHAT THIS DOES NOT ESTABLISH', explanation.what_this_does_not_establish],
  ];
  for (const [label, text] of sections) {
    if (!text) continue;
    lines.push(label);
    lines.push(text);
    lines.push('');
  }

  if (relatedJudgments?.length) {
    lines.push('SUPPORTING CASES');
    for (const j of relatedJudgments) {
      lines.push(`- ${j.title} (${j.court || 'court unknown'})`);
      if (j.excerpt) lines.push(`  ${j.excerpt}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(DISCLAIMER);

  downloadTextFile(`verilex-explanation-${explanation.id?.slice(0, 8) || 'memo'}.txt`, lines.join('\n'));
}
